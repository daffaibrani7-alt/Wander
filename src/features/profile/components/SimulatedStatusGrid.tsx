import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Battery, Shield } from "lucide-react-native";
import { GlassCard } from "@/shared/components/GlassCard";
import { COLORS } from "@/shared/theme/colors";
import { SPACING } from "@/shared/theme/spacing";
import { useThemeStore } from "@/features/settings/store/useThemeStore";

interface SimulatedStatusGridProps {
  totalDistance: number;
  streakCount: number;
  unlockedBadgesCount: number;
}

export function SimulatedStatusGrid({
  totalDistance,
  streakCount,
  unlockedBadgesCount,
}: SimulatedStatusGridProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  return (
    <View style={styles.container}>
      {/* Simulation Info */}
      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Status Perangkat (Simulated)</Text>
      <GlassCard style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Battery size={20} color={COLORS.green} />
            <View style={styles.statusMeta}>
              <Text style={[styles.statusLabel, { color: theme.textMuted }]}>Baterai</Text>
              <Text style={[styles.statusVal, { color: theme.text }]}>98%</Text>
            </View>
          </View>

          <View style={styles.statusItem}>
            <Shield size={20} color={COLORS.cyan} />
            <View style={styles.statusMeta}>
              <Text style={[styles.statusLabel, { color: theme.textMuted }]}>Mode Radar</Text>
              <Text style={[styles.statusVal, { color: theme.text }]}>Precise</Text>
            </View>
          </View>
        </View>
      </GlassCard>

      {/* Gamifikasi & Statistik Eksplorasi */}
      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Gamifikasi & Statistik 🏆</Text>
      <GlassCard style={styles.friendCard}>
        <View style={styles.statsRowGrid}>
          <View style={styles.statsGridItem}>
            <Text style={styles.statsEmoji}>🏔️</Text>
            <Text style={[styles.statsLabelSmall, { color: theme.textMuted }]}>Total Jarak</Text>
            <Text style={[styles.statsValue, { color: theme.text }]}>{totalDistance} km</Text>
          </View>
          <View style={styles.statsGridItem}>
            <Text style={styles.statsEmoji}>🔥</Text>
            <Text style={[styles.statsLabelSmall, { color: theme.textMuted }]}>Streak Hari</Text>
            <Text style={[styles.statsValue, { color: theme.text }]}>{streakCount} Hari</Text>
          </View>
          <View style={styles.statsGridItem}>
            <Text style={styles.statsEmoji}>🔓</Text>
            <Text style={[styles.statsLabelSmall, { color: theme.textMuted }]}>Badge Buka</Text>
            <Text style={[styles.statsValue, { color: theme.text }]}>{unlockedBadgesCount} / 12</Text>
          </View>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 10,
    paddingLeft: 4,
  },
  statusCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusMeta: {
    marginLeft: 12,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "System",
  },
  statusVal: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
    fontFamily: "System",
  },
  friendCard: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 20,
  },
  statsRowGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  statsGridItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  statsEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  statsLabelSmall: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
    fontFamily: "System",
  },
  statsValue: {
    fontSize: 14,
    fontWeight: "900",
    fontFamily: "System",
  },
});
