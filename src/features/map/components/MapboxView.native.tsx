/**
 * MapboxView.native.tsx  ← hanya dipakai di iOS / Android
 * Full @rnmapbox/maps integration dengan graceful fallback saat Mapbox belum dikonfigurasi.
 */
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { View, StyleSheet, Animated, Easing, UIManager, Text, Pressable } from "react-native";
import Reanimated, { useSharedValue, withSpring, useAnimatedProps } from "react-native-reanimated";
import MapView, { Marker as RNMarker, Polygon, Polyline } from "react-native-maps";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { COLORS } from "@/shared/theme/colors";
import { MapMarker } from "@/features/map/components/MapMarker";
import { FriendLocation } from "@/features/friends/services/mockService";
import { useExplorationStore, TILE_SIZE, ReplayCoordinate } from "@/features/exploration/store/useExplorationStore";
import { useGamificationStore } from "@/features/exploration/store/useGamificationStore";
import { getClusteredNodes, ClusterNode } from "@/features/map/utils/clustering";
import * as Haptics from "expo-haptics";

export interface MapboxViewRef {
  flyTo: (coords: { latitude: number; longitude: number }, zoom?: number) => void;
}

export interface MapboxViewProps {
  latitude: number;
  longitude: number;
  isDark: boolean;
  friends?: FriendLocation[];
  userProfile?: {
    displayName: string;
    photoURL: string | null;
    avatarEmoji: string;
    statusEmoji?: string;
  } | null;
  userBatteryLevel?: number;
  userIsCharging?: boolean;
  userGhostMode?: "precise" | "blurry" | "frozen";
  userActivity?: "online" | "idle" | "driving" | "sleeping" | "walking" | "traveling" | "home" | "work" | "school" | "cafe";
  userGeofence?: "home" | "work" | "school" | "cafe" | "custom" | null;
  followUser?: boolean;
  onMapPan?: () => void;
  onMapPress?: (coords: { latitude: number; longitude: number }) => void;
  children?: React.ReactNode;
  style?: object;
}

// Attempt to load Mapbox native – may fail in Expo Go
let MapboxSDK: any = null;
let NativeMapView: any = null;
let Camera: any = null;
let UserLocation: any = null;
let MarkerView: any = null;
let AnimatedMarkerView: any = null;

try {
  const Mapbox = require("@rnmapbox/maps");
  const tempMapboxSDK = Mapbox.default;
  const tempNativeMapView = Mapbox.MapView;
  const tempCamera = Mapbox.Camera;
  const tempUserLocation = Mapbox.UserLocation;
  const tempMarkerView = Mapbox.MarkerView;
  const tempAnimatedMarkerView = Reanimated.createAnimatedComponent(tempMarkerView);

  tempMapboxSDK?.setAccessToken(
    "pk.eyJ1IjoiZGFmZmFpYnJhbmk3IiwiYSI6ImNtYjVvZ3FxaTBoaHkyanF4eDZ5M2xia3QifQ.PLACEHOLDER_PUBLIC_TOKEN"
  );

  // Assign only if all above succeeded without throwing
  MapboxSDK = tempMapboxSDK;
  NativeMapView = tempNativeMapView;
  Camera = tempCamera;
  UserLocation = tempUserLocation;
  MarkerView = tempMarkerView;
  AnimatedMarkerView = tempAnimatedMarkerView;
} catch (e) {
  // Expo Go – use radar fallback
  MapboxSDK = null;
  NativeMapView = null;
  Camera = null;
  UserLocation = null;
  MarkerView = null;
  AnimatedMarkerView = null;
}

// Check if running on Expo Go (standard client without custom native binaries)
const isExpoGo =
  Constants?.appOwnership === "expo" ||
  Constants?.executionEnvironment === ExecutionEnvironment.StoreClient;

// Check if Mapbox token is still a placeholder
const MAPBOX_TOKEN = "pk.eyJ1IjoiZGFmZmFpYnJhbmk3IiwiYSI6ImNtYjVvZ3FxaTBoaHkyanF4eDZ5M2xia3QifQ.PLACEHOLDER_PUBLIC_TOKEN";
const isPlaceholderToken = MAPBOX_TOKEN.includes("PLACEHOLDER");

// Bulletproof check: Query the native runtime directly to see if the Mapbox view manager is registered
const isMapboxNativeRegistered = !!(
  UIManager &&
  UIManager.getViewManagerConfig &&
  (UIManager.getViewManagerConfig("RNMBXMapView") ||
   UIManager.getViewManagerConfig("RCTMGLMapView"))
);

// Force fallback to react-native-maps if native code is missing, in Expo Go, or if a real Mapbox token is missing
const isMapboxAvailable = !!NativeMapView && isMapboxNativeRegistered && !isExpoGo && !isPlaceholderToken;

console.log(
  "\n=======================================================",
  "\n📍 [Wander MapboxView] DIAGNOSTIC SYSTEM:",
  `\n - Native Mapbox SDK imported: ${!!NativeMapView}`,
  `\n - Native Mapbox view manager registered in binary: ${isMapboxNativeRegistered}`,
  `\n - Running in Expo Go environment: ${isExpoGo}`,
  `\n - Mapbox Access Token is placeholder: ${isPlaceholderToken}`,
  `\n -> SELECTED MAP RENDERER: ${isMapboxAvailable ? "Native Mapbox SDK (Premium)" : "react-native-maps Fallback (Google/Apple Maps)"}`,
  "\n=======================================================\n"
);

function AnimatedRadarFriendComponent({
  friend,
  centerLatitude,
  centerLongitude,
}: {
  friend: FriendLocation;
  centerLatitude: number;
  centerLongitude: number;
}) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const isInitialRender = useRef(true);

  // Stable isOnline — recomputed only when updatedAt changes, not on every render
  const isOnline = React.useMemo(
    () => Date.now() - new Date(friend.updatedAt).getTime() < 120000,
    [friend.updatedAt]
  );

  useEffect(() => {
    const latDiff = friend.latitude - centerLatitude;
    const lngDiff = friend.longitude - centerLongitude;

    const yMeters = latDiff * 111000;
    const xMeters = lngDiff * 111000 * Math.cos((centerLatitude * Math.PI) / 180);

    const scale = 110 / 1000;
    const px = xMeters * scale;
    const py = -yMeters * scale;

    const distance = Math.sqrt(px * px + py * py);
    let finalX = px;
    let finalY = py;
    if (distance > 135) {
      finalX = (px / distance) * 135;
      finalY = (py / distance) * 135;
    }

    if (isInitialRender.current) {
      pan.setValue({ x: finalX, y: finalY });
      isInitialRender.current = false;
    } else {
      Animated.spring(pan, {
        toValue: { x: finalX, y: finalY },
        friction: 8,
        tension: 30,
        useNativeDriver: true,
      }).start();
    }
  }, [friend.latitude, friend.longitude, centerLatitude, centerLongitude]);

  return (
    <Animated.View
      style={[
        styles.fallbackFriendMarker,
        {
          transform: pan.getTranslateTransform(),
        },
      ]}
    >
      <MapMarker
        displayName={friend.displayName}
        avatarUrl={friend.avatarUrl}
        avatarEmoji={friend.avatarEmoji}
        batteryLevel={friend.batteryLevel}
        isCharging={friend.isCharging}
        ghostMode={friend.ghostMode}
        isOnline={isOnline}
      />
    </Animated.View>
  );
}

const AnimatedRadarFriend = React.memo(AnimatedRadarFriendComponent, (prev, next) =>
  prev.friend.uid === next.friend.uid &&
  prev.friend.latitude === next.friend.latitude &&
  prev.friend.longitude === next.friend.longitude &&
  prev.friend.batteryLevel === next.friend.batteryLevel &&
  prev.friend.ghostMode === next.friend.ghostMode &&
  prev.centerLatitude === next.centerLatitude &&
  prev.centerLongitude === next.centerLongitude
);

// Beautiful custom HSL dark styling for Google Maps on Fallback MapView
const DARK_MAP_STYLE = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#0d0e1b" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#00f0ff" }, { "opacity": 0.6 }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#0d0e1b" }]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [{ "color": "#1d2136" }]
  },
  {
    "featureType": "landscape",
    "elementType": "geometry",
    "stylers": [{ "color": "#090a14" }]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{ "color": "#121428" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#161b36" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#0d0e1b" }]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [{ "color": "#1b213c" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#04050b" }]
  }
];

const LIGHT_MAP_STYLE = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#f5f6fa" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#c8d6e5" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#ffffff" }]
  }
];

const AnimatedRNMarker = Animated.createAnimatedComponent(RNMarker);

function SmoothFallbackMarkerComponent({ friend }: { friend: FriendLocation }) {
  const safeLat = typeof friend.latitude === "number" && !isNaN(friend.latitude) ? friend.latitude : -6.2088;
  const safeLng = typeof friend.longitude === "number" && !isNaN(friend.longitude) ? friend.longitude : 106.8456;
  const animatedLat = useRef(new Animated.Value(safeLat)).current;
  const animatedLon = useRef(new Animated.Value(safeLng)).current;
  const isInitial = useRef(true);

  // Stable isOnline — recomputed only when updatedAt string changes
  const isOnline = React.useMemo(
    () => Date.now() - new Date(friend.updatedAt).getTime() < 120000,
    [friend.updatedAt]
  );

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    Animated.parallel([
      Animated.spring(animatedLat, {
        toValue: safeLat,
        friction: 8,
        tension: 30,
        useNativeDriver: false,
      }),
      Animated.spring(animatedLon, {
        toValue: safeLng,
        friction: 8,
        tension: 30,
        useNativeDriver: false,
      }),
    ]).start();
  }, [safeLat, safeLng]);

  return (
    <AnimatedRNMarker
      coordinate={{
        // @ts-ignore
        latitude: animatedLat,
        // @ts-ignore
        longitude: animatedLon,
      }}
      anchor={{ x: 0.5, y: 1.0 }}
      tracksViewChanges={false}
    >
      <MapMarker
        displayName={friend.displayName}
        avatarUrl={friend.avatarUrl}
        avatarEmoji={friend.avatarEmoji}
        batteryLevel={friend.batteryLevel}
        isCharging={friend.isCharging}
        ghostMode={friend.ghostMode}
        activity={friend.activity}
        geofence={friend.geofence}
        isOnline={isOnline}
      />
    </AnimatedRNMarker>
  );
}

const SmoothFallbackMarker = React.memo(SmoothFallbackMarkerComponent, (prev, next) =>
  prev.friend.uid === next.friend.uid &&
  prev.friend.latitude === next.friend.latitude &&
  prev.friend.longitude === next.friend.longitude &&
  prev.friend.batteryLevel === next.friend.batteryLevel &&
  prev.friend.isCharging === next.friend.isCharging &&
  prev.friend.ghostMode === next.friend.ghostMode &&
  prev.friend.activity === next.friend.activity &&
  prev.friend.geofence === next.friend.geofence &&
  prev.friend.updatedAt === next.friend.updatedAt
);

interface ClusterMarkerProps {
  friends: FriendLocation[];
  isDark: boolean;
}

function ClusterMarkerComponent({ friends, isDark }: ClusterMarkerProps) {
  const displayed = friends.slice(0, 3);
  const count = friends.length;
  const accentColor = "#2BE080"; // Glowing emerald neon for clusters

  return (
    <View style={clusterStyles.markerContainer}>
      {/* Glowing Bubble */}
      <View
        style={[
          clusterStyles.bubble,
          {
            borderColor: accentColor,
            backgroundColor: isDark ? "rgba(18, 18, 22, 0.95)" : "rgba(255, 255, 255, 0.95)",
            shadowColor: accentColor,
          },
        ]}
      >
        {/* Overlapping Emojis */}
        <View style={clusterStyles.emojiWrapper}>
          {displayed.map((friend, index) => (
            <View
              key={friend.uid}
              style={[
                clusterStyles.emojiContainer,
                {
                  marginLeft: index > 0 ? -12 : 0,
                  zIndex: 5 - index,
                },
              ]}
            >
              <Text style={clusterStyles.emojiText}>{friend.avatarEmoji}</Text>
            </View>
          ))}
        </View>

          {/* Corner Count Badge */}
          <View style={clusterStyles.badge}>
            <Text style={clusterStyles.badgeText}>+{count}</Text>
          </View>
        </View>

        {/* Bottom Name Tag */}
        <View
          style={[
            clusterStyles.nameTag,
            {
              backgroundColor: isDark ? "rgba(18, 18, 22, 0.9)" : "rgba(255, 255, 255, 0.92)",
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            },
          ]}
        >
          <Text style={[clusterStyles.nameTagText, { color: isDark ? "#ffffff" : "#121216" }]}>
            {friends.slice(0, 2).map((f) => f.displayName).join(" & ")}
            {count > 2 ? ` +${count - 2}` : ""}
          </Text>
        </View>
      </View>
    );
  }

const clusterStyles = StyleSheet.create({
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  emojiWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  emojiContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    fontSize: 18,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#ff5b99",
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "900",
  },
  nameTag: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  nameTagText: {
    fontSize: 9,
    fontWeight: "900",
  },
});

// ─── Replay Beacon — animated pulsing dot ──────────────────────────────────
function ReplayBeacon() {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={replayStyles.beaconWrap}>
      <Animated.View
        style={[
          replayStyles.beaconRing,
          {
            transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.4] }) }],
            opacity: pulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 0.3, 0] }),
          },
        ]}
      />
      <View style={replayStyles.beaconDot} />
    </View>
  );
}

const replayStyles = StyleSheet.create({
  beaconWrap: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  beaconRing: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(138, 63, 252, 0.4)",
  },
  beaconDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#8A3FFC",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#8A3FFC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  startDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2BE080",
    borderWidth: 2,
    borderColor: "#fff",
  },
});

function FallbackMapView({
  isDark,
  friends,
  latitude,
  longitude,
  userProfile,
  userBatteryLevel = 100,
  userIsCharging = false,
  userGhostMode = "precise",
  userActivity = "online",
  userGeofence = null,
  mapRef,
  onMapPress,
}: {
  isDark: boolean;
  friends?: FriendLocation[];
  latitude: number;
  longitude: number;
  userProfile?: {
    displayName: string;
    photoURL: string | null;
    avatarEmoji: string;
    statusEmoji?: string;
  } | null;
  userBatteryLevel?: number;
  userIsCharging?: boolean;
  userGhostMode?: "precise" | "blurry" | "frozen";
  userActivity?: "online" | "idle" | "driving" | "sleeping" | "walking" | "traveling" | "home" | "work" | "school" | "cafe";
  userGeofence?: "home" | "work" | "school" | "cafe" | "custom" | null;
  mapRef: React.RefObject<MapView | null>;
  onMapPress?: (coords: { latitude: number; longitude: number }) => void;
}) {
  const isInitial = useRef(true);
  const isExplorationActive = useExplorationStore((s) => s.isExplorationActive);
  const exploredFrequencies = useGamificationStore((s) => s.exploredFrequencies);
  const exploredTilesArray = useExplorationStore((s) => s.exploredTilesArray);
  const isReplaying = useExplorationStore((s) => s.isReplaying);
  const replayCoordinates = useExplorationStore((s) => s.replayCoordinates);

  const [zoomLevel, setZoomLevel] = useState(14);

  const handleRegionChangeComplete = (region: any) => {
    // Estimate zoom level from longitudeDelta
    const zoom = Math.round(Math.log2(360 / region.longitudeDelta));
    setZoomLevel(zoom);
  };

  const safeLat = typeof latitude === "number" && !isNaN(latitude) ? latitude : -6.2088;
  const safeLng = typeof longitude === "number" && !isNaN(longitude) ? longitude : 106.8456;

  // Smooth Apple Maps style follow camera in fallback map!
  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    mapRef.current?.animateCamera(
      {
        center: {
          latitude: safeLat,
          longitude: safeLng,
        },
        zoom: 15,
        pitch: 45, // Tilted perspective like Apple Maps
      },
      { duration: 1000 }
    );
  }, [safeLat, safeLng]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialCamera={{
        center: {
          latitude: safeLat,
          longitude: safeLng,
        },
        zoom: 15,
        pitch: 45, // Tilted perspective like Apple Maps
        heading: 0,
        altitude: 1000,
      }}
      customMapStyle={(isDark || isExplorationActive) ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsCompass={false}
      pitchEnabled={true}
      rotateEnabled={true}
      zoomEnabled={true}
      scrollEnabled={true}
      onPress={(e) => {
        if (onMapPress) {
          onMapPress(e.nativeEvent.coordinate);
        }
      }}
      onRegionChangeComplete={handleRegionChangeComplete}
    >
      {/* Exploration Visited Polygons Heatmap */}
      {isExplorationActive &&
        (Object.keys(exploredFrequencies).length > 0 ? Object.keys(exploredFrequencies) : exploredTilesArray).map((tileKey) => {
          const [latIdxStr, lngIdxStr] = tileKey.split("_");
          const latIdx = parseInt(latIdxStr, 10);
          const lngIdx = parseInt(lngIdxStr, 10);

          const minLat = latIdx * TILE_SIZE;
          const minLng = lngIdx * TILE_SIZE;
          const maxLat = (latIdx + 1) * TILE_SIZE;
          const maxLng = (lngIdx + 1) * TILE_SIZE;

          const coordinates = [
            { latitude: minLat, longitude: minLng },
            { latitude: maxLat, longitude: minLng },
            { latitude: maxLat, longitude: maxLng },
            { latitude: minLat, longitude: maxLng },
          ];

          const freq = exploredFrequencies[tileKey] || 1;
          let strokeWidth = 1.0;
          let fillColor = "rgba(46, 213, 115, 0.22)";

          if (freq >= 2 && freq <= 4) {
            strokeWidth = 1.8;
            fillColor = "rgba(46, 213, 115, 0.48)";
          } else if (freq >= 5) {
            strokeWidth = 2.8;
            fillColor = "rgba(46, 213, 115, 0.84)";
          }

          return (
            <Polygon
              key={tileKey}
              coordinates={coordinates}
              strokeColor="#2BE080"
              strokeWidth={strokeWidth}
              fillColor={fillColor}
            />
          );
        })}

      {/* Journey Replay Polyline + Pulsing Beacon */}
      {isReplaying && replayCoordinates.length >= 2 && (
        <>
          {/* Start dot */}
          <RNMarker
            coordinate={{ latitude: replayCoordinates[0].latitude, longitude: replayCoordinates[0].longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={replayStyles.startDot} />
          </RNMarker>

          {/* Purple glowing polyline path */}
          <Polyline
            coordinates={replayCoordinates.map((c: ReplayCoordinate) => ({ latitude: c.latitude, longitude: c.longitude }))}
            strokeColor="#8A3FFC"
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />

          {/* Pulsing beacon head */}
          <RNMarker
            coordinate={{
              latitude: replayCoordinates[replayCoordinates.length - 1].latitude,
              longitude: replayCoordinates[replayCoordinates.length - 1].longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <ReplayBeacon />
          </RNMarker>
        </>
      )}

      {/* Render Me marker */}
      {typeof safeLat === "number" && typeof safeLng === "number" && (
        <RNMarker
          coordinate={{ latitude: safeLat, longitude: safeLng }}
          anchor={{ x: 0.5, y: 1.0 }}
          tracksViewChanges={false}
        >
          <MapMarker
            displayName={userProfile?.displayName || "Saya"}
            avatarUrl={userProfile?.photoURL || ""}
            avatarEmoji={userProfile?.statusEmoji || userProfile?.avatarEmoji || "🦊"}
            batteryLevel={userBatteryLevel}
            isCharging={userIsCharging}
            ghostMode={userGhostMode}
            activity={userActivity}
            geofence={userGeofence}
            isMe={true}
          />
        </RNMarker>
      )}

      {/* Render friends & clusters dynamically */}
      {friends &&
        getClusteredNodes(friends, zoomLevel).map((node) => {
          if (node.isCluster) {
            return (
              <RNMarker
                key={node.id}
                coordinate={{ latitude: node.latitude, longitude: node.longitude }}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  mapRef.current?.animateCamera(
                    {
                      center: {
                        latitude: node.latitude,
                        longitude: node.longitude,
                      },
                      zoom: Math.min(17, zoomLevel + 2),
                      pitch: 45,
                    },
                    { duration: 800 }
                  );
                }}
              >
                <ClusterMarkerComponent friends={node.friends} isDark={isDark} />
              </RNMarker>
            );
          } else {
            const friend = node.friends[0];
            return (
              <SmoothFallbackMarker key={friend.uid} friend={friend} />
            );
          }
        })}
    </MapView>
  );
}

function AnimatedFriendMarkerComponent({ friend }: { friend: FriendLocation }) {
  const lon = useSharedValue(friend.longitude);
  const lat = useSharedValue(friend.latitude);
  const isInitialRender = useRef(true);

  // Stable isOnline — only recomputed when updatedAt changes
  const isOnline = React.useMemo(
    () => Date.now() - new Date(friend.updatedAt).getTime() < 120000,
    [friend.updatedAt]
  );

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
    } else {
      lon.value = withSpring(friend.longitude, { damping: 15, stiffness: 80 });
      lat.value = withSpring(friend.latitude, { damping: 15, stiffness: 80 });
    }
  }, [friend.longitude, friend.latitude]);

  const animatedProps = useAnimatedProps(() => {
    return {
      coordinate: [lon.value, lat.value],
    };
  });

  if (!AnimatedMarkerView) return null;

  return (
    <AnimatedMarkerView
      id={`marker-${friend.uid}`}
      animatedProps={animatedProps}
      anchor={{ x: 0.5, y: 1.0 }}
      allowOverlap
    >
      <MapMarker
        displayName={friend.displayName}
        avatarUrl={friend.avatarUrl}
        avatarEmoji={friend.avatarEmoji}
        batteryLevel={friend.batteryLevel}
        isCharging={friend.isCharging}
        ghostMode={friend.ghostMode}
        activity={friend.activity}
        geofence={friend.geofence}
        isOnline={isOnline}
      />
    </AnimatedMarkerView>
  );
}

const AnimatedFriendMarker = React.memo(AnimatedFriendMarkerComponent, (prev, next) =>
  prev.friend.uid === next.friend.uid &&
  prev.friend.latitude === next.friend.latitude &&
  prev.friend.longitude === next.friend.longitude &&
  prev.friend.batteryLevel === next.friend.batteryLevel &&
  prev.friend.isCharging === next.friend.isCharging &&
  prev.friend.ghostMode === next.friend.ghostMode &&
  prev.friend.activity === next.friend.activity &&
  prev.friend.geofence === next.friend.geofence &&
  prev.friend.updatedAt === next.friend.updatedAt
);

// ─── Mapbox Native View ────────────────────────────────────────────────────────
const MapboxViewComponent = forwardRef<MapboxViewRef, MapboxViewProps>(
  (
    {
      latitude,
      longitude,
      isDark,
      friends,
      userProfile,
      userBatteryLevel = 100,
      userIsCharging = false,
      userGhostMode = "precise",
      userActivity = "online",
      userGeofence = null,
      followUser = true,
      onMapPan,
      onMapPress,
      children,
      style,
    },
    ref
  ) => {
    const cameraRef = useRef<any>(null);
    const fallbackMapRef = useRef<MapView>(null);
    const [mapboxZoom, setMapboxZoom] = useState(14);

    useImperativeHandle(ref, () => ({
      flyTo: (coords, zoom = 15) => {
        if (isMapboxAvailable) {
          cameraRef.current?.flyTo([coords.longitude, coords.latitude], 800);
          cameraRef.current?.zoomTo(zoom, 800);
        } else {
          fallbackMapRef.current?.animateCamera(
            {
              center: {
                latitude: coords.latitude,
                longitude: coords.longitude,
              },
              zoom: zoom,
              pitch: 45, // Tilted perspective like Apple Maps
            },
            { duration: 800 }
          );
        }
      },
    }));

    if (!isMapboxAvailable) {
      return (
        <View style={[styles.container, style]}>
          <FallbackMapView
            isDark={isDark}
            friends={friends}
            latitude={latitude}
            longitude={longitude}
            userProfile={userProfile}
            userBatteryLevel={userBatteryLevel}
            userIsCharging={userIsCharging}
            userGhostMode={userGhostMode}
            userActivity={userActivity}
            userGeofence={userGeofence}
            mapRef={fallbackMapRef}
            onMapPress={onMapPress}
          />
        </View>
      );
    }

    const mapStyle = isDark
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/light-v11";

    return (
      <View style={[styles.container, style]}>
        <NativeMapView
          style={styles.map}
          styleURL={mapStyle}
          logoEnabled={false}
          attributionEnabled={false}
          compassEnabled={false}
          scaleBarEnabled={false}
          pitchEnabled
          rotateEnabled
          onPress={(e: any) => {
            if (onMapPress) {
              const coords = e.geometry.coordinates;
              onMapPress({ latitude: coords[1], longitude: coords[0] });
            }
          }}
          onCameraChanged={(state: any) => {
            // Jika perubahan kamera dipicu oleh gestur geser tangan pengguna,
            // matikan mode followUser otomatis agar tidak mental/snap kembali.
            if (state.gestures?.isGestureActive && onMapPan) {
              onMapPan();
            }
            if (state.properties?.zoomLevel !== undefined) {
              setMapboxZoom(state.properties.zoomLevel);
            }
          }}
        >
          <Camera
            ref={cameraRef}
            centerCoordinate={followUser ? [longitude, latitude] : undefined}
            defaultSettings={{
              centerCoordinate: [longitude, latitude],
              zoomLevel: 14,
              pitch: 40,
            }}
            animationMode="flyTo"
            animationDuration={800}
          />
          <UserLocation visible={false} />

          {/* Render marker kustom pengguna utama (Me) dengan Cyan neon glow */}
          {latitude && longitude && (
            <MarkerView
              id="me-marker"
              coordinate={[longitude, latitude]}
              anchor={{ x: 0.5, y: 1.0 }}
            >
              <MapMarker
                displayName={userProfile?.displayName || "Saya"}
                avatarUrl={userProfile?.photoURL || ""}
                avatarEmoji={userProfile?.statusEmoji || userProfile?.avatarEmoji || "🦊"}
                batteryLevel={userBatteryLevel}
                isCharging={userIsCharging}
                ghostMode={userGhostMode}
                activity={userActivity}
                geofence={userGeofence}
                isMe={true}
              />
            </MarkerView>
          )}

          {/* Render markers of friends & clusters dynamically in Mapbox native */}
          {friends &&
            getClusteredNodes(friends, mapboxZoom).map((node) => {
              if (node.isCluster) {
                return (
                  <MarkerView
                    key={node.id}
                    id={node.id}
                    coordinate={[node.longitude, node.latitude]}
                    anchor={{ x: 0.5, y: 0.5 }}
                  >
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        cameraRef.current?.flyTo([node.longitude, node.latitude], 800);
                        cameraRef.current?.zoomTo(Math.min(17, mapboxZoom + 2), 800);
                      }}
                    >
                      <ClusterMarkerComponent friends={node.friends} isDark={isDark} />
                    </Pressable>
                  </MarkerView>
                );
              } else {
                const friend = node.friends[0];
                return (
                  <AnimatedFriendMarker key={friend.uid} friend={friend} />
                );
              }
            })}

          {children}
        </NativeMapView>
      </View>
    );
  }
);

MapboxViewComponent.displayName = "MapboxView";
export const MapboxView = MapboxViewComponent;

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  fallbackContainer: {
    ...StyleSheet.absoluteFill,
  },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  ring: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
  },
  centerDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 10,
  },
  centerInner: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    zIndex: 11,
  },
  centerMarkerContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
  },
  fallbackFriendMarker: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
});
