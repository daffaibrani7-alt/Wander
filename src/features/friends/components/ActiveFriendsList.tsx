import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Users } from "lucide-react-native";
import { GlassCard } from "@/shared/components/GlassCard";
import { EmptyState } from "@/shared/components/EmptyState";
import { COLORS } from "@/shared/theme/colors";
import { SPACING } from "@/shared/theme/spacing";
import { useThemeStore } from "@/features/settings/store/useThemeStore";

interface ActiveFriendsListProps {
  filteredFriends: any[];
  onTriggerSearchFocus?: () => void;
}

export function ActiveFriendsList({
  filteredFriends,
  onTriggerSearchFocus,
}: ActiveFriendsListProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
        Teman Anda ({filteredFriends.length})
      </Text>

      {filteredFriends.length === 0 ? (
        <EmptyState
          icon={<Users size={32} color={theme.textMuted} />}
          title="Belum Ada Teman di Radar"
          description="Belum ada teman di radar Anda. Mulailah perjalanan berdua dengan mengetik nama teman di atas untuk menghubungkan radar sosial Anda!"
          actionTitle={onTriggerSearchFocus ? "Cari Teman Baru" : undefined}
          onActionPress={onTriggerSearchFocus}
        />
      ) : (
        filteredFriends.map((friend) => (
          <GlassCard key={friend.uid} style={styles.friendCard}>
            <View style={styles.friendRow}>
              <Image source={{ uri: friend.avatarUrl }} style={styles.avatar} />
              <View style={styles.friendInfo}>
                <Text style={[styles.friendName, { color: theme.text }]}>
                  {friend.displayName}
                </Text>
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
    marginBottom: 12,
    marginTop: 12,
    paddingLeft: 4,
  },
  friendCard: {
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
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
});
