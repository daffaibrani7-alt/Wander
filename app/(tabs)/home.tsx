import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Image,
  Alert,
  Platform,
  useWindowDimensions,
  TextInput,
  Keyboard,
  StatusBar,
  SafeAreaView,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Search,
  X,
  Zap,
  MessageCircle,
  Navigation,
  ChevronDown,
  MapPin,
  Shield,
  Crosshair,
} from "lucide-react-native";
import { COLORS } from "../../src/theme/colors";
import { GlassCard } from "../../src/components/GlassCard";
import { MapMarker } from "../../src/components/MapMarker";
import { MapboxView, MapboxViewRef } from "../../src/components/MapboxView";
import { FriendLocation } from "../../src/services/mockService";
import { useLocationStore } from "../../src/store/useLocationStore";
import { useThemeStore } from "../../src/store/useThemeStore";
import { useAuthStore } from "../../src/store/useAuthStore";
import { useFriendStore } from "../../src/store/useFriendStore";
import { useGeofenceStore } from "../../src/store/useGeofenceStore";

type GhostModeType = "precise" | "blurry" | "frozen";

const GHOST_MODES: { mode: GhostModeType; label: string; color: string; icon: string }[] = [
  { mode: "precise", label: "Akurat", color: COLORS.cyan, icon: "📡" },
  { mode: "blurry", label: "Samar", color: COLORS.pink, icon: "🌫️" },
  { mode: "frozen", label: "Beku", color: COLORS.purple, icon: "❄️" },
];

export default function HomeMapScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);
  const userProfile = useAuthStore((s) => s.user);
  const { height } = useWindowDimensions();

  const mapRef = useRef<MapboxViewRef>(null);
  const [selectedFriendUid, setSelectedFriendUid] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [showGhostPicker, setShowGhostPicker] = useState(false);
  const [followUser, setFollowUser] = useState(true);

  // Live Location Store
  const {
    location,
    friends: allFriendsLocations,
    ghostMode,
    batteryLevel,
    isCharging,
    startTracking,
    stopTracking,
    setGhostMode,
    listenToFriends,
  } = useLocationStore();

  const { radiusConfig, initializeNotifications } = useGeofenceStore();

  const { friends: activeFriends, initializeFriendListener } = useFriendStore();

  // Dengarkan relasi pertemanan secara real-time
  useEffect(() => {
    if (userProfile?.uid) {
      const unsubscribe = initializeFriendListener(userProfile.uid);
      return () => unsubscribe();
    }
  }, [userProfile?.uid]);

  // Saring koordinat teman: tampilkan hanya teman yang terdaftar sebagai 'accepted', 
  // atau teman mock simulasi (berawalan 'mock-') agar peta tidak kosong
  const friends = allFriendsLocations.filter(
    (loc) => activeFriends.some((f) => f.uid === loc.uid) || loc.uid.startsWith("mock-")
  );

  const selectedFriend = friends.find((f) => f.uid === selectedFriendUid) || null;

  // Mulai pelacakan lokasi foreground/background saat mount
  useEffect(() => {
    startTracking();
    initializeNotifications();
    return () => stopTracking();
  }, []);

  // Dengarkan perubahan lokasi teman secara real-time (Firestore + simulator)
  useEffect(() => {
    const unsubscribe = listenToFriends();
    return () => unsubscribe();
  }, []);

  // Kamera otomatis mengikuti pergerakan teman terpilih secara halus (real-time camera follow)
  useEffect(() => {
    if (selectedFriend && selectedFriend.latitude && selectedFriend.longitude) {
      mapRef.current?.flyTo(
        { latitude: selectedFriend.latitude, longitude: selectedFriend.longitude },
        15
      );
    }
  }, [selectedFriend?.latitude, selectedFriend?.longitude]);

  // Animations
  const alertAnim = useRef(new Animated.Value(-150)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const searchWidthAnim = useRef(new Animated.Value(1)).current;
  const ghostPickerAnim = useRef(new Animated.Value(0)).current;
  const profilePulse = useRef(new Animated.Value(1)).current;
  const recenterAnim = useRef(new Animated.Value(0)).current;

  // Profile pulse animation loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(profilePulse, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(profilePulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const currentGhostMeta = GHOST_MODES.find((g) => g.mode === ghostMode)!;

  // ── Alert Banner ──────────────────────────────────────────────────────────
  const triggerAlert = (text: string) => {
    setAlertText(text);
    Animated.sequence([
      Animated.spring(alertAnim, { toValue: 0, useNativeDriver: true, tension: 40, friction: 7 }),
      Animated.delay(3200),
      Animated.timing(alertAnim, { toValue: -150, duration: 280, useNativeDriver: true }),
    ]).start(() => setAlertText(null));
  };

  // ── Friend selection ──────────────────────────────────────────────────────
  const handleSelectFriend = (friend: FriendLocation) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedFriendUid(friend.uid);
    if (friend.latitude && friend.longitude) {
      mapRef.current?.flyTo({ latitude: friend.latitude, longitude: friend.longitude }, 15);
    }
    slideAnim.setValue(height);
    Animated.spring(slideAnim, { toValue: 0, tension: 28, friction: 8, useNativeDriver: true }).start();
  };

  const handleClosePanel = () => {
    Haptics.selectionAsync().catch(() => {});
    Animated.timing(slideAnim, { toValue: height, duration: 240, useNativeDriver: true }).start(() =>
      setSelectedFriendUid(null)
    );
  };

  // ── Search animation ──────────────────────────────────────────────────────
  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    Animated.timing(searchWidthAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    Keyboard.dismiss();
    Animated.timing(searchWidthAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  // ── Ghost mode picker ─────────────────────────────────────────────────────
  const toggleGhostPicker = () => {
    const toValue = showGhostPicker ? 0 : 1;
    setShowGhostPicker(!showGhostPicker);
    Animated.spring(ghostPickerAnim, { toValue, useNativeDriver: true, tension: 60, friction: 10 }).start();
  };

  const handleGhostMode = (mode: GhostModeType) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setGhostMode(mode);
    const label = GHOST_MODES.find((g) => g.mode === mode)?.label;
    triggerAlert(`Mode lokasi: ${label} ${GHOST_MODES.find((g) => g.mode === mode)?.icon}`);
    toggleGhostPicker();
  };

  // ── Recenter ──────────────────────────────────────────────────────────────
  const handleRecenter = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setFollowUser(true);
    if (location) {
      mapRef.current?.flyTo({ latitude: location.latitude, longitude: location.longitude }, 15);
    }
    Animated.sequence([
      Animated.timing(recenterAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(recenterAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const filteredFriends = friends.filter((f) =>
    f.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />

      {/* ── Full-screen Map ── */}
      <MapboxView
        ref={mapRef}
        latitude={location?.latitude ?? -6.2088}
        longitude={location?.longitude ?? 106.8456}
        isDark={isDark}
        friends={friends}
        userProfile={userProfile}
        userBatteryLevel={batteryLevel}
        userIsCharging={isCharging}
        userGhostMode={ghostMode}
        followUser={followUser}
        onMapPan={() => setFollowUser(false)}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Top floating bar ── */}
      <View style={styles.topBar} pointerEvents="box-none">
        {/* Profile / Ghost mode button */}
        <Animated.View style={{ transform: [{ scale: profilePulse }] }}>
          <Pressable
            id="profile-button"
            onPress={toggleGhostPicker}
            style={[
              styles.profileBtn,
              {
                backgroundColor: isDark ? "rgba(18,18,22,0.9)" : "rgba(255,255,255,0.92)",
                borderColor: currentGhostMeta.color + "55",
                shadowColor: currentGhostMeta.color,
              },
            ]}
          >
            <Text style={styles.profileEmoji}>{userProfile?.avatarEmoji ?? "🦊"}</Text>
            <View style={[styles.ghostDot, { backgroundColor: currentGhostMeta.color }]} />
          </Pressable>
        </Animated.View>

        {/* Search bar */}
        <Animated.View
          style={[
            styles.searchWrap,
            {
              flex: searchWidthAnim.interpolate({ inputRange: [0, 1], outputRange: [0.01, 1] }),
            },
          ]}
        >
          <GlassCard style={styles.searchCard}>
            <View style={styles.searchRow}>
              <Search size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                id="search-input"
                placeholder="Cari teman..."
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                style={[styles.searchInput, { color: theme.text }]}
                returnKeyType="search"
              />
              {isSearchFocused && (
                <Pressable onPress={handleSearchBlur} style={{ padding: 4 }}>
                  <X size={14} color={theme.textMuted} />
                </Pressable>
              )}
            </View>
          </GlassCard>
        </Animated.View>

        {/* Recenter button (Apple Maps Style) */}
        <Animated.View
          style={{
            transform: [
              {
                scale: recenterAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] }),
              },
            ],
          }}
        >
          <Pressable
            id="recenter-button"
            onPress={handleRecenter}
            style={[
              styles.iconBtn,
              {
                backgroundColor: isDark ? "rgba(18,18,22,0.9)" : "rgba(255,255,255,0.92)",
                borderColor: followUser
                  ? COLORS.cyan + "66"
                  : isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.08)",
                shadowColor: followUser ? COLORS.cyan : "#000",
                shadowOpacity: followUser ? 0.35 : 0.12,
                shadowRadius: followUser ? 10 : 8,
              },
            ]}
          >
            {followUser ? (
              <Navigation size={18} color={COLORS.cyan} fill={COLORS.cyan} strokeWidth={2.5} />
            ) : (
              <Navigation size={18} color={theme.text} strokeWidth={2} />
            )}
          </Pressable>
        </Animated.View>
      </View>

      {/* ── Ghost Mode Picker ── */}
      <Animated.View
        pointerEvents={showGhostPicker ? "auto" : "none"}
        style={[
          styles.ghostPicker,
          {
            opacity: ghostPickerAnim,
            transform: [
              {
                translateY: ghostPickerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }),
              },
              {
                scale: ghostPickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
              },
            ],
          },
        ]}
      >
        <GlassCard style={styles.ghostPickerCard}>
          <Text style={[styles.ghostPickerTitle, { color: theme.textMuted }]}>MODE LOKASI</Text>
          {GHOST_MODES.map((item) => (
            <Pressable
              key={item.mode}
              id={`ghost-mode-${item.mode}`}
              onPress={() => handleGhostMode(item.mode)}
              style={[
                styles.ghostModeRow,
                ghostMode === item.mode && { backgroundColor: item.color + "18" },
              ]}
            >
              <View style={[styles.ghostModeIconWrap, { backgroundColor: item.color + "25" }]}>
                <Text style={{ fontSize: 14 }}>{item.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ghostModeLabel, { color: theme.text }]}>{item.label}</Text>
                <Text style={[styles.ghostModeDesc, { color: theme.textMuted }]}>
                  {item.mode === "precise" && "Lokasi tepat ditampilkan"}
                  {item.mode === "blurry" && "Lokasi disamarkan ~1km"}
                  {item.mode === "frozen" && "Lokasi dibekukan di sini"}
                </Text>
              </View>
              {ghostMode === item.mode && (
                <View style={[styles.activeCheck, { backgroundColor: item.color }]} />
              )}
            </Pressable>
          ))}
        </GlassCard>
      </Animated.View>

      {/* ── Alert Banner ── */}
      {alertText && (
        <Animated.View
          style={[styles.alertBanner, { transform: [{ translateY: alertAnim }] }]}
          pointerEvents="none"
        >
          <GlassCard style={[styles.alertCard, { borderColor: COLORS.cyan + "40" }]}>
            <Text style={[styles.alertText, { color: theme.text }]}>{alertText}</Text>
          </GlassCard>
        </Animated.View>
      )}

      {/* ── Search results dropdown ── */}
      {isSearchFocused && searchQuery.length > 0 && (
        <View style={styles.searchResults}>
          <GlassCard style={styles.searchResultsCard}>
            {filteredFriends.length === 0 ? (
              <Text style={[styles.noResultText, { color: theme.textMuted }]}>Teman tidak ditemukan</Text>
            ) : (
              filteredFriends.map((f) => (
                <Pressable
                  key={f.uid}
                  id={`search-result-${f.uid}`}
                  onPress={() => {
                    handleSearchBlur();
                    handleSelectFriend(f);
                  }}
                  style={styles.resultRow}
                >
                  <Text style={{ fontSize: 22 }}>{f.avatarEmoji}</Text>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={[styles.resultName, { color: theme.text }]}>{f.displayName}</Text>
                    <Text style={[styles.resultDist, { color: theme.textMuted }]}>
                      {f.distanceText || "Menghitung..."}
                    </Text>
                  </View>
                  <MapPin size={14} color={theme.textMuted} />
                </Pressable>
              ))
            )}
          </GlassCard>
        </View>
      )}

      {/* ── Bottom friend card (slide up) ── */}
      {selectedFriend && (
        <Animated.View
          style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <GlassCard style={styles.detailCard}>
            {/* Drag handle */}
            <Pressable onPress={handleClosePanel} style={styles.handleWrap} id="close-friend-panel">
              <View style={[styles.handle, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)" }]} />
            </Pressable>

            {/* Friend info */}
            <View style={styles.friendRow}>
              <View style={[styles.friendAvatarWrap, { shadowColor: selectedFriend.geofence ? COLORS.cyan : COLORS.pink }]}>
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
                  📍 Jarak: {selectedFriend.distanceText || "Menghitung..."}
                </Text>
                <Text style={[styles.friendSub, { color: theme.textMuted }]}>
                  🕒 Diperbarui: {selectedFriend.statusText || "Aktif"}
                </Text>
              </View>
              <Pressable onPress={handleClosePanel} style={styles.closeBtn}>
                <X size={16} color={theme.textMuted} />
              </Pressable>
            </View>

            {/* Zenly Status Pills */}
            <View style={styles.pillsContainer}>
              {/* Geofence Status Pill */}
              {selectedFriend.geofence && (
                <View style={[styles.statusPill, { backgroundColor: "rgba(0, 240, 255, 0.12)", borderColor: COLORS.cyan + "50" }]}>
                  <Text style={[styles.statusTextPill, { color: COLORS.cyan }]}>
                    {selectedFriend.geofence === "home" && "🏡 Di Rumah"}
                    {selectedFriend.geofence === "work" && "💼 Di Kantor"}
                    {selectedFriend.geofence === "school" && "🏫 Di Sekolah"}
                  </Text>
                </View>
              )}

              {/* Activity Status Pill */}
              <View style={[
                styles.statusPill, 
                { 
                  backgroundColor: selectedFriend.activity === "driving" ? "rgba(255, 138, 0, 0.12)" : 
                                   selectedFriend.activity === "sleeping" ? "rgba(138, 63, 252, 0.12)" : 
                                   "rgba(43, 224, 128, 0.12)", 
                  borderColor: selectedFriend.activity === "driving" ? "#FF8A0080" : 
                               selectedFriend.activity === "sleeping" ? "#8A3FFC80" : 
                               "#2BE08080"
                }
              ]}>
                <Text style={[
                  styles.statusTextPill, 
                  { 
                    color: selectedFriend.activity === "driving" ? "#FF8A00" : 
                           selectedFriend.activity === "sleeping" ? "#8A3FFC" : 
                           "#2BE080"
                  }
                ]}>
                  {selectedFriend.activity === "driving" && "🚗 Sedang Menyetir"}
                  {selectedFriend.activity === "sleeping" && "😴 Sedang Tidur"}
                  {selectedFriend.activity === "idle" && "⏳ Diam di Tempat"}
                  {selectedFriend.activity === "online" && "🟢 Sedang Aktif"}
                </Text>
              </View>

              {/* Battery / Charging Status Pill */}
              <View style={[
                styles.statusPill, 
                { 
                  backgroundColor: selectedFriend.isCharging ? "rgba(46, 213, 115, 0.15)" : "rgba(255, 255, 255, 0.08)", 
                  borderColor: selectedFriend.isCharging ? "#2ed57380" : "rgba(255, 255, 255, 0.15)" 
                }
              ]}>
                <Text style={[styles.statusTextPill, { color: selectedFriend.isCharging ? "#2ed573" : theme.text }]}>
                  {selectedFriend.isCharging ? "⚡ Mengisi Daya" : "🔋 Baterai"} {selectedFriend.batteryLevel}%
                </Text>
              </View>
            </View>

            {/* Geofence Radius Selector */}
            {selectedFriend.geofence && (
              <View style={styles.radiusSelector}>
                <Text style={[styles.radiusTitle, { color: theme.textMuted }]}>
                  📏 RADIUS NOTIFIKASI GEOPENCING
                </Text>
                <View style={styles.radiusRow}>
                  {[100, 250, 500].map((r) => {
                    const isSelected = radiusConfig[selectedFriend.geofence!] === r;

                    return (
                      <Pressable
                        key={r}
                        onPress={() => {
                          useGeofenceStore.getState().updateRegionRadius(selectedFriend.geofence!, r);
                          triggerAlert(`Radius geofence ${selectedFriend.geofence === "home" ? "Rumah" : selectedFriend.geofence === "work" ? "Kantor" : "Sekolah"} disetel ke ${r}m! 📏`);
                        }}
                        style={[
                          styles.radiusBtn,
                          isSelected && { backgroundColor: COLORS.cyan + "25", borderColor: COLORS.cyan }
                        ]}
                      >
                        <Text style={[styles.radiusBtnText, { color: isSelected ? COLORS.cyan : theme.text }]}>
                          {r}m
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionRow}>
              <Pressable
                id="buzz-button"
                onPress={() => {
                  triggerAlert(`⚡️ Buzz dikirim ke ${selectedFriend.displayName}!`);
                  setTimeout(() => triggerAlert(`⚡️ ${selectedFriend.displayName} membalas!`), 2000);
                  handleClosePanel();
                }}
                style={[styles.actionBtn, { backgroundColor: COLORS.yellow }]}
              >
                <Zap size={17} color="#000" fill="#000" />
                <Text style={[styles.actionLabel, { color: "#000" }]}>Buzz</Text>
              </Pressable>

              <Pressable
                id="chat-button"
                onPress={() => {
                  Alert.alert("Chat", `Membuka obrolan dengan ${selectedFriend.displayName}…`);
                  handleClosePanel();
                }}
                style={[styles.actionBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}
              >
                <MessageCircle size={17} color={theme.text} />
                <Text style={[styles.actionLabel, { color: theme.text }]}>Chat</Text>
              </Pressable>

              <Pressable
                id="navigate-button"
                onPress={() => {
                  Alert.alert("Navigasi", `Merutekan ke ${selectedFriend.displayName}…`);
                  handleClosePanel();
                }}
                style={[styles.actionBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}
              >
                <Navigation size={17} color={theme.text} />
                <Text style={[styles.actionLabel, { color: theme.text }]}>Rute</Text>
              </Pressable>
            </View>
          </GlassCard>
        </Animated.View>
      )}


      {/* ── Friends quick list (bottom right) ── */}
      <View style={styles.friendsQuick} pointerEvents="box-none">
        {friends.slice(0, 4).map((f, i) => (
          <Pressable
            key={f.uid}
            id={`quick-friend-${f.uid}`}
            onPress={() => handleSelectFriend(f)}
            style={[
              styles.quickAvatarBtn,
              {
                backgroundColor: isDark ? "rgba(18,18,22,0.88)" : "rgba(255,255,255,0.9)",
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
                marginBottom: i < friends.length - 1 ? 8 : 0,
              },
            ]}
          >
            <Text style={{ fontSize: 18 }}>{f.avatarEmoji}</Text>
            <View
              style={[
                styles.quickDot,
                { backgroundColor: f.ghostMode === "frozen" ? COLORS.purple : COLORS.green },
              ]}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Top Bar
  topBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 58 : 44,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 100,
  },
  profileBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    ...Platform.select({
      web: { backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" },
    }),
  },
  profileEmoji: {
    fontSize: 22,
  },
  ghostDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "transparent",
  },
  searchWrap: {
    flex: 1,
    minWidth: 0,
  },
  searchCard: {
    padding: 0,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "System",
    padding: 0,
    margin: 0,
  },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    ...Platform.select({
      web: { backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" },
    }),
  },

  // ── Ghost Picker
  ghostPicker: {
    position: "absolute",
    top: Platform.OS === "ios" ? 116 : 102,
    left: 16,
    zIndex: 200,
  },
  ghostPickerCard: {
    padding: 12,
    borderRadius: 22,
    minWidth: 220,
  },
  ghostPickerTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 4,
    fontFamily: "System",
  },
  ghostModeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 14,
    marginBottom: 4,
  },
  ghostModeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  ghostModeLabel: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "System",
  },
  ghostModeDesc: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
    fontFamily: "System",
  },
  activeCheck: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },

  // ── Alert
  alertBanner: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    zIndex: 999,
  },
  alertCard: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1.5,
  },
  alertText: {
    fontWeight: "700",
    fontSize: 13,
    textAlign: "center",
    fontFamily: "System",
  },

  // ── Search results
  searchResults: {
    position: "absolute",
    top: Platform.OS === "ios" ? 116 : 102,
    left: 72,
    right: 72,
    zIndex: 150,
  },
  searchResultsCard: {
    padding: 8,
    borderRadius: 18,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  resultName: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "System",
  },
  resultDist: {
    fontSize: 12,
    marginTop: 1,
    fontFamily: "System",
  },
  noResultText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: 12,
    fontFamily: "System",
  },

  // ── Bottom sheet
  bottomSheet: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 110 : 96,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  detailCard: {
    paddingTop: 6,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderRadius: 28,
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
    backgroundColor: "rgba(0,240,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
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

  // ── Quick friends list
  friendsQuick: {
    position: "absolute",
    right: 16,
    bottom: Platform.OS === "ios" ? 120 : 106,
    zIndex: 90,
  },
  quickAvatarBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    ...Platform.select({
      web: { backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" },
    }),
  },
  quickDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    borderColor: "transparent",
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
  radiusRow: {
    flexDirection: "row",
    gap: 8,
  },
  radiusBtn: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  radiusBtnText: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "System",
  },
});

