import React, { useEffect, useRef, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Dimensions,
  Platform,
  Animated,
} from "react-native";
import { BlurView } from "expo-blur";
import { X, Award, Flame, Navigation, Users, Calendar } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import { COLORS } from "../theme/colors";
import { useThemeStore } from "../store/useThemeStore";
import { useGamificationStore } from "../store/useGamificationStore";
import { useExplorationStore } from "../store/useExplorationStore";
import { ACHIEVEMENTS_LIST } from "../services/achievementService";
import { explorationService } from "../services/explorationService";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ExplorationDashboardProps {
  visible: boolean;
  onClose: () => void;
}

export function ExplorationDashboard({ visible, onClose }: ExplorationDashboardProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  const {
    unlockedBadges,
    streakCount,
    totalDistance,
    dailyExploredCount,
    leaderboard,
  } = useGamificationStore();

  const { totalVisitedCount, exploredPercent } = useExplorationStore();

  // Slide drawer animation
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      tension: 75,
      friction: 9,
      useNativeDriver: true,
    }).start();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compile timeline travel recap memories
  const memories = useMemo(() => {
    return explorationService.compileTimeline(dailyExploredCount, totalDistance);
  }, [dailyExploredCount, totalDistance]);

  if (!visible) return null;

  const glassBg = isDark ? "rgba(10, 10, 15, 0.94)" : "rgba(255, 255, 255, 0.96)";
  const glassBorder = isDark ? "rgba(0, 240, 255, 0.12)" : "rgba(0, 85, 255, 0.08)";
  const textColor = isDark ? "#FFFFFF" : "#1C1C1E";
  const labelColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)";

  const handleBadgePress = (badgeName: string, isUnlocked: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    if (isUnlocked) {
      // Small bounce on active unlock badge
      console.log(`Badge tapped: ${badgeName}`);
    }
  };

  // Render SVG Circular Progress Ring
  const renderProgressRing = (
    size: number,
    strokeWidth: number,
    percent: number,
    color: string
  ) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (Math.min(100, percent) / 100) * circumference;

    return (
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          stroke={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)"}
          fill="transparent"
          strokeWidth={strokeWidth}
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        {/* Active progress */}
        <Circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    );
  };

  const renderDashboardContent = () => (
    <View style={styles.dashboardContainer}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerCenterTitle}>
          <Award size={15} color={COLORS.cyan} style={{ marginRight: 6 }} />
          <Text style={[styles.headerCenterText, { color: textColor }]}>PUSAT PETUALANGAN</Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onClose();
          }}
          style={styles.closeBtn}
        >
          <X size={16} color={textColor} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── SECTION 1: STATS rings & streaks ── */}
        <View style={[styles.statsSection, { borderColor: glassBorder }]}>
          <View style={styles.ringsContainer}>
            {/* Left Ring: Visited */}
            <View style={styles.ringCard}>
              <View style={styles.ringRelative}>
                {renderProgressRing(90, 8, exploredPercent * 10, COLORS.cyan)}
                <View style={styles.ringCenterText}>
                  <Text style={[styles.ringBigVal, { color: textColor }]}>{totalVisitedCount}</Text>
                  <Text style={[styles.ringSmallLabel, { color: labelColor }]}>Grid</Text>
                </View>
              </View>
              <Text style={[styles.ringTitle, { color: textColor }]}>Jelajah</Text>
              <Text style={[styles.ringSub, { color: labelColor }]}>{exploredPercent}% Peta</Text>
            </View>

            {/* Right Ring: Distance */}
            <View style={styles.ringCard}>
              <View style={styles.ringRelative}>
                {renderProgressRing(90, 8, Math.min(100, (totalDistance / 5) * 100), COLORS.purple)}
                <View style={styles.ringCenterText}>
                  <Text style={[styles.ringBigVal, { color: textColor }]}>{totalDistance}</Text>
                  <Text style={[styles.ringSmallLabel, { color: labelColor }]}>km</Text>
                </View>
              </View>
              <Text style={[styles.ringTitle, { color: textColor }]}>Jarak</Text>
              <Text style={[styles.ringSub, { color: labelColor }]}>Jelajah total</Text>
            </View>

            {/* Streak Box */}
            <View style={styles.ringCard}>
              <View style={[styles.streakCircle, { backgroundColor: isDark ? "rgba(255,138,0,0.12)" : "rgba(255,138,0,0.06)", borderColor: "rgba(255,138,0,0.25)" }]}>
                <Flame size={28} color="#FF8A00" />
                <Text style={styles.streakCountNumber}>{streakCount}</Text>
              </View>
              <Text style={[styles.ringTitle, { color: textColor }]}>Streak</Text>
              <Text style={[styles.ringSub, { color: labelColor }]}>{streakCount} Hari Aktif</Text>
            </View>
          </View>
        </View>

        {/* ── SECTION 2: achievements BADGES GRID ── */}
        <Text style={[styles.sectionTitle, { color: textColor }]}>🏅 BADGE PENCAPAIAN</Text>
        <View style={styles.badgesGrid}>
          {ACHIEVEMENTS_LIST.map((badge) => {
            const isUnlocked = unlockedBadges.includes(badge.id);
            const badgeBg = isUnlocked
              ? `${badge.color}18`
              : isDark
              ? "rgba(255,255,255,0.02)"
              : "rgba(0,0,0,0.02)";
            const badgeBorder = isUnlocked
              ? `${badge.color}66`
              : isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.06)";

            return (
              <Pressable
                key={badge.id}
                onPress={() => handleBadgePress(badge.name, isUnlocked)}
                style={[
                  styles.badgeCard,
                  {
                    backgroundColor: badgeBg,
                    borderColor: badgeBorder,
                  },
                ]}
              >
                {/* Badge Emoji Circle */}
                <View
                  style={[
                    styles.badgeEmojiBg,
                    {
                      backgroundColor: isUnlocked ? badge.color : "rgba(255,255,255,0.03)",
                      shadowColor: isUnlocked ? badge.color : "transparent",
                    },
                  ]}
                >
                  <Text style={[styles.badgeEmojiText, { opacity: isUnlocked ? 1.0 : 0.25 }]}>
                    {badge.emoji}
                  </Text>
                </View>

                {/* Badge Details */}
                <Text style={[styles.badgeTitle, { color: isUnlocked ? textColor : "rgba(128,128,128,0.7)" }]} numberOfLines={1}>
                  {badge.name}
                </Text>
                <Text style={[styles.badgeSub, { color: labelColor }]} numberOfLines={2}>
                  {isUnlocked ? badge.description : badge.requirement}
                </Text>

                {/* Status Badge Tag */}
                <View style={[styles.badgeTag, { backgroundColor: isUnlocked ? `${COLORS.green}20` : "rgba(128,128,128,0.1)" }]}>
                  <Text style={[styles.badgeTagText, { color: isUnlocked ? COLORS.green : labelColor }]}>
                    {isUnlocked ? "UNLOCKED" : "LOCKED"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── SECTION 3: FRIEND LEADERBOARD ── */}
        <Text style={[styles.sectionTitle, { color: textColor }]}>📊 LEADERBOARD MENJELAJAH</Text>
        <View style={[styles.leaderboardBox, { borderColor: glassBorder, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)" }]}>
          <View style={styles.leaderboardHeader}>
            <Users size={14} color={COLORS.cyan} style={{ marginRight: 6 }} />
            <Text style={[styles.leaderboardHeaderText, { color: textColor }]}>SKOR LEADERBOARD TEMAN</Text>
          </View>

          <View style={styles.leaderboardList}>
            {leaderboard.map((entry) => {
              const isMe = entry.uid === "me";
              const percent = Math.min(100, Math.max(8, (entry.count / 1000) * 100));

              return (
                <View key={entry.uid} style={styles.leaderboardRow}>
                  <View style={styles.rowLeft}>
                    <Text style={[styles.rowRank, { color: isMe ? COLORS.cyan : textColor }]}>
                      #{entry.rank}
                    </Text>
                    <View style={styles.miniAvatar}>
                      <Text style={styles.miniAvatarEmoji}>{entry.avatarEmoji}</Text>
                    </View>
                    <Text style={[styles.rowName, { color: isMe ? COLORS.cyan : textColor, fontWeight: isMe ? "900" : "800" }]} numberOfLines={1}>
                      {entry.name}
                    </Text>
                  </View>

                  <View style={styles.rowRight}>
                    <View style={styles.meterContainer}>
                      <View style={[styles.meterTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }]}>
                        <View
                          style={[
                            styles.meterBar,
                            {
                              width: `${percent}%`,
                              backgroundColor: isMe ? COLORS.cyan : COLORS.green,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={[styles.rowScore, { color: textColor }]}>
                      {entry.count} grid
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── SECTION 4: EXPLORATION MEMORIES TIMELINE ── */}
        <Text style={[styles.sectionTitle, { color: textColor }]}>📅 MEMORI PERJALANAN</Text>
        <View style={styles.timelineList}>
          {memories.map((memory) => (
            <View key={memory.id} style={[styles.timelineCard, { borderColor: glassBorder, backgroundColor: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)" }]}>
              <View style={styles.timelineCardHeader}>
                <View style={styles.timelineDayIndicator}>
                  <Calendar size={13} color={COLORS.cyan} style={{ marginRight: 6 }} />
                  <Text style={[styles.timelineDayText, { color: textColor }]}>
                    {memory.dayName}, {memory.date}
                  </Text>
                </View>
                <View style={styles.timelineStatsPill}>
                  <Navigation size={10} color={COLORS.purple} style={{ marginRight: 4 }} />
                  <Text style={styles.timelineStatsPillText}>
                    {memory.distance} km • {memory.tilesCount} Grid
                  </Text>
                </View>
              </View>
              <Text style={[styles.timelineDesc, { color: labelColor }]}>
                {memory.description}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      {Platform.OS === "web" ? (
        <View style={[styles.wallpaper, { backgroundColor: glassBg }]}>
          {renderDashboardContent()}
        </View>
      ) : (
        <BlurView intensity={98} tint={isDark ? "dark" : "light"} style={styles.wallpaper}>
          {renderDashboardContent()}
        </BlurView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
  },
  wallpaper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dashboardContainer: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 54 : 32,
    alignItems: "center",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 18,
    height: 48,
    borderBottomWidth: 1.5,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  headerCenterTitle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 240, 255, 0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.2)",
  },
  headerCenterText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  scrollArea: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 64,
  },

  // Stats Section Styles
  statsSection: {
    width: "100%",
    borderRadius: 22,
    borderWidth: 1.5,
    marginVertical: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.01)",
  },
  ringsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  ringCard: {
    alignItems: "center",
    width: SCREEN_WIDTH / 3.8,
  },
  ringRelative: {
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  ringCenterText: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  ringBigVal: {
    fontSize: 16,
    fontWeight: "900",
  },
  ringSmallLabel: {
    fontSize: 8,
    fontWeight: "600",
    marginTop: -2,
  },
  ringTitle: {
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8,
  },
  ringSub: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },
  streakCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  streakCountNumber: {
    color: "#FF8A00",
    fontSize: 14,
    fontWeight: "900",
    marginTop: -1,
  },

  // Achievements section
  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 12,
    paddingLeft: 4,
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  badgeCard: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 10,
    alignItems: "center",
    justifyContent: "space-between",
    height: 128,
  },
  badgeEmojiBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  badgeEmojiText: {
    fontSize: 20,
  },
  badgeTitle: {
    fontSize: 11,
    fontWeight: "900",
    marginTop: 6,
  },
  badgeSub: {
    fontSize: 8,
    fontWeight: "600",
    textAlign: "center",
    opacity: 0.8,
    marginTop: 2,
    paddingHorizontal: 4,
    flex: 1,
  },
  badgeTag: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  badgeTagText: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // Leaderboard Styles
  leaderboardBox: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
  },
  leaderboardHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    paddingBottom: 8,
    marginBottom: 8,
  },
  leaderboardHeaderText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  leaderboardList: {
    gap: 10,
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1.2,
  },
  rowRank: {
    fontSize: 10,
    fontWeight: "900",
    width: 22,
  },
  miniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  miniAvatarEmoji: {
    fontSize: 10,
  },
  rowName: {
    fontSize: 11,
    fontWeight: "800",
    flex: 1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1.8,
    gap: 8,
  },
  meterContainer: {
    flex: 1,
  },
  meterTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: "hidden",
  },
  meterBar: {
    height: "100%",
    borderRadius: 2.5,
  },
  rowScore: {
    fontSize: 10,
    fontWeight: "800",
    width: 48,
    textAlign: "right",
  },

  // Timeline Memory Styles
  timelineList: {
    gap: 12,
  },
  timelineCard: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 12,
  },
  timelineCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
    paddingBottom: 6,
    marginBottom: 6,
  },
  timelineDayIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  timelineDayText: {
    fontSize: 10,
    fontWeight: "900",
  },
  timelineStatsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(138,63,252,0.1)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  timelineStatsPillText: {
    color: COLORS.purple,
    fontSize: 8,
    fontWeight: "900",
  },
  timelineDesc: {
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 14,
  },
});
