import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "../config/firebase";
import { useGamificationStore } from "./useGamificationStore";
import { useLocationStore } from "./useLocationStore";
import { useGeofenceStore } from "./useGeofenceStore";
import { achievementService } from "../services/achievementService";

// Bounding tile degree size (~30m x 30m grid)
export const TILE_SIZE = 0.0003;

// Reference tile counts representing a dense local exploration zone (e.g., 2500 tiles for 1.5km x 1.5km)
const REF_TILES_TOTAL = 2500;

interface ExplorationStateStore {
  isExplorationActive: boolean;
  exploredTiles: Set<string>;
  exploredTilesArray: string[];
  totalVisitedCount: number;
  exploredPercent: number;

  // Actions
  toggleExplorationMode: () => void;
  setExplorationMode: (active: boolean) => void;
  trackPosition: (latitude: number, longitude: number) => Promise<boolean>;
  initializeExplorationListener: (userId: string) => () => void;
  clearExplorationData: (userId: string) => Promise<void>;
}

// Throttling database sync to Firestore (3 seconds cache window)
let syncTimeout: any = null;
let pendingTilesToWrite: string[] = [];

async function syncTilesToFirestoreThrottled(userId: string, tiles: string[]) {
  pendingTilesToWrite = [...new Set([...pendingTilesToWrite, ...tiles])];
  
  if (syncTimeout) return;

  syncTimeout = setTimeout(async () => {
    const listToSend = [...pendingTilesToWrite];
    syncTimeout = null;
    pendingTilesToWrite = [];

    if (!isFirebaseConfigured || !db) return;
    try {
      const docRef = doc(db, "explored_tiles", userId);
      await setDoc(docRef, {
        userId,
        tiles: listToSend,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      console.log(`📡 Synced ${listToSend.length} explored tiles successfully to Firestore.`);
    } catch (e) {
      console.error("⚠️ Failed to sync explored tiles to Firestore:", e);
      // Re-queue on failure so it retries on next tick
      pendingTilesToWrite = [...new Set([...pendingTilesToWrite, ...listToSend])];
    }
  }, 3000);
}

export const useExplorationStore = create<ExplorationStateStore>((set, get) => {
  return {
    isExplorationActive: false,
    exploredTiles: new Set<string>(),
    exploredTilesArray: [],
    totalVisitedCount: 0,
    exploredPercent: 0,

    toggleExplorationMode: () => {
      Haptics.selectionAsync().catch(() => {});
      set({ isExplorationActive: !get().isExplorationActive });
    },

    setExplorationMode: (active) => {
      set({ isExplorationActive: active });
    },

    trackPosition: async (lat, lng) => {
      const latIdx = Math.floor(lat / TILE_SIZE);
      const lngIdx = Math.floor(lng / TILE_SIZE);
      const tileKey = `${latIdx}_${lngIdx}`;

      const activeSet = get().exploredTiles;
      if (activeSet.has(tileKey)) {
        // Increment frequency count on repeat visits for the heatmap thermal tracks!
        useGamificationStore.getState().incrementTileFrequency(tileKey);
        return false; 
      }

      // Add to visited frequencies mapping
      useGamificationStore.getState().incrementTileFrequency(tileKey);
      // Increment total explored distance proportional to grid size (approx 30m / 0.03 km per unlocked tile)
      useGamificationStore.getState().addDistanceAction(0.03);

      // Evaluate achievements
      try {
        const locationStore = useLocationStore.getState();
        const speed = locationStore.location?.speed || null;
        const activity = undefined;
        const savedPlaces = useGeofenceStore.getState().regions;
        achievementService.evaluateAchievements(lat, lng, speed, activity, savedPlaces);
      } catch (err) {
        console.error("Gagal mengevaluasi pencapaian/badge:", err);
      }

      // Add new explored tile
      const updatedSet = new Set(activeSet);
      updatedSet.add(tileKey);
      const updatedArray = Array.from(updatedSet);
      const visitedCount = updatedSet.size;
      
      // Calculate percent explored (rounded up to 3 decimal places)
      const percent = Math.min(100, Math.round((visitedCount / REF_TILES_TOTAL) * 100 * 1000) / 1000);

      // Play Zenly-style successful tile unlock vibration alert
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      set({
        exploredTiles: updatedSet,
        exploredTilesArray: updatedArray,
        totalVisitedCount: visitedCount,
        exploredPercent: percent,
      });

      // Cache locally in AsyncStorage for offline / instant start
      const currentUser = auth?.currentUser;
      if (currentUser) {
        try {
          await AsyncStorage.setItem(
            `wander_explored_tiles_${currentUser.uid}`,
            JSON.stringify(updatedArray)
          );
          // Sync to Firestore
          syncTilesToFirestoreThrottled(currentUser.uid, updatedArray);
        } catch (e) {
          console.error("Failed to write local exploration storage:", e);
        }
      }

      return true; // Newly unlocked tile
    },

    initializeExplorationListener: (userId) => {
      let isUnsubscribed = false;

      // 1. Fetch initial offline cache first
      AsyncStorage.getItem(`wander_explored_tiles_${userId}`).then((cached) => {
        if (isUnsubscribed || !cached) return;
        try {
          const list = JSON.parse(cached) as string[];
          const initialSet = new Set(list);
          const percent = Math.min(100, Math.round((initialSet.size / REF_TILES_TOTAL) * 100 * 1000) / 1000);
          set({
            exploredTiles: initialSet,
            exploredTilesArray: list,
            totalVisitedCount: initialSet.size,
            exploredPercent: percent,
          });
          console.log(`📦 Loaded ${initialSet.size} explored tiles from local AsyncStorage cache.`);
        } catch (e) {
          console.error("Error parsing local explored tiles:", e);
        }
      }).catch(() => {});

      // 2. Setup Firebase Firestore listener
      if (!isFirebaseConfigured || !db) {
        return () => { isUnsubscribed = true; };
      }

      const docRef = doc(db, "explored_tiles", userId);
      const unsubFirestore = onSnapshot(docRef, (snapshot) => {
        if (isUnsubscribed || !snapshot.exists()) return;
        const data = snapshot.data();
        if (data && Array.isArray(data.tiles)) {
          const remoteList = data.tiles as string[];
          const currentArray = get().exploredTilesArray;

          // Merge if remote has new items we don't have
          const mergedSet = new Set([...currentArray, ...remoteList]);
          const mergedList = Array.from(mergedSet);
          
          const percent = Math.min(100, Math.round((mergedSet.size / REF_TILES_TOTAL) * 100 * 1000) / 1000);

          set({
            exploredTiles: mergedSet,
            exploredTilesArray: mergedList,
            totalVisitedCount: mergedSet.size,
            exploredPercent: percent,
          });

          // Sync back to local storage
          AsyncStorage.setItem(`wander_explored_tiles_${userId}`, JSON.stringify(mergedList)).catch(() => {});
        }
      }, (err) => {
        console.error("⚠️ Firestore explored_tiles listener error:", err);
      });

      return () => {
        isUnsubscribed = true;
        unsubFirestore();
      };
    },

    clearExplorationData: async (userId) => {
      try {
        await AsyncStorage.removeItem(`wander_explored_tiles_${userId}`);
        set({
          exploredTiles: new Set<string>(),
          exploredTilesArray: [],
          totalVisitedCount: 0,
          exploredPercent: 0,
        });

        if (isFirebaseConfigured && db) {
          const docRef = doc(db, "explored_tiles", userId);
          await setDoc(docRef, { userId, tiles: [], updatedAt: new Date().toISOString() });
        }
      } catch (e) {
        console.error("Failed to clear exploration data:", e);
      }
    },
  };
});
