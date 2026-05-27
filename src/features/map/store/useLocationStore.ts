/**
 * useLocationStore.ts
 *
 * Refactored backward-compatible legacy wrapper store.
 * Subscribes to the split stores (useTrackingStore, useGhostModeStore, useBatteryStore, useFriendLocationStore)
 * and proxies all state selectors and actions to prevent breakages in existing code.
 */
import { create } from "zustand";
import { useTrackingStore } from "./useTrackingStore";
import { useGhostModeStore } from "./useGhostModeStore";
import { useBatteryStore } from "./useBatteryStore";
import { useFriendLocationStore } from "./useFriendLocationStore";
import { auth } from "@/shared/config/firebase";
import type * as Location from "expo-location";
import type { FriendLocation } from "@/features/friends/services/mockService";

interface LocationState {
  location: Location.LocationObjectCoords | null;
  ghostMode: "precise" | "blurry" | "frozen";
  frozenLocation: Location.LocationObjectCoords | null;
  blurryLocation: Location.LocationObjectCoords | null;
  batteryLevel: number;
  isCharging: boolean;
  lowPowerMode: boolean;
  trackingActive: boolean;
  friends: FriendLocation[];
  errorMsg: string | null;

  // Actions
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  setGhostMode: (mode: "precise" | "blurry" | "frozen") => void;
  syncLocationToFirestore: (coords: Location.LocationObjectCoords, force?: boolean) => Promise<void>;
  listenToFriends: () => () => void;
  adjustTrackingParameters: () => Promise<void>;
}

export const useLocationStore = create<LocationState>((set, get) => {
  // Sync state reactively between individual split stores and this legacy store
  useTrackingStore.subscribe((state) => {
    set({
      location: state.location,
      trackingActive: state.trackingActive,
      errorMsg: state.errorMsg,
    });
  });

  useGhostModeStore.subscribe((state) => {
    set({
      ghostMode: state.ghostMode,
      frozenLocation: state.frozenLocation,
      blurryLocation: state.blurryLocation,
    });
  });

  useBatteryStore.subscribe((state) => {
    set({
      batteryLevel: state.batteryLevel,
      isCharging: state.isCharging,
      lowPowerMode: state.lowPowerMode,
    });
  });

  useFriendLocationStore.subscribe((state) => {
    set({
      friends: state.friends,
    });
  });

  return {
    // Initial Hydrated values
    location: useTrackingStore.getState().location,
    trackingActive: useTrackingStore.getState().trackingActive,
    errorMsg: useTrackingStore.getState().errorMsg,

    ghostMode: useGhostModeStore.getState().ghostMode,
    frozenLocation: useGhostModeStore.getState().frozenLocation,
    blurryLocation: useGhostModeStore.getState().blurryLocation,

    batteryLevel: useBatteryStore.getState().batteryLevel,
    isCharging: useBatteryStore.getState().isCharging,
    lowPowerMode: useBatteryStore.getState().lowPowerMode,

    friends: useFriendLocationStore.getState().friends,

    // Proxy actions
    startTracking: async () => {
      await useTrackingStore.getState().startTracking();
    },

    stopTracking: () => {
      useTrackingStore.getState().stopTracking();
    },

    setGhostMode: (mode) => {
      const { location } = useTrackingStore.getState();
      const currentUser = auth?.currentUser;
      const uid = currentUser?.uid || "default-me";
      useGhostModeStore.getState().setGhostMode(uid, mode, location);
    },

    syncLocationToFirestore: async (coords, force) => {
      await useTrackingStore.getState().syncLocationToFirestore(coords, force);
    },

    listenToFriends: () => {
      return useFriendLocationStore.getState().listenToFriends();
    },

    adjustTrackingParameters: async () => {
      await useTrackingStore.getState().adjustTrackingParameters();
    },
  };
});
