import React, { useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Platform } from "react-native";
import { Navigation } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { COLORS } from "@/shared/theme/colors";
import { SPACING } from "@/shared/theme/spacing";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";
import { HomeSearchBar } from "./HomeSearchBar";

interface HomeHeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSearchFocused: boolean;
  setIsSearchFocused: (f: boolean) => void;
  userAvatarEmoji: string;
  currentGhostColor: string;
  followUser: boolean;
  onProfilePress: () => void;
  onRecenterPress: () => void;
  overlayOpacity: Animated.Value;
}

export function HomeHeader({
  searchQuery,
  setSearchQuery,
  isSearchFocused,
  setIsSearchFocused,
  userAvatarEmoji,
  currentGhostColor,
  followUser,
  onProfilePress,
  onRecenterPress,
  overlayOpacity,
}: HomeHeaderProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  const searchWidthAnim = useRef(new Animated.Value(1)).current;
  const profilePulse = useRef(new Animated.Value(1)).current;
  const recenterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(profilePulse, { toValue: 1.04, duration: 1500, useNativeDriver: true }),
        Animated.timing(profilePulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    Animated.timing(searchWidthAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    Animated.timing(searchWidthAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleRecenter = () => {
    WANDER_HAPTICS.light();
    onRecenterPress();
    Animated.sequence([
      Animated.timing(recenterAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(recenterAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const borderOpacity = isDark ? 0.12 : 0.06;
  const defaultBorderColor = isDark
    ? `rgba(255, 255, 255, ${borderOpacity})`
    : `rgba(0, 0, 0, ${borderOpacity})`;

  const profileButtonContent = (
    <Pressable
      id="profile-button"
      onPress={() => {
        WANDER_HAPTICS.tick();
        onProfilePress();
      }}
      style={styles.btnPressable}
    >
      <Text style={styles.profileEmoji}>{userAvatarEmoji}</Text>
      <View style={[styles.ghostDot, { backgroundColor: currentGhostColor }]} />
    </Pressable>
  );

  const recenterButtonContent = (
    <Pressable
      id="recenter-button"
      onPress={handleRecenter}
      style={styles.btnPressable}
    >
      {followUser ? (
        <Navigation size={18} color={COLORS.cyan} fill={COLORS.cyan} strokeWidth={2.5} />
      ) : (
        <Navigation size={18} color={theme.text} strokeWidth={2} />
      )}
    </Pressable>
  );

  const blurTint = Platform.OS === "ios"
    ? (isDark ? "systemChromeMaterialDark" : "systemChromeMaterialLight")
    : (isDark ? "dark" : "light");

  return (
    <Animated.View style={[styles.container, { opacity: overlayOpacity }]} pointerEvents="box-none">
      {/* Profile / Ghost mode button */}
      <Animated.View style={{ transform: [{ scale: profilePulse }] }}>
        <View
          style={[
            styles.profileBtn,
            {
              borderColor: currentGhostColor ? currentGhostColor + "55" : defaultBorderColor,
              shadowColor: currentGhostColor || "#000",
              shadowOpacity: currentGhostColor ? 0.25 : 0.08,
              shadowRadius: 12,
              backgroundColor: Platform.OS === "web" ? (isDark ? "rgba(18,18,22,0.85)" : "rgba(255,255,255,0.88)") : "transparent",
            },
          ]}
        >
          {Platform.OS === "web" ? (
            profileButtonContent
          ) : (
            <BlurView intensity={90} tint={blurTint} style={[styles.blurView, { borderRadius: 14, overflow: "hidden" }]}>
              {profileButtonContent}
            </BlurView>
          )}
        </View>
      </Animated.View>

      {/* Memoized/Isolated Search bar wrapper */}
      <Animated.View
        style={[
          styles.searchWrap,
          {
            flex: searchWidthAnim.interpolate({ inputRange: [0, 1], outputRange: [0.01, 1] }),
          },
        ]}
      >
        <HomeSearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSearchFocused={isSearchFocused}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
        />
      </Animated.View>

      {/* Recenter button (Apple Maps Style) */}
      <Animated.View
        style={{
          transform: [
            {
              scale: recenterAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] }),
            },
          ],
        }}
      >
        <View
          style={[
            styles.iconBtn,
            {
              borderColor: followUser ? COLORS.cyan + "66" : defaultBorderColor,
              shadowColor: followUser ? COLORS.cyan : "#000",
              shadowOpacity: followUser ? 0.35 : 0.08,
              shadowRadius: followUser ? 10 : 12,
              backgroundColor: Platform.OS === "web" ? (isDark ? "rgba(18,18,22,0.85)" : "rgba(255,255,255,0.88)") : "transparent",
            },
          ]}
        >
          {Platform.OS === "web" ? (
            recenterButtonContent
          ) : (
            <BlurView intensity={90} tint={blurTint} style={[styles.blurView, { borderRadius: 14, overflow: "hidden" }]}>
              {recenterButtonContent}
            </BlurView>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 32,
    left: 20,
    right: 20,
    flexDirection: "row",
    gap: SPACING.md,
    alignItems: "center",
    zIndex: 10,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    position: "relative",
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  blurView: {
    width: "100%",
    height: "100%",
  },
  btnPressable: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  profileEmoji: {
    fontSize: 22,
  },
  ghostDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#000000",
    position: "absolute",
    bottom: -2,
    right: -2,
    zIndex: 2,
  },
  searchWrap: {
    height: 44,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
