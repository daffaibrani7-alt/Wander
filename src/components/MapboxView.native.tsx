/**
 * MapboxView.native.tsx  ← hanya dipakai di iOS / Android
 * Full @rnmapbox/maps integration dengan graceful fallback saat Mapbox belum dikonfigurasi.
 */
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { View, StyleSheet, Animated, Easing, UIManager } from "react-native";
import Reanimated, { useSharedValue, withSpring, useAnimatedProps } from "react-native-reanimated";
import MapView, { Marker as RNMarker } from "react-native-maps";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { COLORS } from "../theme/colors";
import { MapMarker } from "./MapMarker";
import { FriendLocation } from "../services/mockService";

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
  } | null;
  userBatteryLevel?: number;
  userIsCharging?: boolean;
  userGhostMode?: "precise" | "blurry" | "frozen";
  followUser?: boolean;
  onMapPan?: () => void;
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

function AnimatedRadarFriend({
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
        isOnline={Date.now() - new Date(friend.updatedAt).getTime() < 120000}
      />
    </Animated.View>
  );
}

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

function SmoothFallbackMarker({ friend }: { friend: FriendLocation }) {
  const safeLat = typeof friend.latitude === "number" && !isNaN(friend.latitude) ? friend.latitude : -6.2088;
  const safeLng = typeof friend.longitude === "number" && !isNaN(friend.longitude) ? friend.longitude : 106.8456;
  const animatedLat = useRef(new Animated.Value(safeLat)).current;
  const animatedLon = useRef(new Animated.Value(safeLng)).current;
  const isInitial = useRef(true);

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
        isOnline={Date.now() - new Date(friend.updatedAt).getTime() < 120000}
      />
    </AnimatedRNMarker>
  );
}

function FallbackMapView({
  isDark,
  friends,
  latitude,
  longitude,
  userProfile,
  userBatteryLevel = 100,
  userIsCharging = false,
  userGhostMode = "precise",
  mapRef,
}: {
  isDark: boolean;
  friends?: FriendLocation[];
  latitude: number;
  longitude: number;
  userProfile?: {
    displayName: string;
    photoURL: string | null;
    avatarEmoji: string;
  } | null;
  userBatteryLevel?: number;
  userIsCharging?: boolean;
  userGhostMode?: "precise" | "blurry" | "frozen";
  mapRef: React.RefObject<MapView | null>;
}) {
  const isInitial = useRef(true);

  const safeLat = typeof latitude === "number" && !isNaN(latitude) ? latitude : -6.2088;
  const safeLng = typeof longitude === "number" && !isNaN(longitude) ? longitude : 106.8456;

  // Smooth follow user in fallback map too!
  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    mapRef.current?.animateToRegion(
      {
        latitude: safeLat,
        longitude: safeLng,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      800
    );
  }, [safeLat, safeLng]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={{
        latitude: safeLat,
        longitude: safeLng,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }}
      customMapStyle={isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsCompass={false}
      pitchEnabled={true}
      rotateEnabled={true}
      zoomEnabled={true}
      scrollEnabled={true}
    >
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
            avatarEmoji={userProfile?.avatarEmoji || "🦊"}
            batteryLevel={userBatteryLevel}
            isCharging={userIsCharging}
            ghostMode={userGhostMode}
            isMe={true}
          />
        </RNMarker>
      )}

      {/* Render friends with smooth spring physics */}
      {friends &&
        friends.map((friend) => (
          <SmoothFallbackMarker key={friend.uid} friend={friend} />
        ))}
    </MapView>
  );
}

function AnimatedFriendMarker({ friend }: { friend: FriendLocation }) {
  const lon = useSharedValue(friend.longitude);
  const lat = useSharedValue(friend.latitude);
  const isInitialRender = useRef(true);

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
    >
      <MapMarker
        displayName={friend.displayName}
        avatarUrl={friend.avatarUrl}
        avatarEmoji={friend.avatarEmoji}
        batteryLevel={friend.batteryLevel}
        isCharging={friend.isCharging}
        ghostMode={friend.ghostMode}
        isOnline={Date.now() - new Date(friend.updatedAt).getTime() < 120000}
      />
    </AnimatedMarkerView>
  );
}

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
      followUser = true,
      onMapPan,
      children,
      style,
    },
    ref
  ) => {
    const cameraRef = useRef<any>(null);
    const fallbackMapRef = useRef<MapView>(null);

    useImperativeHandle(ref, () => ({
      flyTo: (coords, zoom = 15) => {
        if (isMapboxAvailable) {
          cameraRef.current?.flyTo([coords.longitude, coords.latitude], 800);
          cameraRef.current?.zoomTo(zoom, 800);
        } else {
          fallbackMapRef.current?.animateToRegion(
            {
              latitude: coords.latitude,
              longitude: coords.longitude,
              latitudeDelta: 0.008,
              longitudeDelta: 0.008,
            },
            800
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
            mapRef={fallbackMapRef}
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
          onCameraChanged={(state: any) => {
            // Jika perubahan kamera dipicu oleh gestur geser tangan pengguna,
            // matikan mode followUser otomatis agar tidak mental/snap kembali.
            if (state.gestures?.isGestureActive && onMapPan) {
              onMapPan();
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
                avatarEmoji={userProfile?.avatarEmoji || "🦊"}
                batteryLevel={userBatteryLevel}
                isCharging={userIsCharging}
                ghostMode={userGhostMode}
                isMe={true}
              />
            </MarkerView>
          )}

          {/* Render markers of friends in real Mapbox native */}
          {friends &&
            friends.map((friend) => (
              <AnimatedFriendMarker key={friend.uid} friend={friend} />
            ))}

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
