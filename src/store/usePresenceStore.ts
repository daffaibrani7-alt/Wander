import { create } from "zustand";
import { presenceService, UserPresence } from "../services/presenceService";
import { doc, setDoc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "../config/firebase";

export interface FriendActivityState {
  uid: string;
  activity: "driving" | "walking" | "home" | "work" | "school" | "cafe" | "sleeping" | "traveling" | "online" | "idle";
  status: "online" | "idle" | "offline";
  batteryLevel: number;
  isCharging: boolean;
  lastSeen: string;
  updatedAt: string;
}

interface PresenceStoreState {
  selfPresence: "online" | "idle" | "offline";
  selfActivity: FriendActivityState["activity"];
  friendPresences: { [uid: string]: FriendActivityState };
  isLoading: boolean;
  
  // Actions
  setSelfPresenceAction: (status: "online" | "idle" | "offline") => Promise<void>;
  setSelfActivityAction: (activity: FriendActivityState["activity"]) => Promise<void>;
  listenToFriendsPresenceAndActivities: (friendUids: string[]) => () => void;
}

export const usePresenceStore = create<PresenceStoreState>((set, get) => {
  let activePresenceListeners: (() => void)[] = [];

  return {
    selfPresence: "online",
    selfActivity: "online",
    friendPresences: {},
    isLoading: false,

    setSelfPresenceAction: async (status) => {
      set({ selfPresence: status });
      const currentUser = auth?.currentUser;
      if (currentUser && isFirebaseConfigured) {
        await presenceService.setUserPresence(currentUser.uid, status);
      }
    },

    setSelfActivityAction: async (activity) => {
      set({ selfActivity: activity });
      const currentUser = auth?.currentUser;
      if (currentUser && isFirebaseConfigured && db) {
        try {
          const activityRef = doc(db, "activities", currentUser.uid);
          await setDoc(
            activityRef,
            {
              uid: currentUser.uid,
              activity,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (err) {
          console.error("Gagal sinkronisasi activity ke Firestore:", err);
        }
      }
    },

    listenToFriendsPresenceAndActivities: (friendUids) => {
      // Clean up previous listeners
      activePresenceListeners.forEach((unsub) => unsub());
      activePresenceListeners = [];

      if (friendUids.length === 0) return () => {};

      if (!isFirebaseConfigured || !db) {
        // Simulation mode presence update generator
        const simulated: { [uid: string]: FriendActivityState } = {};
        
        // Generate simulated presence matching the MOCK_FRIENDS locations
        const nowStr = new Date().toISOString();
        simulated["sim-1"] = {
          uid: "sim-1",
          activity: "driving",
          status: "online",
          batteryLevel: 87,
          isCharging: false,
          lastSeen: nowStr,
          updatedAt: nowStr,
        };
        simulated["sim-2"] = {
          uid: "sim-2",
          activity: "sleeping",
          status: "online",
          batteryLevel: 34,
          isCharging: true,
          lastSeen: nowStr,
          updatedAt: nowStr,
        };
        simulated["sim-3"] = {
          uid: "sim-3",
          activity: "idle",
          status: "idle",
          batteryLevel: 14,
          isCharging: false,
          lastSeen: nowStr,
          updatedAt: nowStr,
        };

        set({ friendPresences: simulated });
        return () => {};
      }

      set({ isLoading: true });
      const chunkedUids = friendUids.slice(0, 30);

      // 1. Listen to presence collection for online/idle statuses
      const presenceCol = collection(db, "presence");
      const presenceQ = query(presenceCol, where("uid", "in", chunkedUids));

      const unsubPresence = onSnapshot(presenceQ, (snapshot) => {
        const presencesMap: { [uid: string]: Partial<FriendActivityState> } = {};
        
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          presencesMap[data.uid] = {
            uid: data.uid,
            status: data.status || "online",
            lastSeen: data.updatedAt || new Date().toISOString(),
          };
        });

        // Merge with current state
        const currentFriendPresences = { ...get().friendPresences };
        Object.keys(presencesMap).forEach((uid) => {
          currentFriendPresences[uid] = {
            ...(currentFriendPresences[uid] || {
              activity: "online",
              batteryLevel: 100,
              isCharging: false,
              updatedAt: new Date().toISOString(),
            }),
            ...presencesMap[uid],
          } as FriendActivityState;
        });

        set({ friendPresences: currentFriendPresences, isLoading: false });
      });

      activePresenceListeners.push(unsubPresence);

      // 2. Listen to activities collection for GPS movements classifications
      const activitiesCol = collection(db, "activities");
      const activitiesQ = query(activitiesCol, where("uid", "in", chunkedUids));

      const unsubActivities = onSnapshot(activitiesQ, (snapshot) => {
        const activitiesMap: { [uid: string]: Partial<FriendActivityState> } = {};
        
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          activitiesMap[data.uid] = {
            uid: data.uid,
            activity: data.activity || "online",
            batteryLevel: data.batteryLevel !== undefined ? data.batteryLevel : 100,
            isCharging: !!data.isCharging,
            updatedAt: data.updatedAt || new Date().toISOString(),
          };
        });

        // Merge with current state
        const currentFriendPresences = { ...get().friendPresences };
        Object.keys(activitiesMap).forEach((uid) => {
          currentFriendPresences[uid] = {
            ...(currentFriendPresences[uid] || {
              status: "online",
              lastSeen: new Date().toISOString(),
            }),
            ...activitiesMap[uid],
          } as FriendActivityState;
        });

        set({ friendPresences: currentFriendPresences });
      });

      activePresenceListeners.push(unsubActivities);

      return () => {
        unsubPresence();
        unsubActivities();
      };
    },
  };
});
