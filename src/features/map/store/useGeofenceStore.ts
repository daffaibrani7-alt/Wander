import { create } from "zustand";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { geofenceService, SavedPlace } from "@/features/map/services/geofenceService";
import { auth } from "@/shared/config/firebase";

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
  id: string; // matches placeId
  name: string; // matches label
  latitude: number;
  longitude: number;
  radius: number; // in meters
  type: "home" | "work" | "school" | "cafe" | "custom";
  isInside: boolean;
  emoji?: string;
}

export interface ActivityNotification {
  id: string;
  title: string;
  body: string;
  emoji: string;
  timestamp: string; // ISO string
  read: boolean;
}

interface GeofenceState {
  regions: GeofenceRegion[];
  notificationsFeed: ActivityNotification[];
  nearbyFriendThresholdMeters: number;
  isNotificationsEnabled: boolean;
  isProximityEnabled: boolean;
  isActivityEnabled: boolean;
  
  // Actions
  initializeNotifications: () => Promise<void>;
  initializeGeofenceSync: (uid: string) => () => void;
  evaluateSelfGeofences: (latitude: number, longitude: number) => Promise<void>;
  evaluateFriendProximity: (myLat: number, myLng: number, friends: any[]) => void;
  evaluateFriendActivityChange: (friendUid: string, displayName: string, activity: string) => void;
  triggerLocalNotification: (title: string, body: string, emoji?: string) => Promise<void>;
  setNotificationListener: (listener: (title: string, body: string, emoji: string) => void) => void;
  removeNotificationListener: () => void;
  addSavedPlaceAction: (uid: string, place: Omit<SavedPlace, "uid" | "createdAt">) => Promise<void>;
  deleteSavedPlaceAction: (uid: string, placeId: string) => Promise<void>;
  clearNotificationsFeed: () => Promise<void>;
  markNotificationsAsRead: () => void;
  toggleSetting: (key: "notifications" | "proximity" | "activity") => void;
  addFeedItem: (title: string, body: string, emoji: string) => void;
}

// Internal throttling system to avoid spamming alerts (e.g. 10 mins cooldown)
const throttleMap = new Map<string, any>();

function isThrottled(key: string, cooldownMs: number = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const lastTime = throttleMap.get(key) || 0;
  if (now - lastTime < cooldownMs) {
    return true;
  }
  throttleMap.set(key, now);
  return false;
}

// Foreground UI Alert Event Listener
let uiNotificationListener: ((title: string, body: string, emoji: string) => void) | null = null;

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

export const useGeofenceStore = create<GeofenceState>((set, get) => {
  return {
    regions: [],
    notificationsFeed: [],
    nearbyFriendThresholdMeters: 500, // meters
    isNotificationsEnabled: true,
    isProximityEnabled: true,
    isActivityEnabled: true,

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

    initializeGeofenceSync: (uid) => {
      // 1. First attempt to load cached places immediately
      AsyncStorage.getItem(`wander_places_${uid}`)
        .then((cached) => {
          if (cached) {
            try {
              const places = JSON.parse(cached) as SavedPlace[];
              const currentRegions = get().regions;
              const syncedRegions = places.map((p) => {
                const existing = currentRegions.find((r) => r.id === p.placeId);
                return {
                  id: p.placeId,
                  name: p.label,
                  latitude: p.latitude,
                  longitude: p.longitude,
                  radius: p.radius,
                  type: p.type,
                  emoji: p.emoji,
                  isInside: existing ? existing.isInside : false,
                };
              });
              set({ regions: syncedRegions });
            } catch (e) {
              console.error("Gagal parse cached places:", e);
            }
          }
        })
        .catch(() => {});

      // 2. Load cached notifications feed
      AsyncStorage.getItem(`wander_feed_${uid}`)
        .then((cached) => {
          if (cached) {
            try {
              set({ notificationsFeed: JSON.parse(cached) });
            } catch {}
          }
        })
        .catch(() => {});

      // 3. Realtime listening via firestore service
      const unsubscribe = geofenceService.listenToPlaces(uid, (places) => {
        // Cache places for offline/background access
        AsyncStorage.setItem(`wander_places_${uid}`, JSON.stringify(places)).catch(() => {});

        const currentRegions = get().regions;
        const syncedRegions = places.map((p) => {
          const existing = currentRegions.find((r) => r.id === p.placeId);
          return {
            id: p.placeId,
            name: p.label,
            latitude: p.latitude,
            longitude: p.longitude,
            radius: p.radius,
            type: p.type,
            emoji: p.emoji,
            isInside: existing ? existing.isInside : false,
          };
        });

        set({ regions: syncedRegions });
        console.log(`🔄 Geofence regions synchronized: ${syncedRegions.length} places.`);
      });

      return unsubscribe;
    },

    evaluateSelfGeofences: async (latitude, longitude) => {
      if (!get().isNotificationsEnabled) return;

      const { regions } = get();
      let stateChanged = false;

      const updatedRegions = regions.map((region) => {
        // Calculate distance in meters
        const distMeters = calculateDistance(latitude, longitude, region.latitude, region.longitude) * 1000;
        const insideNow = distMeters <= region.radius;

        // Transition: ENTER (Arrival)
        if (insideNow && !region.isInside) {
          stateChanged = true;
          const emoji = region.emoji || (region.type === "home" ? "🏡" : region.type === "work" ? "💼" : "🏫");
          const throttleKey = `self_enter_${region.id}`;

          if (!isThrottled(throttleKey)) {
            const title = "Wander Kedatangan";
            const body = `Kamu telah sampai di ${region.name}! ${emoji}`;
            
            get().triggerLocalNotification(title, body, emoji);
            get().addFeedItem(title, body, emoji);
          }
          
          return { ...region, isInside: true };
        } 
        
        // Transition: EXIT (Departure)
        if (!insideNow && region.isInside) {
          stateChanged = true;
          const emoji = region.emoji || (region.type === "home" ? "🏡" : region.type === "work" ? "💼" : "🏫");
          const throttleKey = `self_exit_${region.id}`;

          if (!isThrottled(throttleKey)) {
            const title = "Wander Keberangkatan";
            const body = `Kamu telah meninggalkan ${region.name}! ${emoji}`;
            
            get().triggerLocalNotification(title, body, emoji);
            get().addFeedItem(title, body, emoji);
          }

          return { ...region, isInside: false };
        }

        return region;
      });

      if (stateChanged) {
        set({ regions: updatedRegions });
      }
    },

    evaluateFriendProximity: (myLat, myLng, friends) => {
      if (!get().isProximityEnabled) return;

      const threshold = get().nearbyFriendThresholdMeters;
      
      friends.forEach((friend) => {
        if (!friend.latitude || !friend.longitude) return;

        const distMeters = calculateDistance(myLat, myLng, friend.latitude, friend.longitude) * 1000;
        const isNearbyNow = distMeters <= threshold;

        const throttleKey = `friend_prox_${friend.uid}`;
        const previousNearby = throttleMap.has(`${throttleKey}_state`)
          ? throttleMap.get(`${throttleKey}_state`) === 1
          : false;

        if (isNearbyNow && !previousNearby) {
          // Transition into nearby zone
          throttleMap.set(`${throttleKey}_state`, 1);

          // Throttled notification delivery (cooldown: 15 minutes per friend)
          const notifyThrottleKey = `friend_prox_notify_${friend.uid}`;
          if (!isThrottled(notifyThrottleKey, 15 * 60 * 1000)) {
            const displayName = friend.displayName || "Teman";
            const emoji = friend.avatarEmoji || "🦊";
            const distanceText = distMeters < 1000
              ? `${Math.round(distMeters)} m`
              : `${(distMeters / 1000).toFixed(1)} km`;
            
            const title = "Teman Dekat!";
            const body = `${displayName} berada dekat denganmu (${distanceText})! 🤝`;
            
            get().triggerLocalNotification(title, body, "🤝");
            get().addFeedItem(title, body, emoji);
          }
        } else if (!isNearbyNow && previousNearby) {
          // Transition out of nearby zone
          throttleMap.set(`${throttleKey}_state`, 0);
        }
      });
    },

    evaluateFriendActivityChange: (friendUid, displayName, newActivity) => {
      if (!get().isActivityEnabled) return;

      const activityKey = `friend_act_${friendUid}`;
      const previousActivity = throttleMap.get(activityKey) as string | undefined;

      // Register without notification on initial load
      if (previousActivity === undefined) {
        throttleMap.set(activityKey, newActivity);
        return;
      }

      if (newActivity !== previousActivity && newActivity !== "online") {
        throttleMap.set(activityKey, newActivity);

        // Throttle activity changes (cooldown: 15 minutes per friend per activity)
        const notifyThrottleKey = `friend_act_notify_${friendUid}_${newActivity}`;
        if (!isThrottled(notifyThrottleKey, 15 * 60 * 1000)) {
          let activityText = "";
          let emoji = "⚡";

          switch (newActivity) {
            case "driving":
              activityText = "mulai berkendara";
              emoji = "🚗";
              break;
            case "sleeping":
              activityText = "sedang tidur";
              emoji = "😴";
              break;
            case "walking":
              activityText = "sedang berjalan kaki";
              emoji = "🚶";
              break;
            case "idle":
              activityText = "sedang santai (idle)";
              emoji = "⏳";
              break;
            default:
              return; // skip generic online transitions to avoid clutter
          }

          const title = "Aktivitas Teman";
          const body = `${displayName} ${activityText}! ${emoji}`;

          get().triggerLocalNotification(title, body, emoji);
          get().addFeedItem(title, body, emoji);
        }
      }
    },

    triggerLocalNotification: async (title, body, emoji = "🔔") => {
      // 1. Trigger foreground listener
      if (uiNotificationListener) {
        try {
          uiNotificationListener(title, body, emoji);
        } catch (e) {
          console.warn("Foreground UI listener failed:", e);
        }
      }

      // 2. Play selection or warning haptics
      if (title.includes("Keberangkatan") || title.includes("Pergi")) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      // 3. Trigger OS System Notification
      if (Platform.OS === "web") {
        console.log(`🔔 [Wander Web Notif]: [${title}] ${body}`);
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
        console.error("Gagal mengirim notifikasi OS:", err);
      }
    },

    setNotificationListener: (listener) => {
      uiNotificationListener = listener;
    },

    removeNotificationListener: () => {
      uiNotificationListener = null;
    },

    addSavedPlaceAction: async (uid, place) => {
      await geofenceService.savePlace(uid, place);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    },

    deleteSavedPlaceAction: async (uid, placeId) => {
      await geofenceService.deletePlace(uid, placeId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    },

    clearNotificationsFeed: async () => {
      set({ notificationsFeed: [] });
      const currentUser = auth?.currentUser;
      if (currentUser) {
        AsyncStorage.removeItem(`wander_feed_${currentUser.uid}`).catch(() => {});
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },

    markNotificationsAsRead: () => {
      const updatedFeed = get().notificationsFeed.map((n) => ({ ...n, read: true }));
      set({ notificationsFeed: updatedFeed });
      const currentUser = auth?.currentUser;
      if (currentUser) {
        AsyncStorage.setItem(`wander_feed_${currentUser.uid}`, JSON.stringify(updatedFeed)).catch(() => {});
      }
    },

    toggleSetting: (key) => {
      Haptics.selectionAsync().catch(() => {});
      if (key === "notifications") {
        set({ isNotificationsEnabled: !get().isNotificationsEnabled });
      } else if (key === "proximity") {
        set({ isProximityEnabled: !get().isProximityEnabled });
      } else if (key === "activity") {
        set({ isActivityEnabled: !get().isActivityEnabled });
      }
    },

    addFeedItem: (title, body, emoji) => {
      const nowStr = new Date().toISOString();
      const newItem: ActivityNotification = {
        id: Math.random().toString(36).substring(2, 9),
        title,
        body,
        emoji,
        timestamp: nowStr,
        read: false,
      };
      const updatedFeed = [newItem, ...get().notificationsFeed].slice(0, 50);
      set({ notificationsFeed: updatedFeed });

      const currentUser = auth?.currentUser;
      if (currentUser) {
        AsyncStorage.setItem(`wander_feed_${currentUser.uid}`, JSON.stringify(updatedFeed)).catch(() => {});
      }
    },
  };
});
