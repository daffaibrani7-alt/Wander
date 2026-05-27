/**
 * motion.ts
 *
 * Defines Apple-quality premium Spring Physics configurations
 * and interactive animation timing configurations.
 */

export const MOTION_SPRINGS = {
  // Stiff and snappy, ideal for toggle buttons, icon pops, and immediate responses
  stiffSnappy: {
    tension: 180,
    friction: 12,
  },
  // Bounceless and premium, ideal for drawer sheets, pages, and large containers
  premiumBounceless: {
    tension: 100,
    friction: 20,
  },
  // Soft and springy, ideal for game cards, map unlocks, and badge popups
  fluidBounce: {
    tension: 70,
    friction: 8,
  },
  // Slow and immersive, ideal for cinematic panning, memory reveals, and ambient fades
  slowImmersive: {
    tension: 30,
    friction: 12,
  },
};

export const MOTION_DURATIONS = {
  instant: 100,
  micro: 180,
  fluid: 300,
  delightful: 500,
  cinematic: 1200,
};
