/**
 * MapboxView.native.tsx  ← hanya dipakai di iOS / Android
 * Full @rnmapbox/maps integration dengan graceful fallback saat Mapbox belum dikonfigurasi.
 */
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { COLORS } from "../theme/colors";

export interface MapboxViewRef {
  flyTo: (coords: { latitude: number; longitude: number }, zoom?: number) => void;
}

export interface MapboxViewProps {
  latitude: number;
  longitude: number;
  isDark: boolean;
  children?: React.ReactNode;
  style?: object;
}

// Attempt to load Mapbox native – may fail in Expo Go
let MapboxSDK: any = null;
let NativeMapView: any = null;
let Camera: any = null;
let UserLocation: any = null;

try {
  const Mapbox = require("@rnmapbox/maps");
  MapboxSDK = Mapbox.default;
  NativeMapView = Mapbox.MapView;
  Camera = Mapbox.Camera;
  UserLocation = Mapbox.UserLocation;

  MapboxSDK?.setAccessToken(
    "pk.eyJ1IjoiZGFmZmFpYnJhbmk3IiwiYSI6ImNtYjVvZ3FxaTBoaHkyanF4eDZ5M2xia3QifQ.PLACEHOLDER_PUBLIC_TOKEN"
  );
} catch {
  // Expo Go – use radar fallback
}

const isMapboxAvailable = !!NativeMapView;

// ─── Radar Fallback ────────────────────────────────────────────────────────────
function RadarFallback({ isDark }: { isDark: boolean }) {
  const rings = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    rings.forEach((ring, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 900),
          Animated.timing(ring, { toValue: 1, duration: 2800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  const ringColor = isDark ? COLORS.cyan : "#0070FF";

  return (
    <View style={[styles.fallback, { backgroundColor: isDark ? "#080810" : "#E8EAF6" }]}>
      {rings.map((ring, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            {
              borderColor: ringColor,
              transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.1, 3.5] }) }],
              opacity: ring.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.8, 0.3, 0] }),
            },
          ]}
        />
      ))}
      <View style={[styles.centerDot, { backgroundColor: ringColor, shadowColor: ringColor }]} />
      <View style={styles.centerInner} />
    </View>
  );
}

// ─── Mapbox Native View ────────────────────────────────────────────────────────
const MapboxViewComponent = forwardRef<MapboxViewRef, MapboxViewProps>(
  ({ latitude, longitude, isDark, children, style }, ref) => {
    const cameraRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      flyTo: (coords, zoom = 15) => {
        cameraRef.current?.flyTo([coords.longitude, coords.latitude], 800);
        cameraRef.current?.zoomTo(zoom, 800);
      },
    }));

    if (!isMapboxAvailable) {
      return <RadarFallback isDark={isDark} />;
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
        >
          <Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: [longitude, latitude],
              zoomLevel: 14,
              pitch: 40,
            }}
            animationMode="flyTo"
            animationDuration={800}
          />
          <UserLocation visible animated showsUserHeadingIndicator />
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
});
