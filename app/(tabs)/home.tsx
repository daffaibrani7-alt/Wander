import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Animated, useWindowDimensions, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import Svg, { RadialGradient, Rect, Defs, Stop } from "react-native-svg";
import { COLORS } from "@/shared/theme/colors";
import { ZINDEX } from "@/shared/theme/zIndex";
import { GlassCard } from "@/shared/components/GlassCard";
import { PerformanceInspector } from "@/shared/components/PerformanceInspector";

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function StudioVignette({ isDark }: { isDark: boolean }) {
  const edgeColor = isDark ? "#06060E" : "#EAECF8";
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient
            id="vignette"
            cx="50%"
            cy="50%"
            rx="60%"
            ry="60%"
            fx="50%"
            fy="50%"
          >
            <Stop offset="0%" stopColor={edgeColor} stopOpacity="0" />
            <Stop offset="70%" stopColor={edgeColor} stopOpacity="0.1" />
            <Stop offset="100%" stopColor={edgeColor} stopOpacity="0.8" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#vignette)" />
      </Svg>
    </View>
  );
}
import { MapboxViewRef } from "@/features/map/components/MapboxView";
import { FriendLocation } from "@/features/friends/services/mockService";
import { useLocationStore } from "@/features/map/store/useLocationStore";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { useFriendStore } from "@/features/friends/store/useFriendStore";
import { useGeofenceStore } from "@/features/map/store/useGeofenceStore";
import { usePresenceStore } from "@/features/presence/store/usePresenceStore";
import { useActivityDetection } from "@/shared/hooks/useActivityDetection";
import { DynamicIslandAlert } from "@/shared/components/DynamicIslandAlert";
import { useLiveActivityStore } from "@/shared/store/useLiveActivityStore";
import { useWidgetStore } from "@/shared/store/useWidgetStore";
import { useExplorationStore } from "@/features/exploration/store/useExplorationStore";
import { useGamificationStore } from "@/features/exploration/store/useGamificationStore";
import { useAchievementStore } from "@/features/achievements/store/useAchievementStore";
import { useNetworkStore } from "@/shared/store/useNetworkStore";
import { useSyncQueueStore } from "@/shared/store/useSyncQueueStore";
import { LocationConsentModal } from "@/shared/components/LocationConsentModal";
import { AchievementUnlockPopup } from "@/features/achievements/components/AchievementUnlockPopup";
import { SavedPlacesManager } from "@/features/map/components/SavedPlacesManager";
import { HomeScreenWidgetsSimulator } from "@/shared/components/HomeScreenWidgetsSimulator";
import { ExplorationStatsCard } from "@/features/exploration/components/ExplorationStatsCard";
import { ExplorationDashboard } from "@/features/exploration/components/ExplorationDashboard";
import { LiveActivityCard } from "@/shared/components/LiveActivityCard";
import { usePrivacyStore } from "@/shared/store/usePrivacyStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Highly Optimized Architectural Sub-Components
import { HomeMapLayer } from "@/features/map/components/home/HomeMapLayer";
import { HomeHeader } from "@/features/map/components/home/HomeHeader";
import { GhostModePicker } from "@/features/map/components/home/GhostModePicker";
import { HomeActionButtons } from "@/features/map/components/home/HomeActionButtons";
import { HomeBottomSheet } from "@/features/map/components/home/HomeBottomSheet";
import { HomeNotifications } from "@/features/map/components/home/HomeNotifications";
import { HomeFloatingCards } from "@/features/map/components/home/HomeFloatingCards";
import { LockScreenOverlay } from "@/features/map/components/home/LockScreenOverlay";

const CONSENT_KEY = "wander_location_consent";
type GhostModeType = "precise" | "blurry" | "frozen";

export default function HomeMapScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);
  const userProfile = useAuthStore((s) => s.user);
  const { height } = useWindowDimensions();

  const mapRef = useRef<MapboxViewRef>(null);
  const [selectedFriendUid, setSelectedFriendUid] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showGhostPicker, setShowGhostPicker] = useState(false);
  const [followUser, setFollowUser] = useState(true);

  // States
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showSavedPlaces, setShowSavedPlaces] = useState(false);
  const [showNotifCenter, setShowNotifCenter] = useState(false);
  const [isMapPickMode, setMapPickMode] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showUtilities, setShowUtilities] = useState(false);
  const [sheetState, setSheetState] = useState<"peek" | "expanded">("peek");

  // Animations
  const slideAnim = useRef(new Animated.Value(height)).current;
  const ghostPickerAnim = useRef(new Animated.Value(0)).current;
  const utilitiesAnim = useRef(new Animated.Value(0)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const replayHudAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  // Stores
  const { activeActivity, isLockScreenSimulated, toggleLockScreenSimulation, triggerDynamicIsland, startLiveActivity, updateLiveActivity } = useLiveActivityStore();
  const { isWidgetSimulatorActive, setWidgetSimulatorActive, toggleWidgetSimulator } = useWidgetStore();
  const { isExplorationActive, toggleExplorationMode, trackPosition, initializeExplorationListener, isReplaying, stopReplay, coordinateHistory } = useExplorationStore();
  const { isDashboardActive, toggleDashboard, initializeGamificationStore } = useGamificationStore();
  const regions = useGeofenceStore((s) => s.regions);
  const notificationsFeed = useGeofenceStore((s) => s.notificationsFeed);
  const selfActivity = useActivityDetection();
  
  const location = useLocationStore((s) => s.location);
  const allFriendsLocations = useLocationStore((s) => s.friends);
  const ghostMode = useLocationStore((s) => s.ghostMode);
  const batteryLevel = useLocationStore((s) => s.batteryLevel);
  const isCharging = useLocationStore((s) => s.isCharging);
  const { friends: activeFriends, initializeFriendListener } = useFriendStore();
  const { isOnline, initializeNetworkMonitoring } = useNetworkStore();
  const { queue, status: syncStatus, hydrateQueue, flushQueue } = useSyncQueueStore();

  const [islandAlert, setIslandAlert] = useState({ visible: false, title: "Notifikasi Wander", body: "", emoji: "✨" });

  const unreadCount = useMemo(() => notificationsFeed.filter((n) => !n.read).length, [notificationsFeed]);

  // Haptic alert helper
  const triggerAlert = useCallback((body: string, title = "Notifikasi Wander", emoji = "✨") => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setIslandAlert({ visible: true, title, body, emoji });
  }, []);

  // Sync / Online monitorings
  useEffect(() => {
    const unsubNetwork = initializeNetworkMonitoring();
    if (userProfile?.uid) {
      hydrateQueue(userProfile.uid);
      const unsubFriend = initializeFriendListener(userProfile.uid);
      const unsubExplor = initializeExplorationListener(userProfile.uid);
      const unsubGam = initializeGamificationStore(userProfile.uid);
      const unsubAch = useAchievementStore.getState().initializeAchievementStore(userProfile.uid);
      const unsubGeofence = useGeofenceStore.getState().initializeGeofenceSync(userProfile.uid);
      usePrivacyStore.getState().initializePrivacyStore(userProfile.uid);

      return () => {
        unsubNetwork();
        unsubFriend();
        unsubExplor();
        unsubGam();
        unsubAch();
        unsubGeofence();
      };
    }
    return unsubNetwork;
  }, [userProfile?.uid]);

  // Keep offline sync banner animated
  const showBanner = !isOnline || syncStatus === "syncing" || syncStatus === "synced";
  useEffect(() => {
    Animated.spring(bannerAnim, { toValue: showBanner ? 1 : 0, useNativeDriver: true, tension: 60, friction: 12 }).start();
  }, [showBanner]);

  useEffect(() => {
    if (isOnline && userProfile?.uid && queue.length > 0) {
      flushQueue();
    }
  }, [isOnline, userProfile?.uid, queue.length]);

  // Autohide top/right overlays on map pans
  const handleMapPan = useCallback(() => {
    Animated.timing(overlayOpacity, { toValue: 0.08, duration: 180, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }, 1500);
  }, []);

  // Presence Listener and memoized friends calculations
  const friendPresences = usePresenceStore((s) => s.friendPresences);
  const presenceUidString = useMemo(() => {
    const realUids = activeFriends.map((f) => f.uid).sort();
    return [...realUids, "sim-1", "sim-2", "sim-3"].join(",");
  }, [activeFriends]);

  useEffect(() => {
    const uidsToListen = presenceUidString.split(",").filter(Boolean);
    const unsubscribe = usePresenceStore.getState().listenToFriendsPresenceAndActivities(uidsToListen);
    return () => unsubscribe();
  }, [presenceUidString]);

  const friends = useMemo(() => {
    const acceptedUids = new Set(activeFriends.map((f) => f.uid));
    return allFriendsLocations
      .filter((loc) => acceptedUids.has(loc.uid) || loc.uid.startsWith("sim-") || loc.uid.startsWith("mock-"))
      .map((friend) => {
        const presence = friendPresences[friend.uid];
        return {
          ...friend,
          activity: presence?.activity || friend.activity || "online",
          isOnline: presence?.status === "online" || presence?.status === "idle",
          batteryLevel: presence?.batteryLevel !== undefined ? presence.batteryLevel : friend.batteryLevel,
          isCharging: presence?.isCharging !== undefined ? presence.isCharging : friend.isCharging,
        };
      });
  }, [allFriendsLocations, activeFriends, friendPresences]);

  const selectedFriend = useMemo(() => friends.find((f) => f.uid === selectedFriendUid) ?? null, [friends, selectedFriendUid]);

  // Track coordinates and sync geofences
  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      trackPosition(location.latitude, location.longitude);
      const geofenceStore = useGeofenceStore.getState();
      geofenceStore.evaluateSelfGeofences(location.latitude, location.longitude);
      if (friends.length > 0) {
        geofenceStore.evaluateFriendProximity(location.latitude, location.longitude, friends);
        friends.forEach((friend) => {
          geofenceStore.evaluateFriendActivityChange(friend.uid, friend.displayName, friend.activity);
        });
      }
    }
  }, [location?.latitude, location?.longitude, friends]);

  // Simulator engines drivers
  useEffect(() => {
    if (friends.length === 0) return;
    const drivingFriend = friends.find((f) => f.activity === "driving");
    const nearbyFriend = friends.find((f) => {
      if (!location || !f.latitude || !f.longitude) return false;
      return calculateDistance(location.latitude, location.longitude, f.latitude, f.longitude) * 1000 <= 500;
    });

    const activeLive = useLiveActivityStore.getState().activeActivity;

    if (drivingFriend) {
      const place = drivingFriend.geofence || "Tempat Kerja";
      if (!activeLive || activeLive.type !== "driving" || activeLive.displayName !== drivingFriend.displayName) {
        startLiveActivity("driving", drivingFriend.displayName, "Menuju tempat Anda", drivingFriend.avatarEmoji, 0.1, { speed: 65, etaMinutes: 8, placeName: place });
        triggerDynamicIsland("Teman Mulai Berkendara", `${drivingFriend.displayName} sedang menuju tempat Anda.`, drivingFriend.avatarEmoji, "Perjalanan");
      } else {
        const nextRatio = Math.min(activeLive.progressRatio + 0.05, 1.0);
        if (nextRatio >= 0.95) {
          startLiveActivity("arrival", drivingFriend.displayName, "Tiba di tujuan", drivingFriend.avatarEmoji, 1.0, { placeName: place });
          triggerDynamicIsland("Teman Tiba!", `${drivingFriend.displayName} telah sampai di ${place}.`, "🏡", "Geofence");
        } else {
          updateLiveActivity({ progressRatio: nextRatio, details: { speed: 55 + Math.round(Math.random() * 10), etaMinutes: Math.max(8 - Math.round(nextRatio * 8), 1), placeName: place } });
        }
      }
    } else if (nearbyFriend && (!activeLive || activeLive.type !== "nearby")) {
      if (location && nearbyFriend.latitude && nearbyFriend.longitude) {
        const dist = calculateDistance(location.latitude, location.longitude, nearbyFriend.latitude, nearbyFriend.longitude) * 1000;
        startLiveActivity("nearby", nearbyFriend.displayName, "Sedang berada di dekatmu", nearbyFriend.avatarEmoji, 0.0, { distanceText: `${Math.round(dist)} m` });
        triggerDynamicIsland("Teman Sangat Dekat!", `${nearbyFriend.displayName} berada di sekitar Anda.`, "🤝", "Radar");
      }
    }
  }, [friends, location]);

  useEffect(() => {
    const geofenceStore = useGeofenceStore.getState();
    geofenceStore.setNotificationListener((title, body, emoji) => triggerAlert(body, title, emoji));
    useLocationStore.getState().startTracking();
    useGeofenceStore.getState().initializeNotifications();
    const unsubFriendsLocation = useLocationStore.getState().listenToFriends();

    AsyncStorage.getItem(CONSENT_KEY).then((v) => !v && setTimeout(() => setShowConsentModal(true), 800)).catch(() => {});
    return () => {
      geofenceStore.removeNotificationListener();
      useLocationStore.getState().stopTracking();
      unsubFriendsLocation();
    };
  }, []);

  // Animations
  useEffect(() => {
    Animated.spring(replayHudAnim, { toValue: isReplaying ? 1 : 0, tension: 65, friction: 10, useNativeDriver: true }).start();
  }, [isReplaying]);

  const toggleUtilities = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    const targetVal = showUtilities ? 0 : 1;
    if (showUtilities) {
      Animated.timing(utilitiesAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setShowUtilities(false));
    } else {
      setShowUtilities(true);
      Animated.spring(utilitiesAnim, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }).start();
    }
  }, [showUtilities]);

  const handleSelectFriend = useCallback((friend: FriendLocation) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedFriendUid(friend.uid);
    setSheetState("peek");
    if (friend.latitude && friend.longitude) {
      mapRef.current?.flyTo({ latitude: friend.latitude, longitude: friend.longitude }, 15);
    }
    slideAnim.setValue(height);
    Animated.spring(slideAnim, { toValue: 240, tension: 30, friction: 8, useNativeDriver: true }).start();
  }, [height]);

  const handleClosePanel = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    Animated.timing(slideAnim, { toValue: height, duration: 240, useNativeDriver: true }).start(() => {
      setSelectedFriendUid(null);
      setSheetState("peek");
    });
  }, [height]);

  const toggleSheetState = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    const target = sheetState === "peek" ? "expanded" : "peek";
    setSheetState(target);
    Animated.spring(slideAnim, { toValue: target === "peek" ? 240 : 0, tension: 30, friction: 8, useNativeDriver: true }).start();
  }, [sheetState]);

  const toggleGhostPicker = useCallback(() => {
    const toValue = showGhostPicker ? 0 : 1;
    setShowGhostPicker(!showGhostPicker);
    Animated.spring(ghostPickerAnim, { toValue, useNativeDriver: true, tension: 60, friction: 10 }).start();
  }, [showGhostPicker]);

  const handleGhostModeAction = useCallback((mode: GhostModeType) => {
    useLocationStore.getState().setGhostMode(mode);
    const label = mode === "precise" ? "Akurat" : mode === "blurry" ? "Samar" : "Beku";
    const icon = mode === "precise" ? "📡" : mode === "blurry" ? "🌫️" : "❄️";
    triggerAlert(`Lokasi disetel ke ${label}`, "Ghost Mode Aktif", icon);
    toggleGhostPicker();
  }, [toggleGhostPicker, triggerAlert]);

  const handleRecenter = useCallback(() => {
    setFollowUser(true);
    if (location) {
      mapRef.current?.flyTo({ latitude: location.latitude, longitude: location.longitude }, 15);
    }
  }, [location]);

  const handleWidgetAction = useCallback((actionKey: string, payload?: any) => {
    setWidgetSimulatorActive(false);
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (actionKey === "open-map") {
        handleRecenter();
        triggerAlert("Peta berhasil dibuka kembali!", "Wander Utama", "🗺️");
      } else if (actionKey === "select-friend") {
        const friend = friends.find((f) => f.uid === payload);
        if (friend) {
          handleSelectFriend(friend);
          triggerAlert(`Membuka profil teman: ${friend.displayName}`, "Teman Terpilih", friend.avatarEmoji);
        }
      } else if (actionKey === "open-places") {
        setShowSavedPlaces(true);
      } else if (actionKey === "open-notifs") {
        setShowNotifCenter(true);
      }
    }, 400);
  }, [friends, handleRecenter, handleSelectFriend, setWidgetSimulatorActive, triggerAlert]);

  const filteredFriends = useMemo(() => {
    return friends.filter((f) => f.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [friends, searchQuery]);

  const GHOST_MODES: { mode: GhostModeType; label: string; color: string; icon: string }[] = useMemo(() => [
    { mode: "precise", label: "Akurat", color: COLORS.cyan, icon: "📡" },
    { mode: "blurry", label: "Samar", color: COLORS.pink, icon: "🌫️" },
    { mode: "frozen", label: "Beku", color: COLORS.purple, icon: "❄️" },
  ], []);

  const currentGhostMeta = useMemo(() => GHOST_MODES.find((g) => g.mode === ghostMode)!, [ghostMode, GHOST_MODES]);

  return (
    <View style={styles.container}>
      {/* Offline HUD Sync Banner */}
      <Animated.View pointerEvents={showBanner ? "auto" : "none"} style={[styles.offlineBannerContainer, { opacity: bannerAnim, transform: [{ translateY: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [-100, 0] }) }] }]}>
        <BlurView intensity={85} tint={isDark ? "dark" : "light"} style={[styles.offlineBannerBlur, { borderColor: !isOnline ? "rgba(255,165,0,0.4)" : syncStatus === "syncing" ? "rgba(0,206,209,0.4)" : "rgba(46,213,115,0.4)" }]}>
          <View style={styles.offlineBannerContent}>
            <View style={[styles.offlineIndicatorDot, { backgroundColor: !isOnline ? "#FFA500" : syncStatus === "syncing" ? "#00CED1" : "#2ED573" }]} />
            <Text style={[styles.offlineBannerText, { color: theme.text }]}>
              {!isOnline && "⚠️ Menjelajah dalam keheningan luring — Jejak langkah Anda tetap terjaga"}
              {isOnline && syncStatus === "syncing" && `📡 Mengalirkan kenangan petualangan Anda... (${queue.length})`}
              {isOnline && syncStatus === "synced" && "✨ Jejak petualangan Anda telah abadi di awan!"}
            </Text>
          </View>
        </BlurView>
      </Animated.View>

      {/* Highly optimized memoized Map Layer */}
      <HomeMapLayer
        mapRef={mapRef}
        latitude={location?.latitude ?? -6.2088}
        longitude={location?.longitude ?? 106.8456}
        isDark={isDark}
        friends={friends}
        userProfile={userProfile}
        batteryLevel={batteryLevel}
        isCharging={isCharging}
        ghostMode={ghostMode}
        selfActivity={selfActivity}
        activeGeofenceType={regions.find((r) => r.isInside)?.type}
        followUser={followUser}
        onMapPan={handleMapPan}
        isMapPickMode={isMapPickMode}
        onMapPress={useCallback((coords) => setPickedCoords(coords), [])}
      />

      {/* Atmospheric Map studio vignettes for spatial lighting */}
      <StudioVignette isDark={isDark} />

      {/* Modern modular header component */}
      <HomeHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSearchFocused={isSearchFocused}
        setIsSearchFocused={setIsSearchFocused}
        userAvatarEmoji={userProfile?.avatarEmoji ?? "🦊"}
        currentGhostColor={currentGhostMeta.color}
        followUser={followUser}
        onProfilePress={toggleGhostPicker}
        onRecenterPress={handleRecenter}
        overlayOpacity={overlayOpacity}
      />

      {/* Precise/Blurry/Frozen selector */}
      <GhostModePicker
        showGhostPicker={showGhostPicker}
        ghostPickerAnim={ghostPickerAnim}
        ghostMode={ghostMode}
        handleGhostMode={handleGhostModeAction}
      />

      {/* Floating Action Button controls */}
      {!isMapPickMode && (
        <HomeActionButtons
          unreadCount={unreadCount}
          showNotifCenter={showNotifCenter}
          onNotifCenterPress={useCallback(() => setShowNotifCenter(true), [])}
          showSavedPlaces={showSavedPlaces}
          onSavedPlacesPress={useCallback(() => setShowSavedPlaces(true), [])}
          isExplorationActive={isExplorationActive}
          onExplorationPress={toggleExplorationMode}
          showUtilities={showUtilities}
          onUtilitiesPress={toggleUtilities}
          utilitiesAnim={utilitiesAnim}
          isLockScreenSimulated={isLockScreenSimulated}
          onLockScreenPress={toggleLockScreenSimulation}
          isWidgetSimulatorActive={isWidgetSimulatorActive}
          onWidgetSimulatorPress={toggleWidgetSimulator}
          isDashboardActive={isDashboardActive}
          onDashboardPress={toggleDashboard}
          overlayOpacity={overlayOpacity}
        />
      )}

      {/* Selected Friend Bottom Sheet Drawer */}
      <HomeBottomSheet
        selectedFriend={selectedFriend}
        slideAnim={slideAnim}
        toggleSheetState={toggleSheetState}
        onClose={handleClosePanel}
        onBuzzTrigger={triggerAlert}
      />

      {/* Floating Spatial Memory grids & Friend slider carousels */}
      <HomeFloatingCards
        selectedFriend={selectedFriend}
        overlayOpacity={overlayOpacity}
        isDark={isDark}
        friends={friends}
        selectedFriendUid={selectedFriendUid}
        onFriendSelect={handleSelectFriend}
        onRevisitMemory={useCallback((coords) => mapRef.current?.flyTo(coords, 16), [])}
      />

      {/* Lazy / conditionally loaded Notification center overlay */}
      <HomeNotifications
        visible={showNotifCenter}
        onClose={useCallback(() => setShowNotifCenter(false), [])}
      />

      {/* Saved places overlay */}
      <SavedPlacesManager
        visible={showSavedPlaces}
        onClose={() => setShowSavedPlaces(false)}
        isMapPickMode={isMapPickMode}
        setMapPickMode={setMapPickMode}
        pickedCoords={pickedCoords}
        setPickedCoords={setPickedCoords}
      />

      {/* iOS Lock Screen simulator overlay */}
      <LockScreenOverlay
        isLockScreenSimulated={isLockScreenSimulated}
        activeActivity={activeActivity}
        onUnlock={toggleLockScreenSimulation}
      />

      {/* Search results popup */}
      {isSearchFocused && searchQuery.length > 0 && (
        <View style={styles.searchResults}>
          <GlassCard style={styles.searchResultsCard}>
            {filteredFriends.length === 0 ? (
              <Text style={styles.noResultText}>Teman tidak ditemukan</Text>
            ) : (
              filteredFriends.map((f) => (
                <Pressable key={f.uid} style={styles.resultRow} onPress={() => { setIsSearchFocused(false); handleSelectFriend(f); }}>
                  <Text style={{ fontSize: 22 }}>{f.avatarEmoji}</Text>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={[styles.resultName, { color: theme.text }]}>{f.displayName}</Text>
                    <Text style={[styles.resultDist, { color: theme.textMuted }]}>{f.distanceText || "Menghitung..."}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </GlassCard>
        </View>
      )}

      {/* Widgets & Exploration dashboards */}
      <HomeScreenWidgetsSimulator visible={isWidgetSimulatorActive} friends={friends} userProfile={userProfile} userBatteryLevel={batteryLevel} userIsCharging={isCharging} userActivity={selfActivity} userGeofence={regions.find((r) => r.isInside)?.type || null} onWidgetAction={handleWidgetAction} />
      <ExplorationStatsCard visible={isExplorationActive} />
      <ExplorationDashboard visible={isDashboardActive} onClose={toggleDashboard} />
      <AchievementUnlockPopup />

      {/* Replay controller HUD */}
      <Animated.View pointerEvents={isReplaying ? "auto" : "none"} style={[styles.replayHud, { opacity: replayHudAnim, transform: [{ translateY: replayHudAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }, { scale: replayHudAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
        <BlurView intensity={85} tint={isDark ? "dark" : "light"} style={[styles.replayHudBlur, { borderColor: "rgba(138, 63, 252, 0.5)" }]}>
          <View style={styles.replayHudContent}>
            <View style={styles.replayDot} />
            <View style={styles.replayHudTextBlock}>
              <Text style={[styles.replayHudLabel, { color: COLORS.purple }]}>REPLAY AKTIF</Text>
              <Text style={[styles.replayHudSub, { color: theme.textMuted }]}>{coordinateHistory.length} titik • Jalur hari ini</Text>
            </View>
            <Pressable id="stop-replay-btn" onPress={stopReplay} style={styles.stopReplayBtn}>
              <Text style={styles.stopReplayBtnText}>✕ Hentikan</Text>
            </Pressable>
          </View>
        </BlurView>
      </Animated.View>

      <LocationConsentModal
        visible={showConsentModal}
        onAllowAlways={() => { AsyncStorage.setItem(CONSENT_KEY, "always").catch(() => {}); setShowConsentModal(false); useLocationStore.getState().startTracking(); }}
        onAllowOnce={() => { AsyncStorage.setItem(CONSENT_KEY, "once").catch(() => {}); setShowConsentModal(false); useLocationStore.getState().startTracking(); }}
        onDeny={() => { AsyncStorage.setItem(CONSENT_KEY, "denied").catch(() => {}); setShowConsentModal(false); }}
      />

      {activeActivity && !isLockScreenSimulated && !isMapPickMode && <LiveActivityCard activity={activeActivity} />}
      <PerformanceInspector isDark={isDark} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  offlineBannerContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 55 : 40,
    left: 20,
    right: 20,
    zIndex: ZINDEX.toasts,
    alignItems: "center",
  },
  offlineBannerBlur: {
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  offlineBannerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  offlineIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  offlineBannerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  searchResults: {
    position: "absolute",
    top: Platform.OS === "ios" ? 116 : 102,
    left: 72,
    right: 72,
    zIndex: ZINDEX.overlays + 5,
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
    color: "rgba(255, 255, 255, 0.55)",
  },
  replayHud: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 110 : 90,
    left: 20,
    right: 20,
    zIndex: ZINDEX.sheets + 5,
  },
  replayHudBlur: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  replayHudContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  replayDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.purple,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  replayHudTextBlock: {
    flex: 1,
  },
  replayHudLabel: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  replayHudSub: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  stopReplayBtn: {
    backgroundColor: "rgba(138, 63, 252, 0.18)",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(138, 63, 252, 0.5)",
  },
  stopReplayBtnText: {
    color: COLORS.purple,
    fontSize: 11.5,
    fontWeight: "700",
  },
});
