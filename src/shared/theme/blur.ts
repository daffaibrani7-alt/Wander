/**
 * blur.ts
 *
 * Blur intensity and tint configurations for frosted glass layouts.
 */
export const BLUR = {
  intensity: {
    light: 50,
    medium: 80,
    heavy: 90,
    full: 98,
  },
  tint: {
    light: "light" as const,
    dark: "dark" as const,
    default: "default" as const,
  },
};
