/**
 * typography.ts
 *
 * Typography scale and font weights tokens.
 */
export const TYPOGRAPHY = {
  sizes: {
    xs: 10,
    sm: 11,
    md: 12,
    base: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    title: 28,
    clock: 84,
  },
  weights: {
    thin: "300" as const,
    regular: "normal" as const,
    medium: "600" as const,
    semibold: "700" as const,
    bold: "800" as const,
    heavy: "900" as const,
  },
  letterSpacings: {
    tighter: -0.5,
    tight: -0.2,
    normal: 0,
    wide: 0.5,
    wider: 1.0,
    widest: 1.5,
  },
};
