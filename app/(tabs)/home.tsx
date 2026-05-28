import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  Bell,
  Lock,
  Smartphone,
  Compass,
  Award,
  Sliders,
} from "lucide-react-native";
import { ZINDEX } from "@/shared/theme/zIndex";
import { COLORS } from "@/shared/theme/colors";
import { GlassCard } from "@/shared/components/GlassCard";
import { MapMarker } from "@/features/map/components/MapMarker";
import { MapboxView, MapboxViewRef } from "@/features/map/components/MapboxView";
import { FriendLocation } from "@/features/friends/services/mockService";
import { useLocationStore } from "@/features/map/store/useLocationStore";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { useFriendStore } from "@/features/friends/store/useFriendStore";
import { useGeofenceStore } from "@/features/map/store/useGeofenceStore";
import { usePresenceStore } from "@/features/presence/store/usePresenceStore";
import { useActivityDetection } from "@/shared/hooks/useActivityDetection";
import { DynamicIslandAlert } from "@/shared/components/DynamicIslandAlert";
import { BlurView } from "expo-blur";
import { FriendCarousel } from "@/features/friends/components/FriendCarousel";
import { ImageCache } from "@/shared/utils/imageCache";
import { SavedPlacesManager } from "@/features/map/components/SavedPlacesManager";
import { NotificationCenter } from "@/features/notifications/components/NotificationCenter";
import { LiveActivityCard } from "@/shared/components/LiveActivityCard";
import { useLiveActivityStore } from "@/shared/store/useLiveActivityStore";
import { HomeScreenWidgetsSimulator } from "@/shared/components/HomeScreenWidgetsSimulator";
import { useWidgetStore } from "@/shared/store/useWidgetStore";
import { useExplorationStore } from "@/features/exploration/store/useExplorationStore";
import { ExplorationStatsCard } from "@/features/exploration/components/ExplorationStatsCard";
import { useGamificationStore } from "@/features/exploration/store/useGamificationStore";
import { ExplorationDashboard } from "@/features/exploration/components/ExplorationDashboard";
import { useNetworkStore } from "@/shared/store/useNetworkStore";
import { useSyncQueueStore } from "@/shared/store/useSyncQueueStore";
import { LocationConsentModal } from "@/shared/components/LocationConsentModal";
import { useAchievementStore } from "@/features/achievements/store/useAchievementStore";
import { AchievementUnlockPopup } from "@/features/achievements/components/AchievementUnlockPopup";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Premium imports
import { MemoryCardCarousel } from "@/features/exploration/components/MemoryCardCarousel";
import { SocialOnboardingWalkthrough } from "@/shared/components/SocialOnboardingWalkthrough";
import { PerformanceInspector } from "@/shared/components/PerformanceInspector";
import { usePrivacyStore } from "@/shared/store/usePrivacyStore";
import { useNotificationStore } from "@/features/notifications/store/useNotificationStore";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";

const CONSENT_KEY = "wander_location_consent";


type GhostModeType = "precise" | "blurry" | "frozen";

const GHOST_MODES: { mode: GhostModeType; label: string; color: string; icon: string }[] = [
  { mode: "precise", label: "Akurat", color: COLORS.cyan, icon: "📡" },
  { mode: "blurry", label: "Samar", color: COLORS.pink, icon: "🌫️" },
  { mode: "frozen", label: "Beku", color: COLORS.purple, icon: "❄️" },
];

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

  // Offline/Sync Banner Animation
  const bannerAnim = useRef(new Animated.Value(0)).current;

  // Location Consent Modal state
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Replay HUD animation
  const replayHudAnim = useRef(new Animated.Value(0)).current;

  // Saved Places & Notification Center panel states
  const [showSavedPlaces, setShowSavedPlaces] = useState(false);
  const [showNotifCenter, setShowNotifCenter] = useState(false);
  const [isMapPickMode, setMapPickMode] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sheetState, setSheetState] = useState<"peek" | "expanded">("peek");

  // Utilities Dock state and animation
  const [showUtilities, setShowUtilities] = useState(false);
  const utilitiesAnim = useRef(new Animated.Value(0)).current;

  const toggleUtilities = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    if (showUtilities) {
      Animated.timing(utilitiesAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowUtilities(false);
      });
    } else {
      setShowUtilities(true);
      Animated.spring(utilitiesAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [showUtilities, utilitiesAnim]);

  // Contextual UI Map Interaction Autohide
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const panTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMapPan = useCallback(() => {
    Animated.timing(overlayOpacity, {
      toValue: 0.08,
      duration: 180,
      useNativeDriver: true,
    }).start();

    if (panTimeoutRef.current) {
      clearTimeout(panTimeoutRef.current);
    }

    panTimeoutRef.current = setTimeout(() => {
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 1500);
  }, [overlayOpacity]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (panTimeoutRef.current) clearTimeout(panTimeoutRef.current);
    };
  }, []);

  const notificationsFeed = useGeofenceStore((s) => s.notificationsFeed);
  const unreadCount = useMemo(() => notificationsFeed.filter((n) => !n.read).length, [notificationsFeed]);

  // Live Activity Zustand Store
  const {
    activeActivity,
    isLockScreenSimulated,
    toggleLockScreenSimulation,
    triggerDynamicIsland,
    startLiveActivity,
    updateLiveActivity,
    stopLiveActivity,
  } = useLiveActivityStore();

  // Widget Zustand Store
  const {
    isWidgetSimulatorActive,
    widgetTheme,
    setWidgetSimulatorActive,
    toggleWidgetSimulator,
  } = useWidgetStore();

  // Exploration Zustand Store
  const {
    isExplorationActive,
    toggleExplorationMode,
    trackPosition,
    initializeExplorationListener,
    isReplaying,
    stopReplay,
    coordinateHistory,
  } = useExplorationStore();

  // Gamification Zustand Store
  const {
    isDashboardActive,
    toggleDashboard,
    initializeGamificationStore,
  } = useGamificationStore();

  // Dynamic Island Alert State
  const [islandAlert, setIslandAlert] = useState({
    visible: false,
    title: "Notifikasi Wander",
    body: "",
    emoji: "✨",
  });

  // Self Geofence regions — granular selector
  const regions = useGeofenceStore((s) => s.regions);
  const initializeNotifications = useGeofenceStore((s) => s.initializeNotifications);

  // Automatic Self Activity Detection
  const selfActivity = useActivityDetection();

  // Live Location Store — granular selectors prevent re-renders on unrelated state changes
  const location = useLocationStore((s) => s.location);
  const allFriendsLocations = useLocationStore((s) => s.friends);
  const ghostMode = useLocationStore((s) => s.ghostMode);
  const batteryLevel = useLocationStore((s) => s.batteryLevel);
  const isCharging = useLocationStore((s) => s.isCharging);
  const startTracking = useLocationStore((s) => s.startTracking);
  const stopTracking = useLocationStore((s) => s.stopTracking);
  const setGhostMode = useLocationStore((s) => s.setGhostMode);
  const listenToFriends = useLocationStore((s) => s.listenToFriends);

  const { friends: activeFriends, initializeFriendListener } = useFriendStore();

  // Network and Sync Queue Stores
  const { isOnline, initializeNetworkMonitoring } = useNetworkStore();
  const { queue, status: syncStatus, hydrateQueue, flushQueue } = useSyncQueueStore();

  // ── Network State & Sync Queue Listeners ──
  useEffect(() => {
    const unsubNetwork = initializeNetworkMonitoring();
    return () => unsubNetwork();
  }, []);

  useEffect(() => {
    if (userProfile?.uid) {
      hydrateQueue(userProfile.uid);
    }
  }, [userProfile?.uid]);

  useEffect(() => {
    if (isOnline && userProfile?.uid && queue.length > 0) {
      flushQueue();
    }
  }, [isOnline, userProfile?.uid, queue.length]);

  // ── Offline Banner Animation Controller ──
  const showBanner = !isOnline || syncStatus === "syncing" || syncStatus === "synced";
  useEffect(() => {
    Animated.spring(bannerAnim, {
      toValue: showBanner ? 1 : 0,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
  }, [showBanner]);

  // Dengarkan relasi pertemanan secara real-time
  useEffect(() => {
    if (userProfile?.uid) {
      const unsubscribe = initializeFriendListener(userProfile.uid);
      return () => unsubscribe();
    }
  }, [userProfile?.uid]);

  // Dengarkan data eksplorasi peta secara real-time (Firestore / Local Cache)
  useEffect(() => {
    if (userProfile?.uid) {
      const unsubscribe = initializeExplorationListener(userProfile.uid);
      return () => unsubscribe();
    }
  }, [userProfile?.uid]);

  // Dengarkan pencapaian dan leaderboard secara real-time
  useEffect(() => {
    if (userProfile?.uid) {
      const unsubscribe = initializeGamificationStore(userProfile.uid);
      return () => unsubscribe();
    }
  }, [userProfile?.uid]);

  // Dengarkan sistem level/badge dan misi secara real-time
  useEffect(() => {
    if (userProfile?.uid) {
      const unsubscribe = useAchievementStore.getState().initializeAchievementStore(userProfile.uid);
      return () => unsubscribe();
    }
  }, [userProfile?.uid]);

  // Secara otomatis lacak dan buka grid peta saat lokasi GPS pengguna diperbarui
  useEffect(() => {
    if (location && location.latitude && location.longitude) {
      trackPosition(location.latitude, location.longitude);
    }
  }, [location?.latitude, location?.longitude]);

  const listenToFriendsPresenceAndActivities = usePresenceStore((s) => s.listenToFriendsPresenceAndActivities);
  const friendPresences = usePresenceStore((s) => s.friendPresences);

  // Dengarkan presence dan aktivitas teman secara real-time (Firestore/Simulation)
  // Stable UID string — effect only re-fires when the actual UIDs change, not on
  // every reference change of the activeFriends array
  const presenceUidString = useMemo(() => {
    const realUids = activeFriends.map((f) => f.uid).sort();
    return [...realUids, "sim-1", "sim-2", "sim-3"].join(",");
  }, [activeFriends]);

  useEffect(() => {
    const uidsToListen = presenceUidString.split(",").filter(Boolean);
    const unsubscribe = listenToFriendsPresenceAndActivities(uidsToListen);
    return () => unsubscribe();
  }, [presenceUidString]);

  // Memoized friends list — only recomputed when source data actually changes
  // This is the single most impactful optimization: prevents the map from
  // re-rendering on every unrelated store update
  const friends = useMemo(() => {
    const acceptedUids = new Set(activeFriends.map((f) => f.uid));
    return allFriendsLocations
      .filter((loc) =>
        acceptedUids.has(loc.uid) ||
        loc.uid.startsWith("sim-") ||
        loc.uid.startsWith("mock-")
      )
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

  // Pre-warm image cache whenever the friend list changes
  useEffect(() => {
    const urls = friends.map((f) => f.avatarUrl).filter(Boolean);
    if (urls.length > 0) ImageCache.prefetch(urls);
  }, [friends]);

  // Derive selectedFriend via memo — no inline .find() on every render
  const selectedFriend = useMemo(
    () => friends.find((f) => f.uid === selectedFriendUid) ?? null,
    [friends, selectedFriendUid]
  );

  // Check location consent on first mount — show modal if not yet granted
  useEffect(() => {
    AsyncStorage.getItem(CONSENT_KEY).then((val) => {
      if (!val) {
        // Delay slightly to let the map render first
        setTimeout(() => setShowConsentModal(true), 800);
      }
    }).catch(() => {});

    // Check onboarding completed state
    AsyncStorage.getItem("wander_onboarding_completed").then((val) => {
      if (!val) {
        setShowOnboarding(true);
      }
    }).catch(() => {});
  }, []);

  // Initialize privacy store on user change
  useEffect(() => {
    if (userProfile?.uid) {
      usePrivacyStore.getState().initializePrivacyStore(userProfile.uid);
    }
  }, [userProfile?.uid]);

  // Replay HUD spring in/out
  useEffect(() => {
    Animated.spring(replayHudAnim, {
      toValue: isReplaying ? 1 : 0,
      tension: 65,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [isReplaying]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Geofence Dynamic Places real-time listener sync
  useEffect(() => {
    if (userProfile?.uid) {
      const unsubscribe = useGeofenceStore.getState().initializeGeofenceSync(userProfile.uid);
      return () => unsubscribe();
    }
  }, [userProfile?.uid]);

  // Foreground Dynamic Island alert listener
  useEffect(() => {
    const geofenceStore = useGeofenceStore.getState();
    geofenceStore.setNotificationListener((title, body, emoji) => {
      triggerAlert(body, title, emoji);
    });
    return () => {
      geofenceStore.removeNotificationListener();
    };
  }, []);

  // Real-time evaluation hook for geofences, friends proximity, and friend activity changes
  useEffect(() => {
    if (location?.latitude && location?.longitude && friends.length > 0) {
      const geofenceStore = useGeofenceStore.getState();
      
      // 1. Evaluate self geofence transitions dynamically against dynamic saved places
      geofenceStore.evaluateSelfGeofences(location.latitude, location.longitude);
      
      // 2. Evaluate friend proximities dynamically
      geofenceStore.evaluateFriendProximity(location.latitude, location.longitude, friends);

      // 3. Evaluate friend activity transitions dynamically
      friends.forEach((friend) => {
        geofenceStore.evaluateFriendActivityChange(friend.uid, friend.displayName, friend.activity);
      });
    }
  }, [location?.latitude, location?.longitude, friends]);

  // Real-time Live Activity and Dynamic Island automatic simulator driver
  useEffect(() => {
    if (friends.length === 0) return;

    // Find the first friend with an active status that can drive a Live Activity
    const drivingFriend = friends.find((f) => f.activity === "driving");
    const nearbyFriend = friends.find((f) => {
      if (!location || !f.latitude || !f.longitude) return false;
      const dist = calculateDistance(location.latitude, location.longitude, f.latitude, f.longitude) * 1000;
      return dist <= 500; // nearby threshold 500m
    });

    const activeLive = useLiveActivityStore.getState().activeActivity;

    if (drivingFriend) {
      const place = drivingFriend.geofence || "Tempat Kerja";
      if (!activeLive || activeLive.type !== "driving" || activeLive.displayName !== drivingFriend.displayName) {
        // Start driving live activity automatically
        startLiveActivity(
          "driving",
          drivingFriend.displayName,
          "Menuju tempat Anda",
          drivingFriend.avatarEmoji,
          0.1,
          { speed: 65, etaMinutes: 8, placeName: place }
        );
        // Also trigger dynamic island alert compactly
        triggerDynamicIsland(
          "Teman Mulai Berkendara",
          `${drivingFriend.displayName} sedang menuju tempat Anda.`,
          drivingFriend.avatarEmoji,
          "Perjalanan"
        );
      } else {
        // Increment progress smoothly in simulator
        const nextRatio = Math.min(activeLive.progressRatio + 0.05, 1.0);
        const nextEta = Math.max(8 - Math.round(nextRatio * 8), 1);
        const currentSpeed = 50 + Math.round(Math.random() * 15);
        
        // If they arrive, trigger arrival state
        if (nextRatio >= 0.95) {
          startLiveActivity("arrival", drivingFriend.displayName, "Tiba di tujuan", drivingFriend.avatarEmoji, 1.0, { placeName: place });
          triggerDynamicIsland("Teman Tiba!", `${drivingFriend.displayName} telah sampai di ${place}.`, "🏡", "Geofence");
        } else {
          updateLiveActivity({
            progressRatio: nextRatio,
            details: { speed: currentSpeed, etaMinutes: nextEta, placeName: place }
          });
        }
      }
    } else if (nearbyFriend && (!activeLive || activeLive.type !== "nearby")) {
      // Start nearby friend live activity automatically
      if (location && nearbyFriend.latitude && nearbyFriend.longitude) {
        const dist = calculateDistance(location.latitude, location.longitude, nearbyFriend.latitude, nearbyFriend.longitude) * 1000;
        const distText = dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1)} km`;
        
        startLiveActivity("nearby", nearbyFriend.displayName, "Sedang berada di dekatmu", nearbyFriend.avatarEmoji, 0.0, { distanceText: distText });
        triggerDynamicIsland("Teman Sangat Dekat!", `${nearbyFriend.displayName} berada di sekitar Anda.`, "🤝", "Radar");
      }
    }
  }, [friends, location?.latitude, location?.longitude]);

  // Animations
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

  // ── Smart Dynamic Island Alert Trigger ─────────────────────────────────────
  const triggerAlert = (text: string, title = "Notifikasi Wander", emoji = "✨") => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setIslandAlert({
      visible: true,
      title,
      body: text,
      emoji,
    });
  };

  // ── Friend selection ──────────────────────────────────────────────────────
  const handleSelectFriend = (friend: FriendLocation) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedFriendUid(friend.uid);
    setSheetState("peek");
    if (friend.latitude && friend.longitude) {
      mapRef.current?.flyTo({ latitude: friend.latitude, longitude: friend.longitude }, 15);
    }
    slideAnim.setValue(height);
    Animated.spring(slideAnim, { toValue: 240, tension: 30, friction: 8, useNativeDriver: true }).start();
  };

  const toggleSheetState = () => {
    Haptics.selectionAsync().catch(() => {});
    const target = sheetState === "peek" ? "expanded" : "peek";
    setSheetState(target);
    Animated.spring(slideAnim, {
      toValue: target === "peek" ? 240 : 0,
      tension: 30,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleClosePanel = () => {
    Haptics.selectionAsync().catch(() => {});
    Animated.timing(slideAnim, { toValue: height, duration: 240, useNativeDriver: true }).start(() => {
      setSelectedFriendUid(null);
      setSheetState("peek");
    });
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
    const icon = GHOST_MODES.find((g) => g.mode === mode)?.icon || "📡";
    triggerAlert(`Lokasi disetel ke ${label}`, "Ghost Mode Aktif", icon);
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

  const renderLockScreenContent = () => {
    return (
      <View style={styles.lockContentContainer}>
        {/* Apple iOS lock screen clock */}
        <View style={styles.lockClockContainer}>
          <Text style={styles.lockClockDate}>Rabu, 27 Mei</Text>
          <Text style={styles.lockClockTime}>10:49</Text>
        </View>

        {/* Live Activity card positioned in its lock screen slot */}
        {activeActivity && (
          <View style={styles.lockActivityPositioner} pointerEvents="box-none">
            <LiveActivityCard activity={activeActivity} />
          </View>
        )}

        {/* Lock Screen Unlock hint */}
        <View style={styles.lockFooter}>
          <Text style={styles.lockFooterText}>Tap di mana saja untuk membuka kunci 🔓</Text>
        </View>
      </View>
    );
  };

  const handleWidgetAction = useCallback((actionKey: string, payload?: any) => {
    // 1. Close simulator overlay with spring collapse delay
    setWidgetSimulatorActive(false);

    // 2. Perform deep link callbacks
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      
      if (actionKey === "open-map") {
        setFollowUser(true);
        if (location) {
          mapRef.current?.flyTo({ latitude: location.latitude, longitude: location.longitude }, 15);
        }
        triggerAlert("Peta berhasil dibuka kembali!", "Wander Utama", "🗺️");
      } else if (actionKey === "select-friend") {
        const friendUid = payload;
        const friend = friends.find((f) => f.uid === friendUid);
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
  }, [location, friends, handleSelectFriend, setWidgetSimulatorActive]);

  const filteredFriends = friends.filter((f) =>
    f.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />

      {/* ── Offline & Sync Status Banner HUD ── */}
      <Animated.View
        pointerEvents={showBanner ? "auto" : "none"}
        style={[
          styles.offlineBannerContainer,
          {
            opacity: bannerAnim,
            transform: [
              {
                translateY: bannerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-100, 0],
                }),
              },
            ],
          },
        ]}
      >
        <BlurView
          intensity={85}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.offlineBannerBlur,
            {
              borderColor: !isOnline
                ? "rgba(255, 165, 0, 0.4)"
                : syncStatus === "syncing"
                ? "rgba(0, 206, 209, 0.4)"
                : "rgba(46, 213, 115, 0.4)",
            },
          ]}
        >
          <View style={styles.offlineBannerContent}>
            <View
              style={[
                styles.offlineIndicatorDot,
                {
                  backgroundColor: !isOnline
                    ? "#FFA500"
                    : syncStatus === "syncing"
                    ? "#00CED1"
                    : "#2ED573",
                },
              ]}
            />
            <Text style={[styles.offlineBannerText, { color: theme.text }]}>
              {!isOnline && "⚠️ Mode Luring Aktif — Bekerja Offline"}
              {isOnline && syncStatus === "syncing" && `📡 Menyinkronkan data tertunda... (${queue.length})`}
              {isOnline && syncStatus === "synced" && "✅ Semua data telah tersinkronisasi!"}
            </Text>
          </View>
        </BlurView>
      </Animated.View>

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
        userActivity={selfActivity}
        userGeofence={regions.find((r) => r.isInside)?.type}
        followUser={followUser}
        onMapPan={() => {
          setFollowUser(false);
          handleMapPan();
        }}
        onMapPress={(coords) => {
          if (isMapPickMode) {
            setPickedCoords(coords);
          }
        }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Top floating bar ── */}
      <Animated.View style={[styles.topBar, { opacity: overlayOpacity }]} pointerEvents="box-none">
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
      </Animated.View>

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

      {/* ── Dynamic Island Alert ── */}
      <DynamicIslandAlert
        visible={islandAlert.visible}
        title={islandAlert.title}
        body={islandAlert.body}
        emoji={islandAlert.emoji}
        onDismiss={() => setIslandAlert((prev) => ({ ...prev, visible: false }))}
      />

      {/* ── Achievement & Badge Unlock Popup Banner Overlay ── */}
      <AchievementUnlockPopup />

      {/* ── Right-side Floating Action Controls ── */}
      {!isMapPickMode && (
        <Animated.View style={[styles.rightSideControls, { opacity: overlayOpacity }]} pointerEvents="box-none">
          {/* Notifications Bell button */}
          <Pressable
            id="notifications-bell-button"
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setShowNotifCenter(true);
            }}
            style={[
              styles.floatingActionBtn,
              {
                backgroundColor: isDark ? "rgba(18, 18, 22, 0.9)" : "rgba(255, 255, 255, 0.92)",
                borderColor: showNotifCenter ? COLORS.cyan + "66" : theme.border,
              },
            ]}
          >
            <Bell size={20} color={showNotifCenter ? COLORS.cyan : theme.text} />
            {unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: COLORS.pink }]}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>

          {/* Saved Places Bookmark button */}
          <Pressable
            id="saved-places-bookmark-button"
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setShowSavedPlaces(true);
            }}
            style={[
              styles.floatingActionBtn,
              {
                backgroundColor: isDark ? "rgba(18, 18, 22, 0.9)" : "rgba(255, 255, 255, 0.92)",
                borderColor: showSavedPlaces ? COLORS.cyan + "66" : theme.border,
              },
            ]}
          >
            <MapPin size={20} color={showSavedPlaces ? COLORS.cyan : theme.text} />
          </Pressable>

          {/* Exploration Mode Toggle button */}
          <Pressable
            id="exploration-mode-toggle-button"
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              toggleExplorationMode();
            }}
            style={[
              styles.floatingActionBtn,
              {
                backgroundColor: isDark ? "rgba(18, 18, 22, 0.9)" : "rgba(255, 255, 255, 0.92)",
                borderColor: isExplorationActive ? COLORS.green + "66" : theme.border,
              },
            ]}
          >
            <Compass size={20} color={isExplorationActive ? COLORS.green : theme.text} />
          </Pressable>

          {/* Expandable Utilities Menu button */}
          <View style={styles.utilitiesMenuContainer} pointerEvents="box-none">
            <Pressable
              id="utilities-menu-toggle-button"
              onPress={toggleUtilities}
              style={[
                styles.floatingActionBtn,
                {
                  backgroundColor: isDark ? "rgba(18, 18, 22, 0.9)" : "rgba(255, 255, 255, 0.92)",
                  borderColor: showUtilities ? COLORS.cyan + "66" : theme.border,
                },
              ]}
            >
              <Sliders size={20} color={showUtilities ? COLORS.cyan : theme.text} />
            </Pressable>

            {/* Slide-out sub-dock */}
            {showUtilities && (
              <Animated.View
                style={[
                  styles.utilitiesShelf,
                  {
                    opacity: utilitiesAnim,
                    transform: [
                      {
                        translateX: utilitiesAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [60, 0],
                        }),
                      },
                    ],
                  },
                ]}
                pointerEvents="box-none"
              >
                {/* Lock Screen Simulator */}
                <Pressable
                  id="lock-screen-toggle-button"
                  onPress={toggleLockScreenSimulation}
                  style={[
                    styles.floatingActionBtn,
                    styles.shelfBtn,
                    {
                      backgroundColor: isDark ? "rgba(18, 18, 22, 0.95)" : "rgba(255, 255, 255, 0.96)",
                      borderColor: isLockScreenSimulated ? COLORS.purple + "66" : theme.border,
                    },
                  ]}
                >
                  <Lock size={18} color={isLockScreenSimulated ? COLORS.purple : theme.text} />
                </Pressable>

                {/* Widget Simulator */}
                <Pressable
                  id="widget-simulator-toggle-button"
                  onPress={toggleWidgetSimulator}
                  style={[
                    styles.floatingActionBtn,
                    styles.shelfBtn,
                    {
                      backgroundColor: isDark ? "rgba(18, 18, 22, 0.95)" : "rgba(255, 255, 255, 0.96)",
                      borderColor: isWidgetSimulatorActive ? COLORS.cyan + "66" : theme.border,
                    },
                  ]}
                >
                  <Smartphone size={18} color={isWidgetSimulatorActive ? COLORS.cyan : theme.text} />
                </Pressable>

                {/* Exploration Achievements Dashboard */}
                <Pressable
                  id="exploration-achievements-dashboard-button"
                  onPress={toggleDashboard}
                  style={[
                    styles.floatingActionBtn,
                    styles.shelfBtn,
                    {
                      backgroundColor: isDark ? "rgba(18, 18, 22, 0.95)" : "rgba(255, 255, 255, 0.96)",
                      borderColor: isDashboardActive ? COLORS.cyan + "66" : theme.border,
                    },
                  ]}
                >
                  <Award size={18} color={isDashboardActive ? COLORS.cyan : theme.text} />
                </Pressable>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      )}

      {/* ── Saved Places Manager Panel ── */}
      <SavedPlacesManager
        visible={showSavedPlaces}
        onClose={() => setShowSavedPlaces(false)}
        isMapPickMode={isMapPickMode}
        setMapPickMode={setMapPickMode}
        pickedCoords={pickedCoords}
        setPickedCoords={setPickedCoords}
      />

      {/* ── Notification Center Panel ── */}
      <NotificationCenter
        visible={showNotifCenter}
        onClose={() => setShowNotifCenter(false)}
      />

      {/* ── iOS Widgets Simulator Panel ── */}
      <HomeScreenWidgetsSimulator
        visible={isWidgetSimulatorActive}
        friends={friends}
        userProfile={userProfile}
        userBatteryLevel={batteryLevel}
        userIsCharging={isCharging}
        userActivity={selfActivity}
        userGeofence={regions.find((r) => r.isInside)?.type || null}
        onWidgetAction={handleWidgetAction}
      />

      {/* ── Exploration Mode HUD Card ── */}
      <ExplorationStatsCard visible={isExplorationActive} />

      {/* ── Exploration Achievements Dashboard Panel ── */}
      <ExplorationDashboard visible={isDashboardActive} onClose={toggleDashboard} />

      {/* ── Journey Replay Controller HUD ── */}
      <Animated.View
        pointerEvents={isReplaying ? "auto" : "none"}
        style={[
          styles.replayHud,
          {
            opacity: replayHudAnim,
            transform: [
              {
                translateY: replayHudAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [80, 0],
                }),
              },
              {
                scale: replayHudAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.85, 1],
                }),
              },
            ],
          },
        ]}
      >
        <BlurView
          intensity={85}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.replayHudBlur,
            {
              borderColor: "rgba(138, 63, 252, 0.5)",
            },
          ]}
        >
          <View style={styles.replayHudContent}>
            {/* Pulsing purple dot */}
            <View style={styles.replayDot} />
            <View style={styles.replayHudTextBlock}>
              <Text style={[styles.replayHudLabel, { color: COLORS.purple }]}>REPLAY AKTIF</Text>
              <Text style={[styles.replayHudSub, { color: theme.textMuted }]}>
                {coordinateHistory.length} titik • Jalur hari ini
              </Text>
            </View>
            <Pressable
              id="stop-replay-btn"
              onPress={stopReplay}
              style={styles.stopReplayBtn}
            >
              <Text style={styles.stopReplayBtnText}>✕ Hentikan</Text>
            </Pressable>
          </View>
        </BlurView>
      </Animated.View>

      {/* ── Location Consent Modal ── */}
      <LocationConsentModal
        visible={showConsentModal}
        onAllowAlways={() => {
          AsyncStorage.setItem(CONSENT_KEY, "always").catch(() => {});
          setShowConsentModal(false);
          startTracking();
        }}
        onAllowOnce={() => {
          AsyncStorage.setItem(CONSENT_KEY, "once").catch(() => {});
          setShowConsentModal(false);
          startTracking();
        }}
        onDeny={() => {
          AsyncStorage.setItem(CONSENT_KEY, "denied").catch(() => {});
          setShowConsentModal(false);
        }}
      />

      {/* ── Floating Live Activity Widget Card (Unlocked view) ── */}
      {activeActivity && !isLockScreenSimulated && !isMapPickMode && (
        <LiveActivityCard activity={activeActivity} />
      )}

      {/* ── Lock Screen Simulator Preview Mode ── */}
      {isLockScreenSimulated && (
        <View style={styles.lockScreenOverlay} pointerEvents="box-none">
          {Platform.OS === "web" ? (
            <Pressable
              onPress={toggleLockScreenSimulation}
              style={[styles.lockWallpaper, { backgroundColor: "rgba(8, 8, 12, 0.97)" }]}
            >
              {renderLockScreenContent()}
            </Pressable>
          ) : (
            <BlurView intensity={98} tint="dark" style={styles.lockWallpaper}>
              <Pressable onPress={toggleLockScreenSimulation} style={StyleSheet.absoluteFill}>
                {renderLockScreenContent()}
              </Pressable>
            </BlurView>
          )}
        </View>
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
          <GlassCard style={styles.detailCard} tier="solid">
            {/* Drag handle */}
            <Pressable onPress={toggleSheetState} style={styles.handleWrap} id="toggle-friend-panel-state">
              <View style={[styles.handle, { backgroundColor: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)" }]} />
            </Pressable>

            {/* Friend info header (press to expand/collapse) */}
            <Pressable onPress={toggleSheetState} style={styles.friendRow}>
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
              <Pressable onPress={handleClosePanel} style={styles.closeBtn} id="close-friend-panel">
                <X size={16} color={theme.textMuted} />
              </Pressable>
            </Pressable>

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

            {/* Geofence Status Display */}
            {selectedFriend.geofence && (
              <View style={styles.radiusSelector}>
                <Text style={[styles.radiusTitle, { color: theme.textMuted }]}>
                  📍 STATUS LOKASI GEOPENCE
                </Text>
                <GlassCard style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14 }} tier="light">
                  <Text style={{ fontSize: 16, marginRight: 8 }}>
                    {selectedFriend.geofence === "home" ? "🏡" : selectedFriend.geofence === "work" ? "💼" : selectedFriend.geofence === "school" ? "🏫" : "📍"}
                  </Text>
                  <Text style={[styles.statusTextPill, { color: theme.text, fontSize: 12 }]}>
                    Sedang berada di {selectedFriend.geofence === "home" ? "Rumah" : selectedFriend.geofence === "work" ? "Kantor" : selectedFriend.geofence === "school" ? "Sekolah" : "Kawasan Favorit"}
                  </Text>
                </GlassCard>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionRow}>
              <Pressable
                id="buzz-button"
                onPress={() => {
                  triggerAlert(`Buzz dikirim ke ${selectedFriend.displayName}!`, "Zenly Buzz", "⚡️");
                  setTimeout(() => triggerAlert(`${selectedFriend.displayName} membalas Buzz Anda!`, "Zenly Buzz", "⚡️"), 2000);
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
      {/* ── Premium Spatial Memories Carousel ── */}
      {!selectedFriend && (
        <Animated.View style={{ opacity: overlayOpacity }}>
          <MemoryCardCarousel
            isDark={isDark}
            onRevisitMemory={(coords) => mapRef.current?.flyTo(coords, 16)}
          />
        </Animated.View>
      )}

      {/* ── Premium Friend Carousel ── */}
      {!selectedFriend && (
        <Animated.View style={{ opacity: overlayOpacity }}>
          <FriendCarousel
            friends={friends}
            selectedFriendUid={selectedFriendUid}
            onFriendSelect={handleSelectFriend}
            isDark={isDark}
          />
        </Animated.View>
      )}

      {/* ── Social Onboarding Wizard Walkthrough ── */}
      {showOnboarding && (
        <SocialOnboardingWalkthrough
          isDark={isDark}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      {/* ── Developer Diagnostic Overlay Panel ── */}
      <PerformanceInspector isDark={isDark} />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
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

  // ── Top Bar
  topBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 58 : 44,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: ZINDEX.overlays,
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
    zIndex: ZINDEX.overlays + 10,
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
    zIndex: ZINDEX.toasts,
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
  },

  // ── Bottom sheet
  bottomSheet: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 110 : 96,
    left: 16,
    right: 16,
    zIndex: ZINDEX.sheets,
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
    zIndex: ZINDEX.sheets - 10,
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
  rightSideControls: {
    position: "absolute",
    top: Platform.OS === "ios" ? 130 : 112,
    right: 16,
    flexDirection: "column",
    gap: 12,
    zIndex: ZINDEX.overlays,
  },
  floatingActionBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    ...Platform.select({
      web: { backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" },
    }),
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#121216",
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "900",
  },
  lockScreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: ZINDEX.modals,
  },
  lockWallpaper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lockContentContainer: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 100 : 70,
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: Platform.OS === "ios" ? 64 : 40,
  },
  lockClockContainer: {
    alignItems: "center",
  },
  lockClockDate: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  lockClockTime: {
    color: "#FFFFFF",
    fontSize: 84,
    fontWeight: "300",
    marginTop: -4,
    fontFamily: "System",
  },
  lockActivityPositioner: {
    width: "100%",
    position: "absolute",
    bottom: Platform.OS === "ios" ? 120 : 90,
    left: 0,
    right: 0,
  },
  lockFooter: {
    alignItems: "center",
    marginBottom: 10,
  },
  lockFooterText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  // ── Replay Controller HUD ────────────────────────────────────────────────
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

  // ── Expandable Utilities Dock Styles ──────────────────────────────────────
  utilitiesMenuContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    position: "relative",
  },
  utilitiesShelf: {
    flexDirection: "row",
    gap: 8,
    marginRight: 10,
  },
  shelfBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
});

