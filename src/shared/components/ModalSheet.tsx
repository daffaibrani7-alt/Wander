import React, { useEffect } from "react";
import { View, StyleSheet, Pressable, Platform, ViewStyle, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { COLORS } from "@/shared/theme/colors";
import { SPACING } from "@/shared/theme/spacing";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number; // Target height, e.g. SCREEN_HEIGHT * 0.5
  style?: ViewStyle;
}

export function ModalSheet({
  visible,
  onClose,
  children,
  height = SCREEN_HEIGHT * 0.5,
  style,
}: ModalSheetProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);
  
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      WANDER_HAPTICS.light();
      progress.value = withSpring(1, { damping: 15, stiffness: 180 });
    } else {
      progress.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0, 0.4]),
      pointerEvents: visible ? "auto" : "none" as const,
    };
  });

  const sheetStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [0, 1], [height + 100, 0]);
    return {
      transform: [{ translateY }],
    };
  });

  if (!visible && progress.value === 0) return null;

  const cardBorderColor = isDark 
    ? "rgba(255, 255, 255, 0.08)" 
    : "rgba(0, 0, 0, 0.06)";

  const cardBgColor = isDark
    ? "rgba(18, 18, 22, 0.88)"
    : "rgba(255, 255, 255, 0.94)";

  const handleClose = () => {
    WANDER_HAPTICS.light();
    onClose();
  };

  const sheetContent = (
    <View style={[styles.innerContainer, { minHeight: height }]}>
      {/* Drag / Pull Grab Handle */}
      <View style={styles.handleContainer}>
        <View
          style={[
            styles.handle,
            {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.15)"
                : "rgba(0, 0, 0, 0.12)",
            },
          ]}
        />
      </View>
      <View style={styles.childrenContainer}>{children}</View>
    </View>
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Pressable onPress={handleClose} style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            styles.backdrop,
            backdropStyle,
            { backgroundColor: "#000" },
          ]}
        />
      </Pressable>

      {/* Sheet Content Card */}
      <Animated.View
        style={[
          styles.sheet,
          sheetStyle,
          {
            backgroundColor: Platform.OS === "web" ? cardBgColor : "transparent",
            borderColor: cardBorderColor,
            maxHeight: SCREEN_HEIGHT * 0.9,
          },
          style,
        ]}
      >
        {Platform.OS === "web" ? (
          sheetContent
        ) : (
          <BlurView
            intensity={90}
            tint={isDark ? "dark" : "light"}
            style={styles.blurView}
          >
            {sheetContent}
          </BlurView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 99,
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: "hidden",
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  blurView: {
    width: "100%",
    height: "100%",
  },
  innerContainer: {
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  handleContainer: {
    width: "100%",
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    width: 38,
    height: 5,
    borderRadius: 2.5,
  },
  childrenContainer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
  },
});
