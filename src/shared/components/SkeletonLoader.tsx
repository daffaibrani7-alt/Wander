import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useThemeStore } from "@/features/settings/store/useThemeStore";

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  variant?: "circle" | "rect" | "text";
  style?: ViewStyle;
}

export function SkeletonLoader({
  width = "100%",
  height = 20,
  variant = "rect",
  style,
}: SkeletonLoaderProps) {
  const isDark = useThemeStore((s) => s.isDark);
  
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.35, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const resolvedBg = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.06)";

  const borderRadius =
    variant === "circle"
      ? typeof width === "number"
        ? width / 2
        : 9999
      : variant === "text"
      ? 6
      : 16;

  const resolvedHeight = variant === "circle" && typeof width === "number" ? width : height;

  return (
    <Animated.View
      style={[
        styles.skeleton,
        animatedStyle,
        {
          width: width as any,
          height: resolvedHeight,
          borderRadius,
          backgroundColor: resolvedBg,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
});
