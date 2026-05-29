import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Switch, SafeAreaView, Platform, Pressable } from "react-native";
import { Moon, LogOut } from "lucide-react-native";
import { GlassCard } from "@/shared/components/GlassCard";
import { COLORS } from "@/shared/theme/colors";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { useFriendStore } from "@/features/friends/store/useFriendStore";
import { useRouter } from "expo-router";
import { ProfileEditor } from "@/features/profile/components/ProfileEditor";
import { useAchievementStore } from "@/features/achievements/store/useAchievementStore";
import { useGamificationStore } from "@/features/exploration/store/useGamificationStore";

// Modularized Components
import { ProfileCard } from "@/features/profile/components/ProfileCard";
import { FriendManager } from "@/features/profile/components/FriendManager";
import { SimulatedStatusGrid } from "@/features/profile/components/SimulatedStatusGrid";

export default function ProfileScreen() {
  const router = useRouter();
  const isDark = useThemeStore((state) => state.isDark);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const { user, logout } = useAuthStore();
  const theme = COLORS.get(isDark);
  
  const [showEditor, setShowEditor] = useState(false);

  // Gamification & Progression states
  const xp = useAchievementStore((state) => state.xp);
  const level = useAchievementStore((state) => state.level);
  const equippedBadgeEmoji = useAchievementStore((state) => state.equippedBadgeEmoji);
  const unlockedBadgesCount = useAchievementStore((state) => state.unlockedBadges.length);

  const totalDistance = useGamificationStore((state) => state.totalDistance);
  const streakCount = useGamificationStore((state) => state.streakCount);

  const {
    friends,
    incomingRequests,
    blockedUsers,
    searchResults,
    searchUsersAction,
    sendRequestAction,
    acceptRequestAction,
    rejectRequestAction,
    removeFriendAction,
    blockUserAction,
    unblockUserAction,
    initializeFriendListener,
  } = useFriendStore();

  useEffect(() => {
    if (user?.uid) {
      const unsubFriend = initializeFriendListener(user.uid);
      const unsubAch = useAchievementStore.getState().initializeAchievementStore(user.uid);
      const unsubGam = useGamificationStore.getState().initializeGamificationStore(user.uid);
      return () => {
        unsubFriend();
        unsubAch();
        unsubGam();
      };
    }
  }, [user?.uid]);

  const handleSearch = (query: string) => {
    if (user?.uid) {
      searchUsersAction(query, user.uid);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Profil Saya 🦊</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Ubah preferensi radar dan kelola status visual perangkat Anda.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Modular Profile Card (Bio, Progress, Status) */}
        <ProfileCard
          user={user}
          xp={xp}
          level={level}
          equippedBadgeEmoji={equippedBadgeEmoji || ""}
          onEditPress={() => setShowEditor(true)}
        />

        {/* Profile Customization Editor */}
        <ProfileEditor
          visible={showEditor}
          onClose={() => setShowEditor(false)}
          userProfile={user}
        />

        {/* Modular Friend Manager */}
        <FriendManager
          user={user}
          friends={friends}
          incomingRequests={incomingRequests}
          blockedUsers={blockedUsers}
          searchResults={searchResults}
          onSearch={handleSearch}
          onSendRequest={(targetUid) => user?.uid && sendRequestAction(user.uid, targetUid)}
          onAcceptRequest={(targetUid) => user?.uid && acceptRequestAction(user.uid, targetUid)}
          onRejectRequest={(targetUid) => user?.uid && rejectRequestAction(user.uid, targetUid)}
          onRemoveFriend={(targetUid) => user?.uid && removeFriendAction(user.uid, targetUid)}
          onBlockUser={(targetUid) => user?.uid && blockUserAction(user.uid, targetUid)}
          onUnblockUser={(targetUid) => user?.uid && unblockUserAction(user.uid, targetUid)}
        />

        {/* Theme dependent Settings */}
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Tampilan & Tema</Text>
        <GlassCard style={styles.settingCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={styles.iconLabelRow}>
                <Moon size={18} color={theme.text} style={styles.rowIcon} />
                <Text style={[styles.toggleTitle, { color: theme.text }]}>Mode Gelap Apple (Dark OLED)</Text>
              </View>
              <Text style={[styles.toggleDesc, { color: theme.textMuted }]}>
                Mengaktifkan latar belakang hitam OLED pekat untuk kenyamanan baterai iPhone Anda.
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: "#D1D1D6", true: COLORS.purple }}
              thumbColor={Platform.OS === "ios" ? "#FFF" : isDark ? "#FFF" : "#8E8E93"}
            />
          </View>
        </GlassCard>

        {/* Modular Device Info and Achievements Widget Grid */}
        <SimulatedStatusGrid
          totalDistance={totalDistance}
          streakCount={streakCount}
          unlockedBadgesCount={unlockedBadgesCount}
        />

        {/* Logout action */}
        <GlassCard style={styles.logoutCard}>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <LogOut size={20} color={COLORS.pink} />
            <Text style={styles.logoutText}>Keluar dari Akun Wander</Text>
          </Pressable>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 20 : 32,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
    fontFamily: "System",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
    fontWeight: "500",
    fontFamily: "System",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120, // Leave space for tabs
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 10,
    paddingLeft: 4,
  },
  settingCard: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 20,
    shadowOpacity: 0.03,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleInfo: {
    flex: 1,
    paddingRight: 16,
  },
  iconLabelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowIcon: {
    marginRight: 8,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "System",
  },
  toggleDesc: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
    fontWeight: "500",
    fontFamily: "System",
  },
  logoutCard: {
    padding: 14,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 91, 153, 0.15)",
    shadowOpacity: 0,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 30,
  },
  logoutText: {
    color: COLORS.pink,
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 8,
    fontFamily: "System",
  },
});
