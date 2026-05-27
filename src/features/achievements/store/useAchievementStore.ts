/**
 * useAchievementStore.ts
 *
 * Zustand store to manage user Level, XP progression, equipped badge states,
 * daily missions, weekly challenges, and unlock notifications.
 * Persists data locally on AsyncStorage and syncs to Firestore.
 */
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "@/shared/config/firebase";
import { useNetworkStore } from "@/shared/store/useNetworkStore";
import { useSyncQueueStore } from "@/shared/store/useSyncQueueStore";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { BADGES_REGISTRY, Badge, BADGE_RARITY_PROFILES } from "@/features/achievements/services/badgeSystem";
import {
  getLevelInfoFromXP,
  getStreakMultiplier,
  generateDailyMissions,
  generateWeeklyChallenges,
  Mission,
  Challenge,
} from "@/features/achievements/services/progressionEngine";

export interface UnlockEvent {
  badgeId: string;
  name: string;
  emoji: string;
  rarity: string;
  xpReward: number;
}

interface AchievementState {
  xp: number;
  level: number;
  equippedBadgeId: string | null;
  equippedBadgeEmoji: string | null;
  unlockedBadges: string[];
  dailyMissions: Mission[];
  weeklyChallenges: Challenge[];
  lastMissionDate: string | null;
  lastChallengeWeek: string | null;
  
  // Notification layers
  lastUnlockNotification: UnlockEvent | null;
  lastLevelUpNotification: number | null;

  // Actions
  initializeAchievementStore: (userId: string) => () => void;
  addXpAction: (amount: number, reason: string) => void;
  unlockBadgeAction: (badgeId: string) => void;
  equipBadgeAction: (badgeId: string | null) => Promise<void>;
  incrementMissionProgressAction: (
    type: "TILES" | "DISTANCE",
    amount: number
  ) => void;
  triggerMockSpeedCompletion: () => void; // for simulation triggers
  clearNotifications: () => void;
  resetProgressionData: (userId: string) => Promise<void>;
}

// Throttled database syncing
let progressionSyncTimeout: any = null;

async function syncProgressionToFirestore(userId: string, state: any) {
  if (progressionSyncTimeout) return;

  progressionSyncTimeout = setTimeout(async () => {
    progressionSyncTimeout = null;

    const isOnline = useNetworkStore.getState().isOnline;
    const payload = {
      xp: state.xp,
      level: state.level,
      equippedBadgeId: state.equippedBadgeId,
      equippedBadgeEmoji: state.equippedBadgeEmoji,
      unlockedBadges: state.unlockedBadges,
      dailyMissions: state.dailyMissions,
      weeklyChallenges: state.weeklyChallenges,
      lastMissionDate: state.lastMissionDate,
      lastChallengeWeek: state.lastChallengeWeek,
    };

    if (!isOnline) {
      useSyncQueueStore.getState().enqueueSyncItem("STATS", userId, payload).catch(() => {});
      return;
    }

    if (!isFirebaseConfigured || !db) return;
    try {
      const docRef = doc(db, "user_progress", userId);
      await setDoc(docRef, {
        userId,
        ...payload,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      console.log("📡 Synced achievement progression stats to Firestore.");
    } catch (e) {
      console.error("Failed to sync progression to Firestore, enqueuing:", e);
      useSyncQueueStore.getState().enqueueSyncItem("STATS", userId, payload).catch(() => {});
    }
  }, 4000);
}

export const useAchievementStore = create<AchievementState>((set, get) => {
  const saveLocalAndSync = (userId: string, updatedState: Partial<AchievementState>) => {
    const fullState = {
      xp: get().xp,
      level: get().level,
      equippedBadgeId: get().equippedBadgeId,
      equippedBadgeEmoji: get().equippedBadgeEmoji,
      unlockedBadges: get().unlockedBadges,
      dailyMissions: get().dailyMissions,
      weeklyChallenges: get().weeklyChallenges,
      lastMissionDate: get().lastMissionDate,
      lastChallengeWeek: get().lastChallengeWeek,
      ...updatedState,
    };

    // Cache local AsyncStorage
    AsyncStorage.setItem(`wander_progression_${userId}`, JSON.stringify(fullState)).catch(() => {});
    // Throttled sync to cloud
    syncProgressionToFirestore(userId, fullState);
  };

  return {
    xp: 0,
    level: 1,
    equippedBadgeId: null,
    equippedBadgeEmoji: null,
    unlockedBadges: [],
    dailyMissions: [],
    weeklyChallenges: [],
    lastMissionDate: null,
    lastChallengeWeek: null,
    
    lastUnlockNotification: null,
    lastLevelUpNotification: null,

    initializeAchievementStore: (userId) => {
      let isUnsubscribed = false;

      const todayStr = new Date().toISOString().split("T")[0];
      
      // Calculate current ISO week string
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const year = d.getUTCFullYear();
      const weekNo = Math.ceil(((d.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / 86400000 + 1) / 7);
      const weekStr = `${year}-W${weekNo}`;

      // 1. Hydrate from AsyncStorage Cache first
      AsyncStorage.getItem(`wander_progression_${userId}`).then((cached) => {
        if (isUnsubscribed) return;
        
        let loadedState: Partial<AchievementState> = {};
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            loadedState = {
              xp: parsed.xp || 0,
              level: parsed.level || 1,
              equippedBadgeId: parsed.equippedBadgeId || null,
              equippedBadgeEmoji: parsed.equippedBadgeEmoji || null,
              unlockedBadges: parsed.unlockedBadges || [],
              dailyMissions: parsed.dailyMissions || [],
              weeklyChallenges: parsed.weeklyChallenges || [],
              lastMissionDate: parsed.lastMissionDate || null,
              lastChallengeWeek: parsed.lastChallengeWeek || null,
            };
          } catch (e) {
            console.error("Failed to parse local progression stats:", e);
          }
        }

        // Daily / Weekly seed check
        let dailyMissions = loadedState.dailyMissions || [];
        let lastMissionDate = loadedState.lastMissionDate || null;
        if (lastMissionDate !== todayStr) {
          // Generate fresh daily missions for the day
          dailyMissions = generateDailyMissions(todayStr);
          lastMissionDate = todayStr;
        }

        let weeklyChallenges = loadedState.weeklyChallenges || [];
        let lastChallengeWeek = loadedState.lastChallengeWeek || null;
        if (lastChallengeWeek !== weekStr) {
          // Generate fresh weekly challenges
          weeklyChallenges = generateWeeklyChallenges(weekStr);
          lastChallengeWeek = weekStr;
        }

        const nextState = {
          xp: loadedState.xp || 0,
          level: loadedState.level || 1,
          equippedBadgeId: loadedState.equippedBadgeId || null,
          equippedBadgeEmoji: loadedState.equippedBadgeEmoji || null,
          unlockedBadges: loadedState.unlockedBadges || [],
          dailyMissions,
          weeklyChallenges,
          lastMissionDate,
          lastChallengeWeek,
        };

        set(nextState);

        // Update auth state reactively if equipped badge exists
        if (nextState.equippedBadgeId) {
          useAuthStore.getState().updateLocalUser({
            equippedBadgeId: nextState.equippedBadgeId,
            equippedBadgeEmoji: nextState.equippedBadgeEmoji,
            level: nextState.level,
            xp: nextState.xp,
          });
        }
      }).catch(() => {});

      // 2. Setup Firebase Firestore snapshot listener
      if (!isFirebaseConfigured || !db) {
        return () => { isUnsubscribed = true; };
      }

      const docRef = doc(db, "user_progress", userId);
      const unsubFirestore = onSnapshot(docRef, (snapshot) => {
        if (isUnsubscribed || !snapshot.exists()) return;
        const data = snapshot.data();
        if (data) {
          let dailyMissions = data.dailyMissions || [];
          let lastMissionDate = data.lastMissionDate || null;
          if (lastMissionDate !== todayStr) {
            dailyMissions = generateDailyMissions(todayStr);
            lastMissionDate = todayStr;
          }

          let weeklyChallenges = data.weeklyChallenges || [];
          let lastChallengeWeek = data.lastChallengeWeek || null;
          if (lastChallengeWeek !== weekStr) {
            weeklyChallenges = generateWeeklyChallenges(weekStr);
            lastChallengeWeek = weekStr;
          }

          const cloudState = {
            xp: data.xp || 0,
            level: data.level || 1,
            equippedBadgeId: data.equippedBadgeId || null,
            equippedBadgeEmoji: data.equippedBadgeEmoji || null,
            unlockedBadges: data.unlockedBadges || [],
            dailyMissions,
            weeklyChallenges,
            lastMissionDate,
            lastChallengeWeek,
          };

          set(cloudState);

          // Update Auth Store
          useAuthStore.getState().updateLocalUser({
            equippedBadgeId: cloudState.equippedBadgeId,
            equippedBadgeEmoji: cloudState.equippedBadgeEmoji,
            level: cloudState.level,
            xp: cloudState.xp,
          });

          // Save locally
          AsyncStorage.setItem(`wander_progression_${userId}`, JSON.stringify(cloudState)).catch(() => {});
        }
      }, (err) => {
        console.error("⚠️ Firestore user_progress listener error:", err);
      });

      return () => {
        isUnsubscribed = true;
        unsubFirestore();
      };
    },

    addXpAction: (amount, reason) => {
      const activeUser = auth?.currentUser || { uid: "bypass-user" };
      
      const newXp = get().xp + amount;
      const prevInfo = getLevelInfoFromXP(get().xp);
      const nextInfo = getLevelInfoFromXP(newXp);

      const stateUpdate: Partial<AchievementState> = { xp: newXp };

      // Check for LEVEL UP
      if (nextInfo.level > prevInfo.level) {
        stateUpdate.level = nextInfo.level;
        stateUpdate.lastLevelUpNotification = nextInfo.level;
        
        // Haptic feedback loop for Level Up
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setTimeout(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }, 300);

        // Auto-check Level 5 Legendary badge
        if (nextInfo.level >= 5) {
          // Triggers badge unlock asynchronously
          setTimeout(() => {
            get().unlockBadgeAction("level-elite");
          }, 600);
        }
      }

      set(stateUpdate);

      // Update Auth store
      useAuthStore.getState().updateLocalUser({
        xp: newXp,
        level: stateUpdate.level || get().level,
      });

      saveLocalAndSync(activeUser.uid, stateUpdate);
    },

    unlockBadgeAction: (badgeId) => {
      const activeUser = auth?.currentUser || { uid: "bypass-user" };
      const currentBadges = get().unlockedBadges;

      if (currentBadges.includes(badgeId)) return; // Already unlocked

      const badge = BADGES_REGISTRY.find((b) => b.id === badgeId);
      if (!badge) return;

      const updated = [...currentBadges, badgeId];
      
      set({
        unlockedBadges: updated,
        lastUnlockNotification: {
          badgeId: badge.id,
          name: badge.name,
          emoji: badge.emoji,
          rarity: BADGE_RARITY_PROFILES[badge.rarity].name,
          xpReward: badge.xpReward,
        },
      });

      // Fire haptics
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // Reward XP
      get().addXpAction(badge.xpReward, `Membuka Badge: ${badge.name}`);

      saveLocalAndSync(activeUser.uid, { unlockedBadges: updated });
    },

    equipBadgeAction: async (badgeId) => {
      const activeUser = auth?.currentUser || { uid: "bypass-user" };
      let badgeEmoji: string | null = null;

      if (badgeId) {
        const badge = BADGES_REGISTRY.find((b) => b.id === badgeId);
        if (badge) badgeEmoji = badge.emoji;
      }

      set({
        equippedBadgeId: badgeId,
        equippedBadgeEmoji: badgeEmoji,
      });

      // Synchronize back to Auth store's profile
      useAuthStore.getState().updateLocalUser({
        equippedBadgeId: badgeId,
        equippedBadgeEmoji: badgeEmoji,
      });

      Haptics.selectionAsync().catch(() => {});

      saveLocalAndSync(activeUser.uid, {
        equippedBadgeId: badgeId,
        equippedBadgeEmoji: badgeEmoji,
      });

      // Write to users collection too if Firebase is active
      if (isFirebaseConfigured && db && auth?.currentUser) {
        try {
          const userRef = doc(db, "users", auth.currentUser.uid);
          await setDoc(userRef, {
            equippedBadgeId: badgeId,
            equippedBadgeEmoji: badgeEmoji,
          }, { merge: true });
        } catch (e) {
          console.error("Failed to sync equipped badge in Firestore users doc:", e);
        }
      } else {
        // Persistence fallback for Simulation Mode users
        const simUid = activeUser.uid;
        try {
          const val = await AsyncStorage.getItem("wander_simulated_profile_" + simUid);
          const existing = val ? JSON.parse(val) : {};
          existing.equippedBadgeId = badgeId;
          existing.equippedBadgeEmoji = badgeEmoji;
          await AsyncStorage.setItem("wander_simulated_profile_" + simUid, JSON.stringify(existing));
        } catch (e) {
          console.error("Simulation mode profile save error:", e);
        }
      }
    },

    incrementMissionProgressAction: (type, amount) => {
      const activeUser = auth?.currentUser || { uid: "bypass-user" };
      let xpEarned = 0;

      // ─── 1. Daily Missions ──────────────────────────────────────────────────
      const dailyMissions = get().dailyMissions.map((mission) => {
        if (mission.type === type && !mission.completed) {
          const nextVal = Math.round((mission.current + amount) * 100) / 100;
          const completed = nextVal >= mission.target;

          if (completed) {
            xpEarned += mission.xpReward;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }

          return {
            ...mission,
            current: Math.min(mission.target, nextVal),
            completed,
          };
        }
        return mission;
      });

      // ─── 2. Weekly Challenges ───────────────────────────────────────────────
      const weeklyChallenges = get().weeklyChallenges.map((challenge) => {
        if (challenge.type === type && !challenge.completed) {
          const nextVal = Math.round((challenge.current + amount) * 100) / 100;
          const completed = nextVal >= challenge.target;

          if (completed) {
            xpEarned += challenge.xpReward;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }

          return {
            ...challenge,
            current: Math.min(challenge.target, nextVal),
            completed,
          };
        }
        return challenge;
      });

      const updates: Partial<AchievementState> = {
        dailyMissions,
        weeklyChallenges,
      };

      set(updates);

      // Reward XP if completed
      if (xpEarned > 0) {
        get().addXpAction(xpEarned, "Menyelesaikan Misi Harian/Mingguan");
      }

      saveLocalAndSync(activeUser.uid, updates);
    },

    triggerMockSpeedCompletion: () => {
      const activeUser = auth?.currentUser || { uid: "bypass-user" };
      let xpEarned = 0;

      const dailyMissions = get().dailyMissions.map((mission) => {
        if (mission.type === "SPEED" && !mission.completed) {
          xpEarned += mission.xpReward;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          return {
            ...mission,
            current: mission.target,
            completed: true,
          };
        }
        return mission;
      });

      set({ dailyMissions });
      if (xpEarned > 0) {
        get().addXpAction(xpEarned, "Menyelesaikan Misi Kecepatan Berkendara");
      }

      saveLocalAndSync(activeUser.uid, { dailyMissions });
    },

    clearNotifications: () => {
      set({
        lastUnlockNotification: null,
        lastLevelUpNotification: null,
      });
    },

    resetProgressionData: async (userId) => {
      try {
        await AsyncStorage.removeItem(`wander_progression_${userId}`);
        const todayStr = new Date().toISOString().split("T")[0];
        
        const resetState = {
          xp: 0,
          level: 1,
          equippedBadgeId: null,
          equippedBadgeEmoji: null,
          unlockedBadges: [],
          dailyMissions: generateDailyMissions(todayStr),
          weeklyChallenges: generateWeeklyChallenges("2026-W22"),
          lastMissionDate: todayStr,
          lastChallengeWeek: "2026-W22",
        };

        set(resetState);

        // Sync Auth Store
        useAuthStore.getState().updateLocalUser({
          equippedBadgeId: null,
          equippedBadgeEmoji: null,
          level: 1,
          xp: 0,
        });

        if (isFirebaseConfigured && db) {
          const docRef = doc(db, "user_progress", userId);
          await setDoc(docRef, {
            userId,
            ...resetState,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error("Failed to reset progression data:", e);
      }
    },
  };
});
