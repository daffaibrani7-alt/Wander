import React from "react";
import { View, Text, StyleSheet, TextInput, Pressable, Image } from "react-native";
import { Search, UserPlus, Check } from "lucide-react-native";
import { GlassCard } from "@/shared/components/GlassCard";
import { COLORS } from "@/shared/theme/colors";
import { SPACING } from "@/shared/theme/spacing";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";

interface AddFriendSectionProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  recommendations: any[];
  onAddRecommendation: (rec: any) => void;
  onCustomAdd: () => void;
}

export function AddFriendSection({
  searchQuery,
  setSearchQuery,
  recommendations,
  onAddRecommendation,
  onCustomAdd,
}: AddFriendSectionProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  return (
    <View style={styles.container}>
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
            onSubmitEditing={onCustomAdd}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => {
                WANDER_HAPTICS.medium();
                onCustomAdd();
              }}
              style={styles.quickAddButton}
            >
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
                onPress={() => {
                  WANDER_HAPTICS.light();
                  onAddRecommendation(rec);
                }}
                style={styles.addButton}
              >
                <UserPlus size={15} color="#000" />
                <Text style={styles.addText}>Add</Text>
              </Pressable>
            )}
          </View>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  searchCard: {
    padding: 10,
    borderRadius: 20,
    marginBottom: 20,
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
});
