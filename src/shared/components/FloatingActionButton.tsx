import React from "react";
import { Pressable, StyleSheet, Platform, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { COLORS } from "@/shared/theme/colors";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";
import { useThemeStore } from "@/features/settings/store/useThemeStore";

interface FloatingActionButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: number;
  style?: ViewStyle | ViewStyle[];
  blurTint?: "light" | "dark" | "default";
  glowColor?: string;
}

export function FloatingActionButton({
  icon,
  onPress,
  size = 52,
  style,
  blurTint,
  glowColor,
}: FloatingActionButtonProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    WANDER_HAPTICS.light();
    scale.value = withSpring(0.92, { damping: 12, stiffness: 350 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 350 });
  };

  const resolvedTint = blurTint || (isDark ? "dark" : "light");

  const borderOpacity = isDark ? 0.08 : 0.06;
  const borderColor = isDark 
    ? `rgba(255, 255, 255, ${borderOpacity})` 
    : `rgba(0, 0, 0, ${borderOpacity})`;

  const resolvedBg = isDark
    ? "rgba(18, 18, 22, 0.78)"
    : "rgba(255, 255, 255, 0.88)";

  const content = (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed }) => [
        styles.pressable,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      {icon}
    </Pressable>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: glowColor ? glowColor + "44" : borderColor,
          borderWidth: 1,
          backgroundColor: Platform.OS === "web" ? resolvedBg : "transparent",
          shadowColor: glowColor || (isDark ? "#000" : "rgba(0,0,0,0.15)"),
          shadowOpacity: glowColor ? 0.25 : 0.12,
          shadowRadius: glowColor ? 12 : 8,
          shadowOffset: { width: 0, height: 4 },
        },
        ...(Array.isArray(style) ? style : [style]),
      ]}
    >
      {Platform.OS === "web" ? (
        content
      ) : (
        <BlurView
          intensity={85}
          tint={resolvedTint}
          style={[styles.blurView, { borderRadius: size / 2 }]}
        >
          {content}
        </BlurView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  blurView: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  pressable: {
    alignItems: "center",
    justifyContent: "center",
  },
});
