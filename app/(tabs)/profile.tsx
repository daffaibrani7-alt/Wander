import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Switch, SafeAreaView, Platform } from "react-native";
import { User, Battery, Shield, ArrowLeft, RefreshCw, Zap, Bell, PlusCircle, Moon, LogOut } from "lucide-react-native";
import { GlassCard } from "../../src/components/GlassCard";
import { COLORS } from "../../src/theme/colors";
import { useThemeStore } from "../../src/store/useThemeStore";
import { useAuthStore } from "../../src/store/useAuthStore";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const router = useRouter();
  const isDark = useThemeStore((state) => state.isDark);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const { user, logout, isLoading } = useAuthStore();
  const theme = COLORS.get(isDark);
  
  const [selectedEmoji, setSelectedEmoji] = useState("😎");
  const emojis = ["😎", "🛹", "🎮", "🦄", "🍿", "🍕", "😴", "⚡️"];

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
            <View style={[styles.avatarGlow, { borderColor: COLORS.cyan }]}>
              <View style={[styles.avatarInner, { backgroundColor: isDark ? "#1C1C1E" : "#E5E5EA" }]}>
                <User size={32} color={theme.text} />
              </View>
              <Text style={styles.avatarEmoji}>{selectedEmoji}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: theme.text }]}>{user?.displayName || "Wanderer"}</Text>
              <Text style={[styles.userPhone, { color: theme.textMuted }]}>{user?.email || "Belum ada email"}</Text>
            </View>
          </View>

          {/* Vibe Picker */}
          <Text style={[styles.vibeTitle, { color: theme.textMuted }]}>UBAH STATUS VIBE</Text>
          <View style={styles.emojiList}>
            {emojis.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => setSelectedEmoji(emoji)}
                style={[
                  styles.emojiButton,
                  selectedEmoji === emoji && { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)" },
                ]}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </GlassCard>

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
});
