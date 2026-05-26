import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { COLORS } from "../theme/colors";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
}

export function GlassCard({ children, style, className }: GlassCardProps) {
  return (
    <View style={[styles.glass, style]} className={className}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: "rgba(24, 24, 27, 0.8)", // Frosted dark gray zinc-900
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
});
export default GlassCard;
