import React from "react";
import { View, Text, StyleSheet, Pressable, Platform, ViewStyle } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { COLORS } from "@/shared/theme/colors";
import { SPACING } from "@/shared/theme/spacing";
import { TYPOGRAPHY } from "@/shared/theme/typography";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { useRouter } from "expo-router";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";

interface AnimatedHeaderProps {
  title: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
  blur?: boolean;
}

export function AnimatedHeader({
  title,
  showBack = false,
  onBackPress,
  rightAction,
  style,
  blur = true,
}: AnimatedHeaderProps) {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  const handleBack = () => {
    WANDER_HAPTICS.light();
    if (onBackPress) {
      onBackPress();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  const borderOpacity = isDark ? 0.06 : 0.05;
  const bottomBorderColor = isDark
    ? `rgba(255, 255, 255, ${borderOpacity})`
    : `rgba(0, 0, 0, ${borderOpacity})`;

  const bgStyle = {
    backgroundColor: isDark ? "rgba(0, 0, 0, 0.82)" : "rgba(242, 242, 247, 0.88)",
  };

  const headerContent = (
    <View style={[styles.headerInner, { borderBottomColor: bottomBorderColor }]}>
      <View style={styles.leftContainer}>
        {showBack && (
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={22} color={theme.text} strokeWidth={2.5} />
          </Pressable>
        )}
      </View>
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.rightContainer}>{rightAction}</View>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        !blur && { backgroundColor: theme.bg },
        blur && Platform.OS === "web" && bgStyle,
        style,
      ]}
    >
      {blur && Platform.OS !== "web" ? (
        <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.blurView}>
          {headerContent}
        </BlurView>
      ) : (
        headerContent
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    zIndex: 10,
    ...Platform.select({
      ios: {
        paddingTop: 44, // Safe area approximation
      },
      android: {
        paddingTop: 12,
      },
    }),
  },
  blurView: {
    width: "100%",
  },
  headerInner: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
  },
  leftContainer: {
    width: 60,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  rightContainer: {
    width: 60,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  backButton: {
    padding: SPACING.xs,
    borderRadius: 12,
  },
  title: {
    ...TYPOGRAPHY.titleScale.h2,
    flex: 1,
    textAlign: "center",
    fontFamily: "System",
  },
});
