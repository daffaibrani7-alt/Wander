import { create } from "zustand";
import * as Location from "expo-location";
import * as Battery from "expo-battery";
import { doc, collection, onSnapshot, setDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "../config/firebase";
import { getTrackingOptions, LOCATION_TASK_NAME } from "../services/locationService";
import { MockService, FriendLocation } from "../services/mockService";
import { useFriendStore } from "./useFriendStore";

interface LocationState {
  location: Location.LocationObjectCoords | null;
  ghostMode: "precise" | "blurry" | "frozen";
  frozenLocation: Location.LocationObjectCoords | null;
  blurryLocation: Location.LocationObjectCoords | null;
  batteryLevel: number;
  isCharging: boolean;
  lowPowerMode: boolean;
  trackingActive: boolean;
  friends: FriendLocation[];
  errorMsg: string | null;

  // Actions
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  setGhostMode: (mode: "precise" | "blurry" | "frozen") => void;
  syncLocationToFirestore: (coords: Location.LocationObjectCoords, force?: boolean) => Promise<void>;
  listenToFriends: () => () => void;
  adjustTrackingParameters: () => Promise<void>;
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

// Helper: Format relative time
function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "baru saja";
    if (diffMins < 60) return `${diffMins}m lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}j lalu`;
    return `${Math.floor(diffHours / 24)}h lalu`;
  } catch {
    return "aktif";
  }
}

// Helper: Analyze presence/activity state (Zenly Smart Activity Analyzer)
function analyzeActivity(
  speed: number | null,
  isCharging: boolean,
  updatedAtIso: string,
  batteryLevel: number
): "online" | "idle" | "driving" | "sleeping" {
  // Speed is usually from expo-location, in meters per second (m/s).
  // 15 km/h is approx 4.17 m/s.
  if (speed !== null && speed > 4.17) {
    return "driving";
  }

  const date = new Date(updatedAtIso);
  const hour = date.getHours();

  // Sleeping mode: Night time (11 PM to 6 AM) AND charging
  const isNight = hour >= 23 || hour < 6;
  if (isNight && isCharging) {
    return "sleeping";
  }

  // Idle: if speed is exactly 0
  if (speed !== null && speed === 0) {
    return "idle";
  }

  return "online";
}

// Helper: Determine optimized foreground options according to battery health
function getForegroundOptions(batteryLevel: number, isCharging: boolean, lowPowerMode: boolean) {
  // Low battery (< 15% and not plugged in) or low power mode enabled: Every 30s / 30m, lower accuracy
  if ((batteryLevel < 15 && !isCharging) || lowPowerMode) {
    return {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000,
      distanceInterval: 30,
    };
  }
  // Medium battery (< 40% and not plugged in): Every 15s / 15m, balanced accuracy
  if (batteryLevel < 40 && !isCharging) {
    return {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 15000,
      distanceInterval: 15,
    };
  }
  // Healthy battery (> 40% or plugged in): Every 5s / 5m, high accuracy
  return {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,
    distanceInterval: 5,
  };
}

export const useLocationStore = create<LocationState>((set, get) => {
  let fgSubscription: Location.LocationSubscription | null = null;
  let batLevelSub: any = null;
  let batStateSub: any = null;
  let powerModeSub: any = null;

  // Persisted state to throttle database writes for cost efficiency
  let lastSyncTime = 0;
  let lastSyncCoords: { latitude: number; longitude: number } | null = null;
  let lastSyncBattery: number | null = null;
  let lastSyncCharging: boolean | null = null;
  let lastSyncGhostMode: string | null = null;

  return {
    location: null,
    ghostMode: "precise",
    frozenLocation: null,
    blurryLocation: null,
    batteryLevel: 100,
    isCharging: false,
    lowPowerMode: false,
    trackingActive: false,
    friends: [],
    errorMsg: null,

    startTracking: async () => {
      if (get().trackingActive) return;

      try {
        // 1. Initial battery query
        let batteryLevel = 100;
        let isCharging = false;
        let lowPowerMode = false;
        try {
          const level = await Battery.getBatteryLevelAsync();
          batteryLevel = Math.round(level * 100);
          const state = await Battery.getBatteryStateAsync();
          isCharging =
            state === Battery.BatteryState.CHARGING ||
            state === Battery.BatteryState.FULL;
          lowPowerMode = await Battery.isLowPowerModeEnabledAsync();
        } catch {
          // Simulator / Web bypass
        }

        set({ batteryLevel, isCharging, lowPowerMode, trackingActive: true });

        // 2. Request Foreground GPS Permission
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus !== "granted") {
          set({ errorMsg: "Izin akses lokasi ditolak." });
          // Fallback coordinates for simulator
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

        // Get initial location quickly
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        set({ location: initial.coords });
        await get().syncLocationToFirestore(initial.coords, true);

        // Start Optimized Foreground Watcher
        const fgOptions = getForegroundOptions(batteryLevel, isCharging, lowPowerMode);
        fgSubscription = await Location.watchPositionAsync(
          fgOptions,
          async (newLocation) => {
            set({ location: newLocation.coords });
            await get().syncLocationToFirestore(newLocation.coords);
          }
        );

        // 3. Background location updates
        try {
          const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
          if (bgStatus === "granted") {
            const options = getTrackingOptions(batteryLevel, isCharging, lowPowerMode);
            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, options);
            console.log("🏃 Background location tracking berhasil diaktifkan!");
          }
        } catch (bgErr) {
          console.log("Info: Background location tidak disupport pada platform ini (misal web/Expo Go).");
        }

        // 4. Register battery optimization listeners
        try {
          batLevelSub = Battery.addBatteryLevelListener(async ({ batteryLevel }) => {
            const levelPercent = Math.round(batteryLevel * 100);
            set({ batteryLevel: levelPercent });
            await get().adjustTrackingParameters();
          });

          batStateSub = Battery.addBatteryStateListener(async ({ batteryState }) => {
            const isCharging =
              batteryState === Battery.BatteryState.CHARGING ||
              batteryState === Battery.BatteryState.FULL;
            set({ isCharging });
            await get().adjustTrackingParameters();
          });

          powerModeSub = Battery.addLowPowerModeListener(async ({ lowPowerMode }) => {
            set({ lowPowerMode });
            await get().adjustTrackingParameters();
          });
        } catch {
          // Low battery modes not supported
        }
      } catch (error: any) {
        console.error("Gagal memulai pelacakan lokasi:", error);
        set({ errorMsg: error.message });
      }
    },

    stopTracking: () => {
      if (fgSubscription) {
        fgSubscription.remove();
        fgSubscription = null;
      }
      if (batLevelSub) {
        batLevelSub.remove();
        batLevelSub = null;
      }
      if (batStateSub) {
        batStateSub.remove();
        batStateSub = null;
      }
      if (powerModeSub) {
        powerModeSub.remove();
        powerModeSub = null;
      }

      try {
        Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).then((active) => {
          if (active) Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        });
      } catch {
        // No-op
      }

      set({ trackingActive: false });
    },

    adjustTrackingParameters: async () => {
      const { trackingActive, batteryLevel, isCharging, lowPowerMode } = get();
      if (!trackingActive) return;

      try {
        // Update Foreground Watcher dynamically to optimize battery life
        if (fgSubscription) {
          fgSubscription.remove();
          fgSubscription = null;
        }

        const fgOptions = getForegroundOptions(batteryLevel, isCharging, lowPowerMode);
        fgSubscription = await Location.watchPositionAsync(
          fgOptions,
          async (newLocation) => {
            set({ location: newLocation.coords });
            await get().syncLocationToFirestore(newLocation.coords);
          }
        );

        // Adjust background parameter throttling
        const isBgActive = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (isBgActive) {
          const options = getTrackingOptions(batteryLevel, isCharging, lowPowerMode);
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, options);
          console.log(
            `🔋 Live Location: Throttling pelacakan diperbarui untuk baterai ${batteryLevel}% (Cas: ${isCharging})`
          );
        }
      } catch {
        // Dynamic throttling not supported
      }
    },

    setGhostMode: (mode) => {
      const { location } = get();
      set({ ghostMode: mode });

      if (mode === "precise") {
        set({ frozenLocation: null, blurryLocation: null });
      } else if (mode === "frozen" && location) {
        set({ frozenLocation: location });
      } else if (mode === "blurry" && location) {
        // Generate a stable blurry location offset once to prevent dynamic jittering/shaking
        const randomOffsetLat = (Math.random() > 0.5 ? 1 : -1) * (0.006 + Math.random() * 0.006);
        const randomOffsetLng = (Math.random() > 0.5 ? 1 : -1) * (0.006 + Math.random() * 0.006);
        set({
          blurryLocation: {
            ...location,
            latitude: location.latitude + randomOffsetLat,
            longitude: location.longitude + randomOffsetLng,
          },
        });
      }

      // Sync changes to Firestore immediately with force=true
      if (location) {
        get().syncLocationToFirestore(location, true);
      }
    },

    syncLocationToFirestore: async (coords, force = false) => {
      const { ghostMode, frozenLocation, blurryLocation, batteryLevel, isCharging } = get();
      const currentUser = auth?.currentUser;

      if (!currentUser || !isFirebaseConfigured || !db) return;

      const now = Date.now();

      // Database writing throttle logic
      if (!force) {
        const timePassed = now - lastSyncTime;
        const locationMoved = lastSyncCoords
          ? calculateDistance(lastSyncCoords.latitude, lastSyncCoords.longitude, coords.latitude, coords.longitude) * 1000 // in meters
          : Infinity;

        const batteryChanged = lastSyncBattery !== batteryLevel;
        const chargingChanged = lastSyncCharging !== isCharging;
        const ghostModeChanged = lastSyncGhostMode !== ghostMode;

        // Skip writing to database if no significant coordinates/state changes occurred under 10 seconds
        if (
          timePassed < 10000 &&
          locationMoved < 5 &&
          !batteryChanged &&
          !chargingChanged &&
          !ghostModeChanged
        ) {
          return;
        }
      }

      // Record last sync status
      lastSyncTime = now;
      lastSyncCoords = { latitude: coords.latitude, longitude: coords.longitude };
      lastSyncBattery = batteryLevel;
      lastSyncCharging = isCharging;
      lastSyncGhostMode = ghostMode;

      // Select final coordinates based on Ghost Mode
      let finalCoords = { ...coords };
      if (ghostMode === "frozen") {
        if (frozenLocation) {
          finalCoords = { ...frozenLocation };
        } else {
          set({ frozenLocation: coords });
        }
      } else if (ghostMode === "blurry") {
        if (blurryLocation) {
          finalCoords = { ...blurryLocation };
        } else {
          const randomOffsetLat = (Math.random() > 0.5 ? 1 : -1) * (0.006 + Math.random() * 0.006);
          const randomOffsetLng = (Math.random() > 0.5 ? 1 : -1) * (0.006 + Math.random() * 0.006);
          const newBlur = {
            ...coords,
            latitude: coords.latitude + randomOffsetLat,
            longitude: coords.longitude + randomOffsetLng,
          };
          set({ blurryLocation: newBlur });
          finalCoords = newBlur;
        }
      }

      try {
        const locationDocRef = doc(db, "locations", currentUser.uid);
        const nowStr = new Date().toISOString();
        const activity = analyzeActivity(coords.speed ?? null, isCharging, nowStr, batteryLevel);

        await setDoc(
          locationDocRef,
          {
            uid: currentUser.uid,
            latitude: finalCoords.latitude,
            longitude: finalCoords.longitude,
            heading: coords.heading ?? null,
            speed: coords.speed ?? null,
            batteryLevel,
            isCharging,
            ghostMode,
            lastSeen: serverTimestamp(),
            updatedAt: nowStr,
            activity,
          },
          { merge: true }
        );
      } catch (err) {
        console.error("Error sinkronisasi lokasi ke Firestore:", err);
      }
    },

    listenToFriends: () => {
      const myLat = get().location?.latitude;
      const myLng = get().location?.longitude;

      if (!isFirebaseConfigured || !db) {
        // Offline / Simulation mode
        set({ friends: MockService.getFriends(myLat, myLng) });

        const interval = setInterval(() => {
          const lat = get().location?.latitude;
          const lng = get().location?.longitude;
          set({ friends: MockService.getFriends(lat, lng) });
        }, 4000);

        return () => clearInterval(interval);
      }

      // Realtime Firebase mode with Friend-Only Realtime Listener (extremely scalable)
      let currentUnsubscribe: (() => void) | null = null;
      let prevUidsString = "";

      const handleSnapshot = (snapshot: any) => {
        const currentUser = auth?.currentUser;
        const currentLat = get().location?.latitude;
        const currentLng = get().location?.longitude;

        const realFriends: FriendLocation[] = [];
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data();

          if (data.uid !== currentUser?.uid && data.latitude && data.longitude) {
            const distance =
              currentLat && currentLng
                ? calculateDistance(currentLat, currentLng, data.latitude, data.longitude)
                : 0;

            // Merge with cached static profile fields from useFriendStore
            const friendProfile = useFriendStore.getState().friends.find((f) => f.uid === data.uid);

            realFriends.push({
              uid: data.uid,
              displayName: friendProfile?.displayName || "Wanderer",
              avatarUrl: friendProfile?.photoURL || "",
              avatarEmoji: friendProfile?.avatarEmoji || "🦊",
              latitude: data.latitude,
              longitude: data.longitude,
              batteryLevel: data.batteryLevel !== undefined ? data.batteryLevel : 100,
              isCharging: !!data.isCharging,
              ghostMode: data.ghostMode || "precise",
              activity: data.activity || "online",
              distanceText:
                distance < 1
                  ? `${Math.round(distance * 1000)} m`
                  : `${distance.toFixed(1)} km`,
              statusText: data.updatedAt
                ? `Aktif ${formatTimeAgo(data.updatedAt)}`
                : "Aktif",
              updatedAt: data.updatedAt || new Date().toISOString(),
            });
          }
        });

        // Always merge mock friends so the map has content for testing
        const mockFriends = MockService.getFriends(currentLat, currentLng).filter(
          (m) => !realFriends.some((r) => r.uid === m.uid)
        );

        set({ friends: [...realFriends, ...mockFriends] });
      };

      const setupQueryListener = (friendUids: string[]) => {
        if (currentUnsubscribe) {
          currentUnsubscribe();
          currentUnsubscribe = null;
        }

        if (friendUids.length === 0) {
          // If no friends, render only mock friends
          const currentLat = get().location?.latitude;
          const currentLng = get().location?.longitude;
          set({ friends: MockService.getFriends(currentLat, currentLng) });
          return;
        }

        // Limit to 30 friends per query to avoid Firestore IN limits
        const chunkedUids = friendUids.slice(0, 30);
        const locationsCollection = collection(db, "locations");
        const q = query(locationsCollection, where("uid", "in", chunkedUids));

        currentUnsubscribe = onSnapshot(q, handleSnapshot, (err) => {
          console.error("Firestore listenToFriends error:", err);
        });
      };

      // Subscribe reactively to accepted friends list updates in useFriendStore
      const unsubscribeFriendStore = useFriendStore.subscribe((state) => {
        const uids = state.friends.map((f) => f.uid).sort();
        const uidsString = uids.join(",");
        if (uidsString !== prevUidsString) {
          prevUidsString = uidsString;
          setupQueryListener(uids);
        }
      });

      // Trigger initial setup with current friends in store
      const initialUids = useFriendStore.getState().friends.map((f) => f.uid).sort();
      prevUidsString = initialUids.join(",");
      setupQueryListener(initialUids);

      return () => {
        unsubscribeFriendStore();
        if (currentUnsubscribe) {
          currentUnsubscribe();
        }
      };
    },
  };
});
