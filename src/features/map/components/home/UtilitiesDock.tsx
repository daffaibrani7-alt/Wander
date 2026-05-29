import React, { useState, useRef } from "react";
import { View, StyleSheet, Pressable, Animated, Platform } from "react-native";
import { Sliders, Bell, MapPin, Compass, Lock, Smartphone, Award, Plus } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { GlassCard } from "@/shared/components/GlassCard";
import { COLORS } from "@/shared/theme/colors";
import { SPACING } from "@/shared/theme/spacing";
import { ZINDEX } from "@/shared/theme/zIndex";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";

interface UtilitiesDockProps {
  unreadCount: number;
  showNotifCenter: boolean;
  onNotifCenterPress: () => void;
  showSavedPlaces: boolean;
  onSavedPlacesPress: () => void;
  isExplorationActive: boolean;
  onExplorationPress: () => void;
  isLockScreenSimulated: boolean;
  onLockScreenPress: () => void;
  isWidgetSimulatorActive: boolean;
  onWidgetSimulatorPress: () => void;
  isDashboardActive: boolean;
  onDashboardPress: () => void;
  overlayOpacity: Animated.Value;
}

export function UtilitiesDock({
  unreadCount,
  showNotifCenter,
  onNotifCenterPress,
  showSavedPlaces,
  onSavedPlacesPress,
  isExplorationActive,
  onExplorationPress,
  isLockScreenSimulated,
  onLockScreenPress,
  isWidgetSimulatorActive,
  onWidgetSimulatorPress,
  isDashboardActive,
  onDashboardPress,
  overlayOpacity,
}: UtilitiesDockProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  const [expanded, setExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    WANDER_HAPTICS.light();
    const toValue = expanded ? 0 : 1;
    setExpanded(!expanded);
    Animated.spring(expandAnim, {
      toValue,
      tension: 60,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleAction = (callback: () => void) => {
    WANDER_HAPTICS.tick();
    callback();
    // Keep it expanded or auto-collapse? Let's keep it expanded for quick actions.
  };

  // FAB button rotation
  const spin = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "135deg"],
  });

  // Secondary vertical panel slide/fade
  const panelStyle = {
    opacity: expandAnim,
    transform: [
      {
        translateY: expandAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
      {
        scale: expandAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }),
      },
    ],
  };

  const borderOpacity = isDark ? 0.08 : 0.06;
  const borderColor = isDark 
    ? `rgba(255, 255, 255, ${borderOpacity})` 
    : `rgba(0, 0, 0, ${borderOpacity})`;

  const resolvedBg = isDark
    ? "rgba(18, 18, 22, 0.78)"
    : "rgba(255, 255, 255, 0.88)";

  const fabButton = (
    <Pressable
      id="utilities-menu-toggle-button"
      onPress={toggleExpand}
      style={styles.fabPressable}
    >
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Plus size={22} color={expanded ? COLORS.pink : theme.text} />
      </Animated.View>
    </Pressable>
  );

  return (
    <Animated.View style={[styles.container, { opacity: overlayOpacity }]} pointerEvents="box-none">
      {/* Expandable Menu Shelf Card */}
      {expanded && (
        <Animated.View style={[styles.shelfCardWrapper, panelStyle]}>
          <GlassCard style={styles.shelfCard} tier="medium">
            <View style={styles.gridColumn}>
              {/* Notification Toggler */}
              <Pressable
                id="notifications-bell-button"
                onPress={() => handleAction(onNotifCenterPress)}
                style={[styles.menuBtn, showNotifCenter && styles.activeBtn]}
              >
                <Bell size={18} color={showNotifCenter ? COLORS.cyan : theme.text} />
                {unreadCount > 0 && <View style={styles.unreadBadge} />}
              </Pressable>

              {/* Saved Places */}
              <Pressable
                id="saved-places-bookmark-button"
                onPress={() => handleAction(onSavedPlacesPress)}
                style={[styles.menuBtn, showSavedPlaces && styles.activeBtn]}
              >
                <MapPin size={18} color={showSavedPlaces ? COLORS.cyan : theme.text} />
              </Pressable>

              {/* Exploration Compass */}
              <Pressable
                id="exploration-mode-toggle-button"
                onPress={() => handleAction(onExplorationPress)}
                style={[styles.menuBtn, isExplorationActive && styles.activeBtn]}
              >
                <Compass size={18} color={isExplorationActive ? COLORS.green : theme.text} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: borderColor }]} />

              {/* Lock Simulator */}
              <Pressable
                id="lock-screen-toggle-button"
                onPress={() => handleAction(onLockScreenPress)}
                style={[styles.menuBtn, isLockScreenSimulated && styles.activeBtn]}
              >
                <Lock size={16} color={isLockScreenSimulated ? COLORS.purple : theme.text} />
              </Pressable>

              {/* Widget Simulator */}
              <Pressable
                id="widget-simulator-toggle-button"
                onPress={() => handleAction(onWidgetSimulatorPress)}
                style={[styles.menuBtn, isWidgetSimulatorActive && styles.activeBtn]}
              >
                <Smartphone size={16} color={isWidgetSimulatorActive ? COLORS.cyan : theme.text} />
              </Pressable>

              {/* Achievements Dashboard */}
              <Pressable
                id="exploration-achievements-dashboard-button"
                onPress={() => handleAction(onDashboardPress)}
                style={[styles.menuBtn, isDashboardActive && styles.activeBtn]}
              >
                <Award size={16} color={isDashboardActive ? COLORS.cyan : theme.text} />
              </Pressable>
            </View>
          </GlassCard>
        </Animated.View>
      )}

      {/* Main Single Expandable FAB */}
      <View
        style={[
          styles.mainFab,
          {
            borderColor: expanded ? COLORS.pink + "44" : borderColor,
            backgroundColor: Platform.OS === "web" ? resolvedBg : "transparent",
            shadowColor: isDark ? "#000" : "rgba(0,0,0,0.12)",
          },
        ]}
      >
        {Platform.OS === "web" ? (
          fabButton
        ) : (
          <BlurView intensity={85} tint={isDark ? "dark" : "light"} style={styles.blurView}>
            {fabButton}
          </BlurView>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 116 : 96,
    right: 20,
    zIndex: ZINDEX.overlays,
    alignItems: "center",
    gap: 8,
  },
  mainFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  blurView: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  fabPressable: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  shelfCardWrapper: {
    marginBottom: 4,
  },
  shelfCard: {
    padding: 6,
    borderRadius: 20,
  },
  gridColumn: {
    flexDirection: "column",
    gap: 6,
    alignItems: "center",
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  activeBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  divider: {
    width: 24,
    height: 1,
    marginVertical: 4,
  },
  unreadBadge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.pink,
    position: "absolute",
    top: 6,
    right: 6,
  },
});
