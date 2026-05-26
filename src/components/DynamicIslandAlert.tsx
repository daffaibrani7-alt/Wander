import React, { useEffect } from "react";
import { StyleSheet, Text, View, Pressable, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { COLORS } from "../theme/colors";

interface DynamicIslandAlertProps {
  visible: boolean;
  title: string;
  body: string;
  emoji?: string;
  onDismiss: () => void;
}

export function DynamicIslandAlert({
  visible,
  title,
  body,
  emoji = "📍",
  onDismiss,
}: DynamicIslandAlertProps) {
  const width = useSharedValue(120);
  const height = useSharedValue(32);
  const opacity = useSharedValue(0.7);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // 1. Expand Capsule
      width.value = withSpring(340, { damping: 14, stiffness: 90 });
      height.value = withSpring(72, { damping: 14, stiffness: 90 });
      opacity.value = withSpring(1, { damping: 12 });
      contentOpacity.value = withDelay(
        150,
        withSpring(1, { damping: 12 })
      );

      // 2. Auto Dismiss after 4.5 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 4500);

      return () => clearTimeout(timer);
    } else {
      // Collapse Capsule to default state
      width.value = withSpring(120, { damping: 15 });
      height.value = withSpring(32, { damping: 15 });
      opacity.value = withSpring(0.7, { damping: 15 });
      contentOpacity.value = withSpring(0);
    }
  }, [visible]);

  const handleDismiss = () => {
    contentOpacity.value = withSpring(0);
    width.value = withSpring(120, { damping: 15 });
    height.value = withSpring(32, { damping: 15 });
    opacity.value = withSpring(0, { damping: 15 });
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: width.value,
      height: height.value,
      opacity: opacity.value,
    };
  });

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
    };
  });

  if (!visible) return null;

  const renderContent = () => (
    <Pressable onPress={handleDismiss} style={styles.clickableArea}>
      <Animated.View style={[styles.innerContent, animatedContentStyle]}>
        <View style={styles.emojiContainer}>
          <Text style={styles.emojiText}>{emoji}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.bodyText} numberOfLines={1}>
            {body}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View style={[styles.islandCapsule, animatedStyle]}>
        {Platform.OS === "web" ? (
          <View style={[styles.blurFallback, { backgroundColor: "rgba(6, 6, 14, 0.96)" }]}>
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
    zIndex: 999,
  },
  islandCapsule: {
    borderRadius: 24,
    backgroundColor: "rgba(10, 10, 16, 0.75)",
    borderWidth: 1.5,
    borderColor: "rgba(0, 240, 255, 0.25)",
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
});
