import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { GlassCard } from "@/shared/components/GlassCard";
import { COLORS } from "@/shared/theme/colors";
import { SPACING } from "@/shared/theme/spacing";
import { TYPOGRAPHY } from "@/shared/theme/typography";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { PrimaryButton } from "./PrimaryButton";

interface EmptyStateProps {
  icon: string | React.ReactNode;
  title: string;
  description: string;
  actionTitle?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon,
  title,
  description,
  actionTitle,
  onActionPress,
  style = {},
}: EmptyStateProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  return (
    <GlassCard style={[styles.container, style]}>
      {typeof icon === "string" ? (
        <Text style={styles.emojiIcon}>{icon}</Text>
      ) : (
        <View style={styles.iconContainer}>{icon}</View>
      )}

      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.description, { color: theme.textMuted }]}>
        {description}
      </Text>

      {actionTitle && onActionPress && (
        <PrimaryButton
          title={actionTitle}
          onPress={onActionPress}
          size="small"
          style={styles.actionButton}
        />
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.xxl,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    width: "100%",
  },
  emojiIcon: {
    fontSize: 48,
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.titleScale.h3,
    textAlign: "center",
    marginBottom: SPACING.sm,
    fontWeight: "800",
    fontFamily: "System",
  },
  description: {
    ...TYPOGRAPHY.bodyScale.regular,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: SPACING.xl,
    fontFamily: "System",
  },
  actionButton: {
    marginTop: SPACING.xs,
    width: "auto",
    minWidth: 140,
  },
});
