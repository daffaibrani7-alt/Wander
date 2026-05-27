import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../config/firebase";
import * as Haptics from "expo-haptics";
import {
  sendFriendRequest,
  acceptFriendRequest,
  deleteFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
} from "../services/friendService";

export interface PendingSyncItem {
  id: string; // Unique task identifier
  type: "LOCATION" | "PRESENCE" | "ACTIVITY" | "TILES" | "STATS" | "FRIEND_ACTION" | "GEOFENCE";
  userId: string;
  payload: any;
  createdAt: number;
}

interface SyncQueueState {
  queue: PendingSyncItem[];
  status: "idle" | "syncing" | "synced" | "error";
  isHydrated: boolean;
  retryCount: number;

  // Actions
  hydrateQueue: (userId: string) => Promise<void>;
  enqueueSyncItem: (type: PendingSyncItem["type"], userId: string, payload: any) => Promise<void>;
  flushQueue: () => Promise<void>;
  clearQueue: (userId: string) => Promise<void>;
}

const STORAGE_KEY_PREFIX = "wander_sync_queue_";
let retryTimer: any = null;

export const useSyncQueueStore = create<SyncQueueState>((set, get) => {
  // Helper to persist queue
  const persistQueue = async (userId: string, newQueue: PendingSyncItem[]) => {
    try {
      await AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(newQueue));
    } catch (err) {
      console.error("⚠️ Failed to persist background sync queue:", err);
    }
  };

  return {
    queue: [],
    status: "idle",
    isHydrated: false,
    retryCount: 0,

    hydrateQueue: async (userId) => {
      try {
        const cached = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
        if (cached) {
          const parsed = JSON.parse(cached) as PendingSyncItem[];
          set({ queue: parsed, isHydrated: true });
          console.log(`📦 Hydrated background sync queue with ${parsed.length} pending updates.`);
        } else {
          set({ queue: [], isHydrated: true });
        }
      } catch (err) {
        console.error("⚠️ Failed to hydrate background sync queue:", err);
        set({ queue: [], isHydrated: true });
      }
    },

    enqueueSyncItem: async (type, userId, payload) => {
      const currentQueue = [...get().queue];
      const now = Date.now();

      let mergedQueue: PendingSyncItem[] = [];

      // ─── Deduplication / Merge Policies ──────────────────────────────────
      if (type === "LOCATION" || type === "PRESENCE" || type === "ACTIVITY" || type === "STATS") {
        // LIFO Merge: Keep only the latest entry of this type for this user
        const filtered = currentQueue.filter((item) => !(item.type === type && item.userId === userId));
        const newItem: PendingSyncItem = {
          id: `${type}_${userId}_${now}`,
          type,
          userId,
          payload,
          createdAt: now,
        };
        mergedQueue = [...filtered, newItem];
      } else if (type === "TILES") {
        // Union Merge: Combine tile arrays to prevent sending repetitive overlapping datasets
        const tilesItemIdx = currentQueue.findIndex((item) => item.type === "TILES" && item.userId === userId);
        if (tilesItemIdx > -1) {
          const existingItem = currentQueue[tilesItemIdx];
          const combinedTiles = Array.from(new Set([...(existingItem.payload as string[]), ...(payload as string[])]));
          
          currentQueue[tilesItemIdx] = {
            ...existingItem,
            payload: combinedTiles,
            createdAt: now,
          };
          mergedQueue = [...currentQueue];
        } else {
          const newItem: PendingSyncItem = {
            id: `${type}_${userId}_${now}`,
            type,
            userId,
            payload,
            createdAt: now,
          };
          mergedQueue = [...currentQueue, newItem];
        }
      } else {
        // FIFO: For friend actions and geofence changes, ordering matters!
        const newItem: PendingSyncItem = {
          id: `${type}_${userId}_${now}`,
          type,
          userId,
          payload,
          createdAt: now,
        };
        mergedQueue = [...currentQueue, newItem];
      }

      set({ queue: mergedQueue });
      await persistQueue(userId, mergedQueue);
      console.log(`➕ Enqueued [${type}] sync item. Total pending: ${mergedQueue.length}`);
    },

    flushQueue: async () => {
      // Exit if unconfigured, already syncing, or queue is empty
      if (!isFirebaseConfigured || !db) return;
      if (get().status === "syncing" || get().queue.length === 0) return;

      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }

      set({ status: "syncing" });
      console.log(`📡 Starting background sync queue flush... (${get().queue.length} items remaining)`);

      const currentQueue = [...get().queue];
      const userId = currentQueue[0]?.userId; // Assuming single user context per flush loop
      
      let itemsProcessed = 0;
      let syncFailed = false;

      for (let i = 0; i < currentQueue.length; i++) {
        const item = currentQueue[i];
        
        try {
          // ─── Execute Firestore Write by Type ───────────────────────────────
          switch (item.type) {
            case "LOCATION": {
              const locRef = doc(db, "locations", item.userId);
              await setDoc(locRef, {
                ...item.payload,
                lastSeen: serverTimestamp(),
              }, { merge: true });
              break;
            }
            case "PRESENCE": {
              const presRef = doc(db, "presence", item.userId);
              await setDoc(presRef, {
                uid: item.userId,
                status: item.payload,
                updatedAt: new Date().toISOString(),
              }, { merge: true });
              break;
            }
            case "ACTIVITY": {
              const actRef = doc(db, "activities", item.userId);
              await setDoc(actRef, {
                uid: item.userId,
                activity: item.payload,
                updatedAt: new Date().toISOString(),
              }, { merge: true });
              break;
            }
            case "TILES": {
              const expRef = doc(db, "explored_tiles", item.userId);
              await setDoc(expRef, {
                userId: item.userId,
                tiles: item.payload,
                updatedAt: new Date().toISOString(),
              }, { merge: true });
              break;
            }
            case "STATS": {
              const statsRef = doc(db, "exploration_stats", item.userId);
              await setDoc(statsRef, {
                userId: item.userId,
                ...item.payload,
                updatedAt: new Date().toISOString(),
              }, { merge: true });
              break;
            }
            case "FRIEND_ACTION": {
              const { action, targetUid } = item.payload;
              if (action === "send") await sendFriendRequest(item.userId, targetUid);
              else if (action === "accept") await acceptFriendRequest(targetUid, item.userId);
              else if (action === "deleteRequest") await deleteFriendRequest(targetUid, item.userId);
              else if (action === "removeFriend") await removeFriend(item.userId, targetUid);
              else if (action === "block") await blockUser(item.userId, targetUid);
              else if (action === "unblock") await unblockUser(item.userId, targetUid);
              break;
            }
            case "GEOFENCE": {
              const { action, place } = item.payload;
              const placeRef = doc(db, "places", place.id);
              if (action === "add") {
                await setDoc(placeRef, place, { merge: true });
              } else if (action === "remove") {
                await deleteDoc(placeRef);
              }
              break;
            }
          }
          itemsProcessed++;
        } catch (err) {
          console.error(`⚠️ Failed to sync pending transaction [${item.type}] id: ${item.id}:`, err);
          syncFailed = true;
          break; // Stop sequencing on failure to preserve queue state/order
        }
      }

      if (itemsProcessed > 0) {
        // Remove successfully processed items
        const remainingQueue = currentQueue.slice(itemsProcessed);
        set({ queue: remainingQueue, retryCount: 0 });
        if (userId) {
          await persistQueue(userId, remainingQueue);
        }
      }

      if (syncFailed) {
        const nextRetryCount = get().retryCount + 1;
        set({ status: "error", retryCount: nextRetryCount });

        // Exponential backoff logic: starting at 2s, doubling to maximum 60s
        const backoffSeconds = Math.min(60, Math.pow(2, nextRetryCount));
        console.log(`🔄 Sync encountered error. Scheduling retry in ${backoffSeconds}s...`);

        retryTimer = setTimeout(() => {
          get().flushQueue();
        }, backoffSeconds * 1000);
      } else {
        set({ status: "synced" });
        console.log("✅ Background sync completed! All luring changes uploaded.");
        
        // Gentle success haptics for full data synchronization
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        // Reset status back to idle after a few seconds
        setTimeout(() => {
          if (get().status === "synced") {
            set({ status: "idle" });
          }
        }, 3000);
      }
    },

    clearQueue: async (userId) => {
      set({ queue: [], status: "idle", retryCount: 0 });
      await AsyncStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`);
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    },
  };
});
