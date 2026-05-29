import React from "react";
import { View, Text, StyleSheet, Pressable, Animated, Platform } from "react-native";
import { GlassCard } from "@/shared/components/GlassCard";
import { COLORS } from "@/shared/theme/colors";
import { SPACING } from "@/shared/theme/spacing";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";

type GhostModeType = "precise" | "blurry" | "frozen";

interface GhostModePickerProps {
  showGhostPicker: boolean;
  ghostPickerAnim: Animated.Value;
  ghostMode: GhostModeType;
  handleGhostMode: (mode: GhostModeType) => void;
}

const GHOST_MODES: { mode: GhostModeType; label: string; color: string; icon: string }[] = [
  { mode: "precise", label: "Akurat", color: COLORS.cyan, icon: "📡" },
  { mode: "blurry", label: "Samar", color: COLORS.pink, icon: "🌫️" },
  { mode: "frozen", label: "Beku", color: COLORS.purple, icon: "❄️" },
];

export function GhostModePicker({
  showGhostPicker,
  ghostPickerAnim,
  ghostMode,
  handleGhostMode,
}: GhostModePickerProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  return (
    <Animated.View
      pointerEvents={showGhostPicker ? "auto" : "none"}
      style={[
        styles.container,
        {
          opacity: ghostPickerAnim,
          transform: [
            {
              translateY: ghostPickerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }),
            },
            {
              scale: ghostPickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
            },
          ],
        },
      ]}
    >
      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: theme.textMuted }]}>MODE LOKASI</Text>
        {GHOST_MODES.map((item) => (
          <Pressable
            key={item.mode}
            id={`ghost-mode-${item.mode}`}
            onPress={() => {
              WANDER_HAPTICS.medium();
              handleGhostMode(item.mode);
            }}
            style={[
              styles.row,
              ghostMode === item.mode && { backgroundColor: item.color + "18" },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: item.color + "25" }]}>
              <Text style={{ fontSize: 14 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.text }]}>{item.label}</Text>
              <Text style={[styles.desc, { color: theme.textMuted }]}>
                {item.mode === "precise" && "Lokasi tepat ditampilkan"}
                {item.mode === "blurry" && "Lokasi disamarkan ~1km"}
                {item.mode === "frozen" && "Lokasi dibekukan di sini"}
              </Text>
            </View>
            {ghostMode === item.mode && (
              <View style={[styles.activeCheck, { backgroundColor: item.color }]} />
            )}
          </Pressable>
        ))}
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "ios" ? 108 : 88,
    left: 20,
    zIndex: 99,
    width: 220,
  },
  card: {
    padding: SPACING.md,
    borderRadius: 20,
  },
  title: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
    fontFamily: "System",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.sm,
    borderRadius: 12,
    marginBottom: 4,
    gap: SPACING.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "System",
  },
  desc: {
    fontSize: 9,
    fontWeight: "500",
    marginTop: 2,
    fontFamily: "System",
  },
  activeCheck: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
