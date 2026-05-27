/**
 * useNotificationStore.ts
 *
 * Intelligent emotional spatial notifications store.
 * Manages contextual alerts (e.g. nearby friends, streak notices, memory alerts)
 * and schedules haptic alerts with smart rate-limiting to prevent notification fatigue.
 */
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";
import { useGeofenceStore } from "@/features/map/store/useGeofenceStore";

export interface WanderNotification {
  id: string;
  type: "nearby_friend" | "streak" | "memory_alert" | "discovery";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

interface NotificationStoreState {
  notifications: WanderNotification[];
  isLoaded: boolean;

  // Actions
  initializeNotifications: (userId: string) => Promise<void>;
  addNotification: (notification: Omit<WanderNotification, "id" | "timestamp" | "isRead">) => void;
  markAsRead: (id: string) => void;
  clearAll: (userId: string) => Promise<void>;
  
  // Realtime Contextual Check Engine
  checkNearbyFriendAlert: (friendUid: string, name: string, distanceMeters: number) => void;
  checkStreakMilestone: (streakCount: number) => void;
}

// Memory rate limit throttle registries
const lastFriendAlertTime = new Map<string, number>();
let lastStreakCheckedCount = 0;

export const useNotificationStore = create<NotificationStoreState>((set, get) => {
  const saveState = async (userId: string, list: WanderNotification[]) => {
    await AsyncStorage.setItem(`wander_notifications_${userId}`, JSON.stringify(list));
  };

  return {
    notifications: [],
    isLoaded: false,

    initializeNotifications: async (userId) => {
      const cached = await AsyncStorage.getItem(`wander_notifications_${userId}`);
      if (cached) {
        set({ notifications: JSON.parse(cached), isLoaded: true });
      } else {
        set({
          notifications: [
            {
              id: "notif-welcome",
              type: "discovery",
              title: "Selamat Datang Wanderer! 🦊",
              message: "Mulailah melangkah ke luar dan radar Anda akan secara otomatis membuka grid peta!",
              timestamp: new Date().toISOString(),
              isRead: false,
            },
          ],
          isLoaded: true,
        });
      }
    },

    addNotification: (item) => {
      const newNotif: WanderNotification = {
        ...item,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        isRead: false,
      };

      const updated = [newNotif, ...get().notifications];
      set({ notifications: updated });

      // Trigger success haptics and overlay notifications in home dashboard
      WANDER_HAPTICS.success();

      // Trigger local geofence overlay trigger if available
      try {
        useGeofenceStore.getState().triggerLocalNotification(newNotif.title, newNotif.message).catch(() => {});
      } catch {
        // Fallback
      }

      const currentUser = "default-me"; // standard user fallback
      saveState(currentUser, updated);
    },

    markAsRead: (id) => {
      const updated = get().notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      set({ notifications: updated });
      saveState("default-me", updated);
    },

    clearAll: async (userId) => {
      await AsyncStorage.removeItem(`wander_notifications_${userId}`);
      set({ notifications: [] });
    },

    checkNearbyFriendAlert: (friendUid, name, distanceMeters) => {
      if (distanceMeters > 300) return; // Only close distance (<300m)

      const now = Date.now();
      const lastTime = lastFriendAlertTime.get(friendUid) || 0;
      const oneHourMs = 3600000;

      // Smart Throttle: Only alert once per hour per friend to avoid annoying the user
      if (now - lastTime < oneHourMs) return;

      lastFriendAlertTime.set(friendUid, now);

      get().addNotification({
        type: "nearby_friend",
        title: "Teman Terdekat Terdeteksi! 📍",
        message: `${name} berjarak sekitar ${Math.round(distanceMeters)}m dari Anda. Ketuk untuk menyapa!`,
      });
    },

    checkStreakMilestone: (streakCount) => {
      if (streakCount <= 0 || streakCount === lastStreakCheckedCount) return;
      
      // Trigger milestone alerts for streaks like 3, 5, 7, 10 days
      const isMilestone = [3, 5, 7, 10, 15, 30].includes(streakCount);
      if (!isMilestone) return;

      lastStreakCheckedCount = streakCount;

      get().addNotification({
        type: "streak",
        title: "Streak Menakjubkan! 🔥",
        message: `Luar biasa! Anda telah mempertahankan streak eksplorasi harian selama ${streakCount} hari. Pertahankan apinya!`,
      });
    },
  };
});
