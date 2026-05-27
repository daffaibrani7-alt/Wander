/**
 * remoteConfig.ts
 *
 * Mock remote configuration client and feature flags store.
 * Permits soft rollouts of performance enhancements and scalability switches.
 */
import { create } from "zustand";

interface FeatureFlags {
  enableLocationThrottling: boolean;
  enableSafeZones: boolean;
  enableRealtimeOrchestrator: boolean;
  enableViewportVirtualization: boolean;
  maxFriendListQueries: number;
  
  // Actions
  toggleFlag: (key: keyof Omit<FeatureFlags, "maxFriendListQueries" | "toggleFlag">) => void;
}

export const useFeatureFlags = create<FeatureFlags>((set, get) => ({
  enableLocationThrottling: true,
  enableSafeZones: true,
  enableRealtimeOrchestrator: true,
  enableViewportVirtualization: true,
  maxFriendListQueries: 30,

  toggleFlag: (key) => {
    set((state) => ({ [key]: !state[key] } as any));
  },
}));
