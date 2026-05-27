/**
 * AchievementUnlockPopup.tsx
 *
 * A premium, Apple-style top banner that slides down dynamically when
 * the user unlocks an achievement or reaches a new level.
 * Features glowing rarity backdrops, rotating SVGs, and automated haptic triggers.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Platform,
  Pressable,
} from "react-native";
import { BlurView } from "expo-blur";
import { Award, Zap, X } from "lucide-react-native";
import { COLORS } from "../theme/colors";
import { useThemeStore } from "../store/useThemeStore";
import { useAchievementStore, UnlockEvent } from "../store/useAchievementStore";
import Svg, { Path, G } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function AchievementUnlockPopup() {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  const {
    lastUnlockNotification,
    lastLevelUpNotification,
    clearNotifications,
  } = useAchievementStore();

  const [activeUnlock, setActiveUnlock] = useState<UnlockEvent | null>(null);
  const [activeLevelUp, setActiveLevelUp] = useState<number | null>(null);

  // ─── Animations ─────────────────────────────────────────────────────────────
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Starburst rotation loop
  useEffect(() => {
    if (activeUnlock || activeLevelUp) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 10000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [activeUnlock, activeLevelUp, spinAnim]);

  // Handle store state notifications
  useEffect(() => {
    if (lastUnlockNotification) {
      setActiveUnlock(lastUnlockNotification);
      setActiveLevelUp(null);
      triggerEntrance();
    } else if (lastLevelUpNotification) {
      setActiveLevelUp(lastLevelUpNotification);
      setActiveUnlock(null);
      triggerEntrance();
    } else {
      triggerExit();
    }
  }, [lastUnlockNotification, lastLevelUpNotification]); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerEntrance = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: Platform.OS === "ios" ? 60 : 40,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto close after 4.5 seconds
    const timer = setTimeout(() => {
      clearNotifications();
    }, 4500);

    return () => clearTimeout(timer);
  };

  const triggerExit = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 250,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveUnlock(null);
      setActiveLevelUp(null);
    });
  };

  if (!activeUnlock && !activeLevelUp) return null;

  // Resolve rarity visuals
  let accentColor = COLORS.cyan;
  let shadowColor = "rgba(0, 240, 255, 0.4)";
  let badgeTitle = "PENCAPAIAN BARU!";
  let bannerDesc = "";
  let bannerEmoji = "🏆";

  if (activeUnlock) {
    bannerEmoji = activeUnlock.emoji;
    bannerDesc = activeUnlock.name;
    const r = activeUnlock.rarity.toUpperCase();
    if (r === "COMMON") {
      accentColor = "#E5E5EA";
      shadowColor = "rgba(229, 229, 234, 0.2)";
      badgeTitle = "COMMON ACHIEVED 🌱";
    } else if (r === "RARE") {
      accentColor = "#00A2FF";
      shadowColor = "rgba(0, 162, 255, 0.4)";
      badgeTitle = "RARE UNLOCKED 💙";
    } else if (r === "EPIC") {
      accentColor = "#8A3FFC";
      shadowColor = "rgba(138, 63, 252, 0.6)";
      badgeTitle = "EPIC ACHIEVED 💜";
    } else if (r === "LEGENDARY") {
      accentColor = "#FF8A00";
      shadowColor = "rgba(255, 138, 0, 0.8)";
      badgeTitle = "LEGENDARY UNLOCKED 🔥";
    }
  } else if (activeLevelUp !== null) {
    accentColor = "#FFD700"; // Gold
    shadowColor = "rgba(255, 215, 0, 0.6)";
    badgeTitle = "LEVEL UP WANDERER! 🎉";
    bannerDesc = `Level ${activeLevelUp} Tercapai`;
    bannerEmoji = "✨";
  }

  const interpolatedSpin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const glassBg = isDark ? "rgba(18, 18, 24, 0.94)" : "rgba(255, 255, 255, 0.94)";
  const borderColor = accentColor + "33"; // 20% opacity border

  return (
    <Animated.View
      style={[
        styles.popupContainer,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
          shadowColor: accentColor,
          shadowOpacity: isDark ? 0.35 : 0.18,
          shadowRadius: 15,
        },
      ]}
    >
      {Platform.OS === "web" ? (
        <View style={[styles.card, { backgroundColor: glassBg, borderColor }]}>
          {renderContent()}
        </View>
      ) : (
        <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.blurFill}>
          <View style={[styles.card, { backgroundColor: glassBg, borderColor }]}>
            {renderContent()}
          </View>
        </BlurView>
      )}
    </Animated.View>
  );

  function renderContent() {
    return (
      <View style={styles.cardContent}>
        {/* Animated Rotating Starburst Background */}
        <Animated.View
          style={[
            styles.starburstContainer,
            { transform: [{ rotate: interpolatedSpin }] },
          ]}
        >
          <Svg width={180} height={180} viewBox="0 0 100 100">
            <G fill={accentColor} opacity={0.06}>
              {/* Starburst rays */}
              <Path d="M50,50 L45,0 L55,0 Z" />
              <Path d="M50,50 L100,45 L100,55 Z" />
              <Path d="M50,50 L45,100 L55,100 Z" />
              <Path d="M50,50 L0,45 L0,55 Z" />
              <Path d="M50,50 L18,18 L26,11 Z" />
              <Path d="M50,50 L82,18 L89,26 Z" />
              <Path d="M50,50 L82,82 L74,89 Z" />
              <Path d="M50,50 L18,82 L11,74 Z" />
            </G>
          </Svg>
        </Animated.View>

        {/* Floating Accent Ring */}
        <View style={[styles.glowingRing, { borderColor: accentColor }]}>
          {activeLevelUp !== null ? (
            <Zap size={24} color={accentColor} fill={accentColor} />
          ) : (
            <Text style={styles.emoji}>{bannerEmoji}</Text>
          )}
        </View>

        {/* Text Area */}
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: accentColor }]}>{badgeTitle}</Text>
          <Text style={[styles.description, { color: theme.text }]}>
            {bannerDesc}
          </Text>
          {activeUnlock && (
            <Text style={styles.rewardText}>
              + {activeUnlock.xpReward} XP Hadiah
            </Text>
          )}
          {activeLevelUp !== null && (
            <Text style={styles.rewardText}>
              Batas Eksplorasi Anda Meningkat!
            </Text>
          )}
        </View>

        {/* Close Button */}
        <Pressable
          id="close-unlock-popup-btn"
          onPress={clearNotifications}
          style={styles.closeBtn}
        >
          <X size={14} color={theme.textMuted} />
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  popupContainer: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    borderRadius: 22,
    zIndex: 999,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  blurFill: {
    borderRadius: 22,
    overflow: "hidden",
  },
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    height: 80,
    position: "relative",
  },
  starburstContainer: {
    position: "absolute",
    left: -20,
    top: -50,
    width: 180,
    height: 180,
    pointerEvents: "none",
  },
  glowingRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: "rgba(18, 18, 22, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 2,
  },
  emoji: {
    fontSize: 22,
    textAlign: "center",
  },
  textBlock: {
    marginLeft: 14,
    flex: 1,
    zIndex: 2,
  },
  title: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    fontFamily: "System",
  },
  description: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: -0.2,
    fontFamily: "System",
  },
  rewardText: {
    fontSize: 10,
    color: "#2BE080",
    fontWeight: "700",
    marginTop: 2,
    fontFamily: "System",
  },
  closeBtn: {
    padding: 6,
    zIndex: 3,
  },
});
