import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Animated,
  Keyboard,
  Platform,
} from "react-native";
import { Search, X, Navigation } from "lucide-react-native";
import { GlassCard } from "@/shared/components/GlassCard";
import { COLORS } from "@/shared/theme/colors";
import { SPACING } from "@/shared/theme/spacing";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";

interface TopSearchBarProps {
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

export function TopSearchBar({
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
}: TopSearchBarProps) {
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

  const handleFocus = () => {
    setIsSearchFocused(true);
    Animated.timing(searchWidthAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsSearchFocused(false);
    Keyboard.dismiss();
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

  return (
    <Animated.View style={[styles.container, { opacity: overlayOpacity }]} pointerEvents="box-none">
      {/* Profile / Ghost mode button */}
      <Animated.View style={{ transform: [{ scale: profilePulse }] }}>
        <Pressable
          id="profile-button"
          onPress={() => {
            WANDER_HAPTICS.tick();
            onProfilePress();
          }}
          style={[
            styles.profileBtn,
            {
              backgroundColor: isDark ? "rgba(18,18,22,0.9)" : "rgba(255,255,255,0.92)",
              borderColor: currentGhostColor + "55",
              shadowColor: currentGhostColor,
            },
          ]}
        >
          <Text style={styles.profileEmoji}>{userAvatarEmoji}</Text>
          <View style={[styles.ghostDot, { backgroundColor: currentGhostColor }]} />
        </Pressable>
      </Animated.View>

      {/* Search bar */}
      <Animated.View
        style={[
          styles.searchWrap,
          {
            flex: searchWidthAnim.interpolate({ inputRange: [0, 1], outputRange: [0.01, 1] }),
          },
        ]}
      >
        <GlassCard style={styles.searchCard}>
          <View style={styles.searchRow}>
            <Search size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              id="search-input"
              placeholder="Cari teman..."
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={[styles.searchInput, { color: theme.text }]}
              returnKeyType="search"
            />
            {isSearchFocused && (
              <Pressable onPress={handleBlur} style={{ padding: 4 }}>
                <X size={14} color={theme.textMuted} />
              </Pressable>
            )}
          </View>
        </GlassCard>
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
        <Pressable
          id="recenter-button"
          onPress={handleRecenter}
          style={[
            styles.iconBtn,
            {
              backgroundColor: isDark ? "rgba(18,18,22,0.9)" : "rgba(255,255,255,0.92)",
              borderColor: followUser
                ? COLORS.cyan + "66"
                : isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.08)",
              shadowColor: followUser ? COLORS.cyan : "#000",
              shadowOpacity: followUser ? 0.35 : 0.12,
              shadowRadius: followUser ? 10 : 8,
            },
          ]}
        >
          {followUser ? (
            <Navigation size={18} color={COLORS.cyan} fill={COLORS.cyan} strokeWidth={2.5} />
          ) : (
            <Navigation size={18} color={theme.text} strokeWidth={2} />
          )}
        </Pressable>
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
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
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
  },
  searchWrap: {
    height: 44,
  },
  searchCard: {
    padding: 0,
    paddingHorizontal: SPACING.md,
    height: 44,
    justifyContent: "center",
    borderRadius: 14,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    height: 38,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "System",
    padding: 0,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
});
