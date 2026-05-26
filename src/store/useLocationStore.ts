import { create } from "zustand";
import * as Location from "expo-location";
import * as Battery from "expo-battery";
import { doc, collection, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "../config/firebase";
import { getTrackingOptions, LOCATION_TASK_NAME } from "../services/locationService";
import { MockService, FriendLocation } from "../services/mockService";

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
  syncLocationToFirestore: (coords: Location.LocationObjectCoords) => Promise<void>;
  listenToFriends: () => () => void;
  adjustTrackingParameters: () => Promise<void>;
}

// Helper: Hitung jarak dalam km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius bumi dalam km
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

// Helper: Format waktu lampau
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

export const useLocationStore = create<LocationState>((set, get) => {
  let fgSubscription: Location.LocationSubscription | null = null;
  let batLevelSub: any = null;
  let batStateSub: any = null;
  let powerModeSub: any = null;

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
        // 1. Dapatkan info awal baterai
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
          // Baterai tidak disupport (misal web/simulator)
        }

        set({ batteryLevel, isCharging, lowPowerMode, trackingActive: true });

        // 2. Minta Foreground Permission
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus !== "granted") {
          set({ errorMsg: "Izin akses lokasi ditolak." });
          // Fallback koordinat Jakarta untuk simulator
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

        // Dapatkan lokasi awal dengan cepat
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        set({ location: initial.coords });
        await get().syncLocationToFirestore(initial.coords);

        // Langganan updates posisi di Foreground (setiap 5s / 5m default)
        fgSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 5,
          },
          async (newLocation) => {
            set({ location: newLocation.coords });
            await get().syncLocationToFirestore(newLocation.coords);
          }
        );

        // 3. Minta Background Permission & jalankan task (jika didukung)
        try {
          const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
          if (bgStatus === "granted") {
            const options = getTrackingOptions(
              get().batteryLevel,
              get().isCharging,
              get().lowPowerMode
            );
            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, options);
            console.log("🏃 Background location tracking berhasil diaktifkan!");
          }
        } catch (bgErr) {
          console.log("Info: Background location tidak disupport pada platform ini (misal web/Expo Go).");
        }

        // 4. Daftarkan event listener baterai untuk optimasi dinamis
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
          // Event baterai tidak disupport
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
        const isBgActive = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (isBgActive) {
          const options = getTrackingOptions(batteryLevel, isCharging, lowPowerMode);
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, options);
          console.log(
            `🔋 Live Location: Throttling pelacakan diperbarui untuk baterai ${batteryLevel}% (Cas: ${isCharging})`
          );
        }
      } catch {
        // Platform tidak mendukung background tracking
      }
    },

    setGhostMode: (mode) => {
      const { location } = get();
      set({ ghostMode: mode });

      if (mode === "frozen" && location) {
        set({ frozenLocation: location });
      } else if (mode === "blurry" && location) {
        // Bikin koordinat buram awal (+- 800m ke 1.5km)
        const randomOffsetLat = (Math.random() > 0.5 ? 1 : -1) * (0.007 + Math.random() * 0.007);
        const randomOffsetLng = (Math.random() > 0.5 ? 1 : -1) * (0.007 + Math.random() * 0.007);
        set({
          blurryLocation: {
            ...location,
            latitude: location.latitude + randomOffsetLat,
            longitude: location.longitude + randomOffsetLng,
          },
        });
      }

      // Sync koordinat baru ke database langsung setelah ganti ghost mode
      if (location) {
        get().syncLocationToFirestore(location);
      }
    },

    syncLocationToFirestore: async (coords) => {
      const { ghostMode, frozenLocation, blurryLocation, batteryLevel, isCharging } = get();
      const currentUser = auth?.currentUser;

      if (!currentUser || !isFirebaseConfigured || !db) return;

      // Pilih koordinat final berdasarkan Ghost Mode
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
          const randomOffsetLat = (Math.random() > 0.5 ? 1 : -1) * (0.007 + Math.random() * 0.007);
          const randomOffsetLng = (Math.random() > 0.5 ? 1 : -1) * (0.007 + Math.random() * 0.007);
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
        const userDocRef = doc(db, "users", currentUser.uid);
        await setDoc(
          userDocRef,
          {
            latitude: finalCoords.latitude,
            longitude: finalCoords.longitude,
            heading: coords.heading ?? null,
            speed: coords.speed ?? null,
            batteryLevel,
            isCharging,
            ghostMode,
            lastSeen: serverTimestamp(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error("Error sinkronisasi lokasi ke Firestore:", err);
      }
    },

    listenToFriends: () => {
      const handleSnapshot = (snapshot: any) => {
        const currentUser = auth?.currentUser;
        const myLat = get().location?.latitude;
        const myLng = get().location?.longitude;

        const realFriends: FriendLocation[] = [];
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data();

          // Saring diri sendiri dan pastikan punya koordinat valid
          if (data.uid !== currentUser?.uid && data.latitude && data.longitude) {
            const distance =
              myLat && myLng
                ? calculateDistance(myLat, myLng, data.latitude, data.longitude)
                : 0;

            realFriends.push({
              uid: data.uid,
              displayName: data.displayName || "Wanderer",
              avatarUrl: data.photoURL || "",
              avatarEmoji: data.avatarEmoji || "🦊",
              latitude: data.latitude,
              longitude: data.longitude,
              batteryLevel: data.batteryLevel !== undefined ? data.batteryLevel : 100,
              isCharging: !!data.isCharging,
              ghostMode: data.ghostMode || "precise",
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

        // Tetap ambil simulated friends agar map ramai terisi
        const mockFriends = MockService.getFriends(myLat, myLng).filter(
          (m) => !realFriends.some((r) => r.uid === m.uid)
        );

        set({ friends: [...realFriends, ...mockFriends] });
      };

      if (!isFirebaseConfigured || !db) {
        // Offline / Simulation mode
        const myLat = get().location?.latitude;
        const myLng = get().location?.longitude;
        set({ friends: MockService.getFriends(myLat, myLng) });

        const interval = setInterval(() => {
          const lat = get().location?.latitude;
          const lng = get().location?.longitude;
          set({ friends: MockService.getFriends(lat, lng) });
        }, 4000);

        return () => clearInterval(interval);
      }

      // Realtime Firebase mode
      const usersCollection = collection(db, "users");
      const unsubscribe = onSnapshot(usersCollection, handleSnapshot);
      return unsubscribe;
    },
  };
});
