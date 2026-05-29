import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { GlassCard } from "@/shared/components/GlassCard";
import { Avatar } from "@/shared/components/Avatar";
import { COLORS } from "@/shared/theme/colors";
import { SPACING } from "@/shared/theme/spacing";
import { TYPOGRAPHY } from "@/shared/theme/typography";
import { getLevelInfoFromXP } from "@/features/achievements/services/progressionEngine";
import { useThemeStore } from "@/features/settings/store/useThemeStore";

interface ProfileCardProps {
  user: any;
  xp: number;
  level: number;
  equippedBadgeEmoji: string;
  onEditPress: () => void;
}

export function ProfileCard({
  user,
  xp,
  level,
  equippedBadgeEmoji,
  onEditPress,
}: ProfileCardProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);
  const levelInfo = getLevelInfoFromXP(xp);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.userRow}>
        <Avatar
          uri={user?.photoURL}
          emoji={user?.statusEmoji || user?.avatarEmoji || "🦊"}
          size={72}
          showGlow
          glowColor={COLORS.cyan}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.text }]}>
            {user?.displayName || "Wanderer"}{equippedBadgeEmoji ? ` ${equippedBadgeEmoji}` : ""}
          </Text>
          <Text style={[styles.userEmail, { color: theme.textMuted }]}>
            {user?.email || "Belum ada email"}
          </Text>
          {user?.bio ? (
            <Text style={[styles.userBio, { color: theme.textMuted }]} numberOfLines={2}>
              {user.bio}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Vibe Status Summary */}
      <View style={[styles.statusSummary, { borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
        <Text style={styles.statusSummaryEmoji}>{user?.statusEmoji || user?.avatarEmoji || "🦊"}</Text>
        <Text style={[styles.statusSummaryText, { color: theme.text }]} numberOfLines={1}>
          {user?.statusText || "Tidak ada status aktivitas saat ini"}
        </Text>
      </View>

      {/* XP & Level Progression Block */}
      <View style={styles.progressionContainer}>
        <View style={styles.progressionHeader}>
          <View style={[styles.levelBadge, { backgroundColor: COLORS.cyan + "20", borderColor: COLORS.cyan }]}>
            <Text style={[styles.levelText, { color: COLORS.cyan }]}>Lv. {level}</Text>
          </View>
          <Text style={[styles.xpText, { color: theme.textMuted }]}>
            {levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP
          </Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${levelInfo.progressPercent * 100}%`,
                backgroundColor: COLORS.cyan,
                shadowColor: COLORS.cyan,
              },
            ]}
          />
        </View>
      </View>

      {/* Action to Edit Profile */}
      <Pressable
        id="open-profile-editor-btn"
        onPress={onEditPress}
        style={({ pressed }) => [
          styles.editBtn,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text style={[styles.editBtnText, { color: COLORS.cyan }]}>🎨 Ubah Profil & Status</Text>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "900",
    fontFamily: "System",
  },
  userEmail: {
    fontSize: 12,
    marginTop: 3,
    fontWeight: "600",
    fontFamily: "System",
  },
  userBio: {
    fontSize: 11,
    marginTop: 4,
    fontFamily: "System",
    fontWeight: "500",
  },
  statusSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  statusSummaryEmoji: {
    fontSize: 16,
  },
  statusSummaryText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    fontFamily: "System",
  },
  progressionContainer: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  progressionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  levelBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  levelText: {
    fontSize: 11,
    fontWeight: "900",
    fontFamily: "System",
  },
  xpText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "System",
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  editBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.15)",
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "System",
  },
});
