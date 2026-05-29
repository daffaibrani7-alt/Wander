import React, { memo } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { COLORS } from "@/shared/theme/colors";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";
import { FriendLocation } from "@/features/friends/services/mockService";
import { usePresenceStore } from "@/features/presence/store/usePresenceStore";

interface FriendCarouselProps {
  friends: FriendLocation[];
  selectedFriendUid: string | null;
  onFriendSelect: (friend: FriendLocation) => void;
  isDark: boolean;
}

function getGlowColor(friend: FriendLocation, activity?: string): string {
  if (friend.ghostMode === "frozen") return COLORS.purple;
  if (friend.ghostMode === "blurry") return COLORS.pink;
  if (activity === "driving") return "#FF8A00";
  if (activity === "sleeping") return COLORS.purple;
  return COLORS.green;
}

function getActivityEmoji(friend: FriendLocation, activity?: string): string {
  if (friend.geofence === "home") return "🏡";
  if (friend.geofence === "work") return "💼";
  if (friend.geofence === "school") return "🏫";
  if (activity === "driving") return "🚗";
  if (activity === "sleeping") return "😴";
  if (activity === "idle") return "⏳";
  return "🟢";
}

interface FriendCardProps {
  friend: FriendLocation;
  isSelected: boolean;
  isDark: boolean;
  activity?: string;
  onPress: () => void;
}

function FriendCardComponent({ friend, isSelected, isDark, activity, onPress }: FriendCardProps) {
  const glowColor = getGlowColor(friend, activity);
  const emoji = getActivityEmoji(friend, activity);

  const cardContent = (
    <>
      <View style={[styles.avatarRing, { borderColor: isSelected ? COLORS.cyan : "rgba(255,255,255,0.06)" }]}>
        <Text style={styles.avatarEmoji}>{friend.avatarEmoji}</Text>
        <View style={[styles.badge, { backgroundColor: glowColor }]}>
          <Text style={styles.badgeEmoji}>{emoji}</Text>
        </View>
      </View>
      <Text
        style={[styles.friendName, { color: isSelected ? COLORS.cyan : isDark ? "#FFF" : "#000" }]}
        numberOfLines={1}
      >
        {friend.displayName.split(" ")[0]}
      </Text>
    </>
  );

  const cardBorderColor = isSelected
    ? COLORS.cyan + "55"
    : isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.06)";

  const cardBgColor = isDark
    ? isSelected
      ? "rgba(18, 18, 22, 0.95)"
      : "rgba(18, 18, 22, 0.72)"
    : isSelected
    ? "rgba(255, 255, 255, 0.98)"
    : "rgba(255, 255, 255, 0.85)";

  return (
    <Pressable
      key={friend.uid}
      id={`carousel-friend-${friend.uid}`}
      onPress={onPress}
      style={styles.cardContainer}
    >
      {Platform.OS === "web" ? (
        <View
          style={[
            styles.card,
            {
              backgroundColor: cardBgColor,
              borderColor: cardBorderColor,
            },
          ]}
        >
          {cardContent}
        </View>
      ) : (
        <BlurView
          intensity={80}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.card,
            {
              backgroundColor: cardBgColor,
              borderColor: cardBorderColor,
            },
          ]}
        >
          {cardContent}
        </BlurView>
      )}
    </Pressable>
  );
}

const FriendCard = memo(FriendCardComponent, (prev, next) => {
  return (
    prev.isSelected === next.isSelected &&
    prev.isDark === next.isDark &&
    prev.activity === next.activity &&
    prev.friend.uid === next.friend.uid &&
    prev.friend.ghostMode === next.friend.ghostMode &&
    prev.friend.geofence === next.friend.geofence &&
    prev.friend.avatarEmoji === next.friend.avatarEmoji &&
    prev.friend.displayName === next.friend.displayName &&
    prev.friend.equippedBadgeEmoji === next.friend.equippedBadgeEmoji
  );
});

function FriendCarouselComponent({
  friends,
  selectedFriendUid,
  onFriendSelect,
  isDark,
}: FriendCarouselProps) {
  const friendPresences = usePresenceStore((s) => s.friendPresences);

  if (friends.length === 0) return null;

  const isMemoriesSelected = selectedFriendUid === "memories";
  const memoriesBorderColor = isMemoriesSelected
    ? COLORS.purple + "aa"
    : isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.06)";

  const memoriesBgColor = isDark
    ? isMemoriesSelected
      ? "rgba(138, 63, 252, 0.25)"
      : "rgba(18, 18, 22, 0.72)"
    : isMemoriesSelected
    ? "rgba(138, 63, 252, 0.15)"
    : "rgba(255, 255, 255, 0.85)";

  const memoriesCard = (
    <Pressable
      id="toggle-memories-pill-button"
      onPress={() => {
        WANDER_HAPTICS.medium();
        if (isMemoriesSelected) {
          onFriendSelect(null as any);
        } else {
          onFriendSelect({ uid: "memories", displayName: "Memori", avatarEmoji: "🎞️" } as any);
        }
      }}
      style={styles.cardContainer}
    >
      {Platform.OS === "web" ? (
        <View
          style={[
            styles.card,
            {
              backgroundColor: memoriesBgColor,
              borderColor: memoriesBorderColor,
            },
          ]}
        >
          <View style={[styles.avatarRing, { borderColor: isMemoriesSelected ? COLORS.purple : "rgba(255,255,255,0.06)" }]}>
            <Text style={styles.avatarEmoji}>🎞️</Text>
          </View>
          <Text
            style={[styles.friendName, { color: isMemoriesSelected ? COLORS.purple : isDark ? "#FFF" : "#000" }]}
            numberOfLines={1}
          >
            Memori
          </Text>
        </View>
      ) : (
        <BlurView
          intensity={80}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.card,
            {
              backgroundColor: memoriesBgColor,
              borderColor: memoriesBorderColor,
            },
          ]}
        >
          <View style={[styles.avatarRing, { borderColor: isMemoriesSelected ? COLORS.purple : "rgba(255,255,255,0.06)" }]}>
            <Text style={styles.avatarEmoji}>🎞️</Text>
          </View>
          <Text
            style={[styles.friendName, { color: isMemoriesSelected ? COLORS.purple : isDark ? "#FFF" : "#000" }]}
            numberOfLines={1}
          >
            Memori
          </Text>
        </BlurView>
      )}
    </Pressable>
  );

  return (
    <View style={styles.container} pointerEvents="box-none">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        pointerEvents="auto"
        removeClippedSubviews={Platform.OS !== "web"}
      >
        {memoriesCard}

        {friends.map((friend) => {
          const presence = friendPresences[friend.uid];
          const activity = presence?.activity || friend.activity;

          return (
            <FriendCard
              key={friend.uid}
              friend={friend}
              isSelected={selectedFriendUid === friend.uid}
              isDark={isDark}
              activity={activity}
              onPress={() => onFriendSelect(friend)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

export const FriendCarousel = memo(FriendCarouselComponent, (prev, next) => {
  return (
    prev.isDark === next.isDark &&
    prev.selectedFriendUid === next.selectedFriendUid &&
    prev.friends === next.friends
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "ios" ? 112 : 92,
    left: 0,
    right: 0,
    zIndex: 95,
    height: 72,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    gap: 8,
  },
  cardContainer: {
    width: 60,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    position: "relative",
    marginBottom: 4,
  },
  avatarEmoji: {
    fontSize: 16,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#121216",
  },
  badgeEmoji: {
    fontSize: 7,
  },
  friendName: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.2,
    fontFamily: "System",
    textAlign: "center",
    width: "100%",
  },
});
