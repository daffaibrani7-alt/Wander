/**
 * ExplorationDashboard.tsx
 *
 * Upgraded premium Apple-style Achievements & Missions Center overlay.
 * Renders a segmented two-tab frosted glass container:
 * 1. "Statistik & Memori": original rings, friends leaderboards, and replaying timeline cards.
 * 2. "Misi & Pencapaian": leveling XP slider HUD, daily/weekly seeded checklists, and categorized badges.
 * Includes interactive Equip controls and a Simulation Speed trigger for verification.
 */
import React, { useEffect, useRef, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Dimensions,
  Platform,
  Animated,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import {
  X,
  Award,
  Flame,
  Navigation,
  Users,
  Calendar,
  Play,
  Zap,
  CheckCircle2,
  Lock,
  Compass,
} from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import { COLORS } from "@/shared/theme/colors";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { useGamificationStore } from "@/features/exploration/store/useGamificationStore";
import { useExplorationStore } from "@/features/exploration/store/useExplorationStore";
import { useAchievementStore } from "@/features/achievements/store/useAchievementStore";
import { BADGES_REGISTRY, BADGE_RARITY_PROFILES } from "@/features/achievements/services/badgeSystem";
import { getLevelInfoFromXP } from "@/features/achievements/services/progressionEngine";
import { explorationService } from "@/features/exploration/services/explorationService";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ExplorationDashboardProps {
  visible: boolean;
  onClose: () => void;
}

export function ExplorationDashboard({
  visible,
  onClose,
}: ExplorationDashboardProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  const [activeTab, setActiveTab] = useState<"stats" | "achievements">("stats");

  // ─── Gamification & Exploration State ──────────────────────────────────────
  const {
    streakCount,
    totalDistance,
    dailyExploredCount,
    leaderboard,
  } = useGamificationStore();

  const {
    totalVisitedCount,
    exploredPercent,
    startReplay,
    coordinateHistory,
  } = useExplorationStore();

  // ─── Advanced Achievements State ───────────────────────────────────────────
  const {
    xp,
    level,
    equippedBadgeId,
    unlockedBadges,
    dailyMissions,
    weeklyChallenges,
    equipBadgeAction,
    triggerMockSpeedCompletion,
  } = useAchievementStore();

  const levelInfo = useMemo(() => getLevelInfoFromXP(xp), [xp]);

  // Slide drawer animation
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      tension: 75,
      friction: 9,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  // Compile timeline travel recap memories
  const memories = useMemo(() => {
    return explorationService.compileTimeline(dailyExploredCount, totalDistance);
  }, [dailyExploredCount, totalDistance]);

  if (!visible) return null;

  const glassBg = isDark ? "rgba(10, 10, 15, 0.94)" : "rgba(255, 255, 255, 0.96)";
  const glassBorder = isDark ? "rgba(0, 240, 255, 0.12)" : "rgba(0, 85, 255, 0.08)";
  const textColor = isDark ? "#FFFFFF" : "#1C1C1E";
  const labelColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)";

  const handleEquipBadge = (badgeId: string, isEquipped: boolean) => {
    if (isEquipped) {
      equipBadgeAction(null); // Unequip
    } else {
      equipBadgeAction(badgeId);
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
    const strokeDashoffset =
      circumference - (Math.min(100, percent) / 100) * circumference;

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

  const renderStatsTab = () => (
    <>
      {/* ── SECTION 1: STATS rings & streaks ── */}
      <View style={[styles.statsSection, { borderColor: glassBorder }]}>
        <View style={styles.ringsContainer}>
          {/* Left Ring: Visited */}
          <View style={styles.ringCard}>
            <View style={styles.ringRelative}>
              {renderProgressRing(90, 8, exploredPercent * 10, COLORS.cyan)}
              <View style={styles.ringCenterText}>
                <Text style={[styles.ringBigVal, { color: textColor }]}>
                  {totalVisitedCount}
                </Text>
                <Text style={[styles.ringSmallLabel, { color: labelColor }]}>
                  Grid
                </Text>
              </View>
            </View>
            <Text style={[styles.ringTitle, { color: textColor }]}>Jelajah</Text>
            <Text style={[styles.ringSub, { color: labelColor }]}>
              {exploredPercent}% Peta
            </Text>
          </View>

          {/* Right Ring: Distance */}
          <View style={styles.ringCard}>
            <View style={styles.ringRelative}>
              {renderProgressRing(
                90,
                8,
                Math.min(100, (totalDistance / 5) * 100),
                COLORS.purple
              )}
              <View style={styles.ringCenterText}>
                <Text style={[styles.ringBigVal, { color: textColor }]}>
                  {totalDistance}
                </Text>
                <Text style={[styles.ringSmallLabel, { color: labelColor }]}>
                  km
                </Text>
              </View>
            </View>
            <Text style={[styles.ringTitle, { color: textColor }]}>Jarak</Text>
            <Text style={[styles.ringSub, { color: labelColor }]}>
              Jelajah total
            </Text>
          </View>

          {/* Streak Box */}
          <View style={styles.ringCard}>
            <View
              style={[
                styles.streakCircle,
                {
                  backgroundColor: isDark
                    ? "rgba(255,138,0,0.12)"
                    : "rgba(255,138,0,0.06)",
                  borderColor: "rgba(255,138,0,0.25)",
                },
              ]}
            >
              <Flame size={28} color="#FF8A00" />
              <Text style={styles.streakCountNumber}>{streakCount}</Text>
            </View>
            <Text style={[styles.ringTitle, { color: textColor }]}>Streak</Text>
            <Text style={[styles.ringSub, { color: labelColor }]}>
              {streakCount} Hari Aktif
            </Text>
          </View>
        </View>
      </View>

      {/* ── SECTION 2: FRIEND LEADERBOARD ── */}
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        📊 LEADERBOARD MENJELAJAH
      </Text>
      <View
        style={[
          styles.leaderboardBox,
          {
            borderColor: glassBorder,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.02)"
              : "rgba(0,0,0,0.01)",
          },
        ]}
      >
        <View style={styles.leaderboardHeader}>
          <Users size={14} color={COLORS.cyan} style={{ marginRight: 6 }} />
          <Text style={[styles.leaderboardHeaderText, { color: textColor }]}>
            SKOR LEADERBOARD TEMAN
          </Text>
        </View>

        <View style={styles.leaderboardList}>
          {leaderboard.map((entry) => {
            const isMe = entry.uid === "me";
            const percent = Math.min(
              100,
              Math.max(8, (entry.count / 1000) * 100)
            );

            return (
              <View key={entry.uid} style={styles.leaderboardRow}>
                <View style={styles.rowLeft}>
                  <Text
                    style={[
                      styles.rowRank,
                      { color: isMe ? COLORS.cyan : textColor },
                    ]}
                  >
                    #{entry.rank}
                  </Text>
                  <View style={styles.miniAvatar}>
                    <Text style={styles.miniAvatarEmoji}>{entry.avatarEmoji}</Text>
                  </View>
                  <Text
                    style={[
                      styles.rowName,
                      {
                        color: isMe ? COLORS.cyan : textColor,
                        fontWeight: isMe ? "900" : "800",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {entry.name}
                  </Text>
                </View>

                <View style={styles.rowRight}>
                  <View style={styles.meterContainer}>
                    <View
                      style={[
                        styles.meterTrack,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.04)",
                        },
                      ]}
                    >
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

      {/* ── SECTION 3: EXPLORATION MEMORIES TIMELINE ── */}
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        📅 MEMORI PERJALANAN
      </Text>
      <View style={styles.timelineList}>
        {memories.map((memory) => (
          <View
            key={memory.id}
            style={[
              styles.timelineCard,
              {
                borderColor: glassBorder,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.01)"
                  : "rgba(0,0,0,0.01)",
              },
            ]}
          >
            <View style={styles.timelineCardHeader}>
              <View style={styles.timelineDayIndicator}>
                <Calendar size={13} color={COLORS.cyan} style={{ marginRight: 6 }} />
                <Text style={[styles.timelineDayText, { color: textColor }]}>
                  {memory.dayName}, {memory.date}
                </Text>
              </View>
              <View style={styles.timelineStatsPill}>
                <Text style={styles.timelineStatsPillText}>
                  {memory.tilesCount} GRID UNLOCKED
                </Text>
              </View>
            </View>
            <Text style={[styles.timelineDesc, { color: theme.text }]}>
              {memory.description}
            </Text>
            {coordinateHistory.length > 0 && (
              <Pressable
                id={`replay-journey-${memory.id}`}
                onPress={() => {
                  startReplay();
                  onClose();
                }}
                style={[
                  styles.replayBtn,
                  {
                    borderColor: isDark
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(0,0,0,0.08)",
                  },
                ]}
              >
                <Play size={10} color={COLORS.purple} fill={COLORS.purple} />
                <Text style={[styles.replayBtnText, { color: theme.text }]}>
                  Replay Perjalanan
                </Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
    </>
  );

  const renderAchievementsTab = () => (
    <>
      {/* ── SECTION 1: LEVEL XP HUD CARD ── */}
      <View style={[styles.levelUpCard, { borderColor: glassBorder }]}>
        <View style={styles.levelProgressContainer}>
          {/* Level Circle */}
          <View
            style={[
              styles.levelCircle,
              {
                borderColor: COLORS.cyan,
                shadowColor: COLORS.cyan,
              },
            ]}
          >
            <Zap size={14} color={COLORS.cyan} fill={COLORS.cyan} />
            <Text style={styles.levelCircleVal}>Lv.{level}</Text>
          </View>

          {/* Level Progress Bar */}
          <View style={styles.xpBlock}>
            <View style={styles.xpTextRow}>
              <Text style={styles.xpProgressLabel}>XP LEVELING</Text>
              <Text style={styles.xpValLabel}>
                {levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP
              </Text>
            </View>
            <View
              style={[
                styles.xpProgressTrack,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                },
              ]}
            >
              <View
                style={[
                  styles.xpProgressBar,
                  {
                    width: `${levelInfo.progressPercent * 100}%`,
                    backgroundColor: COLORS.cyan,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* ── SECTION 2: DAILY & WEEKLY MISSIONS ── */}
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        📅 MISI & TANTANGAN AKTIF
      </Text>
      <View style={styles.missionsContainer}>
        {/* Daily Missions */}
        {dailyMissions.map((mission) => {
          const isSpeedType = mission.type === "SPEED";

          return (
            <View
              key={mission.id}
              style={[
                styles.missionItem,
                {
                  borderColor: mission.completed
                    ? "rgba(43, 224, 128, 0.4)"
                    : glassBorder,
                  backgroundColor: mission.completed
                    ? "rgba(43, 224, 128, 0.04)"
                    : "rgba(255,255,255,0.01)",
                },
              ]}
            >
              <View style={styles.missionHeader}>
                <View style={styles.checkboxContainer}>
                  {mission.completed ? (
                    <CheckCircle2 size={18} color={COLORS.green} />
                  ) : (
                    <View
                      style={[
                        styles.emptyCheckbox,
                        { borderColor: theme.textMuted },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.missionText}>
                  <Text style={[styles.missionTitle, { color: textColor }]}>
                    {mission.title}
                  </Text>
                  <Text style={[styles.missionDesc, { color: theme.textMuted }]}>
                    {mission.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.xpBadge,
                    {
                      backgroundColor: mission.completed
                        ? "rgba(43, 224, 128, 0.15)"
                        : "rgba(255,255,255,0.05)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.xpBadgeText,
                      { color: mission.completed ? COLORS.green : theme.text },
                    ]}
                  >
                    +{mission.xpReward} XP
                  </Text>
                </View>
              </View>

              {/* Progress Slider */}
              <View style={styles.missionProgressWrapper}>
                <View style={styles.missionBarTrack}>
                  <View
                    style={[
                      styles.missionBarFill,
                      {
                        width: `${Math.round(
                          (mission.current / mission.target) * 100
                        )}%`,
                        backgroundColor: mission.completed
                          ? COLORS.green
                          : COLORS.cyan,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.missionProgressVal, { color: theme.text }]}>
                  {mission.current} / {mission.target}{" "}
                  {mission.type === "DISTANCE" ? "km" : "grid"}
                </Text>
              </View>

              {/* Simulated Speed Trigger Button */}
              {isSpeedType && !mission.completed && (
                <Pressable
                  id="simulate-speed-btn"
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                    triggerMockSpeedCompletion();
                  }}
                  style={styles.simSpeedBtn}
                >
                  <Compass size={11} color="#FFF" style={{ marginRight: 4 }} />
                  <Text style={styles.simSpeedBtnText}>Simulasikan Speed</Text>
                </Pressable>
              )}
            </View>
          );
        })}

        {/* Weekly Challenges */}
        {weeklyChallenges.map((challenge) => (
          <View
            key={challenge.id}
            style={[
              styles.missionItem,
              {
                borderColor: challenge.completed
                  ? "rgba(138, 63, 252, 0.4)"
                  : glassBorder,
                backgroundColor: challenge.completed
                  ? "rgba(138, 63, 252, 0.04)"
                  : "rgba(255,255,255,0.01)",
              },
            ]}
          >
            <View style={styles.missionHeader}>
              <View style={styles.checkboxContainer}>
                {challenge.completed ? (
                  <CheckCircle2 size={18} color={COLORS.purple} />
                ) : (
                  <View
                    style={[
                      styles.emptyCheckbox,
                      { borderColor: theme.textMuted },
                    ]}
                  />
                )}
              </View>
              <View style={styles.missionText}>
                <Text style={[styles.missionTitle, { color: textColor }]}>
                  {challenge.title}
                </Text>
                <Text style={[styles.missionDesc, { color: theme.textMuted }]}>
                  {challenge.description}
                </Text>
              </View>
              <View
                style={[
                  styles.xpBadge,
                  {
                    backgroundColor: challenge.completed
                      ? "rgba(138, 63, 252, 0.15)"
                      : "rgba(255,255,255,0.05)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.xpBadgeText,
                    { color: challenge.completed ? COLORS.purple : theme.text },
                  ]}
                >
                  +{challenge.xpReward} XP
                </Text>
              </View>
            </View>

            {/* Progress Slider */}
            <View style={styles.missionProgressWrapper}>
              <View style={styles.missionBarTrack}>
                <View
                  style={[
                    styles.missionBarFill,
                    {
                      width: `${Math.round(
                        (challenge.current / challenge.target) * 100
                      )}%`,
                      backgroundColor: challenge.completed
                        ? COLORS.purple
                        : COLORS.cyan,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.missionProgressVal, { color: theme.text }]}>
                {challenge.current} / {challenge.target}{" "}
                {challenge.type === "DISTANCE" ? "km" : "grid"}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── SECTION 3: ADVANCED BADGES SHOWCASE ── */}
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        🏅 SHOWCASE BADGE & RARITAS
      </Text>
      <View style={styles.badgesGrid}>
        {BADGES_REGISTRY.map((badge) => {
          const isUnlocked = unlockedBadges.includes(badge.id);
          const isEquipped = equippedBadgeId === badge.id;
          const rarity = BADGE_RARITY_PROFILES[badge.rarity];

          const badgeBg = isUnlocked
            ? rarity.bg
            : isDark
            ? "rgba(255,255,255,0.015)"
            : "rgba(0,0,0,0.015)";
          
          const badgeBorder = isUnlocked
            ? rarity.color + "66"
            : isDark
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,0,0,0.05)";

          return (
            <Pressable
              key={badge.id}
              disabled={!isUnlocked}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                handleEquipBadge(badge.id, isEquipped);
              }}
              style={[
                styles.badgeCard,
                {
                  backgroundColor: badgeBg,
                  borderColor: isEquipped ? COLORS.cyan : badgeBorder,
                  shadowColor: isUnlocked ? rarity.color : "transparent",
                  shadowOpacity: isUnlocked ? 0.35 : 0,
                  shadowRadius: 8,
                },
              ]}
            >
              {/* Badge Emoji Circle */}
              <View
                style={[
                  styles.badgeEmojiBg,
                  {
                    backgroundColor: isUnlocked
                      ? rarity.color + "22"
                      : isDark
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(0,0,0,0.03)",
                    borderColor: isUnlocked ? rarity.color : "transparent",
                    borderWidth: isUnlocked ? 1.5 : 0,
                  },
                ]}
              >
                {isUnlocked ? (
                  <Text style={styles.badgeEmojiText}>{badge.emoji}</Text>
                ) : (
                  <Lock size={15} color={theme.textMuted} />
                )}
              </View>

              {/* Badge Details */}
              <Text
                style={[
                  styles.badgeTitle,
                  {
                    color: isUnlocked ? textColor : "rgba(128,128,128,0.7)",
                    fontWeight: "900",
                  },
                ]}
                numberOfLines={1}
              >
                {badge.name}
              </Text>
              <Text
                style={[
                  styles.badgeSub,
                  { color: isUnlocked ? theme.text : labelColor },
                ]}
                numberOfLines={2}
              >
                {isUnlocked ? badge.description : badge.requirement}
              </Text>

              {/* Rarity and Equip Status Tags */}
              <View style={styles.badgeFooterTags}>
                <View
                  style={[
                    styles.badgeTag,
                    {
                      backgroundColor: isUnlocked
                        ? rarity.color + "22"
                        : "rgba(128,128,128,0.1)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeTagText,
                      { color: isUnlocked ? rarity.color : labelColor },
                    ]}
                  >
                    {rarity.name.toUpperCase()}
                  </Text>
                </View>

                {isUnlocked && (
                  <View
                    style={[
                      styles.equipIndicator,
                      {
                        backgroundColor: isEquipped
                          ? "rgba(0, 240, 255, 0.15)"
                          : "rgba(255,255,255,0.06)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.equipIndicatorText,
                        { color: isEquipped ? COLORS.cyan : theme.text },
                      ]}
                    >
                      {isEquipped ? "EQUIPPED" : "TAP EQUIP"}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  const renderDashboardContent = () => (
    <View style={styles.dashboardContainer}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerCenterTitle}>
          <Award size={15} color={COLORS.cyan} style={{ marginRight: 6 }} />
          <Text style={[styles.headerCenterText, { color: textColor }]}>
            PUSAT PETUALANGAN
          </Text>
        </View>
        <Pressable
          id="close-adventure-center-btn"
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onClose();
          }}
          style={styles.closeBtn}
        >
          <X size={16} color={textColor} />
        </Pressable>
      </View>

      {/* Frosted Segmented Tab Control */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.02)",
            borderColor: glassBorder,
          },
        ]}
      >
        <Pressable
          id="dashboard-tab-stats"
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setActiveTab("stats");
          }}
          style={[
            styles.tabButton,
            activeTab === "stats" && [
              styles.tabButtonActive,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(255,255,255,0.85)",
              },
            ],
          ]}
        >
          <Text
            style={[
              styles.tabButtonText,
              {
                color: activeTab === "stats" ? textColor : labelColor,
                fontWeight: activeTab === "stats" ? "900" : "600",
              },
            ]}
          >
            📊 Statistik & Memori
          </Text>
        </Pressable>

        <Pressable
          id="dashboard-tab-achievements"
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setActiveTab("achievements");
          }}
          style={[
            styles.tabButton,
            activeTab === "achievements" && [
              styles.tabButtonActive,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(255,255,255,0.85)",
              },
            ],
          ]}
        >
          <Text
            style={[
              styles.tabButtonText,
              {
                color: activeTab === "achievements" ? textColor : labelColor,
                fontWeight: activeTab === "achievements" ? "900" : "600",
              },
            ]}
          >
            🏆 Misi & Pencapaian
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "stats" ? renderStatsTab() : renderAchievementsTab()}
      </ScrollView>
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
    >
      {Platform.OS === "web" ? (
        <View
          style={[
            styles.sheet,
            { backgroundColor: glassBg, borderColor: glassBorder },
          ]}
        >
          {renderDashboardContent()}
        </View>
      ) : (
        <BlurView intensity={98} tint={isDark ? "dark" : "light"} style={styles.sheet}>
          <View
            style={[
              styles.sheetInner,
              { backgroundColor: glassBg, borderColor: glassBorder },
            ]}
          >
            {renderDashboardContent()}
          </View>
        </BlurView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 99,
  },
  sheet: {
    flex: 1,
  },
  sheetInner: {
    flex: 1,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  dashboardContainer: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 54 : 36,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerCenterTitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerCenterText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.5,
    fontFamily: "System",
  },
  closeBtn: {
    padding: 6,
  },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 14,
    padding: 3,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 11,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  statsSection: {
    width: "100%",
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.015)",
  },
  ringsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ringCard: {
    alignItems: "center",
    flex: 1,
  },
  ringRelative: {
    position: "relative",
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  ringCenterText: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  ringBigVal: {
    fontSize: 18,
    fontWeight: "900",
    fontFamily: "System",
  },
  ringSmallLabel: {
    fontSize: 9,
    fontWeight: "700",
    marginTop: 1,
    fontFamily: "System",
  },
  ringTitle: {
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8,
    fontFamily: "System",
  },
  ringSub: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
    fontFamily: "System",
  },
  streakCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#FF8A00",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  streakCountNumber: {
    position: "absolute",
    bottom: -6,
    backgroundColor: "#FF8A00",
    color: "#FFF",
    fontSize: 9,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1C1C1E",
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 12,
    marginBottom: 12,
    fontFamily: "System",
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 20,
  },
  badgeCard: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 12,
    alignItems: "center",
    position: "relative",
  },
  badgeEmojiBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  badgeEmojiText: {
    fontSize: 22,
  },
  badgeTitle: {
    fontSize: 12.5,
    fontFamily: "System",
    textAlign: "center",
  },
  badgeSub: {
    fontSize: 9,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 12,
    marginTop: 4,
    minHeight: 24,
    fontFamily: "System",
  },
  badgeFooterTags: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
  },
  badgeTag: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  badgeTagText: {
    fontSize: 7.5,
    fontWeight: "900",
    fontFamily: "System",
  },
  equipIndicator: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.08)",
  },
  equipIndicatorText: {
    fontSize: 7.5,
    fontWeight: "900",
    fontFamily: "System",
  },
  leaderboardBox: {
    width: "100%",
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
  },
  leaderboardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  leaderboardHeaderText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    fontFamily: "System",
  },
  leaderboardList: {
    gap: 12,
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
    fontSize: 11,
    fontWeight: "900",
    width: 24,
    fontFamily: "System",
  },
  miniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
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
  replayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  replayBtnText: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  // ─── Level Up Card Styles ───
  levelUpCard: {
    width: "100%",
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.015)",
  },
  levelProgressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  levelCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    backgroundColor: "rgba(18, 18, 22, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  levelCircleVal: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 1,
    fontFamily: "System",
  },
  xpBlock: {
    flex: 1,
    gap: 6,
  },
  xpTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  xpProgressLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: COLORS.cyan,
  },
  xpValLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFF",
  },
  xpProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  xpProgressBar: {
    height: "100%",
    borderRadius: 3,
  },

  // ─── Missions Panel Styles ───
  missionsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  missionItem: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1.2,
    padding: 14,
    gap: 10,
  },
  missionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkboxContainer: {
    marginTop: 2,
  },
  emptyCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  missionText: {
    flex: 1,
    gap: 2,
  },
  missionTitle: {
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "System",
  },
  missionDesc: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "System",
  },
  xpBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  xpBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    fontFamily: "System",
  },
  missionProgressWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  missionBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 2,
    overflow: "hidden",
  },
  missionBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  missionProgressVal: {
    fontSize: 9,
    fontWeight: "700",
    width: 48,
    textAlign: "right",
  },
  simSpeedBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cyan,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  simSpeedBtnText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "800",
  },
});
