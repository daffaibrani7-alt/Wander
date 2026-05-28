/**
 * interactionTokens.ts
 *
 * Defines Apple-quality standard micro-interaction scales,
 * touch targets, transition presets, and accessibility rules.
 */
export const INTERACTION_TOKENS = {
  // Human Interface Guidelines: safe minimum touch area in points
  minTouchTarget: 44,

  // Active state compression scale for tactile bouncy press effects
  scales: {
    active: 0.96 as const,    // Light organic compression
    hover: 1.02 as const,     // Subtle floating elevation scale
    normal: 1.0 as const,
  },

  // Apple-style micro-haptic presets
  haptics: {
    enabled: true,
    intensity: {
      light: "light" as const,
      medium: "medium" as const,
      heavy: "heavy" as const,
    },
  },

  // Snappy spring and duration transitions
  transitions: {
    snappy: {
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    },
    bounceless: {
      tension: 100,
      friction: 20,
      useNativeDriver: true,
    },
    slowReveal: {
      tension: 30,
      friction: 12,
      useNativeDriver: true,
    },
  },

  // Perceived speed and accessibilities
  comfort: {
    reducedMotion: false,
    contrastRatioMin: 4.5,
    dynamicTextScale: true,
  },
};
