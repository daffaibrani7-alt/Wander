export const COLORS = {
  // Brand/Aesthetic colors (Sleek Apple / ChatGPT vibe)
  green: "#2BE080",      // Active, high battery
  cyan: "#00F0FF",       // Regular markers, precise mode
  purple: "#8A3FFC",     // Frozen mode, primary UI accent
  pink: "#FF5B99",       // Blurry mode, ghost mode indicator
  yellow: "#FFF500",     // Charging, highlights
  
  // Theme dependent styling helper
  get: (isDark: boolean) => ({
    bg: isDark ? "#000000" : "#F2F2F7",
    cardBg: isDark ? "rgba(24, 24, 27, 0.82)" : "rgba(255, 255, 255, 0.88)",
    cardBorder: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
    text: isDark ? "#FFFFFF" : "#000000",
    textMuted: isDark ? "rgba(255, 255, 255, 0.55)" : "rgba(0, 0, 0, 0.5)",
    border: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
    tabBarBg: isDark ? "rgba(10, 10, 10, 0.85)" : "rgba(255, 255, 255, 0.85)",
    inputBg: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
  }),
};
