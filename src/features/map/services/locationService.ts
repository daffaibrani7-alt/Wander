import * as Location from "expo-location";
import * as Battery from "expo-battery";
import * as TaskManager from "expo-task-manager";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "@/shared/config/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { notificationService } from "@/features/notifications/services/notificationService";
import { SavedPlace } from "@/features/map/services/geofenceService";

export const LOCATION_TASK_NAME = "background-location-task";

export interface TrackingOptions {
  accuracy: Location.Accuracy;
  timeInterval: number;
  distanceInterval: number;
  pausesUpdatesAutomatically: boolean;
  showsBackgroundLocationIndicator: boolean;
  foregroundService?: {
    notificationTitle: string;
    notificationBody: string;
    notificationColor: string;
  };
}

/**
 * Mendapatkan konfigurasi optimasi baterai secara dinamis.
 */
export function getTrackingOptions(
  batteryLevel: number,
  isCharging: boolean,
  lowPowerMode: boolean = false
): TrackingOptions {
  // Jika sedang dicas atau baterai sangat tinggi, gunakan mode performa penuh (presisi)
  if (isCharging || (batteryLevel > 30 && !lowPowerMode)) {
    return {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000, // 5 detik
      distanceInterval: 5, // 5 meter
      pausesUpdatesAutomatically: true,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Wander Aktif",
        notificationBody: "Berbagi lokasi presisi secara real-time dengan teman.",
        notificationColor: "#00F0FF",
      },
    };
  }

  // Jika baterai lemah tapi belum sangat kritis, gunakan mode hemat daya (balanced)
  if (batteryLevel > 15 && !lowPowerMode) {
    return {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 15000, // 15 detik
      distanceInterval: 15, // 15 meter
      pausesUpdatesAutomatically: true,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Wander Aktif (Hemat Daya)",
        notificationBody: "Memantau lokasi dengan mode hemat energi.",
        notificationColor: "#FF8A00",
      },
    };
  }

  // Jika baterai sangat kritis (< 15%) atau Low Power Mode menyala, gunakan pembatasan ekstrim
  return {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 30000, // 30 detik
    distanceInterval: 30, // 30 meter
    pausesUpdatesAutomatically: true,
    showsBackgroundLocationIndicator: false, // Sembunyikan indikator biru menyala jika memungkinkan di iOS
    foregroundService: {
      notificationTitle: "Wander (Ultra Saver)",
      notificationBody: "Lokasi diperbarui secara berkala untuk memperpanjang daya baterai.",
      notificationColor: "#FF5B99",
    },
  };
}

// ─── BATTERY READ CACHE ───────────────────────────────────────────────────────
// Caches battery level/state to avoid expensive I/O on every GPS fix.
let _cachedBatteryLevel = 100;
let _cachedIsCharging = false;
let _lastBatteryReadAt = 0;
const BATTERY_CACHE_TTL_MS = 60_000; // refresh every 60 seconds

async function getCachedBattery(): Promise<{ batteryLevel: number; isCharging: boolean }> {
  const now = Date.now();
  if (now - _lastBatteryReadAt < BATTERY_CACHE_TTL_MS) {
    return { batteryLevel: _cachedBatteryLevel, isCharging: _cachedIsCharging };
  }
  try {
    const level = await Battery.getBatteryLevelAsync();
    const state = await Battery.getBatteryStateAsync();
    _cachedBatteryLevel = Math.round(level * 100);
    _cachedIsCharging =
      state === Battery.BatteryState.CHARGING ||
      state === Battery.BatteryState.FULL;
    _lastBatteryReadAt = now;
  } catch {
    // Ignore — use previous cached values
  }
  return { batteryLevel: _cachedBatteryLevel, isCharging: _cachedIsCharging };
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

// ─── DEFINISI BACKGROUND TASK ──────────────────────────────────────────────
// Harus didefinisikan di top-level scope dan diimpor pada entrypoint aplikasi
try {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error("Error pada background location task:", error);
      return;
    }

    if (data) {
      const { locations } = data as { locations: Location.LocationObject[] };
      if (locations && locations.length > 0) {
        const location = locations[0];
        const { latitude, longitude, heading, speed } = location.coords;

        const currentUser = auth?.currentUser;
        if (currentUser && isFirebaseConfigured && db) {
          try {
            const locationDocRef = doc(db, "locations", currentUser.uid);

            // Use cached battery values — only reads from hardware every 60s
            const { batteryLevel, isCharging } = await getCachedBattery();

            const nowStr = new Date().toISOString();
            const hour = new Date().getHours();
            
            // Zenly Smart Activity Analyzer for background updates
            let activity: "online" | "idle" | "driving" | "sleeping" = "online";
            if (speed !== null && speed > 4.17) {
              activity = "driving";
            } else if ((hour >= 23 || hour < 6) && isCharging) {
              activity = "sleeping";
            } else if (speed !== null && speed === 0) {
              activity = "idle";
            }

            // ─── EVALUASI GEOFENCE DI LATAR BELAKANG ─────────────────────────────
            let geofence: string | null = null;
            try {
              const cachedPlacesStr = await AsyncStorage.getItem(`wander_places_${currentUser.uid}`);
              if (cachedPlacesStr) {
                const cachedPlaces = JSON.parse(cachedPlacesStr) as SavedPlace[];
                const cachedStatesStr = await AsyncStorage.getItem(`wander_bg_geofence_states_${currentUser.uid}`);
                const cachedStates = cachedStatesStr ? JSON.parse(cachedStatesStr) as { [placeId: string]: boolean } : {};
                
                const updatedStates: { [placeId: string]: boolean } = { ...cachedStates };
                let stateChanged = false;

                for (const place of cachedPlaces) {
                  const dist = calculateDistance(latitude, longitude, place.latitude, place.longitude) * 1000;
                  const insideNow = dist <= place.radius;
                  const wasInside = !!cachedStates[place.placeId];

                  if (insideNow) {
                    geofence = place.type;
                  }

                  if (insideNow && !wasInside) {
                    // ENTER transition in background
                    updatedStates[place.placeId] = true;
                    stateChanged = true;
                    const emoji = place.emoji || (place.type === "home" ? "🏡" : place.type === "work" ? "💼" : "🏫");
                    notificationService.sendLocalNotification(
                      "Wander Kedatangan",
                      `Kamu telah sampai di ${place.label}! ${emoji}`,
                      { type: "geofence-alert" }
                    ).catch(() => {});
                  } else if (!insideNow && wasInside) {
                    // EXIT transition in background
                    updatedStates[place.placeId] = false;
                    stateChanged = true;
                    const emoji = place.emoji || (place.type === "home" ? "🏡" : place.type === "work" ? "💼" : "🏫");
                    notificationService.sendLocalNotification(
                      "Wander Keberangkatan",
                      `Kamu telah meninggalkan ${place.label}! ${emoji}`,
                      { type: "geofence-alert" }
                    ).catch(() => {});
                  }
                }

                if (stateChanged) {
                  await AsyncStorage.setItem(
                    `wander_bg_geofence_states_${currentUser.uid}`,
                    JSON.stringify(updatedStates)
                  );
                }
              }
            } catch (e) {
              console.error("Gagal mengevaluasi geofence latar belakang:", e);
            }

            await setDoc(locationDocRef, {
              uid: currentUser.uid,
              latitude,
              longitude,
              heading: heading ?? null,
              speed: speed ?? null,
              batteryLevel,
              isCharging,
              lastSeen: serverTimestamp(),
              updatedAt: nowStr,
              activity,
              geofence,
            }, { merge: true });
          } catch (err) {
            console.error(
              "Gagal sinkronisasi background location ke Firestore:",
              err
            );
          }
        }
      }
    }
  });
} catch (err) {
  console.warn("Gagal mendefinisikan background location task:", err);
}
