import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Image, SafeAreaView } from "react-native";
import { Search, UserPlus, ArrowLeft, Check, Users } from "lucide-react-native";
import { GlassCard } from "../components/GlassCard";
import { COLORS } from "../theme/colors";

interface FriendsScreenProps {
  friendsList: any[];
  onAddMockFriend: (name: string) => void;
  onClose: () => void;
}

export function FriendsScreen({ friendsList, onAddMockFriend, onClose }: FriendsScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter existing friends
  const filteredFriends = friendsList.filter((friend) =>
    friend.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Recommendations of people they might know to add (mocked)
  const [recommendations, setRecommendations] = useState([
    { uid: "rec-1", name: "Deni Pratama", mutual: 3, avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150", added: false },
    { uid: "rec-2", name: "Elisa Wulandari", mutual: 7, avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150", added: false },
    { uid: "rec-3", name: "Giri Wijaya", mutual: 1, avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150", added: false },
  ]);

  const handleAddRecommendation = (rec: any) => {
    // Mark as added in UI
    setRecommendations((prev) =>
      prev.map((item) => (item.uid === rec.uid ? { ...item, added: true } : item))
    );

    // Call callback to add friend to location simulation list
    onAddMockFriend(rec.name);

    // Trigger success notification
    setSuccessMessage(`Berhasil menambahkan ${rec.name} sebagai teman!`);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const handleCustomAdd = () => {
    if (!searchQuery.trim()) return;
    onAddMockFriend(searchQuery.trim());
    setSuccessMessage(`Berhasil mengirim permintaan ke ${searchQuery.trim()}!`);
    setSearchQuery("");
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Toast Alert */}
      {successMessage && (
        <GlassCard style={styles.toast}>
          <Text style={styles.toastText}>🎉 {successMessage}</Text>
        </GlassCard>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.title}>Teman & Kontak 👥</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Search Bar */}
        <GlassCard style={styles.searchCard}>
          <View style={styles.searchContainer}>
            <Search size={20} color="rgba(255,255,255,0.4)" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari teman atau ketik nama baru..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleCustomAdd}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={handleCustomAdd} style={styles.quickAddButton}>
                <UserPlus size={16} color="#000" />
                <Text style={styles.quickAddText}>Add</Text>
              </Pressable>
            )}
          </View>
        </GlassCard>

        {/* Mutual Recommendations */}
        <Text style={styles.sectionTitle}>Mungkin Anda Kenal</Text>
        {recommendations.map((rec) => (
          <GlassCard key={rec.uid} style={styles.friendCard}>
            <View style={styles.friendRow}>
              <Image source={{ uri: rec.avatar }} style={styles.avatar} />
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{rec.name}</Text>
                <Text style={styles.friendMeta}>{rec.mutual} teman bersama</Text>
              </View>
              {rec.added ? (
                <View style={[styles.addedBadge, { backgroundColor: COLORS.green + "20" }]}>
                  <Check size={14} color={COLORS.green} />
                  <Text style={[styles.addedText, { color: COLORS.green }]}>Added</Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => handleAddRecommendation(rec)}
                  style={styles.addButton}
                >
                  <UserPlus size={16} color="#000" />
                  <Text style={styles.addText}>Add</Text>
                </Pressable>
              )}
            </View>
          </GlassCard>
        ))}

        {/* Existing Friends */}
        <Text style={styles.sectionTitle}>Teman Anda ({filteredFriends.length})</Text>
        {filteredFriends.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Users size={32} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>Tidak ada teman yang cocok dengan pencarian Anda.</Text>
          </GlassCard>
        ) : (
          filteredFriends.map((friend) => (
            <GlassCard key={friend.uid} style={styles.friendCard}>
              <View style={styles.friendRow}>
                <Image source={{ uri: friend.avatarUrl }} style={styles.avatar} />
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{friend.displayName}</Text>
                  <Text style={styles.friendMeta}>
                    {friend.uid.startsWith("sim") ? "Simulated Friend 🤖" : "Realtime Friend 🔥"}
                  </Text>
                </View>
                <View style={styles.chatStatus}>
                  <Text style={styles.statusEmoji}>{friend.avatarEmoji || "📍"}</Text>
                  <Text style={styles.statusText}>{friend.distanceText || "Dekat"}</Text>
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
    backgroundColor: "rgba(10, 10, 12, 0.95)",
  },
  toast: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: COLORS.green,
    zIndex: 999,
    padding: 14,
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.2)",
  },
  toastText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 14,
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
  searchCard: {
    padding: 12,
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchIcon: {
    marginLeft: 4,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: "#FFF",
    fontSize: 15,
    marginLeft: 10,
    fontWeight: "600",
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
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 12,
    paddingLeft: 4,
  },
  friendCard: {
    padding: 12,
    marginBottom: 10,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#2C2C2E",
  },
  friendInfo: {
    marginLeft: 14,
    flex: 1,
  },
  friendName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFF",
  },
  friendMeta: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    marginTop: 2,
  },
  addButton: {
    backgroundColor: COLORS.green,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 14,
  },
  addText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000",
    marginLeft: 4,
  },
  addedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  addedText: {
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 4,
  },
  chatStatus: {
    alignItems: "flex-end",
  },
  statusEmoji: {
    fontSize: 16,
  },
  statusText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
    marginTop: 3,
    fontWeight: "bold",
  },
  emptyCard: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
  },
});
export default FriendsScreen;
