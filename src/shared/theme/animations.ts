/**
 * animations.ts
 *
 * Motion durations and spring dynamics configurations.
 */
export const ANIMATIONS = {
  durations: {
    fast: 150,
    normal: 250,
    slow: 400,
    popup: 4500, // 4.5s auto-dismiss
  },
  spring: {
    bounce: {
      tension: 75,
      friction: 9,
    },
    snappy: {
      tension: 80,
      friction: 8,
    },
    gentle: {
      tension: 60,
      friction: 12,
    },
  },
};
