import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Switch, SafeAreaView, Platform, TextInput } from "react-native";
import { Battery, Shield, ArrowLeft, RefreshCw, Zap, Bell, PlusCircle, Moon, LogOut } from "lucide-react-native";
import { GlassCard } from "../../src/components/GlassCard";
import { COLORS } from "../../src/theme/colors";
import { useThemeStore } from "../../src/store/useThemeStore";
import { useAuthStore } from "../../src/store/useAuthStore";
import { useFriendStore } from "../../src/store/useFriendStore";
import { useRouter } from "expo-router";
import { Avatar } from "../../src/components/Avatar";
import { ProfileEditor } from "../../src/components/ProfileEditor";
import { useAchievementStore } from "../../src/store/useAchievementStore";
import { useGamificationStore } from "../../src/store/useGamificationStore";
import { getLevelInfoFromXP } from "../../src/services/progressionEngine";

export default function ProfileScreen() {
  const router = useRouter();
  const isDark = useThemeStore((state) => state.isDark);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const { user, logout, isLoading } = useAuthStore();
  const theme = COLORS.get(isDark);
  
  const [selectedEmoji, setSelectedEmoji] = useState("😎");
  const emojis = ["😎", "🛹", "🎮", "🦄", "🍿", "🍕", "😴", "⚡️"];
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditor, setShowEditor] = useState(false);

  // Gamification & Progression states
  const xp = useAchievementStore((state) => state.xp);
  const level = useAchievementStore((state) => state.level);
  const equippedBadgeEmoji = useAchievementStore((state) => state.equippedBadgeEmoji);
  const unlockedBadgesCount = useAchievementStore((state) => state.unlockedBadges.length);

  const totalDistance = useGamificationStore((state) => state.totalDistance);
  const streakCount = useGamificationStore((state) => state.streakCount);

  const levelInfo = getLevelInfoFromXP(xp);

  const {
    friends,
    incomingRequests,
    outgoingRequests,
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

  const handleSearch = () => {
    if (user?.uid && searchQuery.trim()) {
      searchUsersAction(searchQuery, user.uid);
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Profile Apple Card */}
        <GlassCard style={styles.userCard}>
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
                {user?.displayName || "Wanderer"} {equippedBadgeEmoji ? ` ${equippedBadgeEmoji}` : ""}
              </Text>
              <Text style={[styles.userPhone, { color: theme.textMuted }]}>{user?.email || "Belum ada email"}</Text>
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
            onPress={() => setShowEditor(true)}
            style={[styles.editProfileBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)" }]}
          >
            <Text style={[styles.editProfileBtnText, { color: COLORS.cyan }]}>🎨 Ubah Profil & Status</Text>
          </Pressable>
        </GlassCard>

        {/* ─── Profile Customization Modal Editor ─── */}
        <ProfileEditor
          visible={showEditor}
          onClose={() => setShowEditor(false)}
          userProfile={user}
        />

        {/* ─── KELOLA TEMAN (FRIEND SYSTEM) ─── */}
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Sistem Pertemanan 👥</Text>
        
        {/* Card 1: Cari Pengguna */}
        <GlassCard style={styles.friendCard}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Cari Teman Baru</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.searchInput, { color: theme.text, borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }]}
              placeholder="Masukkan nama pengguna..."
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            <Pressable onPress={handleSearch} style={[styles.searchBtn, { backgroundColor: COLORS.cyan }]}>
              <Text style={styles.searchBtnText}>Cari</Text>
            </Pressable>
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={styles.resultsList}>
              {searchResults.map((item) => {
                const isAlreadyFriend = friends.some((f) => f.uid === item.uid);
                const isIncoming = incomingRequests.some((r) => r.uid === item.uid);
                const isOutgoing = outgoingRequests.some((r) => r.uid === item.uid);

                return (
                  <View key={item.uid} style={styles.resultItem}>
                    <Text style={styles.resultEmoji}>{item.avatarEmoji || "🦊"}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.resultName, { color: theme.text }]}>{item.displayName}</Text>
                    </View>
                    
                    {isAlreadyFriend ? (
                      <Text style={[styles.statusText, { color: COLORS.green }]}>Teman</Text>
                    ) : isOutgoing ? (
                      <Text style={[styles.statusText, { color: theme.textMuted }]}>Terkirim</Text>
                    ) : isIncoming ? (
                      <Pressable
                        onPress={() => user?.uid && acceptRequestAction(user.uid, item.uid)}
                        style={[styles.actionBadge, { backgroundColor: COLORS.green }]}
                      >
                        <Text style={styles.badgeText}>Terima</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => user?.uid && sendRequestAction(user.uid, item.uid)}
                        style={[styles.actionBadge, { backgroundColor: COLORS.cyan }]}
                      >
                        <Text style={styles.badgeText}>+ Tambah</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </GlassCard>

        {/* Card 2: Permintaan Pertemanan Masuk */}
        {incomingRequests.length > 0 && (
          <GlassCard style={styles.friendCard}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Permintaan Pertemanan ({incomingRequests.length})</Text>
            <View style={styles.incomingList}>
              {incomingRequests.map((item) => (
                <View key={item.uid} style={styles.requestItem}>
                  <Text style={styles.resultEmoji}>{item.avatarEmoji || "🦊"}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.resultName, { color: theme.text }]}>{item.displayName}</Text>
                  </View>
                  <View style={styles.searchRow}>
                    <Pressable
                      onPress={() => user?.uid && acceptRequestAction(user.uid, item.uid)}
                      style={[styles.iconActionBtn, { backgroundColor: "rgba(0, 240, 255, 0.15)" }]}
                    >
                      <Text style={{ color: COLORS.cyan, fontWeight: "900", fontSize: 13 }}>Terima</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => user?.uid && rejectRequestAction(user.uid, item.uid)}
                      style={[styles.iconActionBtn, { backgroundColor: "rgba(255, 91, 153, 0.15)" }]}
                    >
                      <Text style={{ color: COLORS.pink, fontWeight: "900", fontSize: 13 }}>Tolak</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </GlassCard>
        )}

        {/* Card 3: Daftar Teman Aktif */}
        <GlassCard style={styles.friendCard}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Teman Saya ({friends.length})</Text>
          {friends.length === 0 ? (
            <Text style={[styles.noFriendsText, { color: theme.textMuted }]}>Belum ada teman terhubung. Cari teman di atas!</Text>
          ) : (
            <View style={styles.friendsList}>
              {friends.map((item) => (
                <View key={item.uid} style={styles.friendListItem}>
                  <Text style={styles.resultEmoji}>{item.avatarEmoji || "🦊"}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.resultName, { color: theme.text }]}>{item.displayName}</Text>
                    <Text style={[styles.resultEmail, { color: theme.textMuted }]} numberOfLines={1}>{item.email}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <Pressable
                      onPress={() => user?.uid && removeFriendAction(user.uid, item.uid)}
                      style={styles.unfriendBtn}
                    >
                      <Text style={{ color: COLORS.pink, fontWeight: "800", fontSize: 12 }}>Hapus</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => user?.uid && blockUserAction(user.uid, item.uid)}
                      style={styles.unfriendBtn}
                    >
                      <Text style={{ color: COLORS.purple, fontWeight: "800", fontSize: 12 }}>Blokir</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </GlassCard>

        {/* Card 4: Pengguna Diblokir */}
        {blockedUsers.length > 0 && (
          <GlassCard style={styles.friendCard}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Pengguna Diblokir ({blockedUsers.length})</Text>
            <View style={styles.friendsList}>
              {blockedUsers.map((item) => (
                <View key={item.uid} style={styles.friendListItem}>
                  <Text style={styles.resultEmoji}>{item.avatarEmoji || "🦊"}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.resultName, { color: theme.text }]}>{item.displayName}</Text>
                    <Text style={[styles.resultEmail, { color: theme.textMuted }]} numberOfLines={1}>{item.email}</Text>
                  </View>
                  <Pressable
                    onPress={() => user?.uid && unblockUserAction(user.uid, item.uid)}
                    style={styles.unfriendBtn}
                  >
                    <Text style={{ color: COLORS.cyan, fontWeight: "800", fontSize: 12 }}>Buka Blokir</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </GlassCard>
        )}

        {/* Dynamic Display Settings */}
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

        {/* Simulation Info */}
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Status Perangkat (Simulated)</Text>
        <GlassCard style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Battery size={20} color={COLORS.green} />
              <View style={styles.statusMeta}>
                <Text style={[styles.statusLabel, { color: theme.textMuted }]}>Baterai</Text>
                <Text style={[styles.statusVal, { color: theme.text }]}>98%</Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <Shield size={20} color={COLORS.cyan} />
              <View style={styles.statusMeta}>
                <Text style={[styles.statusLabel, { color: theme.textMuted }]}>Mode Radar</Text>
                <Text style={[styles.statusVal, { color: theme.text }]}>Precise</Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Gamifikasi & Statistik Eksplorasi */}
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Gamifikasi & Statistik 🏆</Text>
        <GlassCard style={styles.friendCard}>
          <View style={styles.statsRowGrid}>
            <View style={styles.statsGridItem}>
              <Text style={styles.statsEmoji}>🏔️</Text>
              <Text style={[styles.statsLabelSmall, { color: theme.textMuted }]}>Total Jarak</Text>
              <Text style={[styles.statsValue, { color: theme.text }]}>{totalDistance} km</Text>
            </View>
            <View style={styles.statsGridItem}>
              <Text style={styles.statsEmoji}>🔥</Text>
              <Text style={[styles.statsLabelSmall, { color: theme.textMuted }]}>Streak Hari</Text>
              <Text style={[styles.statsValue, { color: theme.text }]}>{streakCount} Hari</Text>
            </View>
            <View style={styles.statsGridItem}>
              <Text style={styles.statsEmoji}>🔓</Text>
              <Text style={[styles.statsLabelSmall, { color: theme.textMuted }]}>Badge Buka</Text>
              <Text style={[styles.statsValue, { color: theme.text }]}>{unlockedBadgesCount} / 12</Text>
            </View>
          </View>
        </GlassCard>

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
  userCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    shadowOpacity: 0.04,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarGlow: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: {
    position: "absolute",
    bottom: -4,
    right: -4,
    fontSize: 18,
  },
  userInfo: {
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: "900",
    fontFamily: "System",
  },
  userPhone: {
    fontSize: 12,
    marginTop: 3,
    fontWeight: "600",
    fontFamily: "System",
  },
  vibeTitle: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 20,
    marginBottom: 10,
    fontFamily: "System",
  },
  emojiList: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  emojiButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    fontSize: 18,
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
  statusCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
    shadowOpacity: 0.03,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusMeta: {
    marginLeft: 12,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "System",
  },
  statusVal: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
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
  friendCard: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 20,
    shadowOpacity: 0.03,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
    fontFamily: "System",
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "System",
  },
  searchBtn: {
    width: 60,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 13,
    fontFamily: "System",
  },
  resultsList: {
    marginTop: 12,
    gap: 8,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  resultEmoji: {
    fontSize: 22,
  },
  resultName: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "System",
  },
  resultEmail: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: "System",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "System",
  },
  actionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 11,
    fontFamily: "System",
  },
  incomingList: {
    gap: 8,
  },
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  iconActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  noFriendsText: {
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 14,
    fontFamily: "System",
  },
  friendsList: {
    gap: 8,
  },
  friendListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  unfriendBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
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
  editProfileBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.15)",
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: "800",
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
  statsRowGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  statsGridItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  statsEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  statsLabelSmall: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
    fontFamily: "System",
  },
  statsValue: {
    fontSize: 14,
    fontWeight: "900",
    fontFamily: "System",
  },
});
