import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Navigation, Trash2, X, AlertTriangle, Compass, MapPin } from "lucide-react-native";
import { COLORS } from "@/shared/theme/colors";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { useLiveActivityStore, LiveActivityState } from "@/shared/store/useLiveActivityStore";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface LiveActivityCardProps {
  activity: LiveActivityState;
}

export function LiveActivityCard({ activity }: LiveActivityCardProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  const { stopLiveActivity } = useLiveActivityStore();

  const slideAnim = useRef(new Animated.Value(180)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Slide up animation on mount
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 30,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  // Sync progressRatio driving animation smoothly
  useEffect(() => {
    if (activity.type === "driving") {
      Animated.spring(progressAnim, {
        toValue: activity.progressRatio,
        tension: 15,
        friction: 6,
        useNativeDriver: false, // Layout animations on width/margins don't support native driver
      }).start();
    }
  }, [activity.progressRatio]);

  // Sync radar pulse animation loop
  useEffect(() => {
    if (activity.type === "nearby") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.35,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [activity.type]);

  const handleDismiss = () => {
    Haptics.selectionAsync().catch(() => {});
    Animated.timing(slideAnim, {
      toValue: 180,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      stopLiveActivity();
    });
  };

  const renderDrivingTracker = () => {
    // Interpolate progress width dynamically
    const carOffset = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["0%", "88%"],
    });

    const speed = activity.details.speed || 0;
    const eta = activity.details.etaMinutes || 0;
    const place = activity.details.placeName || "Tujuan";

    return (
      <View style={styles.activityContent}>
        {/* Top Info section */}
        <View style={styles.topSection}>
          <View style={styles.infoLeft}>
            <View style={[styles.avatarBox, { borderColor: COLORS.green }]}>
              <Text style={styles.avatarEmoji}>{activity.emoji}</Text>
            </View>
            <View style={styles.textBox}>
              <Text style={[styles.title, { color: theme.text }]}>
                {activity.displayName} • Sedang Berkendara
              </Text>
              <Text style={[styles.sub, { color: theme.textMuted }]}>
                Menuju: {place} • {speed} km/jam
              </Text>
            </View>
          </View>
          <Text style={[styles.etaBadge, { color: COLORS.green }]}>
            {eta > 0 ? `${eta} mtk` : "Tiba"}
          </Text>
        </View>

        {/* Dynamic Linear Travel progress Bar [📍]─────🚗─────[💼] */}
        <View style={styles.progressBarContainer}>
          <MapPin size={14} color={COLORS.pink} style={styles.progressAnchor} />
          
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, { width: carOffset, backgroundColor: COLORS.green }]} />
            <Animated.View style={[styles.carWrapper, { left: carOffset }]}>
              <Text style={styles.carEmoji}>🚗</Text>
            </Animated.View>
          </View>

          <Compass size={14} color={COLORS.green} style={styles.progressAnchor} />
        </View>

        {/* Footer info summaries */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            Sisa waktu: {eta} menit • Akurasi GPS Tinggi
          </Text>
        </View>
      </View>
    );
  };

  const renderRadarTracker = () => {
    const distance = activity.details.distanceText || "Dekat";

    return (
      <View style={styles.activityContent}>
        <View style={styles.topSection}>
          <View style={styles.infoLeft}>
            {/* Pulsing Radar Ring layout */}
            <View style={styles.radarWrapper}>
              <Animated.View
                style={[
                  styles.radarPulseCircle,
                  {
                    transform: [{ scale: pulseAnim }],
                    borderColor: COLORS.cyan,
                  },
                ]}
              />
              <View style={[styles.radarCenter, { backgroundColor: "rgba(0, 240, 255, 0.25)" }]}>
                <Text style={styles.avatarEmoji}>🤝</Text>
              </View>
            </View>
            <View style={styles.textBox}>
              <Text style={[styles.title, { color: theme.text }]}>
                Teman Dekat Terdeteksi!
              </Text>
              <Text style={[styles.sub, { color: theme.textMuted }]}>
                {activity.displayName} berada sangat dekat denganmu
              </Text>
            </View>
          </View>
          <Text style={[styles.etaBadge, { color: COLORS.cyan }]}>
            {distance}
          </Text>
        </View>
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            Kirim ping ke teman Anda untuk menyapa mereka di sekitar.
          </Text>
        </View>
      </View>
    );
  };

  const renderArrivalTracker = () => {
    const place = activity.details.placeName || "Tujuan";

    return (
      <View style={styles.activityContent}>
        <View style={styles.topSection}>
          <View style={styles.infoLeft}>
            <View style={[styles.avatarBox, { borderColor: COLORS.purple }]}>
              <Text style={styles.avatarEmoji}>🏡</Text>
            </View>
            <View style={styles.textBox}>
              <Text style={[styles.title, { color: theme.text }]}>
                Sampai di Tujuan
              </Text>
              <Text style={[styles.sub, { color: theme.textMuted }]}>
                Anda telah terdeteksi sampai di {place}!
              </Text>
            </View>
          </View>
          <View style={[styles.etaIcon, { backgroundColor: "rgba(138, 63, 252, 0.2)" }]}>
            <Text style={{ fontSize: 13 }}>🏡</Text>
          </View>
        </View>
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            Kehadiran Anda telah dibagikan kepada teman Anda di peta.
          </Text>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    switch (activity.type) {
      case "driving":
        return renderDrivingTracker();
      case "nearby":
        return renderRadarTracker();
      case "arrival":
        return renderArrivalTracker();
      default:
        return null;
    }
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      {Platform.OS === "web" ? (
        <View style={[styles.webFallback, { backgroundColor: "rgba(12, 12, 16, 0.96)", borderColor: theme.border }]}>
          {renderContent()}
          <Pressable onPress={handleDismiss} style={styles.closeBtn}>
            <X size={14} color="#8E8E93" />
          </Pressable>
        </View>
      ) : (
        <BlurView intensity={95} tint="dark" style={[styles.blurCard, { borderColor: "rgba(255, 255, 255, 0.08)" }]}>
          {renderContent()}
          <Pressable onPress={handleDismiss} style={styles.closeBtn}>
            <X size={14} color="#8E8E93" />
          </Pressable>
        </BlurView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 34 : 20,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  blurCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: "hidden",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  webFallback: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 16,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    padding: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  activityContent: {
    width: "100%",
  },
  topSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginRight: 10,
  },
  avatarEmoji: {
    fontSize: 18,
  },
  textBox: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  sub: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.8,
    marginTop: 2,
  },
  etaBadge: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.3,
    marginRight: 18,
  },
  etaIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 18,
  },

  // Driving progress tracker bar styles
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  progressAnchor: {
    opacity: 0.95,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginHorizontal: 8,
    justifyContent: "center",
    position: "relative",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  carWrapper: {
    position: "absolute",
    top: -10,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  carEmoji: {
    fontSize: 16,
  },
  footerRow: {
    marginTop: 10,
    paddingHorizontal: 2,
  },
  footerText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // Radar proximity widgets styles
  radarWrapper: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  radarPulseCircle: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  radarCenter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
