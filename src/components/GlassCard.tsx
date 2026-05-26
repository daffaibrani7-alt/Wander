import React from "react";
import { View, StyleSheet, ViewStyle, Platform } from "react-native";
import { COLORS } from "../theme/colors";
import { useThemeStore } from "../store/useThemeStore";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export function GlassCard({ children, style }: GlassCardProps) {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = COLORS.get(isDark);

  return (
    <View
      style={[
        styles.glass,
        {
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          shadowColor: isDark ? "#000" : "rgba(0, 0, 0, 0.1)",
        },
        ...(Array.isArray(style) ? style : [style]),
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      },
    }),
  },
});

export default GlassCard;
