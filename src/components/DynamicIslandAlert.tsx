import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, Pressable, Platform, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { X, MessageCircle, Navigation } from "lucide-react-native";
import { COLORS } from "../theme/colors";
import { useThemeStore } from "../store/useThemeStore";
import { useLiveActivityStore } from "../store/useLiveActivityStore";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface DynamicIslandAlertProps {
  visible?: boolean;
  title?: string;
  body?: string;
  emoji?: string;
  onDismiss?: () => void;
}

export function DynamicIslandAlert({
  visible: propVisible,
  title: propTitle,
  body: propBody,
  emoji: propEmoji = "📍",
  onDismiss: propOnDismiss,
}: DynamicIslandAlertProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  // Zustand Store linkage
  const {
    islandState,
    islandData,
    setIslandState,
    collapseIsland,
  } = useLiveActivityStore();

  // Determine active data source (props for backward compatibility, store for Live Activities)
  const isUsingStore = propVisible === undefined;
  const isVisible = isUsingStore ? islandState !== "collapsed" : !!propVisible;
  const titleText = isUsingStore ? islandData?.title || "" : propTitle || "";
  const bodyText = isUsingStore ? islandData?.body || "" : propBody || "";
  const activeEmoji = isUsingStore ? islandData?.emoji || "🔔" : propEmoji;
  const category = isUsingStore ? islandData?.category || "Alert" : "Alert";
  const actions = isUsingStore ? islandData?.actions || [] : [];

  // Morph Shared Values
  const widthVal = useSharedValue(120);
  const heightVal = useSharedValue(32);
  const opacityVal = useSharedValue(0);
  const contentOpacityVal = useSharedValue(0);

  // Spring options mimicking native iOS bouncy physics
  const springConfig = {
    damping: 15,
    stiffness: 100,
    mass: 0.8,
  };

  useEffect(() => {
    if (isVisible) {
      opacityVal.value = withSpring(1, springConfig);
      
      const activeState = isUsingStore ? islandState : "compact";

      if (activeState === "expanded") {
        // Expand Island to rich control card
        widthVal.value = withSpring(SCREEN_WIDTH - 32, springConfig);
        heightVal.value = withSpring(150, springConfig);
        contentOpacityVal.value = withDelay(100, withSpring(1, springConfig));
      } else {
        // Compact Alert bubble
        widthVal.value = withSpring(340, springConfig);
        heightVal.value = withSpring(72, springConfig);
        contentOpacityVal.value = withDelay(80, withSpring(1, springConfig));
      }
    } else {
      // Collapse
      contentOpacityVal.value = withSpring(0, springConfig);
      widthVal.value = withSpring(120, springConfig);
      heightVal.value = withSpring(32, springConfig);
      opacityVal.value = withSpring(0, springConfig);
    }
  }, [isVisible, islandState, propVisible]);

  const handleTapIsland = () => {
    if (!isUsingStore) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (islandState === "compact") {
      setIslandState("expanded");
    } else if (islandState === "expanded") {
      setIslandState("compact");
    }
  };

  const handleLongPressIsland = () => {
    if (!isUsingStore) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (islandState === "compact") {
      setIslandState("expanded");
    }
  };

  const handleDismiss = () => {
    Haptics.selectionAsync().catch(() => {});
    if (isUsingStore) {
      collapseIsland();
    } else if (propOnDismiss) {
      propOnDismiss();
    }
  };

  const handleExecuteAction = (actionKey: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    collapseIsland();
    
    // Simulate action alert
    setTimeout(() => {
      alert(`Aksi "${actionKey === "ping" ? "Kirim Ping" : "Buka Peta"}" berhasil dikirim!`);
    }, 400);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: widthVal.value,
      height: heightVal.value,
      opacity: opacityVal.value,
    };
  });

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacityVal.value,
    };
  });

  if (!isVisible) return null;

  const renderCompactContent = () => (
    <View style={styles.compactRow}>
      <View style={styles.emojiContainer}>
        <Text style={styles.emojiText}>{activeEmoji}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.titleText} numberOfLines={1}>
          {titleText}
        </Text>
        <Text style={styles.bodyText} numberOfLines={1}>
          {bodyText}
        </Text>
      </View>
    </View>
  );

  const renderExpandedContent = () => (
    <View style={styles.expandedContainer}>
      {/* Header section with categories */}
      <View style={styles.expandedHeader}>
        <View style={styles.expandedCategoryBox}>
          <Text style={styles.categoryEmoji}>{activeEmoji}</Text>
          <Text style={styles.categoryText}>{category.toUpperCase()}</Text>
        </View>
        <Pressable onPress={handleDismiss} style={styles.closeBtn}>
          <X size={14} color="#A0A0AB" />
        </Pressable>
      </View>

      {/* Main text message */}
      <View style={styles.expandedBody}>
        <Text style={styles.expandedTitle}>{titleText}</Text>
        <Text style={styles.expandedDesc} numberOfLines={2}>
          {bodyText}
        </Text>
      </View>

      {/* Action Buttons row (Apple style capsule buttons) */}
      {actions.length > 0 && (
        <View style={styles.actionsRow}>
          {actions.map((act) => (
            <Pressable
              key={act.actionKey}
              onPress={() => handleExecuteAction(act.actionKey)}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.08)" },
                pressed && styles.actionPressed,
              ]}
            >
              {act.actionKey === "ping" ? (
                <MessageCircle size={13} color={COLORS.cyan} style={styles.actionIcon} />
              ) : (
                <Navigation size={13} color={COLORS.purple} style={styles.actionIcon} />
              )}
              <Text style={styles.actionText}>{act.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  const renderContent = () => {
    const isExpanded = isUsingStore && islandState === "expanded";
    
    return (
      <Pressable
        onPress={handleTapIsland}
        onLongPress={handleLongPressIsland}
        delayLongPress={350}
        style={styles.clickableArea}
      >
        <Animated.View style={[styles.innerContent, animatedContentStyle]}>
          {isExpanded ? renderExpandedContent() : renderCompactContent()}
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View style={[styles.islandCapsule, animatedStyle]}>
        {Platform.OS === "web" ? (
          <View style={[styles.blurFallback, { backgroundColor: "rgba(10, 10, 14, 0.95)" }]}>
            {renderContent()}
          </View>
        ) : (
          <BlurView intensity={95} tint="dark" style={styles.blurContainer}>
            {renderContent()}
          </BlurView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 40,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999999,
  },
  islandCapsule: {
    borderRadius: 24,
    backgroundColor: "rgba(10, 10, 14, 0.85)",
    borderWidth: 1.5,
    borderColor: "rgba(0, 240, 255, 0.22)",
    overflow: "hidden",
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  blurContainer: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  blurFallback: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  clickableArea: {
    flex: 1,
    justifyContent: "center",
  },
  innerContent: {
    flex: 1,
    justifyContent: "center",
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  emojiText: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  titleText: {
    color: "#00F0FF",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.5,
    fontFamily: "System",
  },
  bodyText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 11,
    marginTop: 2,
    opacity: 0.85,
    fontFamily: "System",
  },

  // Expanded layout styles
  expandedContainer: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: "space-between",
  },
  expandedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expandedCategoryBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  categoryEmoji: {
    fontSize: 11,
    marginRight: 6,
  },
  categoryText: {
    color: "#A0A0AB",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  expandedBody: {
    marginTop: 6,
    paddingHorizontal: 2,
  },
  expandedTitle: {
    color: "#00F0FF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  expandedDesc: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
    opacity: 0.8,
    lineHeight: 15,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionIcon: {
    marginRight: 6,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
});
