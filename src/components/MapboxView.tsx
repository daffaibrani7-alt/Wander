/**
 * MapboxView.tsx  ← dipakai di web (fallback platform-agnostik)
 * Menggunakan mapbox-gl langsung via dynamic script injection.
 * Menampilkan animated radar fallback yang premium.
 */
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { View, StyleSheet, Animated, Easing, Platform } from "react-native";
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

// ─── Animated Radar (web fallback – looks premium) ─────────────────────────────
function RadarFallback({ isDark }: { isDark: boolean }) {
  const rings = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  const gridOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Rings stagger
    rings.forEach((ring, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 700),
          Animated.timing(ring, {
            toValue: 1,
            duration: 3200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    });

    // Fade in grid
    Animated.timing(gridOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }).start();
  }, []);

  const accent = isDark ? COLORS.cyan : "#0055FF";
  const bg = isDark ? "#060610" : "#EEF1FA";
  const gridColor = isDark ? "rgba(0,240,255,0.035)" : "rgba(0,80,255,0.04)";

  return (
    <View style={[styles.fallback, { backgroundColor: bg }]}>
      {/* Grid lines */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: gridOpacity }]}>
        {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => (
          <View
            key={`h${i}`}
            style={[styles.gridH, { top: `${50 + i * 10}%` as any, backgroundColor: gridColor }]}
          />
        ))}
        {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => (
          <View
            key={`v${i}`}
            style={[styles.gridV, { left: `${50 + i * 10}%` as any, backgroundColor: gridColor }]}
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
                { scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.05, 4.2] }) },
              ],
              opacity: ring.interpolate({
                inputRange: [0, 0.15, 0.7, 1],
                outputRange: [0, 0.9, 0.25, 0],
              }),
            },
          ]}
        />
      ))}

      {/* Glow orb */}
      <View style={[styles.glow, { backgroundColor: accent + "18" }]} />

      {/* Center user dot */}
      <View style={[styles.centerDot, { backgroundColor: accent, shadowColor: accent }]}>
        <View style={styles.centerInner} />
      </View>

      {/* Location label */}
      <View style={[styles.locLabel, { backgroundColor: isDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.7)" }]}>
        <View style={[styles.locDot, { backgroundColor: accent }]} />
      </View>
    </View>
  );
}

// ─── Web Mapbox GL JS embed ──────────────────────────────────────────────────
function WebMapbox({
  latitude,
  longitude,
  isDark,
  forwardedRef,
}: {
  latitude: number;
  longitude: number;
  isDark: boolean;
  forwardedRef: React.MutableRefObject<MapboxViewRef | null>;
}) {
  const containerRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    let map: any = null;

    const initMap = async () => {
      try {
        // Dynamically import mapbox-gl only on web
        const mapboxgl = await import("mapbox-gl");
        const MapboxGL = (mapboxgl as any).default || mapboxgl;

        // Inject CSS
        if (!document.getElementById("mapbox-css")) {
          const link = document.createElement("link");
          link.id = "mapbox-css";
          link.rel = "stylesheet";
          link.href = "https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.css";
          document.head.appendChild(link);
        }

        MapboxGL.accessToken =
          "pk.eyJ1IjoiZGFmZmFpYnJhbmk3IiwiYSI6ImNtYjVvZ3FxaTBoaHkyanF4eDZ5M2xia3QifQ.PLACEHOLDER_PUBLIC_TOKEN";

        if (!containerRef.current) return;

        map = new MapboxGL.Map({
          container: containerRef.current,
          style: isDark
            ? "mapbox://styles/mapbox/dark-v11"
            : "mapbox://styles/mapbox/light-v11",
          center: [longitude, latitude],
          zoom: 14,
          pitch: 45,
          bearing: 0,
          attributionControl: false,
          logoPosition: "bottom-right",
        });

        // Add user location marker
        map.on("load", () => {
          // Pulsing user dot
          const el = document.createElement("div");
          el.style.cssText = `
            width: 20px; height: 20px; border-radius: 50%;
            background: ${isDark ? "#00F0FF" : "#0055FF"};
            box-shadow: 0 0 0 6px ${isDark ? "rgba(0,240,255,0.25)" : "rgba(0,85,255,0.2)"};
            border: 3px solid white;
            animation: pulse 2s infinite;
          `;

          if (!document.getElementById("mapbox-pulse-style")) {
            const style = document.createElement("style");
            style.id = "mapbox-pulse-style";
            style.textContent = `
              @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(0,240,255,0.4); }
                70% { box-shadow: 0 0 0 16px rgba(0,240,255,0); }
                100% { box-shadow: 0 0 0 0 rgba(0,240,255,0); }
              }
            `;
            document.head.appendChild(style);
          }

          new MapboxGL.Marker({ element: el })
            .setLngLat([longitude, latitude])
            .addTo(map);
        });

        mapInstanceRef.current = map;

        // Expose flyTo via ref
        if (forwardedRef) {
          forwardedRef.current = {
            flyTo: (coords, zoom = 15) => {
              map.flyTo({
                center: [coords.longitude, coords.latitude],
                zoom,
                duration: 1200,
                pitch: 45,
              });
            },
          };
        }
      } catch (err) {
        console.warn("Mapbox GL web init failed:", err);
      }
    };

    initMap();

    return () => {
      map?.remove();
      mapInstanceRef.current = null;
    };
  }, [isDark]);

  // Update center when location changes
  useEffect(() => {
    if (mapInstanceRef.current && latitude && longitude) {
      mapInstanceRef.current.easeTo({
        center: [longitude, latitude],
        duration: 500,
      });
    }
  }, [latitude, longitude]);

  if (Platform.OS !== "web") return null;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
const MapboxViewComponent = forwardRef<MapboxViewRef, MapboxViewProps>(
  ({ latitude, longitude, isDark, children, style }, ref) => {
    const internalRef = useRef<MapboxViewRef | null>(null);

    useImperativeHandle(ref, () => ({
      flyTo: (coords, zoom) => {
        internalRef.current?.flyTo(coords, zoom);
      },
    }));

    if (Platform.OS === "web") {
      return (
        <View style={[styles.container, style]}>
          <WebMapbox
            latitude={latitude}
            longitude={longitude}
            isDark={isDark}
            forwardedRef={internalRef}
          />
          {children}
        </View>
      );
    }

    // Non-web, non-native (fallback)
    return (
      <View style={[styles.container, style]}>
        <RadarFallback isDark={isDark} />
        {children}
      </View>
    );
  }
);

MapboxViewComponent.displayName = "MapboxView";
export const MapboxView = MapboxViewComponent;

const styles = StyleSheet.create({
  container: { flex: 1 },
  fallback: {
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
  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  centerDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 15,
    zIndex: 10,
  },
  centerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  locLabel: {
    position: "absolute",
    bottom: "35%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  locDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
});
