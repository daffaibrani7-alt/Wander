import React from "react";
import { View, Image, Text, StyleSheet, Animated } from "react-native";
import { BatteryBadge } from "./BatteryBadge";

interface MapMarkerProps {
  displayName: string;
  avatarUrl: string;
  avatarEmoji: string;
  batteryLevel: number;
  isCharging: boolean;
  ghostMode: "precise" | "blurry" | "frozen";
  activity?: "online" | "idle" | "driving" | "sleeping";
  isMe?: boolean;
  isOnline?: boolean;
}

export function MapMarker({
  displayName,
  avatarUrl,
  avatarEmoji,
  batteryLevel,
  isCharging,
  ghostMode,
  activity,
  isMe = false,
  isOnline = true,
}: MapMarkerProps) {
  
  // Decide glowing border color
  const getGlowColor = () => {
    if (isMe) return "#00F0FF"; // Cyan for user
    if (ghostMode === "frozen") return "#8A3FFC"; // Purple for Frozen
    if (ghostMode === "blurry") return "#FF5B99"; // Pink for Blurry
    return "#2BE080"; // Neon Green for Precise/Active Friends
  };

  const glowColor = getGlowColor();

  return (
    <View style={styles.container}>
      {/* Outer Glow Ring */}
      <View style={[styles.glowRing, { borderColor: glowColor }]}>
        {/* Avatar Wrapper */}
        <View style={styles.avatarWrapper}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: glowColor }]}>
              <Text style={styles.fallbackText}>{displayName.slice(0, 2).toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Floating Emoji Vibe Badge */}
        <View style={[styles.emojiBadge, { backgroundColor: glowColor }]}>
          <Text style={styles.emojiText}>{avatarEmoji || "📍"}</Text>
        </View>

        {/* Floating Activity Status Badge */}
        {activity && activity !== "online" && (
          <View style={styles.activityBadge}>
            <Text style={{ fontSize: 10 }}>
              {activity === "driving" && "🚗"}
              {activity === "sleeping" && "😴"}
              {activity === "idle" && "⏳"}
            </Text>
          </View>
        )}

        {/* Online Status Dot */}
        <View
          style={[
            styles.onlineDot,
            { backgroundColor: isOnline ? "#2BE080" : "#8E8E93" }
          ]}
        />
      </View>

      {/* Battery badge attached below marker */}
      <View style={styles.batteryBadgeContainer}>
        <BatteryBadge level={batteryLevel} isCharging={isCharging} size="sm" />
      </View>
      
      {/* Mini stem pointing down */}
      <View style={[styles.markerStem, { borderTopColor: glowColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    width: 65,
    height: 75,
  },
  glowRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    position: "relative",
  },
  avatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#2C2C2E",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  emojiBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2.0,
    elevation: 4,
  },
  emojiText: {
    fontSize: 10,
  },
  activityBadge: {
    position: "absolute",
    top: -8,
    left: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#1C1C1E",
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2.0,
    elevation: 4,
  },
  onlineDot: {
    position: "absolute",
    bottom: -2,
    left: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#1C1C1E",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.0,
    elevation: 2,
  },
  batteryBadgeContainer: {
    marginTop: 4,
    zIndex: 10,
  },
  markerStem: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#2BE080",
    marginTop: -2,
  },
});
export default MapMarker;
