import React from "react";
import { View, StyleSheet, ViewStyle, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { COLORS } from "@/shared/theme/colors";
import { useThemeStore } from "@/features/settings/store/useThemeStore";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  tier?: "light" | "medium" | "solid";
}

export function GlassCard({ children, style, tier = "medium" }: GlassCardProps) {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = COLORS.get(isDark);

  const blurIntensity = tier === "light" ? 40 : tier === "medium" ? 70 : 100;
  
  const borderOpacity = tier === "light" ? 0.05 : tier === "medium" ? 0.09 : 0.15;
  const cardBorderColor = isDark 
    ? `rgba(255, 255, 255, ${borderOpacity})` 
    : `rgba(0, 0, 0, ${borderOpacity})`;

  const cardBgColor = isDark
    ? tier === "light"
      ? "rgba(18, 18, 22, 0.45)"
      : tier === "medium"
      ? "rgba(18, 18, 22, 0.75)"
      : "rgba(24, 24, 28, 0.96)"
    : tier === "light"
    ? "rgba(255, 255, 255, 0.55)"
    : tier === "medium"
    ? "rgba(255, 255, 255, 0.85)"
    : "rgba(242, 242, 247, 0.98)";

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.glass,
          {
            backgroundColor: cardBgColor,
            borderColor: cardBorderColor,
            shadowColor: isDark ? "#000" : "rgba(0, 0, 0, 0.06)",
            shadowOpacity: tier === "light" ? 0.03 : tier === "medium" ? 0.06 : 0.1,
            shadowRadius: tier === "light" ? 6 : tier === "medium" ? 12 : 20,
            elevation: tier === "light" ? 2 : tier === "medium" ? 4 : 6,
          },
          ...(Array.isArray(style) ? style : [style]),
        ]}
      >
        {children}
      </View>
    );
  }

  // Native iOS / Android – use expo-blur
  return (
    <BlurView
      intensity={blurIntensity}
      tint={isDark ? "dark" : "light"}
      style={[
        styles.glass,
        {
          backgroundColor: cardBgColor,
          borderColor: cardBorderColor,
          shadowColor: isDark ? "#000" : "rgba(0, 0, 0, 0.06)",
          shadowOpacity: tier === "light" ? 0.03 : tier === "medium" ? 0.06 : 0.1,
          shadowRadius: tier === "light" ? 6 : tier === "medium" ? 12 : 20,
          elevation: tier === "light" ? 2 : tier === "medium" ? 4 : 6,
          overflow: "hidden",
        },
        ...(Array.isArray(style) ? style : [style]),
      ]}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      },
    }),
  },
});

export default GlassCard;
