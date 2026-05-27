/**
 * usePrivacyStore.ts
 *
 * Store managing advanced user privacy controls:
 * - Precise / Approximate toggle
 * - Ghost Zones (bounding coordinate circles)
 * - Invisible Hours (scheduled ghosting)
 * - Friend-Level overrides (sharing permissions per UID)
 */
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, setDoc } from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "@/shared/config/firebase";

export interface GhostZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface InvisibleHours {
  enabled: boolean;
  startHour: number; // 0-23
  endHour: number; // 0-23
}

interface PrivacyStateStore {
  sharingMode: "precise" | "approximate";
  ghostZones: GhostZone[];
  invisibleHours: InvisibleHours;
  friendPermissions: Record<string, "precise" | "approximate" | "hidden">;
  isLoaded: boolean;

  // Actions
  initializePrivacyStore: (userId: string) => Promise<void>;
  setSharingMode: (mode: "precise" | "approximate") => void;
  addGhostZone: (zone: Omit<GhostZone, "id">) => void;
  removeGhostZone: (zoneId: string) => void;
  setInvisibleHours: (hours: InvisibleHours) => void;
  toggleFriendPermission: (friendUid: string, permission: "precise" | "approximate" | "hidden") => void;
  
  // Evaluation Helper
  getFuzzedLocation: (latitude: number, longitude: number) => { latitude: number; longitude: number; fuzzed: boolean };
}

// Helper: Calculate distance in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
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

export const usePrivacyStore = create<PrivacyStateStore>((set, get) => {
  const saveState = async (userId: string) => {
    const payload = {
      sharingMode: get().sharingMode,
      ghostZones: get().ghostZones,
      invisibleHours: get().invisibleHours,
      friendPermissions: get().friendPermissions,
    };
    await AsyncStorage.setItem(`wander_privacy_${userId}`, JSON.stringify(payload));

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, "user_privacy", userId);
        await setDoc(docRef, { userId, ...payload, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (err) {
        console.error("Gagal sinkronisasi privasi ke Firestore:", err);
      }
    }
  };

  return {
    sharingMode: "precise",
    ghostZones: [],
    invisibleHours: { enabled: false, startHour: 22, endHour: 6 },
    friendPermissions: {},
    isLoaded: false,

    initializePrivacyStore: async (userId) => {
      try {
        const cached = await AsyncStorage.getItem(`wander_privacy_${userId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          set({
            sharingMode: parsed.sharingMode || "precise",
            ghostZones: parsed.ghostZones || [],
            invisibleHours: parsed.invisibleHours || { enabled: false, startHour: 22, endHour: 6 },
            friendPermissions: parsed.friendPermissions || {},
            isLoaded: true,
          });
        } else {
          // Seed standard mock home ghost zone
          set({
            ghostZones: [
              { id: "gz-home", name: "Zona Rumah Saya", latitude: -6.2088, longitude: 106.8456, radiusMeters: 200 }
            ],
            isLoaded: true,
          });
        }
      } catch {
        set({ isLoaded: true });
      }
    },

    setSharingMode: (mode) => {
      set({ sharingMode: mode });
      const currentUser = auth?.currentUser;
      if (currentUser) saveState(currentUser.uid);
    },

    addGhostZone: (zone) => {
      const newZone: GhostZone = {
        ...zone,
        id: `gz-${Date.now()}`,
      };
      set({ ghostZones: [...get().ghostZones, newZone] });
      const currentUser = auth?.currentUser;
      if (currentUser) saveState(currentUser.uid);
    },

    removeGhostZone: (zoneId) => {
      set({ ghostZones: get().ghostZones.filter((z) => z.id !== zoneId) });
      const currentUser = auth?.currentUser;
      if (currentUser) saveState(currentUser.uid);
    },

    setInvisibleHours: (hours) => {
      set({ invisibleHours: hours });
      const currentUser = auth?.currentUser;
      if (currentUser) saveState(currentUser.uid);
    },

    toggleFriendPermission: (friendUid, permission) => {
      const current = { ...get().friendPermissions };
      current[friendUid] = permission;
      set({ friendPermissions: current });
      const currentUser = auth?.currentUser;
      if (currentUser) saveState(currentUser.uid);
    },

    getFuzzedLocation: (latitude, longitude) => {
      const { sharingMode, ghostZones, invisibleHours } = get();
      let fuzzed = false;

      // 1. Check general sharing mode
      if (sharingMode === "approximate") {
        fuzzed = true;
      }

      // 2. Check Ghost Zones boundaries
      for (const zone of ghostZones) {
        const dist = getDistanceMeters(latitude, longitude, zone.latitude, zone.longitude);
        if (dist <= zone.radiusMeters) {
          fuzzed = true;
          break;
        }
      }

      // 3. Check Invisible Hours schedule
      if (invisibleHours.enabled) {
        const hour = new Date().getHours();
        const { startHour, endHour } = invisibleHours;
        const isOverlap = startHour > endHour
          ? (hour >= startHour || hour < endHour)
          : (hour >= startHour && hour < endHour);
        if (isOverlap) {
          fuzzed = true;
        }
      }

      if (fuzzed) {
        // Generate a deterministic blur offset based on coordinate values so it is stable (non-jittery)
        const offsetLat = Math.sin(latitude * 100) * 0.0065;
        const offsetLng = Math.cos(longitude * 100) * 0.0065;
        return {
          latitude: latitude + offsetLat,
          longitude: longitude + offsetLng,
          fuzzed: true,
        };
      }

      return { latitude, longitude, fuzzed: false };
    },
  };
});
