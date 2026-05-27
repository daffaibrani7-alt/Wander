/**
 * useFriendLocationStore.ts
 *
 * Decentralized Zustand store for active friends' geolocations.
 * Employs subscriptionManager for IN query chunking, geofence evaluations, and micro-haptic alerts.
 */
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { MockService, FriendLocation } from "@/features/friends/services/mockService";
import { useFriendStore } from "@/features/friends/store/useFriendStore";
import { useGeofenceStore } from "@/features/map/store/useGeofenceStore";
import { useTrackingStore } from "@/features/map/store/useTrackingStore";
import { subscriptionManager } from "@/shared/realtime/subscriptionManager";
import { auth, isFirebaseConfigured } from "@/shared/config/firebase";

interface FriendLocationState {
  friends: FriendLocation[];
  isLoading: boolean;

  // Actions
  listenToFriends: () => () => void;
}

const prevFriendGeofenceStates = new Map<string, "home" | "work" | "school" | null>();

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

export const useFriendLocationStore = create<FriendLocationState>((set, get) => {
  return {
    friends: [],
    isLoading: false,

    listenToFriends: () => {
      const currentUser = auth?.currentUser;
      const trackingStore = useTrackingStore.getState();

      // Load cached friends initially
      if (currentUser) {
        AsyncStorage.getItem(`wander_cached_friends_${currentUser.uid}`)
          .then((cached) => {
            if (cached && get().friends.length === 0) {
              set({ friends: JSON.parse(cached) });
            }
          })
          .catch(() => {});
      }

      if (!isFirebaseConfigured) {
        // Fallback simulation
        const currentLat = trackingStore.location?.latitude;
        const currentLng = trackingStore.location?.longitude;
        set({ friends: MockService.getFriends(currentLat, currentLng) });

        const interval = setInterval(() => {
          const lat = useTrackingStore.getState().location?.latitude;
          const lng = useTrackingStore.getState().location?.longitude;
          set({ friends: MockService.getFriends(lat, lng) });
        }, 4000);

        return () => clearInterval(interval);
      }

      set({ isLoading: true });
      let currentUnsubscribe: (() => void) | null = null;
      let prevUidsString = "";

      const handleChunkUpdates = (chunkLocations: any[]) => {
        const myLat = useTrackingStore.getState().location?.latitude;
        const myLng = useTrackingStore.getState().location?.longitude;
        const geofenceStore = useGeofenceStore.getState();

        const activeFriendsList = useFriendStore.getState().friends;
        const mappedFriends: FriendLocation[] = [];

        chunkLocations.forEach((data) => {
          if (data.uid === currentUser?.uid) return;

          const distance = myLat && myLng ? calculateDistance(myLat, myLng, data.latitude, data.longitude) : 0;
          const friendProfile = activeFriendsList.find((f) => f.uid === data.uid);

          const currentGeofence = data.geofence || null;
          const previousGeofence = prevFriendGeofenceStates.get(data.uid);

          if (previousGeofence !== undefined && currentGeofence !== previousGeofence) {
            prevFriendGeofenceStates.set(data.uid, currentGeofence);
            const displayName = friendProfile?.displayName || "Wanderer";

            if (currentGeofence) {
              const emoji = currentGeofence === "home" ? "🏡" : currentGeofence === "work" ? "💼" : "🏫";
              const place = currentGeofence === "home" ? "Rumah" : currentGeofence === "work" ? "Kantor" : "Sekolah";

              geofenceStore.triggerLocalNotification("Wander Teman Sampai", `${displayName} telah sampai di ${place}! ${emoji}`).catch(() => {});
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            } else if (previousGeofence) {
              const emoji = previousGeofence === "home" ? "🏡" : previousGeofence === "work" ? "💼" : "🏫";
              const place = previousGeofence === "home" ? "Rumah" : previousGeofence === "work" ? "Kantor" : "Sekolah";

              geofenceStore.triggerLocalNotification("Wander Teman Pergi", `${displayName} telah meninggalkan ${place}! ${emoji}`).catch(() => {});
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            }
          } else if (previousGeofence === undefined) {
            prevFriendGeofenceStates.set(data.uid, currentGeofence);
          }

          mappedFriends.push({
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
            geofence: currentGeofence,
            distanceText: distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`,
            statusText: data.updatedAt ? `Aktif ${formatTimeAgo(data.updatedAt)}` : "Aktif",
            updatedAt: data.updatedAt || new Date().toISOString(),
          });
        });

        // Merge with MockService friends to ensure Map is populated
        const mockFriends = MockService.getFriends(myLat, myLng).filter(
          (m) => !mappedFriends.some((r) => r.uid === m.uid)
        );

        const mergedFriends = [...mappedFriends, ...mockFriends];
        set({ friends: mergedFriends, isLoading: false });

        if (currentUser) {
          AsyncStorage.setItem(`wander_cached_friends_${currentUser.uid}`, JSON.stringify(mergedFriends)).catch(() => {});
        }
      };

      const setupChunkListeners = (friendUids: string[]) => {
        if (currentUnsubscribe) {
          currentUnsubscribe();
          currentUnsubscribe = null;
        }

        if (friendUids.length === 0) {
          const myLat = useTrackingStore.getState().location?.latitude;
          const myLng = useTrackingStore.getState().location?.longitude;
          set({ friends: MockService.getFriends(myLat, myLng), isLoading: false });
          return;
        }

        // Subscribe to chunked queries using subscriptionManager
        currentUnsubscribe = subscriptionManager.subscribeToUids(
          friendUids,
          "locations",
          "uid",
          handleChunkUpdates
        );
      };

      // Subscribe reactively to accepted friends updates
      const unsubscribeFriendStore = useFriendStore.subscribe((state) => {
        const uids = state.friends.map((f) => f.uid).sort();
        const uidsString = uids.join(",");
        if (uidsString !== prevUidsString) {
          prevUidsString = uidsString;
          setupChunkListeners(uids);
        }
      });

      const initialUids = useFriendStore.getState().friends.map((f) => f.uid).sort();
      prevUidsString = initialUids.join(",");
      setupChunkListeners(initialUids);

      return () => {
        unsubscribeFriendStore();
        if (currentUnsubscribe) {
          currentUnsubscribe();
        }
      };
    },
  };
});
