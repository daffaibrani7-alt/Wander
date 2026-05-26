/**
 * MapboxView.tsx  ← dipakai di web
 *
 * Web preview menggunakan animated radar premium sebagai pengganti peta.
 * Mapbox sesungguhnya hanya aktif di iOS/Android via MapboxView.native.tsx.
 *
 * Radar ini menampilkan:
 * - Pulse rings animasi stagger
 * - Grid lines tipis
 * - Glow orb di tengah
 * - Marker kustom Anda sendiri (Me Marker) dengan pendaran sian neon
 * - Marker teman dengan visualisasi live real-time
 */
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
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



function AnimatedRadarFriend({
  friend,
  centerLatitude,
  centerLongitude,
  isDark,
}: {
  friend: FriendLocation;
  centerLatitude: number;
  centerLongitude: number;
  isDark: boolean;
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
      Animated.timing(pan, {
        toValue: { x: finalX, y: finalY },
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }).start();
    }
  }, [friend.latitude, friend.longitude, centerLatitude, centerLongitude]);

  return (
    <Animated.View
      style={[
        styles.friendMarkerContainer,
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
        isMe={false}
        isOnline={Date.now() - new Date(friend.updatedAt).getTime() < 120000}
      />
      <View
        style={[
          styles.nameTag,
          {
            backgroundColor: isDark ? "rgba(18,18,22,0.9)" : "rgba(255,255,255,0.92)",
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
          },
        ]}
      >
        <Text style={[styles.nameTagText, { color: isDark ? "#fff" : "#000" }]} numberOfLines={1}>
          {friend.displayName}
        </Text>
      </View>
    </Animated.View>
  );
}

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
    // flyTo is a no-op on web (radar doesn't move)
    useImperativeHandle(ref, () => ({
      flyTo: () => {},
    }));

    const rings = [
      useRef(new Animated.Value(0)).current,
      useRef(new Animated.Value(0)).current,
      useRef(new Animated.Value(0)).current,
      useRef(new Animated.Value(0)).current,
    ];
    const gridOpacity = useRef(new Animated.Value(0)).current;
    const dotGlow = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
      // Staggered pulse rings
      rings.forEach((ring, i) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 700),
            Animated.timing(ring, {
              toValue: 1,
              duration: 3000,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: true }),
          ])
        ).start();
      });

      // Grid fade in
      Animated.timing(gridOpacity, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }).start();

      // Center dot breathing
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotGlow, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(dotGlow, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    }, []);

    const accent = isDark ? COLORS.cyan : "#0055FF";
    const bg = isDark ? "#06060E" : "#EAECF8";
    const gridColor = isDark ? "rgba(0,240,255,0.03)" : "rgba(0,80,255,0.04)";

    return (
      <View style={[styles.container, { backgroundColor: bg }, style]}>
        {/* Grid lines */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: gridOpacity }]}>
          {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => (
            <View
              key={`h${i}`}
              style={[
                styles.gridH,
                { top: `${50 + i * 10}%` as any, backgroundColor: gridColor },
              ]}
            />
          ))}
          {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => (
            <View
              key={`v${i}`}
              style={[
                styles.gridV,
                { left: `${50 + i * 10}%` as any, backgroundColor: gridColor },
              ]}
            />
          ))}
        </Animated.View>

        {/* Pulse rings */}
        {rings.map((ring, i) => (
          <Animated.View
            key={i}
            style={[
              styles.ring,
              {
                borderColor: accent,
                transform: [
                  { scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.05, 4.5] }) },
                ],
                opacity: ring.interpolate({
                  inputRange: [0, 0.12, 0.75, 1],
                  outputRange: [0, 0.85, 0.2, 0],
                }),
              },
            ]}
          />
        ))}

        {/* Glow orb */}
        <View
          style={[
            styles.glowOrb,
            { backgroundColor: accent + (isDark ? "14" : "0D") },
          ]}
        />

        {/* ── Center User Custom Marker (Me) ── */}
        <View style={styles.centerMarkerContainer}>
          <MapMarker
            displayName={userProfile?.displayName || "Saya"}
            avatarUrl={userProfile?.photoURL || ""}
            avatarEmoji={userProfile?.avatarEmoji || "🦊"}
            batteryLevel={userBatteryLevel}
            isCharging={userIsCharging}
            ghostMode={userGhostMode}
            isMe={true}
          />
        </View>

        {/* ── Friend markers on the Radar ── */}
        {friends &&
          friends.map((friend) => (
            <AnimatedRadarFriend
              key={friend.uid}
              friend={friend}
              centerLatitude={latitude}
              centerLongitude={longitude}
              isDark={isDark}
            />
          ))}

        {/* Children (overlays etc) */}
        {children}
      </View>
    );
  }
);

MapboxViewComponent.displayName = "MapboxView";
export const MapboxView = MapboxViewComponent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ring: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
  },
  glowOrb: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  centerMarkerContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30, // Paling atas, melebihi teman jika bertumpuk
  },
  gridH: {
    position: "absolute",
    width: "100%",
    height: 1,
  },
  gridV: {
    position: "absolute",
    height: "100%",
    width: 1,
  },
  friendMarkerContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  nameTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: -8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  nameTagText: {
    fontSize: 9,
    fontWeight: "900",
    fontFamily: "System",
  },
});
