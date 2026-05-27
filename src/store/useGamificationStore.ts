import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "../config/firebase";
import { useNetworkStore } from "./useNetworkStore";
import { useSyncQueueStore } from "./useSyncQueueStore";

export interface LeaderboardEntry {
  uid: string;
  name: string;
  avatarEmoji: string;
  count: number;
  rank: number;
}

interface GamificationStateStore {
  isDashboardActive: boolean;
  exploredFrequencies: Record<string, number>;
  unlockedBadges: string[];
  streakCount: number;
  totalDistance: number;
  dailyExploredCount: Record<string, number>;
  leaderboard: LeaderboardEntry[];

  // Actions
  toggleDashboard: () => void;
  setDashboardActive: (active: boolean) => void;
  incrementTileFrequency: (tileKey: string) => void;
  unlockBadgeAction: (badgeId: string, badgeName: string) => void;
  addDistanceAction: (km: number) => void;
  initializeGamificationStore: (userId: string) => () => void;
  resetGamificationData: (userId: string) => Promise<void>;
}

// Throttled Firestore sync
let gamificationTimeout: any = null;

async function syncGamificationToFirestore(userId: string, state: any) {
  if (gamificationTimeout) return;

  gamificationTimeout = setTimeout(async () => {
    gamificationTimeout = null;

    const isOnline = useNetworkStore.getState().isOnline;
    const statsPayload = {
      unlockedBadges: state.unlockedBadges,
      streakCount: state.streakCount,
      totalDistance: state.totalDistance,
      exploredFrequencies: state.exploredFrequencies,
      dailyExploredCount: state.dailyExploredCount,
    };

    if (!isOnline) {
      useSyncQueueStore.getState().enqueueSyncItem("STATS", userId, statsPayload).catch(() => {});
      return;
    }

    if (!isFirebaseConfigured || !db) return;
    try {
      const docRef = doc(db, "exploration_stats", userId);
      await setDoc(docRef, {
        userId,
        ...statsPayload,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      console.log("📡 Synced exploration gamification statistics to Firestore.");
    } catch (e) {
      console.error("Failed to sync gamification to Firestore, enqueuing:", e);
      useSyncQueueStore.getState().enqueueSyncItem("STATS", userId, statsPayload).catch(() => {});
    }
  }, 4000);
}

// Initial mock leaderboard scores for accepted friends
const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  { uid: "sim-1", name: "Aria", avatarEmoji: "⚡️", count: 874, rank: 1 },
  { uid: "me", name: "Saya (Anda)", avatarEmoji: "🦊", count: 0, rank: 4 },
  { uid: "sim-3", name: "Chloe", avatarEmoji: "👻", count: 432, rank: 2 },
  { uid: "sim-2", name: "Bastian", avatarEmoji: "🥶", count: 184, rank: 3 },
];

export const useGamificationStore = create<GamificationStateStore>((set, get) => {
  return {
    isDashboardActive: false,
    exploredFrequencies: {},
    unlockedBadges: [],
    streakCount: 3, // Start with a default streak of 3 days to look alive
    totalDistance: 0.8, // Default initial explored distance
    dailyExploredCount: {},
    leaderboard: INITIAL_LEADERBOARD,

    toggleDashboard: () => {
      Haptics.selectionAsync().catch(() => {});
      set({ isDashboardActive: !get().isDashboardActive });
    },

    setDashboardActive: (active) => {
      set({ isDashboardActive: active });
    },

    incrementTileFrequency: (tileKey) => {
      const frequencies = { ...get().exploredFrequencies };
      const currentVal = frequencies[tileKey] || 0;
      frequencies[tileKey] = currentVal + 1;

      // Add to today's count
      const todayStr = new Date().toISOString().split("T")[0];
      const dailyCount = { ...get().dailyExploredCount };
      dailyCount[todayStr] = (dailyCount[todayStr] || 0) + 1;

      // Update leaderboard score for self
      const myCount = Object.keys(frequencies).length;
      const updatedLeaderboard = get().leaderboard.map((entry) => {
        if (entry.uid === "me") {
          return { ...entry, count: myCount };
        }
        return entry;
      });

      // Sort leaderboard
      updatedLeaderboard.sort((a, b) => b.count - a.count);
      const rankedLeaderboard = updatedLeaderboard.map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
      }));

      set({
        exploredFrequencies: frequencies,
        dailyExploredCount: dailyCount,
        leaderboard: rankedLeaderboard,
      });

      // Cache locally and sync
      const currentUser = auth?.currentUser;
      if (currentUser) {
        const statePayload = {
          unlockedBadges: get().unlockedBadges,
          streakCount: get().streakCount,
          totalDistance: get().totalDistance,
          exploredFrequencies: frequencies,
          dailyExploredCount: dailyCount,
        };
        AsyncStorage.setItem(`wander_gamification_${currentUser.uid}`, JSON.stringify(statePayload)).catch(() => {});
        syncGamificationToFirestore(currentUser.uid, statePayload);
      }
    },

    unlockBadgeAction: (badgeId, badgeName) => {
      const activeBadges = get().unlockedBadges;
      if (activeBadges.includes(badgeId)) return; // Already unlocked

      const updated = [...activeBadges, badgeId];
      set({ unlockedBadges: updated });

      // Trigger premium success haptic alerts
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      const currentUser = auth?.currentUser;
      if (currentUser) {
        const statePayload = {
          unlockedBadges: updated,
          streakCount: get().streakCount,
          totalDistance: get().totalDistance,
          exploredFrequencies: get().exploredFrequencies,
          dailyExploredCount: get().dailyExploredCount,
        };
        AsyncStorage.setItem(`wander_gamification_${currentUser.uid}`, JSON.stringify(statePayload)).catch(() => {});
        syncGamificationToFirestore(currentUser.uid, statePayload);
      }
    },

    addDistanceAction: (km) => {
      const nextDistance = Math.round((get().totalDistance + km) * 100) / 100;
      set({ totalDistance: nextDistance });

      const currentUser = auth?.currentUser;
      if (currentUser) {
        const statePayload = {
          unlockedBadges: get().unlockedBadges,
          streakCount: get().streakCount,
          totalDistance: nextDistance,
          exploredFrequencies: get().exploredFrequencies,
          dailyExploredCount: get().dailyExploredCount,
        };
        AsyncStorage.setItem(`wander_gamification_${currentUser.uid}`, JSON.stringify(statePayload)).catch(() => {});
        syncGamificationToFirestore(currentUser.uid, statePayload);
      }
    },

    initializeGamificationStore: (userId) => {
      let isUnsubscribed = false;

      // 1. Fetch initial offline cache
      AsyncStorage.getItem(`wander_gamification_${userId}`).then((cached) => {
        if (isUnsubscribed || !cached) return;
        try {
          const state = JSON.parse(cached);
          const freqs = state.exploredFrequencies || {};
          const myCount = Object.keys(freqs).length;

          // Update self count on leaderboard
          const updatedLeaderboard = get().leaderboard.map((entry) => {
            if (entry.uid === "me") {
              return { ...entry, count: myCount };
            }
            return entry;
          });
          updatedLeaderboard.sort((a, b) => b.count - a.count);
          const rankedLeaderboard = updatedLeaderboard.map((entry, idx) => ({
            ...entry,
            rank: idx + 1,
          }));

          set({
            exploredFrequencies: freqs,
            unlockedBadges: state.unlockedBadges || [],
            streakCount: typeof state.streakCount === "number" ? state.streakCount : 3,
            totalDistance: typeof state.totalDistance === "number" ? state.totalDistance : 0.8,
            dailyExploredCount: state.dailyExploredCount || {},
            leaderboard: rankedLeaderboard,
          });
          console.log("📦 Loaded gamification stats from AsyncStorage.");
        } catch (e) {
          console.error("Failed to parse gamification cache:", e);
        }
      }).catch(() => {});

      // 2. Setup Firebase Firestore listener
      if (!isFirebaseConfigured || !db) {
        return () => { isUnsubscribed = true; };
      }

      const docRef = doc(db, "exploration_stats", userId);
      const unsubFirestore = onSnapshot(docRef, (snapshot) => {
        if (isUnsubscribed || !snapshot.exists()) return;
        const data = snapshot.data();
        if (data) {
          const freqs = data.exploredFrequencies || {};
          const myCount = Object.keys(freqs).length;

          // Update self count on leaderboard
          const updatedLeaderboard = get().leaderboard.map((entry) => {
            if (entry.uid === "me") {
              return { ...entry, count: myCount };
            }
            return entry;
          });
          updatedLeaderboard.sort((a, b) => b.count - a.count);
          const rankedLeaderboard = updatedLeaderboard.map((entry, idx) => ({
            ...entry,
            rank: idx + 1,
          }));

          set({
            exploredFrequencies: freqs,
            unlockedBadges: data.unlockedBadges || [],
            streakCount: typeof data.streakCount === "number" ? data.streakCount : 3,
            totalDistance: typeof data.totalDistance === "number" ? data.totalDistance : 0.8,
            dailyExploredCount: data.dailyExploredCount || {},
            leaderboard: rankedLeaderboard,
          });

          // Sync back to local storage
          AsyncStorage.setItem(`wander_gamification_${userId}`, JSON.stringify(data)).catch(() => {});
        }
      }, (err) => {
        console.error("⚠️ Firestore exploration_stats listener error:", err);
      });

      return () => {
        isUnsubscribed = true;
        unsubFirestore();
      };
    },

    resetGamificationData: async (userId) => {
      try {
        await AsyncStorage.removeItem(`wander_gamification_${userId}`);
        set({
          exploredFrequencies: {},
          unlockedBadges: [],
          streakCount: 0,
          totalDistance: 0,
          dailyExploredCount: {},
          leaderboard: INITIAL_LEADERBOARD,
        });

        if (isFirebaseConfigured && db) {
          const docRef = doc(db, "exploration_stats", userId);
          await setDoc(docRef, {
            userId,
            unlockedBadges: [],
            streakCount: 0,
            totalDistance: 0,
            exploredFrequencies: {},
            dailyExploredCount: {},
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error("Failed to reset gamification data:", e);
      }
    },
  };
});
