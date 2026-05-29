import React, { useRef, useEffect } from "react";
import { Animated, StyleSheet, Platform } from "react-native";
import { MemoryCardCarousel } from "@/features/exploration/components/MemoryCardCarousel";
import { FriendCarousel } from "@/features/friends/components/FriendCarousel";

interface HomeFloatingCardsProps {
  selectedFriend: any;
  overlayOpacity: any;
  isDark: boolean;
  friends: any[];
  selectedFriendUid: string | null;
  onFriendSelect: (friend: any) => void;
  onRevisitMemory: (coords: { latitude: number; longitude: number }) => void;
}

export function HomeFloatingCards({
  selectedFriend,
  overlayOpacity,
  isDark,
  friends,
  selectedFriendUid,
  onFriendSelect,
  onRevisitMemory,
}: HomeFloatingCardsProps) {
  const memoriesAnim = useRef(new Animated.Value(360)).current;

  const isMemoriesActive = selectedFriendUid === "memories";

  useEffect(() => {
    Animated.spring(memoriesAnim, {
      toValue: isMemoriesActive ? 0 : 360,
      tension: 30,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [isMemoriesActive]);

  // If a real friend is selected, we hide the HUD elements for zero visual competition
  if (selectedFriend) return null;

  return (
    <>
      {/* Relocate Memories carousel absolutely to the bottom region, sitting cleanly above tab bar */}
      <Animated.View 
        style={[
          styles.memoriesWrapper, 
          { 
            opacity: overlayOpacity,
            transform: [{ translateY: memoriesAnim }]
          }
        ]}
      >
        <MemoryCardCarousel
          isDark={isDark}
          onRevisitMemory={onRevisitMemory}
          onClose={() => onFriendSelect(null)}
        />
      </Animated.View>

      {/* Relocated sleek top friend avatar pill carousel */}
      <Animated.View style={{ opacity: overlayOpacity }}>
        <FriendCarousel
          friends={friends}
          selectedFriendUid={selectedFriendUid}
          onFriendSelect={onFriendSelect}
          isDark={isDark}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  memoriesWrapper: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 104 : 88,
    left: 0,
    right: 0,
    zIndex: 90,
  },
});
