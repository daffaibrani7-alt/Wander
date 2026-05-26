import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Switch, Image, SafeAreaView } from "react-native";
import { User, Battery, Shield, ArrowLeft, RefreshCw, Zap, Bell, PlusCircle } from "lucide-react-native";
import { GlassCard } from "../components/GlassCard";
import { COLORS } from "../theme/colors";

interface ProfileScreenProps {
  ghostMode: string;
  batteryLevel: number;
  isCharging: boolean;
  onClose: () => void;
  onSimLowBattery: () => void;
  onSimToggleCharging: () => void;
  onSimAddFriend: () => void;
  onSimNotification: () => void;
  isLiveFirestore: boolean;
  onToggleFirestore: (val: boolean) => void;
}

export function ProfileScreen({
  ghostMode,
  batteryLevel,
  isCharging,
  onClose,
  onSimLowBattery,
  onSimToggleCharging,
  onSimAddFriend,
  onSimNotification,
  isLiveFirestore,
  onToggleFirestore,
}: ProfileScreenProps) {
  
  const [selectedEmoji, setSelectedEmoji] = useState("⚡️");
  const emojis = ["⚡️", "😎", "🛹", "🎮", "🦄", "🍿", "🍕", "😴"];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.title}>Profil Saya 🦊</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <GlassCard style={styles.userCard}>
          <View style={styles.userRow}>
            <View style={[styles.avatarGlow, { borderColor: COLORS.cyan }]}>
              <View style={styles.avatarInner}>
                <User size={36} color="#FFF" />
              </View>
              <Text style={styles.avatarEmoji}>{selectedEmoji}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Me (You)</Text>
              <Text style={styles.userPhone}>+62 812-3456-7890</Text>
            </View>
          </View>

          {/* Vibe Picker */}
          <Text style={styles.vibeTitle}>Ubah Status Vibe Anda:</Text>
          <View style={styles.emojiList}>
            {emojis.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => setSelectedEmoji(emoji)}
                style={[
                  styles.emojiButton,
                  selectedEmoji === emoji && { backgroundColor: "rgba(255,255,255,0.15)" },
                ]}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        {/* Real-time Status Card */}
        <Text style={styles.sectionTitle}>Status Aktif</Text>
        <GlassCard style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Battery size={20} color={isCharging ? COLORS.yellow : COLORS.green} />
              <View style={styles.statusMeta}>
                <Text style={styles.statusLabel}>Baterai</Text>
                <Text style={[styles.statusVal, { color: isCharging ? COLORS.yellow : "#FFF" }]}>
                  {batteryLevel}% {isCharging ? "⚡️" : ""}
                </Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <Shield size={20} color={ghostMode === "frozen" ? COLORS.purple : ghostMode === "blurry" ? COLORS.pink : COLORS.cyan} />
              <View style={styles.statusMeta}>
                <Text style={styles.statusLabel}>Mode Hantu</Text>
                <Text style={[styles.statusVal, { textTransform: "capitalize" }]}>{ghostMode}</Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Sync Settings */}
        <Text style={styles.sectionTitle}>Pengaturan Server</Text>
        <GlassCard style={styles.settingCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Live Firebase Firestore</Text>
              <Text style={styles.toggleDesc}>
                {isLiveFirestore 
                  ? "Sinkronisasi realtime aktif dengan Firestore database." 
                  : "Berjalan di mode Wander Sim Engine offline."}
              </Text>
            </View>
            <Switch
              value={isLiveFirestore}
              onValueChange={onToggleFirestore}
              trackColor={{ false: "#2C2C2E", true: COLORS.purple }}
              thumbColor={isLiveFirestore ? "#FFF" : "#8E8E93"}
            />
          </View>
        </GlassCard>

        {/* Simulation Control Center */}
        <Text style={styles.sectionTitle}>Wander Sim Engine (Dev Tools)</Text>
        <GlassCard style={styles.simCard}>
          <Text style={styles.simIntro}>
            Gunakan tombol interaktif di bawah untuk menyimulasikan fitur-fitur pada aplikasi iPhone.
          </Text>

          <View style={styles.btnGrid}>
            <Pressable onPress={onSimLowBattery} style={styles.simBtn}>
              <View style={[styles.btnIcon, { backgroundColor: COLORS.pink + "20" }]}>
                <Battery size={18} color={COLORS.pink} />
              </View>
              <Text style={styles.btnText}>Simulasikan Low-Batt</Text>
            </Pressable>

            <Pressable onPress={onSimToggleCharging} style={styles.simBtn}>
              <View style={[styles.btnIcon, { backgroundColor: COLORS.yellow + "20" }]}>
                <Zap size={18} color={COLORS.yellow} />
              </View>
              <Text style={styles.btnText}>Toggle Cas Baterai</Text>
            </Pressable>

            <Pressable onPress={onSimAddFriend} style={styles.simBtn}>
              <View style={[styles.btnIcon, { backgroundColor: COLORS.green + "20" }]}>
                <PlusCircle size={18} color={COLORS.green} />
              </View>
              <Text style={styles.btnText}>Tambah Teman 🤖</Text>
            </Pressable>

            <Pressable onPress={onSimNotification} style={styles.simBtn}>
              <View style={[styles.btnIcon, { backgroundColor: COLORS.cyan + "20" }]}>
                <Bell size={18} color={COLORS.cyan} />
              </View>
              <Text style={styles.btnText}>Simulasi Notifikasi</Text>
            </Pressable>
          </View>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(10, 10, 12, 0.95)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFF",
    marginLeft: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  userCard: {
    padding: 20,
    marginBottom: 20,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarGlow: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2C2C2E",
    position: "relative",
  },
  avatarInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#1C1C1E",
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
    fontSize: 20,
    fontWeight: "900",
    color: "#FFF",
  },
  userPhone: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
  },
  vibeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(255,255,255,0.6)",
    marginTop: 18,
    marginBottom: 10,
  },
  emojiList: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  emojiButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 10,
    paddingLeft: 4,
  },
  statusCard: {
    padding: 16,
    marginBottom: 20,
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
    color: "rgba(255,255,255,0.45)",
    fontWeight: "bold",
  },
  statusVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFF",
    marginTop: 2,
  },
  settingCard: {
    padding: 16,
    marginBottom: 20,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "between",
  },
  toggleInfo: {
    flex: 1,
    paddingRight: 16,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFF",
  },
  toggleDesc: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    marginTop: 3,
    lineHeight: 15,
  },
  simCard: {
    padding: 18,
    marginBottom: 20,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  simIntro: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 17,
    marginBottom: 16,
  },
  btnGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  simBtn: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  btnIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  btnText: {
    fontSize: 10,
    color: "#FFF",
    fontWeight: "800",
    textAlign: "center",
  },
});
export default ProfileScreen;
