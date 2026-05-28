/**
 * typography.ts
 *
 * Typography scale and font weights tokens.
 */
export const TYPOGRAPHY = {
  // Title Scale
  titleScale: {
    large: { fontSize: 34, fontWeight: "900" as const, letterSpacing: -1 },
    h1: { fontSize: 24, fontWeight: "800" as const, letterSpacing: -0.5 },
    h2: { fontSize: 20, fontWeight: "700" as const, letterSpacing: -0.3 },
    h3: { fontSize: 16, fontWeight: "600" as const, letterSpacing: -0.2 },
  },

  // Body Scale
  bodyScale: {
    large: { fontSize: 16, fontWeight: "500" as const },
    regular: { fontSize: 14, fontWeight: "normal" as const },
    medium: { fontSize: 14, fontWeight: "600" as const },
    semibold: { fontSize: 14, fontWeight: "700" as const },
  },

  // Caption Scale
  captionScale: {
    large: { fontSize: 12, fontWeight: "600" as const },
    regular: { fontSize: 12, fontWeight: "normal" as const },
    bold: { fontSize: 11, fontWeight: "800" as const, letterSpacing: 0.5 },
    tiny: { fontSize: 10, fontWeight: "900" as const, letterSpacing: 1 },
  },

  // Keep backward compatibility
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
