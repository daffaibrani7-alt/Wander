import React, { useRef } from "react";
import { Pressable, Text, StyleSheet, Animated, ViewStyle, TextStyle } from "react-native";
import { COLORS } from "@/shared/theme/colors";
import { useThemeStore } from "@/features/settings/store/useThemeStore";

interface AppleButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "glass" | "danger";
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function AppleButton({
  title,
  onPress,
  variant = "primary",
  style,
  textStyle,
  icon,
}: AppleButtonProps) {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = COLORS.get(isDark);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          bg: isDark ? "#FFFFFF" : "#000000",
          border: "transparent",
          text: isDark ? "#000000" : "#FFFFFF",
        };
      case "secondary":
        return {
          bg: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
          border: "transparent",
          text: theme.text,
        };
      case "glass":
        return {
          bg: theme.cardBg,
          border: theme.cardBorder,
          text: theme.text,
        };
      case "danger":
        return {
          bg: COLORS.pink,
          border: "transparent",
          text: "#FFFFFF",
        };
    }
  };

  const vColors = getVariantStyles();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.button,
          {
            backgroundColor: vColors.bg,
            borderColor: vColors.border,
            borderWidth: vColors.border !== "transparent" ? 1 : 0,
          },
          style,
        ]}
      >
        {icon && <Animated.View style={styles.iconContainer}>{icon}</Animated.View>}
        <Text style={[styles.text, { color: vColors.text }, textStyle]}>
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "System",
  },
  iconContainer: {
    marginRight: 8,
  },
});

export default AppleButton;
