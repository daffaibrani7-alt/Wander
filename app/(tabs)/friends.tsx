import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Image, SafeAreaView, Platform } from "react-native";
import { Search, UserPlus, ArrowLeft, Check, Users } from "lucide-react-native";
import { GlassCard } from "@/shared/components/GlassCard";
import { COLORS } from "@/shared/theme/colors";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { MockService, FriendLocation } from "@/features/friends/services/mockService";

export default function FriendsScreen() {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = COLORS.get(isDark);

  const [searchQuery, setSearchQuery] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [friendsList, setFriendsList] = useState<FriendLocation[]>([]);

  // Recommendations of people they might know to add (mocked)
  const [recommendations, setRecommendations] = useState([
    { uid: "rec-1", name: "Deni Pratama", mutual: 3, avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150", added: false },
    { uid: "rec-2", name: "Elisa Wulandari", mutual: 7, avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150", added: false },
    { uid: "rec-3", name: "Giri Wijaya", mutual: 1, avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150", added: false },
  ]);

  useEffect(() => {
    // Fetch initial simulated friends list
    setFriendsList(MockService.getFriends());
  }, []);

  const handleAddRecommendation = (rec: any) => {
    setRecommendations((prev) =>
      prev.map((item) => (item.uid === rec.uid ? { ...item, added: true } : item))
    );

    // Call mock service to add to simulator
    const newFriend = MockService.addMockFriend(rec.name);
    setFriendsList(prev => [...prev, newFriend]);

    setSuccessMessage(`Berhasil menambahkan ${rec.name} sebagai teman!`);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const handleCustomAdd = () => {
    if (!searchQuery.trim()) return;
    const name = searchQuery.trim();
    const newFriend = MockService.addMockFriend(name);
    setFriendsList(prev => [...prev, newFriend]);
    
    setSuccessMessage(`Berhasil menambahkan ${name} sebagai teman!`);
    setSearchQuery("");
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const filteredFriends = friendsList.filter((friend) =>
    friend.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Toast Notification */}
      {successMessage && (
        <GlassCard style={[styles.toast, { backgroundColor: COLORS.green }]}>
          <Text style={styles.toastText}>🎉 {successMessage}</Text>
        </GlassCard>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Radar Kehadiran Teman 👥</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Hubungkan langkah Anda dengan orang terdekat dan mulailah saling terhubung secara tenang.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Search Bar */}
        <GlassCard style={styles.searchCard}>
          <View style={styles.searchContainer}>
            <Search size={18} color={theme.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Cari teman atau ketik nama baru..."
              placeholderTextColor={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleCustomAdd}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={handleCustomAdd} style={styles.quickAddButton}>
                <UserPlus size={14} color="#000" />
                <Text style={styles.quickAddText}>Add</Text>
              </Pressable>
            )}
          </View>
        </GlassCard>

        {/* Mutual Recommendations */}
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Mungkin Anda Kenal</Text>
        {recommendations.map((rec) => (
          <GlassCard key={rec.uid} style={styles.friendCard}>
            <View style={styles.friendRow}>
              <Image source={{ uri: rec.avatar }} style={styles.avatar} />
              <View style={styles.friendInfo}>
                <Text style={[styles.friendName, { color: theme.text }]}>{rec.name}</Text>
                <Text style={[styles.friendMeta, { color: theme.textMuted }]}>{rec.mutual} teman bersama</Text>
              </View>
              {rec.added ? (
                <View style={[styles.addedBadge, { backgroundColor: COLORS.green + "15" }]}>
                  <Check size={14} color={COLORS.green} />
                  <Text style={[styles.addedText, { color: COLORS.green }]}>Added</Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => handleAddRecommendation(rec)}
                  style={styles.addButton}
                >
                  <UserPlus size={15} color="#000" />
                  <Text style={styles.addText}>Add</Text>
                </Pressable>
              )}
            </View>
          </GlassCard>
        ))}

        {/* Existing Friends */}
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Teman Anda ({filteredFriends.length})</Text>
        {filteredFriends.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Users size={32} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Belum ada teman di radar Anda. Mulailah perjalanan berdua dengan mengetik nama teman di atas untuk menghubungkan radar sosial Anda!
            </Text>
          </GlassCard>
        ) : (
          filteredFriends.map((friend) => (
            <GlassCard key={friend.uid} style={styles.friendCard}>
              <View style={styles.friendRow}>
                <Image source={{ uri: friend.avatarUrl }} style={styles.avatar} />
                <View style={styles.friendInfo}>
                  <Text style={[styles.friendName, { color: theme.text }]}>{friend.displayName}</Text>
                  <Text style={[styles.friendMeta, { color: theme.textMuted }]}>
                    {friend.uid.startsWith("sim") ? "Simulated Friend 🤖" : "Realtime Friend 🔥"}
                  </Text>
                </View>
                <View style={styles.chatStatus}>
                  <Text style={styles.statusEmoji}>{friend.avatarEmoji || "📍"}</Text>
                  <Text style={[styles.statusText, { color: theme.textMuted }]}>
                    {friend.distanceText || "Dekat"}
                  </Text>
                </View>
              </View>
            </GlassCard>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toast: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 20,
    left: 20,
    right: 20,
    zIndex: 999,
    padding: 14,
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.2)",
  },
  toastText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 14,
    fontFamily: "System",
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
    paddingBottom: 120, // Leave space for floating tabs
  },
  searchCard: {
    padding: 10,
    borderRadius: 20,
    marginBottom: 20,
    shadowOpacity: 0.04,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchIcon: {
    marginLeft: 6,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    marginLeft: 10,
    fontWeight: "600",
    fontFamily: "System",
  },
  quickAddButton: {
    backgroundColor: COLORS.cyan,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 12,
  },
  quickAddText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#000",
    marginLeft: 4,
    fontFamily: "System",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 12,
    paddingLeft: 4,
  },
  friendCard: {
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
    shadowOpacity: 0.03,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2C2C2E",
  },
  friendInfo: {
    marginLeft: 14,
    flex: 1,
  },
  friendName: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "System",
  },
  friendMeta: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: "System",
  },
  addButton: {
    backgroundColor: COLORS.green,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 12,
  },
  addText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#000",
    marginLeft: 4,
    fontFamily: "System",
  },
  addedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  addedText: {
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 4,
    fontFamily: "System",
  },
  chatStatus: {
    alignItems: "flex-end",
  },
  statusEmoji: {
    fontSize: 16,
  },
  statusText: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: "700",
    fontFamily: "System",
  },
  emptyCard: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
    fontWeight: "500",
    fontFamily: "System",
  },
});
