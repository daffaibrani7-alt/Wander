import React from "react";
import { View, Text, StyleSheet, Pressable, Animated, Alert, Platform } from "react-native";
import { X, Zap, MessageCircle, Navigation } from "lucide-react-native";
import { GlassCard } from "@/shared/components/GlassCard";
import { COLORS } from "@/shared/theme/colors";
import { SPACING } from "@/shared/theme/spacing";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";
import { ZINDEX } from "@/shared/theme/zIndex";

interface HomeBottomSheetProps {
  selectedFriend: any;
  slideAnim: Animated.Value;
  toggleSheetState: () => void;
  onClose: () => void;
  onBuzzTrigger: (msg: string, title: string, emoji: string) => void;
}

export function HomeBottomSheet({
  selectedFriend,
  slideAnim,
  toggleSheetState,
  onClose,
  onBuzzTrigger,
}: HomeBottomSheetProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  if (!selectedFriend) return null;

  const cardBorderColor = isDark
    ? "rgba(255, 255, 255, 0.06)"
    : "rgba(0, 0, 0, 0.04)";

  return (
    <Animated.View 
      style={[
        styles.bottomSheet, 
        { 
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <GlassCard 
        style={[
          styles.detailCard, 
          { 
            borderColor: cardBorderColor,
            marginBottom: Platform.OS === "ios" ? 116 : 96
          }
        ]} 
        tier="solid"
      >
        {/* Grab handle */}
        <Pressable onPress={toggleSheetState} style={styles.handleWrap} id="toggle-friend-panel-state">
          <View style={[styles.handle, { backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" }]} />
        </Pressable>

        {/* Header content */}
        <Pressable onPress={toggleSheetState} style={styles.friendRow}>
          <View style={[styles.friendAvatarWrap, { borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}>
            <Text style={styles.friendEmoji}>{selectedFriend.avatarEmoji}</Text>
            <View
              style={[
                styles.onlineDot,
                { backgroundColor: selectedFriend.ghostMode === "frozen" ? COLORS.purple : COLORS.green },
              ]}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.friendName, { color: theme.text }]}>
              {selectedFriend.displayName}
            </Text>
            <Text style={[styles.friendSub, { color: theme.textMuted }]}>
              📍 Distance: {selectedFriend.distanceText || "Calculating..."}
            </Text>
            <Text style={[styles.friendSub, { color: theme.textMuted }]}>
              🕒 Updated: {selectedFriend.statusText || "Active"}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} id="close-friend-panel">
            <X size={16} color={theme.textMuted} />
          </Pressable>
        </Pressable>

        {/* Dynamic opacity fade for secondary detailed contents when bottom sheet is peeked */}
        <Animated.View
          style={{
            opacity: slideAnim.interpolate({
              inputRange: [0, 100, 240],
              outputRange: [1, 0, 0],
            }),
          }}
          pointerEvents={selectedFriend ? "auto" : "none"}
        >
          {/* Zenly Status Pills */}
          <View style={styles.pillsContainer}>
            {selectedFriend.geofence && (
              <View style={[styles.statusPill, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderColor: cardBorderColor }]}>
                <Text style={[styles.statusTextPill, { color: theme.text }]}>
                  {selectedFriend.geofence === "home" && "🏡 Chilling at Home"}
                  {selectedFriend.geofence === "work" && "💼 Working at Office"}
                  {selectedFriend.geofence === "school" && "🏫 Studying at School"}
                </Text>
              </View>
            )}

            <View style={[
              styles.statusPill, 
              { 
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", 
                borderColor: cardBorderColor
              }
            ]}>
              <Text style={[
                styles.statusTextPill, 
                { 
                  color: selectedFriend.activity === "driving" ? "#FF8A00" : 
                         selectedFriend.activity === "sleeping" ? COLORS.purple : 
                         COLORS.green
                }
              ]}>
                {selectedFriend.activity === "driving" && "🚗 Cruising the Streets"}
                {selectedFriend.activity === "sleeping" && "😴 Resting"}
                {selectedFriend.activity === "idle" && "⏳ Enjoying the Vibes"}
                {selectedFriend.activity === "online" && "🟢 Active & Awake"}
              </Text>
            </View>

            <View style={[
              styles.statusPill, 
              { 
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", 
                borderColor: cardBorderColor 
              }
            ]}>
              <Text style={[styles.statusTextPill, { color: theme.text }]}>
                🔋 {selectedFriend.batteryLevel}% {selectedFriend.isCharging ? "⚡" : ""}
              </Text>
            </View>
          </View>

          {/* Geofence Status Display */}
          {selectedFriend.geofence && (
            <View style={styles.radiusSelector}>
              <Text style={[styles.radiusTitle, { color: theme.textMuted }]}>
                ✨ PRESENCE BEAT
              </Text>
              <GlassCard style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderColor: cardBorderColor }} tier="light">
                <Text style={{ fontSize: 16, marginRight: 8 }}>
                  {selectedFriend.geofence === "home" ? "🏡" : selectedFriend.geofence === "work" ? "💼" : selectedFriend.geofence === "school" ? "🏫" : "📍"}
                </Text>
                <Text style={[styles.statusTextPill, { color: theme.text, fontSize: 12 }]}>
                  Currently at {selectedFriend.geofence === "home" ? "Home for a rest" : selectedFriend.geofence === "work" ? "Office for work" : selectedFriend.geofence === "school" ? "School to study" : "Favorite Area"}
                </Text>
              </GlassCard>
            </View>
          )}

          {/* Action Row */}
          <View style={styles.actionRow}>
            <Pressable
              id="buzz-button"
              onPress={() => {
                WANDER_HAPTICS.heavy();
                onBuzzTrigger(`Buzz sent to ${selectedFriend.displayName}!`, "Zenly Buzz", "⚡️");
                setTimeout(() => onBuzzTrigger(`${selectedFriend.displayName} replied to your Buzz!`, "Zenly Buzz", "⚡️"), 2000);
                onClose();
              }}
              style={[styles.actionBtn, { backgroundColor: COLORS.yellow }]}
            >
              <Zap size={17} color="#000" fill="#000" />
              <Text style={[styles.actionLabel, { color: "#000" }]}>Buzz</Text>
            </Pressable>

            <Pressable
              id="chat-button"
              onPress={() => {
                WANDER_HAPTICS.medium();
                Alert.alert("Chat", `Opening chat with ${selectedFriend.displayName}…`);
                onClose();
              }}
              style={[styles.actionBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}
            >
              <MessageCircle size={17} color={theme.text} />
              <Text style={[styles.actionLabel, { color: theme.text }]}>Chat</Text>
            </Pressable>

            <Pressable
              id="navigate-button"
              onPress={() => {
                WANDER_HAPTICS.medium();
                Alert.alert("Navigation", `Routing to ${selectedFriend.displayName}…`);
                onClose();
              }}
              style={[styles.actionBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}
            >
              <Navigation size={17} color={theme.text} />
              <Text style={[styles.actionLabel, { color: theme.text }]}>Route</Text>
            </Pressable>
          </View>
        </Animated.View>
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    zIndex: ZINDEX.sheets,
  },
  detailCard: {
    paddingTop: 6,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderRadius: 28,
    borderWidth: 1,
  },
  handleWrap: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  friendAvatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  friendEmoji: {
    fontSize: 26,
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "transparent",
  },
  friendName: {
    fontSize: 18,
    fontWeight: "900",
    fontFamily: "System",
  },
  friendSub: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    fontFamily: "System",
  },
  closeBtn: {
    padding: 8,
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 2,
    marginBottom: 16,
    gap: 6,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  statusTextPill: {
    fontSize: 11,
    fontWeight: "800",
    fontFamily: "System",
  },
  radiusSelector: {
    marginVertical: 4,
    marginBottom: 14,
  },
  radiusTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8,
    fontFamily: "System",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    borderRadius: 14,
    gap: 6,
  },
  actionLabel: {
    fontWeight: "800",
    fontSize: 13,
    fontFamily: "System",
  },
});
