/**
 * haptics.ts
 *
 * Wrapper for expo-haptics to standardise micro-interactions.
 * Automatically falls back to safe mock behaviors in environments without taptic engine.
 */
import * as Haptics from "expo-haptics";

export const WANDER_HAPTICS = {
  // Subtle selector tick for sliders, lists, and dials (extremely lightweight)
  tick: async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // Graceful fallback
    }
  },

  // Soft boundary hit or small card drag feedback
  light: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Graceful fallback
    }
  },

  // Significant events: unlocking a tile, toggling exploration mode
  medium: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Graceful fallback
    }
  },

  // High importance events: achievement unlocks, level-ups
  heavy: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // Graceful fallback
    }
  },

  // Double pulse representing a successful background operation or incoming alert
  success: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Graceful fallback
    }
  },

  // Warning or error signals
  warning: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // Graceful fallback
    }
  },
  
  error: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Graceful fallback
    }
  },
};
