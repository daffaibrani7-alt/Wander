/**
 * useGhostModeStore.ts
 *
 * Decoupled Zustand store for Ghost Mode configuration.
 * Manages privacy modes: Precise, Blurry, and Frozen locations with static random offsets.
 */
import { create } from "zustand";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface GhostModeState {
  ghostMode: "precise" | "blurry" | "frozen";
  frozenLocation: Location.LocationObjectCoords | null;
  blurryLocation: Location.LocationObjectCoords | null;

  // Actions
  initializeGhostMode: (uid: string) => Promise<void>;
  setGhostMode: (uid: string, mode: "precise" | "blurry" | "frozen", currentCoords: Location.LocationObjectCoords | null) => Promise<void>;
  getOptimizedCoords: (coords: Location.LocationObjectCoords) => Location.LocationObjectCoords;
}

export const useGhostModeStore = create<GhostModeState>((set, get) => {
  return {
    ghostMode: "precise",
    frozenLocation: null,
    blurryLocation: null,

    initializeGhostMode: async (uid) => {
      try {
        const mode = await AsyncStorage.getItem(`wander_ghost_mode_${uid}`);
        if (mode) {
          set({ ghostMode: mode as any });
        }
      } catch {}
    },

    setGhostMode: async (uid, mode, currentCoords) => {
      set({ ghostMode: mode });
      await AsyncStorage.setItem(`wander_ghost_mode_${uid}`, mode);

      if (mode === "precise") {
        set({ frozenLocation: null, blurryLocation: null });
      } else if (mode === "frozen" && currentCoords) {
        set({ frozenLocation: currentCoords });
      } else if (mode === "blurry" && currentCoords) {
        const randomOffsetLat = (Math.random() > 0.5 ? 1 : -1) * (0.006 + Math.random() * 0.006);
        const randomOffsetLng = (Math.random() > 0.5 ? 1 : -1) * (0.006 + Math.random() * 0.006);
        set({
          blurryLocation: {
            ...currentCoords,
            latitude: currentCoords.latitude + randomOffsetLat,
            longitude: currentCoords.longitude + randomOffsetLng,
          },
        });
      }
    },

    getOptimizedCoords: (coords) => {
      const { ghostMode, frozenLocation, blurryLocation } = get();

      if (ghostMode === "frozen") {
        if (frozenLocation) return frozenLocation;
        // Lazily set if not available
        set({ frozenLocation: coords });
        return coords;
      }

      if (ghostMode === "blurry") {
        if (blurryLocation) return blurryLocation;
        // Lazily set a blurry coordinate
        const randomOffsetLat = (Math.random() > 0.5 ? 1 : -1) * (0.006 + Math.random() * 0.006);
        const randomOffsetLng = (Math.random() > 0.5 ? 1 : -1) * (0.006 + Math.random() * 0.006);
        const newBlur = {
          ...coords,
          latitude: coords.latitude + randomOffsetLat,
          longitude: coords.longitude + randomOffsetLng,
        };
        set({ blurryLocation: newBlur });
        return newBlur;
      }

      return coords;
    },
  };
});
