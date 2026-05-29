import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { COLORS } from "@/shared/theme/colors";
import { SPACING } from "@/shared/theme/spacing";
import { TYPOGRAPHY } from "@/shared/theme/typography";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";
import { useThemeStore } from "@/features/settings/store/useThemeStore";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "small" | "medium" | "large";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function PrimaryButton({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}: PrimaryButtonProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);
  
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (disabled || loading) return;
    WANDER_HAPTICS.light();
    scale.value = withSpring(0.96, { damping: 10, stiffness: 300 });
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    scale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  // Get background and border colors based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: COLORS.cyan,
          borderColor: "rgba(0, 240, 255, 0.4)",
          textColor: "#000000",
        };
      case "secondary":
        return {
          backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
          borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
          textColor: theme.text,
        };
      case "danger":
        return {
          backgroundColor: COLORS.pink,
          borderColor: "rgba(255, 91, 153, 0.4)",
          textColor: "#FFFFFF",
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          borderColor: "transparent",
          textColor: COLORS.cyan,
        };
    }
  };

  const { backgroundColor, borderColor, textColor } = getVariantStyles();

  // Get sizing details
  const getSizing = () => {
    switch (size) {
      case "small":
        return {
          height: 38,
          borderRadius: 12,
          paddingHorizontal: SPACING.md,
          fontSize: 13,
        };
      case "medium":
        return {
          height: 48,
          borderRadius: 16,
          paddingHorizontal: SPACING.lg,
          fontSize: 15,
        };
      case "large":
        return {
          height: 56,
          borderRadius: 20,
          paddingHorizontal: SPACING.xl,
          fontSize: 17,
        };
    }
  };

  const sizing = getSizing();

  return (
    <Animated.View style={[styles.wrapper, animatedStyle, ...(Array.isArray(style) ? style : [style])]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor,
            borderColor,
            height: sizing.height,
            borderRadius: sizing.borderRadius,
            paddingHorizontal: sizing.paddingHorizontal,
            opacity: disabled ? 0.5 : loading ? 0.9 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <>
            {icon && <Animated.View style={styles.iconContainer}>{icon}</Animated.View>}
            <Text
              style={[
                styles.text,
                {
                  color: textColor,
                  fontSize: sizing.fontSize,
                },
                textStyle,
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  text: {
    fontWeight: "800",
    fontFamily: "System",
  },
  iconContainer: {
    marginRight: 8,
  },
});
