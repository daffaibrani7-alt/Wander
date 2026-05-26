import * as Location from "expo-location";
import * as Battery from "expo-battery";
import * as TaskManager from "expo-task-manager";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "../config/firebase";

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

            // Dapatkan level baterai saat ini jika memungkinkan secara async di background
            let batteryLevel = 100;
            let isCharging = false;
            try {
              const level = await Battery.getBatteryLevelAsync();
              const state = await Battery.getBatteryStateAsync();
              batteryLevel = Math.round(level * 100);
              isCharging =
                state === Battery.BatteryState.CHARGING ||
                state === Battery.BatteryState.FULL;
            } catch {
              // Abaikan jika tidak didukung di simulator/background OS
            }

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
