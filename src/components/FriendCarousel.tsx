import React from "react";
import { StyleSheet, Text, View, Pressable, ScrollView, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { COLORS } from "../theme/colors";
import { FriendLocation } from "../services/mockService";
import { usePresenceStore } from "../store/usePresenceStore";

interface FriendCarouselProps {
  friends: FriendLocation[];
  selectedFriendUid: string | null;
  onFriendSelect: (friend: FriendLocation) => void;
  isDark: boolean;
}

export function FriendCarousel({
  friends,
  selectedFriendUid,
  onFriendSelect,
  isDark,
}: FriendCarouselProps) {
  const friendPresences = usePresenceStore((s) => s.friendPresences);

  const getGlowColor = (friend: FriendLocation) => {
    if (friend.ghostMode === "frozen") return "#8A3FFC";
    if (friend.ghostMode === "blurry") return "#FF5B99";
    const activity = friendPresences[friend.uid]?.activity || friend.activity;
    if (activity === "driving") return "#FF8A00";
    if (activity === "sleeping") return "#8A3FFC";
    return "#2BE080"; // Neon Green for active/online
  };

  const getActivityEmoji = (friend: FriendLocation) => {
    if (friend.geofence === "home") return "🏡";
    if (friend.geofence === "work") return "💼";
    if (friend.geofence === "school") return "🏫";
    const activity = friendPresences[friend.uid]?.activity || friend.activity;
    if (activity === "driving") return "🚗";
    if (activity === "sleeping") return "😴";
    if (activity === "idle") return "⏳";
    return "🟢";
  };

  const getActivityText = (friend: FriendLocation) => {
    if (friend.geofence === "home") return "Rumah";
    if (friend.geofence === "work") return "Kantor";
    if (friend.geofence === "school") return "Sekolah";
    const activity = friendPresences[friend.uid]?.activity || friend.activity;
    if (activity === "driving") return "Menyetir";
    if (activity === "sleeping") return "Tidur";
    if (activity === "idle") return "Diam";
    return "Aktif";
  };

  if (friends.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        pointerEvents="auto"
      >
        {friends.map((friend) => {
          const isSelected = selectedFriendUid === friend.uid;
          const glowColor = getGlowColor(friend);
          const emoji = getActivityEmoji(friend);
          const activityText = getActivityText(friend);

          return (
            <Pressable
              key={friend.uid}
              id={`carousel-friend-${friend.uid}`}
              onPress={() => onFriendSelect(friend)}
              style={styles.cardContainer}
            >
              {Platform.OS === "web" ? (
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: isDark ? "rgba(18, 18, 24, 0.88)" : "rgba(255, 255, 255, 0.92)",
                      borderColor: isSelected ? COLORS.cyan : "rgba(255, 255, 255, 0.1)",
                      shadowColor: isSelected ? COLORS.cyan : "#000",
                    },
                  ]}
                >
                  <View style={[styles.avatarRing, { borderColor: glowColor }]}>
                    <Text style={styles.avatarEmoji}>{friend.avatarEmoji}</Text>
                    <View style={[styles.badge, { backgroundColor: glowColor }]}>
                      <Text style={styles.badgeEmoji}>{emoji}</Text>
                    </View>
                  </View>
                  <Text style={[styles.friendName, { color: isDark ? "#FFF" : "#000" }]} numberOfLines={1}>
                    {friend.displayName}
                  </Text>
                  <Text style={[styles.activityText, { color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }]} numberOfLines={1}>
                    {activityText}
                  </Text>
                </View>
              ) : (
                <BlurView
                  intensity={75}
                  tint={isDark ? "dark" : "light"}
                  style={[
                    styles.card,
                    {
                      borderColor: isSelected ? COLORS.cyan : "rgba(255, 255, 255, 0.15)",
                      shadowColor: isSelected ? COLORS.cyan : "#000",
                      shadowRadius: isSelected ? 8 : 4,
                      shadowOpacity: isSelected ? 0.35 : 0.12,
                    },
                  ]}
                >
                  <View style={[styles.avatarRing, { borderColor: glowColor }]}>
                    <Text style={styles.avatarEmoji}>{friend.avatarEmoji}</Text>
                    <View style={[styles.badge, { backgroundColor: glowColor }]}>
                      <Text style={styles.badgeEmoji}>{emoji}</Text>
                    </View>
                  </View>
                  <Text style={[styles.friendName, { color: isDark ? "#FFF" : "#000" }]} numberOfLines={1}>
                    {friend.displayName}
                  </Text>
                  <Text style={[styles.activityText, { color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }]} numberOfLines={1}>
                    {activityText}
                  </Text>
                </BlurView>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 116 : 102,
    left: 0,
    right: 0,
    zIndex: 95,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 10,
  },
  cardContainer: {
    width: 90,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
    ...Platform.select({
      web: { backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" },
    }),
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    position: "relative",
    marginBottom: 6,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#121216",
  },
  badgeEmoji: {
    fontSize: 9,
  },
  friendName: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
    fontFamily: "System",
  },
  activityText: {
    fontSize: 9,
    fontWeight: "800",
    marginTop: 1,
    fontFamily: "System",
  },
});
