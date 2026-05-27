import { useEffect, useRef, useState } from "react";
import { useLocationStore } from "@/features/map/store/useLocationStore";
import { usePresenceStore } from "@/features/presence/store/usePresenceStore";
import { useGeofenceStore } from "@/features/map/store/useGeofenceStore";

/**
 * Custom hook untuk mengautomasi deteksi aktivitas pengguna berbasis pergerakan GPS,
 * waktu lokal, status baterai/pengisian daya, dan saved places geofences.
 */
export function useActivityDetection() {
  const { location, batteryLevel, isCharging } = useLocationStore();
  const { selfActivity, setSelfActivityAction } = usePresenceStore();
  const { regions } = useGeofenceStore();
  
  const [currentActivity, setCurrentActivity] = useState<typeof selfActivity>("online");
  const lastCoordinatesRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const stationaryTimerRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!location) return;

    const { latitude, longitude, speed } = location;
    const now = new Date();
    const hour = now.getHours();
    
    let detectedActivity: typeof selfActivity = "online";
    
    // 1. Tentukan status Traveling (✈️) atau Driving (🚗) atau Walking (🚶)
    if (speed !== null) {
      if (speed > 25.0) {
        // Kecepatan di atas 90 km/jam -> Traveling
        detectedActivity = "traveling";
      } else if (speed > 4.17) {
        // Kecepatan antara 15 km/jam - 90 km/jam -> Driving
        detectedActivity = "driving";
      } else if (speed > 0.5) {
        // Kecepatan jalan santai 1.8 km/jam - 15 km/jam -> Walking
        detectedActivity = "walking";
      }
    }

    // 2. Evaluasi Geofencing Saved Places jika tidak sedang bergerak cepat
    if (detectedActivity === "online") {
      // Cari apakah ada wilayah Saved Place terdaftar yang radiusnya memenuhi posisi saat ini
      const activeGeofence = regions.find((region) => {
        const dist = calculateDistance(latitude, longitude, region.latitude, region.longitude) * 1000; // in meters
        return dist <= region.radius;
      });

      if (activeGeofence) {
        if (activeGeofence.type === "home") {
          detectedActivity = "home";
        } else if (activeGeofence.type === "work") {
          detectedActivity = "work";
        } else if (activeGeofence.type === "school") {
          detectedActivity = "school";
        } else if (activeGeofence.type === "cafe") {
          detectedActivity = "cafe";
        }
      }
    }

    // 3. Evaluasi Sleeping Mode (😴)
    // Berada di rentang jam 23:00 - 06:00, sedang dicas, dan posisi diam
    const isNightTime = hour >= 23 || hour < 6;
    if (detectedActivity === "online" && isNightTime && isCharging) {
      detectedActivity = "sleeping";
    }

    // 4. Evaluasi Idle (⏳) jika diam lama di satu titik
    const currentCoords = { latitude, longitude };
    const prevCoords = lastCoordinatesRef.current;

    if (prevCoords) {
      const movedDist = calculateDistance(prevCoords.latitude, prevCoords.longitude, latitude, longitude) * 1000;
      if (movedDist < 10 && (speed === null || speed <= 0.1)) {
        // Jika diam atau geser kurang dari 10m dalam 5 menit -> Idle
        const minutesStationary = (Date.now() - stationaryTimerRef.current) / 60000;
        if (minutesStationary >= 5 && detectedActivity === "online") {
          detectedActivity = "idle";
        }
      } else {
        // Reset timer diam jika ada pergerakan signifikan
        stationaryTimerRef.current = Date.now();
        lastCoordinatesRef.current = currentCoords;
      }
    } else {
      lastCoordinatesRef.current = currentCoords;
      stationaryTimerRef.current = Date.now();
    }

    // Update state jika ada perubahan aktivitas terdeteksi
    if (detectedActivity !== currentActivity) {
      setCurrentActivity(detectedActivity);
      setSelfActivityAction(detectedActivity).catch(() => {});
      console.log(`🤖 [Activity Detector]: Activity changed to ${detectedActivity}`);
    }
  }, [location, isCharging, batteryLevel, regions, currentActivity]);

  return currentActivity;
}

// Helper: Calculate distance in km
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
