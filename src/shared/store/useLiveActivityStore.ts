import { create } from "zustand";
import * as Haptics from "expo-haptics";

export interface LiveActivityState {
  id: string;
  type: "driving" | "nearby" | "arrival";
  displayName: string;
  subtitle: string;
  emoji: string;
  progressRatio: number; // 0 to 1, used for driving tracker progress
  details: {
    speed?: number; // km/h
    etaMinutes?: number; // minutes remaining
    distanceText?: string; // e.g. "200m"
    placeName?: string; // e.g. "Rumah Saya"
  };
  startedAt: string;
}

export interface DynamicIslandData {
  title: string;
  body: string;
  emoji: string;
  category?: string;
  actions?: Array<{
    label: string;
    actionKey: string;
    emoji: string;
  }>;
}

interface LiveActivityStateStore {
  activeActivity: LiveActivityState | null;
  islandState: "collapsed" | "compact" | "expanded";
  islandData: DynamicIslandData | null;
  isLockScreenSimulated: boolean;

  // Actions
  startLiveActivity: (
    type: LiveActivityState["type"],
    displayName: string,
    subtitle: string,
    emoji: string,
    progressRatio?: number,
    details?: LiveActivityState["details"]
  ) => void;
  updateLiveActivity: (updates: Partial<Omit<LiveActivityState, "id" | "type" | "startedAt">>) => void;
  stopLiveActivity: () => void;
  triggerDynamicIsland: (
    title: string,
    body: string,
    emoji: string,
    category?: string,
    durationMs?: number
  ) => void;
  setIslandState: (state: LiveActivityStateStore["islandState"]) => void;
  collapseIsland: () => void;
  toggleLockScreenSimulation: () => void;
}

let autoDismissTimer: ReturnType<typeof setTimeout> | null = null;

export const useLiveActivityStore = create<LiveActivityStateStore>((set, get) => {
  return {
    activeActivity: null,
    islandState: "collapsed",
    islandData: null,
    isLockScreenSimulated: false,

    startLiveActivity: (type, displayName, subtitle, emoji, progressRatio = 0, details = {}) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      
      const newActivity: LiveActivityState = {
        id: `activity_${Date.now()}`,
        type,
        displayName,
        subtitle,
        emoji,
        progressRatio,
        details,
        startedAt: new Date().toISOString(),
      };

      set({ activeActivity: newActivity });
      console.log(`📡 Live Activity started: [${type}] for ${displayName}`);
    },

    updateLiveActivity: (updates) => {
      const current = get().activeActivity;
      if (!current) return;

      const updatedDetails = updates.details
        ? { ...current.details, ...updates.details }
        : current.details;

      const updatedActivity: LiveActivityState = {
        ...current,
        ...updates,
        details: updatedDetails,
      };

      set({ activeActivity: updatedActivity });
    },

    stopLiveActivity: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      set({ activeActivity: null });
      console.log("📡 Live Activity stopped.");
    },

    triggerDynamicIsland: (title, body, emoji, category = "Alert", durationMs = 5000) => {
      if (autoDismissTimer) clearTimeout(autoDismissTimer);

      Haptics.selectionAsync().catch(() => {});
      
      const actions = [
        { label: "Kirim Ping", actionKey: "ping", emoji: "💬" },
        { label: "Buka Peta", actionKey: "map", emoji: "🗺️" },
      ];

      set({
        islandState: "compact",
        islandData: { title, body, emoji, category, actions },
      });

      // Auto dismiss to collapsed state after duration
      autoDismissTimer = setTimeout(() => {
        get().collapseIsland();
      }, durationMs);
    },

    setIslandState: (state) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      set({ islandState: state });
    },

    collapseIsland: () => {
      if (autoDismissTimer) clearTimeout(autoDismissTimer);
      set({ islandState: "collapsed" });
    },

    toggleLockScreenSimulation: () => {
      Haptics.selectionAsync().catch(() => {});
      set({ isLockScreenSimulated: !get().isLockScreenSimulated });
    },
  };
});
