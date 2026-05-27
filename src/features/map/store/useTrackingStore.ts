/**
 * useTrackingStore.ts
 *
 * Dedicated Zustand store for active GPS tracking and background location updates.
 * Implements adaptive sync intervals and Firestore write queue scheduling.
 */
import { create } from "zustand";
import * as Location from "expo-location";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "@/shared/config/firebase";
import { getTrackingOptions, LOCATION_TASK_NAME } from "@/features/map/services/locationService";
import { useBatteryStore } from "@/features/map/store/useBatteryStore";
import { useGhostModeStore } from "@/features/map/store/useGhostModeStore";
import { useGeofenceStore } from "@/features/map/store/useGeofenceStore";
import { useNetworkStore } from "@/shared/store/useNetworkStore";
import { useSyncQueueStore } from "@/shared/store/useSyncQueueStore";
import { syncScheduler } from "@/shared/realtime/syncScheduler";
import { geohashUtil } from "@/shared/utils/geohash";

interface TrackingState {
  location: Location.LocationObjectCoords | null;
  trackingActive: boolean;
  errorMsg: string | null;

  // Actions
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  adjustTrackingParameters: () => Promise<void>;
  syncLocationToFirestore: (coords: Location.LocationObjectCoords, force?: boolean) => Promise<void>;
}

// Helper: Calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Foreground parameters per battery rules
function getForegroundOptions(batteryLevel: number, isCharging: boolean, lowPowerMode: boolean) {
  if ((batteryLevel < 15 && !isCharging) || lowPowerMode) {
    return {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000, // 30s
      distanceInterval: 30, // 30m
    };
  }
  if (batteryLevel < 40 && !isCharging) {
    return {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 15000, // 15s
      distanceInterval: 15, // 15m
    };
  }
  return {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000, // 5s
    distanceInterval: 5, // 5m
  };
}

// Helper: smart activity analyzer
function analyzeActivity(speed: number | null, isCharging: boolean, batteryLevel: number): "online" | "idle" | "driving" | "sleeping" {
  if (speed !== null && speed > 4.17) {
    return "driving";
  }
  const hour = new Date().getHours();
  const isNight = hour >= 23 || hour < 6;
  if (isNight && isCharging) {
    return "sleeping";
  }
  if (speed !== null && speed === 0) {
    return "idle";
  }
  return "online";
}

export const useTrackingStore = create<TrackingState>((set, get) => {
  let fgSubscription: Location.LocationSubscription | null = null;
  let isAdjusting = false;
  let isStopped = false;

  // Persisted local variables to throttle writes
  let lastSyncTime = 0;
  let lastSyncCoords: { latitude: number; longitude: number } | null = null;
  let lastSyncBattery = 0;
  let lastSyncCharging = false;
  let lastSyncGhostMode = "";

  return {
    location: null,
    trackingActive: false,
    errorMsg: null,

    startTracking: async () => {
      if (get().trackingActive) return;

      try {
        isStopped = false;
        
        // 1. Start battery monitoring store
        const batteryStore = useBatteryStore.getState();
        const batteryUnsub = batteryStore.startBatteryMonitoring();

        // 2. Request GPS permissions
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus !== "granted") {
          set({ errorMsg: "GPS access denied." });
          // Jakarta default fallback
          set({
            location: {
              latitude: -6.2088,
              longitude: 106.8456,
              altitude: null,
              accuracy: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
          });
          return;
        }

        // Get initial location instantly
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        set({ location: initial.coords, trackingActive: true });
        
        // Initialize ghost mode configuration
        const currentUser = auth?.currentUser;
        if (currentUser) {
          await useGhostModeStore.getState().initializeGhostMode(currentUser.uid);
        }

        // Sync initially
        await get().syncLocationToFirestore(initial.coords, true);
        useGeofenceStore.getState().evaluateSelfGeofences(initial.coords.latitude, initial.coords.longitude);

        // Start watching foreground coordinates
        const { batteryLevel, isCharging, lowPowerMode } = batteryStore;
        const fgOptions = getForegroundOptions(batteryLevel, isCharging, lowPowerMode);
        
        fgSubscription = await Location.watchPositionAsync(
          fgOptions,
          async (newLoc) => {
            if (isStopped) return;
            set({ location: newLoc.coords });
            await get().syncLocationToFirestore(newLoc.coords);
            useGeofenceStore.getState().evaluateSelfGeofences(newLoc.coords.latitude, newLoc.coords.longitude);
          }
        );

        // Subscribe to background location updates
        try {
          const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
          if (bgStatus === "granted") {
            const options = getTrackingOptions(batteryLevel, isCharging, lowPowerMode);
            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, options);
          }
        } catch {}

        // Listen to battery store changes to adjust parameters dynamically
        useBatteryStore.subscribe(async () => {
          await get().adjustTrackingParameters();
        });

      } catch (err: any) {
        set({ errorMsg: err.message });
      }
    },

    stopTracking: () => {
      isStopped = true;
      if (fgSubscription) {
        fgSubscription.remove();
        fgSubscription = null;
      }

      try {
        Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).then((active) => {
          if (active) Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        });
      } catch {}

      set({ trackingActive: false });
    },

    adjustTrackingParameters: async () => {
      const { trackingActive } = get();
      if (!trackingActive) return;
      if (isAdjusting) return;
      isAdjusting = true;

      try {
        const { batteryLevel, isCharging, lowPowerMode } = useBatteryStore.getState();

        if (fgSubscription) {
          fgSubscription.remove();
          fgSubscription = null;
        }

        const fgOptions = getForegroundOptions(batteryLevel, isCharging, lowPowerMode);
        fgSubscription = await Location.watchPositionAsync(
          fgOptions,
          async (newLoc) => {
            if (isStopped) return;
            set({ location: newLoc.coords });
            await get().syncLocationToFirestore(newLoc.coords);
            useGeofenceStore.getState().evaluateSelfGeofences(newLoc.coords.latitude, newLoc.coords.longitude);
          }
        );

        const isBgActive = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (isBgActive) {
          const options = getTrackingOptions(batteryLevel, isCharging, lowPowerMode);
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, options);
        }
      } catch {
      } finally {
        isAdjusting = false;
      }
    },

    syncLocationToFirestore: async (coords, force = false) => {
      const currentUser = auth?.currentUser;
      if (!currentUser) return;

      const batteryStore = useBatteryStore.getState();
      const ghostModeStore = useGhostModeStore.getState();
      const { ghostMode } = ghostModeStore;
      const { batteryLevel, isCharging } = batteryStore;

      const now = Date.now();

      // Adaptive writing throttling rules
      if (!force) {
        const timePassed = now - lastSyncTime;
        const locationMoved = lastSyncCoords
          ? calculateDistance(lastSyncCoords.latitude, lastSyncCoords.longitude, coords.latitude, coords.longitude) * 1000
          : Infinity;

        const batteryChanged = lastSyncBattery !== batteryLevel;
        const chargingChanged = lastSyncCharging !== isCharging;
        const ghostModeChanged = lastSyncGhostMode !== ghostMode;

        // Throttling thresholds:
        // Idle (stationary or low-battery): slow down writes to every 30s.
        const isIdle = (coords.speed === 0 || batteryLevel < 20) && !isCharging;
        const timeThreshold = isIdle ? 30000 : 10000; // 30s if idle, 10s if active
        const distanceThreshold = isIdle ? 15 : 5; // 15m if idle, 5m if active

        if (
          timePassed < timeThreshold &&
          locationMoved < distanceThreshold &&
          !batteryChanged &&
          !chargingChanged &&
          !ghostModeChanged
        ) {
          return;
        }
      }

      lastSyncTime = now;
      lastSyncCoords = { latitude: coords.latitude, longitude: coords.longitude };
      lastSyncBattery = batteryLevel;
      lastSyncCharging = isCharging;
      lastSyncGhostMode = ghostMode;

      // Wrap sync call inside debounced scheduler
      syncScheduler.schedule(`sync_coords_${currentUser.uid}`, async () => {
        const targetCoords = ghostModeStore.getOptimizedCoords(coords);
        const isOnline = useNetworkStore.getState().isOnline;
        const syncQueueStore = useSyncQueueStore.getState();
        const nowStr = new Date().toISOString();
        const activity = analyzeActivity(coords.speed ?? null, isCharging, batteryLevel);
        
        // Generate Geohash Spatial Index (Precision: 9 -> ~4.77m x 4.77m cell size)
        const geohash = geohashUtil.encode(targetCoords.latitude, targetCoords.longitude, 9);

        const locationPayload = {
          uid: currentUser.uid,
          latitude: targetCoords.latitude,
          longitude: targetCoords.longitude,
          heading: coords.heading ?? null,
          speed: coords.speed ?? null,
          batteryLevel,
          isCharging,
          ghostMode,
          activity,
          geohash,
          updatedAt: nowStr,
        };

        if (!isOnline) {
          await syncQueueStore.enqueueSyncItem("LOCATION", currentUser.uid, locationPayload);
          return;
        }

        try {
          const docRef = doc(db, "locations", currentUser.uid);
          await setDoc(docRef, { ...locationPayload, lastSeen: serverTimestamp() }, { merge: true });
        } catch {
          // Fallback queue
          await syncQueueStore.enqueueSyncItem("LOCATION", currentUser.uid, locationPayload);
        }
      }, force ? 0 : 2500, force ? "high" : "low");
    },
  };
});
