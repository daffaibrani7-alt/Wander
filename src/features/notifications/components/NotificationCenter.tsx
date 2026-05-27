import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  Switch,
} from "react-native";
import { Bell, Trash2, X, AlertCircle, Sparkles, Check, Settings, Moon } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { COLORS } from "@/shared/theme/colors";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { useGeofenceStore, ActivityNotification } from "@/features/map/store/useGeofenceStore";
import * as Haptics from "expo-haptics";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

// Relative time formatting helper (Indonesian)
function formatTimeElapsed(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} mtk lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return `${diffDays} hari lalu`;
}

export function NotificationCenter({ visible, onClose }: NotificationCenterProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  const {
    notificationsFeed,
    isNotificationsEnabled,
    isProximityEnabled,
    isActivityEnabled,
    clearNotificationsFeed,
    markNotificationsAsRead,
    toggleSetting,
  } = useGeofenceStore();

  const slideAnim = useRef(new Animated.Value(-SCREEN_HEIGHT)).current;

  // Auto-mark notifications as read when opening NotificationCenter
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 25,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Small delay then mark all as read
      const timer = setTimeout(() => {
        markNotificationsAsRead();
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      Animated.timing(slideAnim, {
        toValue: -SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClearAll = () => {
    clearNotificationsFeed().catch(() => {});
  };

  const renderFeedItem = (item: ActivityNotification) => {
    const isUnread = !item.read;

    return (
      <View
        key={item.id}
        style={[
          styles.feedItem,
          {
            borderColor: theme.border,
            backgroundColor: isUnread ? "rgba(0, 240, 255, 0.03)" : "transparent",
          },
        ]}
      >
        <View style={styles.feedItemLeft}>
          <View style={[styles.itemEmojiBox, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }]}>
            <Text style={styles.itemEmoji}>{item.emoji}</Text>
          </View>
          <View style={styles.itemTextContainer}>
            <View style={styles.itemTitleRow}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
              {isUnread && <View style={[styles.unreadDot, { backgroundColor: COLORS.cyan }]} />}
            </View>
            <Text style={[styles.itemBody, { color: theme.text }]} numberOfLines={2}>
              {item.body}
            </Text>
          </View>
        </View>
        <Text style={[styles.itemTime, { color: theme.textMuted }]}>
          {formatTimeElapsed(item.timestamp)}
        </Text>
      </View>
    );
  };

  return (
    <>
      {visible && (
        <Animated.View
          style={[
            styles.panel,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {Platform.OS === "web" ? (
            <View style={[styles.webFallback, { backgroundColor: isDark ? "rgba(10, 10, 14, 0.98)" : "rgba(240, 240, 245, 0.98)", borderColor: theme.border }]}>
              {renderHeader()}
              {renderBody()}
            </View>
          ) : (
            <BlurView intensity={96} tint={isDark ? "dark" : "light"} style={[styles.blurPanel, { borderColor: theme.border }]}>
              {renderHeader()}
              {renderBody()}
            </BlurView>
          )}
        </Animated.View>
      )}
    </>
  );

  function renderHeader() {
    return (
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleContainer}>
            <Bell size={20} color={COLORS.cyan} style={styles.headerIcon} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>Pemberitahuan</Text>
          </View>
          <Pressable onPress={onClose} style={styles.headerClose}>
            <X size={18} color={theme.text} />
          </Pressable>
        </View>
      </View>
    );
  }

  function renderBody() {
    const hasItems = notificationsFeed.length > 0;

    return (
      <View style={styles.body}>
        {/* Activity feed list */}
        <ScrollView style={styles.scrollFeed} contentContainerStyle={styles.scrollContent}>
          {!hasItems ? (
            <View style={styles.emptyFeed}>
              <AlertCircle size={40} color={theme.textMuted} style={styles.emptyIcon} />
              <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>Belum ada pemberitahuan</Text>
              <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                Aktivitas seperti kehadiran geofence, teman masuk radius, dan perubahan status akan terekam di sini.
              </Text>
            </View>
          ) : (
            notificationsFeed.map(renderFeedItem)
          )}
        </ScrollView>

        {/* Action Clear feed button */}
        {hasItems && (
          <View style={styles.feedActionRow}>
            <Pressable
              onPress={handleClearAll}
              style={[styles.clearBtn, { borderColor: theme.border, backgroundColor: "rgba(255,255,255,0.02)" }]}
            >
              <Trash2 size={16} color={COLORS.pink} style={styles.clearIcon} />
              <Text style={[styles.clearText, { color: COLORS.pink }]}>Hapus Riwayat</Text>
            </Pressable>
          </View>
        )}

        {/* Quick Settings Panel */}
        <View style={[styles.settingsPanel, { borderTopColor: theme.border, backgroundColor: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)" }]}>
          <View style={styles.settingsHeader}>
            <Settings size={14} color={theme.textMuted} style={styles.settingsIcon} />
            <Text style={[styles.settingsTitle, { color: theme.textMuted }]}>
              PENGATURAN NOTIFIKASI
            </Text>
          </View>

          <View style={styles.toggleRow}>
            <ToggleItem
              label="Geofencing Saya"
              value={isNotificationsEnabled}
              onValueChange={() => toggleSetting("notifications")}
            />
            <ToggleItem
              label="Kedekatan Teman"
              value={isProximityEnabled}
              onValueChange={() => toggleSetting("proximity")}
            />
            <ToggleItem
              label="Aktivitas Teman"
              value={isActivityEnabled}
              onValueChange={() => toggleSetting("activity")}
            />
          </View>
        </View>
      </View>
    );
  }

  function ToggleItem({
    label,
    value,
    onValueChange,
  }: {
    label: string;
    value: boolean;
    onValueChange: () => void;
  }) {
    return (
      <View style={styles.toggleItem}>
        <Text style={[styles.toggleLabel, { color: theme.text }]}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: "rgba(255,255,255,0.08)", true: COLORS.purple }}
          thumbColor={value ? COLORS.cyan : "#8E8E93"}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.65,
    zIndex: 99999,
  },
  blurPanel: {
    flex: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    borderBottomWidth: 1.5,
    overflow: "hidden",
    paddingTop: Platform.OS === "ios" ? 54 : 32,
  },
  webFallback: {
    flex: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    borderBottomWidth: 1.5,
    paddingTop: 32,
  },
  header: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 24,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  headerClose: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  body: {
    flex: 1,
  },
  scrollFeed: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  feedItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  feedItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  itemEmojiBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  itemEmoji: {
    fontSize: 18,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
  },
  itemBody: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.85,
    marginTop: 2,
    lineHeight: 15,
  },
  itemTime: {
    fontSize: 9,
    fontWeight: "700",
    opacity: 0.7,
  },
  emptyFeed: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    opacity: 0.35,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 16,
    opacity: 0.7,
  },
  feedActionRow: {
    alignItems: "center",
    paddingVertical: 10,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  clearIcon: {
    marginRight: 6,
  },
  clearText: {
    fontSize: 12,
    fontWeight: "800",
  },
  settingsPanel: {
    borderTopWidth: 1.5,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  settingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  settingsIcon: {
    marginRight: 6,
  },
  settingsTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  toggleItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  toggleLabel: {
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
});

export default NotificationCenter;
