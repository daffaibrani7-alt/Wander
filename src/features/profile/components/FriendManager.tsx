import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { GlassCard } from "@/shared/components/GlassCard";
import { COLORS } from "@/shared/theme/colors";
import { SPACING } from "@/shared/theme/spacing";
import { useThemeStore } from "@/features/settings/store/useThemeStore";

interface FriendManagerProps {
  user: any;
  friends: any[];
  incomingRequests: any[];
  blockedUsers: any[];
  searchResults: any[];
  onSearch: (query: string) => void;
  onSendRequest: (targetUid: string) => void;
  onAcceptRequest: (targetUid: string) => void;
  onRejectRequest: (targetUid: string) => void;
  onRemoveFriend: (targetUid: string) => void;
  onBlockUser: (targetUid: string) => void;
  onUnblockUser: (targetUid: string) => void;
}

export function FriendManager({
  user,
  friends,
  incomingRequests,
  blockedUsers,
  searchResults,
  onSearch,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  onRemoveFriend,
  onBlockUser,
  onUnblockUser,
}: FriendManagerProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <View style={styles.container}>
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
            onSubmitEditing={handleSearchSubmit}
          />
          <Pressable onPress={handleSearchSubmit} style={[styles.searchBtn, { backgroundColor: COLORS.cyan }]}>
            <Text style={styles.searchBtnText}>Cari</Text>
          </Pressable>
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.resultsList}>
            {searchResults.map((item) => {
              const isAlreadyFriend = friends.some((f) => f.uid === item.uid);
              const isIncoming = incomingRequests.some((r) => r.uid === item.uid);
              const isOutgoing = false; // Outgoing tracking can be resolved by store or left implicit

              return (
                <View key={item.uid} style={styles.resultItem}>
                  <Text style={styles.resultEmoji}>{item.avatarEmoji || "🦊"}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.resultName, { color: theme.text }]}>{item.displayName}</Text>
                  </View>
                  
                  {isAlreadyFriend ? (
                    <Text style={[styles.statusText, { color: COLORS.green }]}>Teman</Text>
                  ) : isIncoming ? (
                    <Pressable
                      onPress={() => onAcceptRequest(item.uid)}
                      style={[styles.actionBadge, { backgroundColor: COLORS.green }]}
                    >
                      <Text style={styles.badgeText}>Terima</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => onSendRequest(item.uid)}
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
                    onPress={() => onAcceptRequest(item.uid)}
                    style={[styles.iconActionBtn, { backgroundColor: "rgba(0, 240, 255, 0.15)" }]}
                  >
                    <Text style={{ color: COLORS.cyan, fontWeight: "900", fontSize: 13 }}>Terima</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onRejectRequest(item.uid)}
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
                    onPress={() => onRemoveFriend(item.uid)}
                    style={styles.unfriendBtn}
                  >
                    <Text style={{ color: COLORS.pink, fontWeight: "800", fontSize: 12 }}>Hapus</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onBlockUser(item.uid)}
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
                  onPress={() => onUnblockUser(item.uid)}
                  style={styles.unfriendBtn}
                >
                  <Text style={{ color: COLORS.cyan, fontWeight: "800", fontSize: 12 }}>Buka Blokir</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </GlassCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
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
  friendCard: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 20,
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
});
