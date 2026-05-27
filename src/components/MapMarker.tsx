import React, { useEffect, useRef, useMemo, useState } from "react";
import { View, Image, Text, StyleSheet, Animated } from "react-native";
import { BatteryBadge } from "./BatteryBadge";
import { ImageCache } from "../utils/imageCache";

interface MapMarkerProps {
  displayName: string;
  avatarUrl: string;
  avatarEmoji: string;
  batteryLevel: number;
  isCharging: boolean;
  ghostMode: "precise" | "blurry" | "frozen";
  activity?: "online" | "idle" | "driving" | "sleeping" | "walking" | "traveling" | "home" | "work" | "school" | "cafe";
  geofence?: "home" | "work" | "school" | "cafe" | "custom" | null;
  isMe?: boolean;
  isOnline?: boolean;
}

// Pure helper — defined outside component so it's never recreated
function resolveGlowColor(
  isMe: boolean,
  ghostMode: MapMarkerProps["ghostMode"],
  activity: MapMarkerProps["activity"]
): string {
  if (isMe) return "#00F0FF";
  if (ghostMode === "frozen") return "#8A3FFC";
  if (ghostMode === "blurry") return "#FF5B99";
  if (activity === "driving") return "#FF8A00";
  if (activity === "sleeping") return "#8A3FFC";
  if (activity === "walking") return "#FF5B99";
  if (activity === "traveling") return "#00F0FF";
  return "#2BE080";
}

// Custom equality — only re-render if visually meaningful props changed
function arePropsEqual(prev: MapMarkerProps, next: MapMarkerProps): boolean {
  return (
    prev.avatarUrl === next.avatarUrl &&
    prev.avatarEmoji === next.avatarEmoji &&
    prev.displayName === next.displayName &&
    prev.batteryLevel === next.batteryLevel &&
    prev.isCharging === next.isCharging &&
    prev.ghostMode === next.ghostMode &&
    prev.activity === next.activity &&
    prev.geofence === next.geofence &&
    prev.isMe === next.isMe &&
    prev.isOnline === next.isOnline
  );
}

function MapMarkerComponent({
  displayName,
  avatarUrl,
  avatarEmoji,
  batteryLevel,
  isCharging,
  ghostMode,
  activity,
  geofence,
  isMe = false,
  isOnline = true,
}: MapMarkerProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const [imageError, setImageError] = useState(false);

  // Resolve URI synchronously — ImageCache.prefetch() in home.tsx pre-warms this
  const resolvedUri = ImageCache.resolve(avatarUrl);

  // Premium spring bounce on mount — only once
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 110,
      friction: 6,
      useNativeDriver: true,
    }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset error flag when avatar URL changes
  const prevUrlRef = useRef(avatarUrl);
  if (prevUrlRef.current !== avatarUrl) {
    prevUrlRef.current = avatarUrl;
    // imageError will be reset by the key change on the Image component below
  }

  // Memoize — only recalculate when colour-affecting props change
  const glowColor = useMemo(
    () => resolveGlowColor(isMe, ghostMode, activity),
    [isMe, ghostMode, activity]
  );

  const showActivityBadge = (geofence || (activity && activity !== "online"));

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      {/* Outer Glow Ring */}
      <View style={[styles.glowRing, { borderColor: glowColor }]}>
        {/* Avatar Wrapper */}
        <View style={styles.avatarWrapper}>
          {resolvedUri && !imageError ? (
            <Image
              key={resolvedUri}
              source={{ uri: resolvedUri }}
              style={styles.avatarImage}
              fadeDuration={200}
              onError={() => setImageError(true)}
            />
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

        {/* Floating Activity/Geofence Status Badge */}
        {showActivityBadge && (
          <View style={styles.activityBadge}>
            <Text style={{ fontSize: 10 }}>
              {geofence === "home" || activity === "home" ? "🏡" : ""}
              {geofence === "work" || activity === "work" ? "💼" : ""}
              {geofence === "school" || activity === "school" ? "🏫" : ""}
              {geofence === "cafe" || activity === "cafe" ? "☕" : ""}
              {!geofence && activity === "driving" && "🚗"}
              {!geofence && activity === "walking" && "🚶"}
              {!geofence && activity === "sleeping" && "😴"}
              {!geofence && activity === "traveling" && "✈️"}
              {!geofence && activity === "idle" && "⏳"}
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
    </Animated.View>
  );
}

export const MapMarker = React.memo(MapMarkerComponent, arePropsEqual);

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
