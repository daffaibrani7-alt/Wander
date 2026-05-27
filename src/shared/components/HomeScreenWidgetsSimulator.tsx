import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
  Platform,
  ScrollView,
} from "react-native";
import { BlurView } from "expo-blur";
import { X, Moon, Sun, Smartphone } from "lucide-react-native";
import { COLORS } from "@/shared/theme/colors";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { useWidgetStore } from "@/shared/store/useWidgetStore";
import { useGeofenceStore } from "@/features/map/store/useGeofenceStore";
import { useLiveActivityStore } from "@/shared/store/useLiveActivityStore";
import { SmallWidget, MediumWidget, LargeWidget } from "@/shared/components/AppleWidgets";
import { FriendLocation } from "@/features/friends/services/mockService";
import * as Haptics from "expo-haptics";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface HomeScreenWidgetsSimulatorProps {
  visible: boolean;
  friends: FriendLocation[];
  userProfile: any;
  userBatteryLevel: number;
  userIsCharging: boolean;
  userActivity: string;
  userGeofence: string | null;
  onWidgetAction: (actionKey: string, payload?: any) => void;
}

export function HomeScreenWidgetsSimulator({
  visible,
  friends,
  userProfile,
  userBatteryLevel,
  userIsCharging,
  userActivity,
  userGeofence,
  onWidgetAction,
}: HomeScreenWidgetsSimulatorProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  const {
    isWidgetSimulatorActive,
    widgetTheme,
    setWidgetSimulatorActive,
    setWidgetTheme,
  } = useWidgetStore();

  const notificationsFeed = useGeofenceStore((s) => s.notificationsFeed);

  if (!visible || !isWidgetSimulatorActive) return null;

  const handleClose = () => {
    Haptics.selectionAsync().catch(() => {});
    setWidgetSimulatorActive(false);
  };

  const handleToggleTheme = () => {
    const nextTheme = widgetTheme === "dark" ? "light" : "dark";
    setWidgetTheme(nextTheme);
  };

  const renderMockAppIcon = (name: string, emoji: string, bgColor: string) => (
    <View style={styles.appIconContainer}>
      <View style={[styles.appIcon, { backgroundColor: bgColor }]}>
        <Text style={styles.appIconEmoji}>{emoji}</Text>
      </View>
      <Text style={styles.appIconLabel} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );

  const renderWallpaperContent = () => (
    <View style={styles.simulatorContainer}>
      {/* Header bar controls: Switch themes & close */}
      <View style={styles.headerBar}>
        <Pressable onPress={handleToggleTheme} style={styles.headerBtn}>
          {widgetTheme === "dark" ? (
            <Sun size={15} color="#FFF500" />
          ) : (
            <Moon size={15} color="#8A3FFC" />
          )}
          <Text style={[styles.headerBtnText, { color: "#FFFFFF" }]}>
            {widgetTheme === "dark" ? "Light Widgets" : "Dark Widgets"}
          </Text>
        </Pressable>

        <View style={styles.headerCenterTitle}>
          <Smartphone size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.headerCenterText}>Simulator Widget iOS</Text>
        </View>

        <Pressable onPress={handleClose} style={styles.closeBtn}>
          <X size={15} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Clock Date / Time block (iPhone look) */}
      <View style={styles.lockClockContainer}>
        <Text style={styles.lockClockDate}>Rabu, 27 Mei</Text>
        <Text style={styles.lockClockTime}>10:58</Text>
      </View>

      {/* Mock Desktop Workspace Scroll */}
      <ScrollView
        style={styles.desktopScroll}
        contentContainerStyle={styles.desktopContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mock App Icons Row */}
        <View style={styles.appsRow}>
          {renderMockAppIcon("Pesan", "💬", "#2BE080")}
          {renderMockAppIcon("Safari", "🌐", COLORS.cyan)}
          {renderMockAppIcon("Musik", "🎵", COLORS.pink)}
          {renderMockAppIcon("Wander", "🦊", COLORS.purple)}
        </View>

        {/* Small & Medium Widgets Row */}
        <View style={styles.widgetsGridRow}>
          {/* Small 2x2 widget */}
          <SmallWidget
            friends={friends}
            userProfile={userProfile}
            userBatteryLevel={userBatteryLevel}
            userIsCharging={userIsCharging}
            userActivity={userActivity}
            userGeofence={userGeofence}
            notificationsFeed={notificationsFeed}
            themeMode={widgetTheme}
            onAction={onWidgetAction}
          />

          {/* Small placeholder row icons */}
          <View style={styles.smallGridColumn}>
            <View style={styles.appsRowMini}>
              {renderMockAppIcon("Foto", "🖼️", "#FF8A00")}
              {renderMockAppIcon("Kontak", "👥", "#00F0FF")}
            </View>
            <View style={[styles.appsRowMini, { marginTop: 12 }]}>
              {renderMockAppIcon("Catatan", "📝", "#FFC700")}
              {renderMockAppIcon("Cuaca", "☀️", "#2BE080")}
            </View>
          </View>
        </View>

        {/* Medium 4x2 widget */}
        <View style={styles.widgetsRow}>
          <MediumWidget
            friends={friends}
            userProfile={userProfile}
            userBatteryLevel={userBatteryLevel}
            userIsCharging={userIsCharging}
            userActivity={userActivity}
            userGeofence={userGeofence}
            notificationsFeed={notificationsFeed}
            themeMode={widgetTheme}
            onAction={onWidgetAction}
          />
        </View>

        {/* Large 4x4 widget */}
        <View style={styles.widgetsRow}>
          <LargeWidget
            friends={friends}
            userProfile={userProfile}
            userBatteryLevel={userBatteryLevel}
            userIsCharging={userIsCharging}
            userActivity={userActivity}
            userGeofence={userGeofence}
            notificationsFeed={notificationsFeed}
            themeMode={widgetTheme}
            onAction={onWidgetAction}
          />
        </View>
      </ScrollView>

      {/* Simulator Footer hint */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Tap di area kosong untuk kembali 🔓</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {Platform.OS === "web" ? (
        <Pressable
          onPress={(e) => {
            // Close simulator if tapping empty wallpaper space
            if (e.target === e.currentTarget) handleClose();
          }}
          style={[styles.wallpaper, { backgroundColor: "rgba(10, 10, 15, 0.95)" }]}
        >
          {renderWallpaperContent()}
        </Pressable>
      ) : (
        <BlurView intensity={98} tint="dark" style={styles.wallpaper}>
          <Pressable
            onPress={(e) => {
              if (e.target === e.currentTarget) handleClose();
            }}
            style={StyleSheet.absoluteFill}
          >
            {renderWallpaperContent()}
          </Pressable>
        </BlurView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
  },
  wallpaper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  simulatorContainer: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 54 : 32,
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 16,
    height: 44,
  },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  headerBtnText: {
    fontSize: 10,
    fontWeight: "900",
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  headerCenterTitle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(138, 63, 252, 0.15)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(138, 63, 252, 0.25)",
  },
  headerCenterText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  lockClockContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  lockClockDate: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  lockClockTime: {
    color: "#FFFFFF",
    fontSize: 64,
    fontWeight: "300",
    marginTop: -4,
    fontFamily: "System",
  },
  desktopScroll: {
    flex: 1,
    width: "100%",
    marginTop: 14,
  },
  desktopContent: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  appsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  appIconContainer: {
    alignItems: "center",
    width: 60,
  },
  appIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  appIconEmoji: {
    fontSize: 22,
  },
  appIconLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 6,
  },
  widgetsGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  smallGridColumn: {
    width: 152,
    justifyContent: "center",
  },
  appsRowMini: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  widgetsRow: {
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  footerRow: {
    alignItems: "center",
    marginTop: 10,
    paddingHorizontal: 20,
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
export default HomeScreenWidgetsSimulator;
