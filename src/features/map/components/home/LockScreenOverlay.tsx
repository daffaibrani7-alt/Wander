import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { LiveActivityCard } from "@/shared/components/LiveActivityCard";

interface LockScreenOverlayProps {
  isLockScreenSimulated: boolean;
  activeActivity: any;
  onUnlock: () => void;
}

export function LockScreenOverlay({
  isLockScreenSimulated,
  activeActivity,
  onUnlock,
}: LockScreenOverlayProps) {
  if (!isLockScreenSimulated) return null;

  const renderContent = () => (
    <View style={styles.content}>
      {/* Clock and Date */}
      <View style={styles.clockContainer}>
        <Text style={styles.dateText}>Rabu, 27 Mei</Text>
        <Text style={styles.timeText}>10:49</Text>
      </View>

      {/* Live Activity positioned under clock */}
      {activeActivity && (
        <View style={styles.activityWrap} pointerEvents="box-none">
          <LiveActivityCard activity={activeActivity} />
        </View>
      )}

      {/* Footer unlock clue */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Tap di mana saja untuk membuka kunci 🔓</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {Platform.OS === "web" ? (
        <Pressable
          onPress={onUnlock}
          style={[styles.wallpaper, { backgroundColor: "rgba(8, 8, 12, 0.97)" }]}
        >
          {renderContent()}
        </Pressable>
      ) : (
        <BlurView intensity={98} tint="dark" style={styles.wallpaper}>
          <Pressable onPress={onUnlock} style={StyleSheet.absoluteFill}>
            {renderContent()}
          </Pressable>
        </BlurView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
  },
  wallpaper: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Platform.OS === "ios" ? 80 : 60,
    paddingHorizontal: 20,
  },
  clockContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  dateText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "System",
  },
  timeText: {
    color: "#FFFFFF",
    fontSize: 76,
    fontWeight: "200",
    fontFamily: "System",
    marginTop: 4,
  },
  activityWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.45)",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "System",
  },
});
