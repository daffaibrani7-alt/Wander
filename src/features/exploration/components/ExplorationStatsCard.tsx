import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, Animated, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { Compass, Globe, CheckCircle } from "lucide-react-native";
import { COLORS } from "@/shared/theme/colors";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { useExplorationStore } from "@/features/exploration/store/useExplorationStore";

interface ExplorationStatsCardProps {
  visible: boolean;
}

export function ExplorationStatsCard({ visible }: ExplorationStatsCardProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  const { totalVisitedCount, exploredPercent } = useExplorationStore();

  // Slide-down animation
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : -140,
      tension: 90,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!visible) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  const glassBg = isDark ? "rgba(10, 10, 14, 0.85)" : "rgba(255, 255, 255, 0.76)";
  const glassBorder = isDark ? "rgba(0, 240, 255, 0.15)" : "rgba(0, 85, 255, 0.12)";
  const textColor = isDark ? "#FFFFFF" : "#1C1C1E";
  const labelColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)";

  const content = (
    <View style={[styles.cardInner, { borderColor: glassBorder }]}>
      {/* Header Indicator */}
      <View style={styles.header}>
        <View style={styles.radarWrapper}>
          <Animated.View style={[styles.radarPing, { opacity: pulseAnim, backgroundColor: COLORS.green }]} />
          <View style={[styles.radarCenter, { backgroundColor: COLORS.green }]} />
        </View>
        <Text style={[styles.radarLabel, { color: COLORS.green }]}>MODE EKSPLORASI AKTIF</Text>
      </View>

      {/* Main Grid Row */}
      <View style={styles.gridRow}>
        {/* Left Side: Count */}
        <View style={styles.statBox}>
          <Compass size={14} color={COLORS.cyan} style={{ marginRight: 6 }} />
          <View>
            <Text style={[styles.statValue, { color: textColor }]}>{totalVisitedCount}</Text>
            <Text style={[styles.statLabel, { color: labelColor }]}>Grid Dibuka</Text>
          </View>
        </View>

        {/* Vertical Separator */}
        <View style={[styles.separator, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }]} />

        {/* Right Side: Percent */}
        <View style={styles.statBox}>
          <Globe size={14} color={COLORS.purple} style={{ marginRight: 6 }} />
          <View>
            <Text style={[styles.statValue, { color: textColor }]}>{exploredPercent}%</Text>
            <Text style={[styles.statLabel, { color: labelColor }]}>Wilayah Unlocked</Text>
          </View>
        </View>
      </View>

      {/* Mini Progress Bar */}
      <View style={[styles.progressTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }]}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${Math.max(1, Math.min(100, exploredPercent * 10))}%`,
              backgroundColor: COLORS.cyan,
              shadowColor: COLORS.cyan,
            },
          ]}
        />
      </View>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      {Platform.OS === "web" ? (
        <View style={[styles.glassCard, { backgroundColor: glassBg }]}>
          {content}
        </View>
      ) : (
        <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.glassCard}>
          {content}
        </BlurView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "ios" ? 64 : 44,
    width: "100%",
    alignItems: "center",
    zIndex: 99999,
  },
  glassCard: {
    width: "88%",
    maxWidth: 360,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  cardInner: {
    padding: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  radarWrapper: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  radarPing: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radarCenter: {
    width: 6,
    height: 6,
    borderRadius: 3,
    zIndex: 2,
  },
  radarLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  statBox: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 1,
  },
  separator: {
    width: 1,
    height: 24,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
});
