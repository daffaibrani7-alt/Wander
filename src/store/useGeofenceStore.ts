import { create } from "zustand";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Configure Expo Notifications handler for foreground system alerts
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    } as any),
  });
} catch (e) {
  console.warn("Info: Expo Notifications tidak disupport di platform ini.");
}

export interface GeofenceRegion {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  type: "home" | "work" | "school" | "custom";
  isInside: boolean;
}

interface GeofenceState {
  regions: GeofenceRegion[];
  radiusConfig: { [key: string]: number }; // key: geofence type/id, value: radius in meters
  
  // Actions
  initializeNotifications: () => Promise<void>;
  updateRegionRadius: (type: "home" | "work" | "school", radius: number) => void;
  evaluateSelfGeofences: (latitude: number, longitude: number) => void;
  triggerLocalNotification: (title: string, body: string) => Promise<void>;
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

export const useGeofenceStore = create<GeofenceState>((set, get) => {
  // Initialize default saved places for current user
  const initialRegions: GeofenceRegion[] = [
    {
      id: "self-home",
      name: "Rumah Saya",
      latitude: -6.2088,
      longitude: 106.8456,
      radius: 200,
      type: "home",
      isInside: false,
    },
    {
      id: "self-work",
      name: "Kantor Saya",
      latitude: -6.2045,
      longitude: 106.8490,
      radius: 250,
      type: "work",
      isInside: false,
    },
    {
      id: "self-school",
      name: "Sekolah Saya",
      latitude: -6.2110,
      longitude: 106.8520,
      radius: 200,
      type: "school",
      isInside: false,
    },
  ];

  return {
    regions: initialRegions,
    radiusConfig: {
      home: 200,
      work: 250,
      school: 200,
    },

    initializeNotifications: async () => {
      if (Platform.OS === "web") return;
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") {
          console.warn("Izin notifikasi tidak diberikan.");
          return;
        }

        // Setup Android channel configuration
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("wander-geofences", {
            name: "Wander Geofences",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#00F0FF",
          });
        }
      } catch (err) {
        console.warn("Gagal inisialisasi permission notifikasi:", err);
      }
    },

    updateRegionRadius: (type, radius) => {
      Haptics.selectionAsync().catch(() => {});
      
      const { radiusConfig, regions } = get();
      const updatedConfig = { ...radiusConfig, [type]: radius };
      
      const updatedRegions = regions.map((r) => {
        if (r.type === type) {
          return { ...r, radius };
        }
        return r;
      });

      set({ radiusConfig: updatedConfig, regions: updatedRegions });
      console.log(`📏 Geofence Radius updated: ${type} -> ${radius}m`);
    },

    evaluateSelfGeofences: (latitude, longitude) => {
      const { regions } = get();
      let stateChanged = false;

      const updatedRegions = regions.map((region) => {
        // Calculate distance in meters
        const distMeters = calculateDistance(latitude, longitude, region.latitude, region.longitude) * 1000;
        const insideNow = distMeters <= region.radius;

        // Transition detection
        if (insideNow && !region.isInside) {
          // ENTER geofence (Arrival)
          stateChanged = true;
          const emoji = region.type === "home" ? "🏡" : region.type === "work" ? "💼" : "🏫";
          const placeName = region.type === "home" ? "Rumah" : region.type === "work" ? "Tempat Kerja" : "Sekolah";
          
          get().triggerLocalNotification(
            "Wander Kedatangan",
            `Kamu telah sampai di ${placeName} Anda! ${emoji}`
          );
          
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          return { ...region, isInside: true };
        } 
        
        if (!insideNow && region.isInside) {
          // EXIT geofence (Departure)
          stateChanged = true;
          const emoji = region.type === "home" ? "🏡" : region.type === "work" ? "💼" : "🏫";
          const placeName = region.type === "home" ? "Rumah" : region.type === "work" ? "Tempat Kerja" : "Sekolah";
          
          get().triggerLocalNotification(
            "Wander Keberangkatan",
            `Kamu telah meninggalkan ${placeName} Anda! ${emoji}`
          );

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          return { ...region, isInside: false };
        }

        return region;
      });

      if (stateChanged) {
        set({ regions: updatedRegions });
      }
    },

    triggerLocalNotification: async (title, body) => {
      if (Platform.OS === "web") {
        console.log(`🔔 WEB NOTIFICATION: [${title}] ${body}`);
        return;
      }
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            data: { type: "geofence-alert" },
          },
          trigger: null, // trigger immediately
        });
      } catch (err) {
        console.error("Gagal mengirim notifikasi:", err);
      }
    },
  };
});
