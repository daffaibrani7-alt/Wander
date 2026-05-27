import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Navigation, Bell, MapPin, Compass, Battery, AlertTriangle } from "lucide-react-native";
import { COLORS } from "@/shared/theme/colors";
import { FriendLocation } from "@/features/friends/services/mockService";
import { ActivityNotification } from "@/features/map/store/useGeofenceStore";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface WidgetProps {
  friends: FriendLocation[];
  userProfile: any;
  userBatteryLevel: number;
  userIsCharging: boolean;
  userActivity: string;
  userGeofence: string | null;
  notificationsFeed: ActivityNotification[];
  themeMode: "dark" | "light" | "system";
  onAction: (actionKey: string, payload?: any) => void;
}

// Custom Apple-style Widgets Container Wrapper
function WidgetWrapper({
  children,
  themeMode,
  sizeStyle,
}: {
  children: React.ReactNode;
  themeMode: "dark" | "light" | "system";
  sizeStyle: object;
}) {
  const isLight = themeMode === "light";
  
  const bgStyle = isLight
    ? { backgroundColor: "rgba(255, 255, 255, 0.74)", borderColor: "rgba(0, 0, 0, 0.08)" }
    : { backgroundColor: "rgba(10, 10, 14, 0.86)", borderColor: "rgba(255, 255, 255, 0.08)" };

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.widgetBase,
          bgStyle,
          sizeStyle,
          isLight && { shadowColor: "rgba(0,0,0,0.1)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" },
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={95}
      tint={isLight ? "light" : "dark"}
      style={[styles.widgetBase, bgStyle, sizeStyle]}
    >
      {children}
    </BlurView>
  );
}

// 1. SMALL WIDGET (2x2)
export function SmallWidget({
  friends,
  userProfile,
  userBatteryLevel,
  userIsCharging,
  userActivity,
  userGeofence,
  themeMode,
  onAction,
}: WidgetProps) {
  const isLight = themeMode === "light";
  const textColor = isLight ? "#1C1C1E" : "#FFFFFF";
  const textMutedColor = isLight ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.55)";

  // Pick the top active friend
  const topFriend = friends.find((f) => f.activity !== "online") || friends[0];

  const handlePress = () => {
    Haptics.selectionAsync().catch(() => {});
    if (topFriend) {
      onAction("select-friend", topFriend.uid);
    } else {
      onAction("open-map");
    }
  };

  return (
    <Pressable onPress={handlePress}>
      <WidgetWrapper themeMode={themeMode} sizeStyle={styles.smallSize}>
        {topFriend ? (
          <View style={styles.smallContent}>
            {/* Top row: Avatar & battery pill */}
            <View style={styles.smallHeader}>
              <View style={[styles.widgetAvatar, { borderColor: COLORS.cyan, backgroundColor: "rgba(255,255,255,0.05)" }]}>
                <Text style={styles.widgetAvatarEmoji}>{topFriend.avatarEmoji || "🦊"}</Text>
              </View>
              <View style={[styles.batteryPill, { backgroundColor: topFriend.isCharging ? "rgba(46, 213, 115, 0.15)" : "rgba(255,255,255,0.06)" }]}>
                <Text style={[styles.batteryPillText, { color: topFriend.isCharging ? "#2ed573" : textColor }]}>
                  {topFriend.isCharging ? "⚡" : "🔋"} {topFriend.batteryLevel}%
                </Text>
              </View>
            </View>

            {/* Bottom info summary */}
            <View style={styles.smallBody}>
              <Text style={[styles.widgetName, { color: textColor }]} numberOfLines={1}>
                {topFriend.displayName}
              </Text>
              <Text style={[styles.widgetStatus, { color: COLORS.cyan }]} numberOfLines={1}>
                {topFriend.activity === "driving"
                  ? "🚗 Berkendara"
                  : topFriend.activity === "sleeping"
                  ? "😴 Sedang Tidur"
                  : topFriend.activity === "walking"
                  ? "🚶 Berjalan kaki"
                  : topFriend.activity === "idle"
                  ? "⏳ Santai"
                  : "🟢 Aktif"}
              </Text>
              <Text style={[styles.widgetSubtext, { color: textMutedColor }]} numberOfLines={1}>
                {topFriend.geofence
                  ? `Di: ${topFriend.geofence === "home" ? "Rumah" : topFriend.geofence === "work" ? "Kantor" : "Sekolah"}`
                  : `Jarak: ${topFriend.distanceText}`}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.smallContentEmpty}>
            <Compass size={24} color={COLORS.cyan} style={styles.emptyWidgetIcon} />
            <Text style={[styles.emptyWidgetTitle, { color: textColor }]}>Wander</Text>
            <Text style={[styles.emptyWidgetSub, { color: textMutedColor }]}>Buka peta utama</Text>
          </View>
        )}
      </WidgetWrapper>
    </Pressable>
  );
}

// 2. MEDIUM WIDGET (4x2)
export function MediumWidget({
  friends,
  themeMode,
  onAction,
}: WidgetProps) {
  const isLight = themeMode === "light";
  const textColor = isLight ? "#1C1C1E" : "#FFFFFF";
  const textMutedColor = isLight ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.55)";

  const topFriends = friends.slice(0, 3);

  return (
    <Pressable onPress={() => onAction("open-map")}>
      <WidgetWrapper themeMode={themeMode} sizeStyle={styles.mediumSize}>
        <View style={styles.mediumContainer}>
          {/* Header */}
          <View style={styles.widgetHeaderRow}>
            <Text style={[styles.widgetHeaderText, { color: textMutedColor }]}>📍 KEDEKATAN TEMAN</Text>
            <Text style={[styles.widgetHeaderBrand, { color: COLORS.purple }]}>Wander</Text>
          </View>

          {/* List grid */}
          <View style={styles.mediumList}>
            {topFriends.length === 0 ? (
              <Text style={[styles.emptyWidgetSub, { color: textMutedColor, marginTop: 24, textAlign: "center" }]}>
                Belum ada teman terhubung.
              </Text>
            ) : (
              topFriends.map((friend) => {
                const activityText = friend.activity === "driving"
                  ? "Berkendara"
                  : friend.activity === "sleeping"
                  ? "Tidur"
                  : friend.activity === "walking"
                  ? "Jalan"
                  : friend.activity === "idle"
                  ? "Santai"
                  : "Aktif";

                return (
                  <Pressable
                    key={friend.uid}
                    onPress={() => onAction("select-friend", friend.uid)}
                    style={styles.mediumRow}
                  >
                    <View style={styles.rowLeft}>
                      <View style={styles.miniAvatar}>
                        <Text style={styles.miniAvatarEmoji}>{friend.avatarEmoji}</Text>
                      </View>
                      <Text style={[styles.rowName, { color: textColor }]} numberOfLines={1}>
                        {friend.displayName}
                      </Text>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={[styles.rowStatus, { color: COLORS.cyan }]} numberOfLines={1}>
                        {activityText}
                      </Text>
                      <Text style={[styles.rowDistance, { color: textMutedColor }]}>
                        {friend.distanceText}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      </WidgetWrapper>
    </Pressable>
  );
}

// 3. LARGE WIDGET (4x4)
export function LargeWidget({
  friends,
  notificationsFeed,
  themeMode,
  onAction,
}: WidgetProps) {
  const isLight = themeMode === "light";
  const textColor = isLight ? "#1C1C1E" : "#FFFFFF";
  const textMutedColor = isLight ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.55)";

  const recentLog = notificationsFeed[0];

  // Helper mock scatter vectors for miniature map preview mapping
  const mockScatterCoords = [
    { cx: "30%", cy: "40%", emoji: "🦊", color: COLORS.cyan },
    { cx: "70%", cy: "30%", emoji: "🐼", color: COLORS.pink },
    { cx: "45%", cy: "75%", emoji: "🐯", color: COLORS.purple },
  ];

  return (
    <WidgetWrapper themeMode={themeMode} sizeStyle={styles.largeSize}>
      <View style={styles.largeContainer}>
        {/* Header */}
        <View style={styles.widgetHeaderRow}>
          <Text style={[styles.widgetHeaderText, { color: textMutedColor }]}>📍 WANDER UTAMA</Text>
          <Text style={[styles.widgetHeaderBrand, { color: COLORS.cyan }]}>10:58</Text>
        </View>

        {/* Middle split panel (Static vector map scatter preview & Action deep links list) */}
        <View style={styles.largeGridRow}>
          {/* Static Map Mock */}
          <Pressable onPress={() => onAction("open-map")} style={[styles.staticMapMock, { backgroundColor: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.02)", borderColor: themeMode === "light" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)" }]}>
            {/* Center target cursor Me */}
            <View style={[styles.centerPulseRadar, { borderColor: COLORS.cyan }]}>
              <View style={[styles.centerPulseRadarDot, { backgroundColor: COLORS.cyan }]} />
            </View>

            {/* Friend nodes scattered */}
            {mockScatterCoords.map((coord, idx) => {
              const friend = friends[idx];
              if (!friend) return null;
              return (
                <View
                  key={idx}
                  style={[
                    styles.mockScatterNode,
                    { left: coord.cx as any, top: coord.cy as any, borderColor: coord.color },
                  ]}
                >
                  <Text style={styles.mockScatterNodeEmoji}>{friend.avatarEmoji}</Text>
                </View>
              );
            })}
          </Pressable>

          {/* Quick Action deep links list */}
          <View style={styles.actionsPanel}>
            <ActionBtn
              label="Buka Peta"
              icon={<Navigation size={13} color="#000000" />}
              onPress={() => onAction("open-map")}
              color={COLORS.cyan}
            />
            <ActionBtn
              label="Tempatku"
              icon={<MapPin size={13} color="#FFFFFF" />}
              onPress={() => onAction("open-places")}
              color={COLORS.purple}
            />
            <ActionBtn
              label="Notifikasi"
              icon={<Bell size={13} color="#FFFFFF" />}
              onPress={() => onAction("open-notifs")}
              color={COLORS.pink}
            />
          </View>
        </View>

        {/* Footer Real-time geofence summary log */}
        <View style={[styles.largeFooter, { borderTopColor: themeMode === "light" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)" }]}>
          <Text style={[styles.largeFooterLabel, { color: textMutedColor }]}>SUMMARY LOGS</Text>
          <Text style={[styles.largeFooterText, { color: textColor }]} numberOfLines={1}>
            {recentLog
              ? `${recentLog.emoji} ${recentLog.body}`
              : "🦊 Ferry terdeteksi sedang berkendara..."}
          </Text>
        </View>
      </View>
    </WidgetWrapper>
  );

  function ActionBtn({
    label,
    icon,
    onPress,
    color,
  }: {
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
    color: string;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.actionBtn,
          { backgroundColor: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)", borderColor: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)" },
          pressed && styles.actionBtnPressed,
        ]}
      >
        <View style={[styles.actionBtnIconBox, { backgroundColor: color }]}>
          {icon}
        </View>
        <Text style={[styles.actionBtnText, { color: textColor }]}>{label}</Text>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  widgetBase: {
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: "hidden",
    padding: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  smallSize: {
    width: 152,
    height: 152,
  },
  mediumSize: {
    width: 320,
    height: 152,
  },
  largeSize: {
    width: 320,
    height: 320,
  },

  // Small widget styles
  smallContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  smallHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  widgetAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  widgetAvatarEmoji: {
    fontSize: 16,
  },
  batteryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  batteryPillText: {
    fontSize: 9,
    fontWeight: "900",
  },
  smallBody: {
    marginTop: 10,
  },
  widgetName: {
    fontSize: 13,
    fontWeight: "900",
  },
  widgetStatus: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
  },
  widgetSubtext: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 3,
    opacity: 0.7,
  },
  smallContentEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWidgetIcon: {
    marginBottom: 6,
  },
  emptyWidgetTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  emptyWidgetSub: {
    fontSize: 10,
    fontWeight: "600",
    opacity: 0.75,
    marginTop: 2,
  },

  // Medium widget styles
  mediumContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  widgetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  widgetHeaderText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  widgetHeaderBrand: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  mediumList: {
    flex: 1,
    marginTop: 10,
    gap: 6,
  },
  mediumRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  miniAvatarEmoji: {
    fontSize: 11,
  },
  rowName: {
    fontSize: 11,
    fontWeight: "800",
    flex: 1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowStatus: {
    fontSize: 10,
    fontWeight: "800",
  },
  rowDistance: {
    fontSize: 10,
    fontWeight: "600",
    opacity: 0.75,
  },

  // Large widget styles
  largeContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  largeGridRow: {
    flexDirection: "row",
    flex: 1,
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  staticMapMock: {
    flex: 1.1,
    borderRadius: 18,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  centerPulseRadar: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 20,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerPulseRadarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mockScatterNode: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.2,
    backgroundColor: "rgba(10,10,12,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  mockScatterNodeEmoji: {
    fontSize: 9,
  },
  actionsPanel: {
    flex: 0.9,
    justifyContent: "space-between",
    gap: 6,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  actionBtnPressed: {
    opacity: 0.7,
  },
  actionBtnIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "900",
  },
  largeFooter: {
    borderTopWidth: 1,
    paddingTop: 8,
  },
  largeFooterLabel: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  largeFooterText: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
  },
});
