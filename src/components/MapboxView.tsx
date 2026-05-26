/**
 * MapboxView.tsx  ← dipakai di web
 *
 * Full interactive Leaflet & OpenStreetMap preview pada Web Platform.
 * Menghadirkan peta riil premium CartoDB Dark/Light Matter gratis tanpa token!
 */
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
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

// Custom HTML for Leaflet markers matching high-fidelity MapMarker design
function createMarkerHtml(
  avatarEmoji: string,
  displayName: string,
  batteryLevel: number,
  isCharging: boolean,
  ghostMode: "precise" | "blurry" | "frozen",
  isMe: boolean,
  activity?: "online" | "idle" | "driving" | "sleeping"
): string {
  const accentColor = isMe ? COLORS.cyan : "#ff007f";
  const glowShadow = isMe
    ? "0 0 15px rgba(0, 240, 255, 0.65)"
    : "0 0 15px rgba(255, 0, 127, 0.65)";

  return `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; user-select: none;">
      <!-- Glowing avatar container -->
      <div style="
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(18, 18, 22, 0.95);
        border: 2px solid ${accentColor};
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: ${glowShadow};
        position: relative;
      ">
        <span style="font-size: 22px;">${avatarEmoji}</span>
        
        <!-- Activity Status Badge -->
        ${activity && activity !== "online" ? `
          <div style="
            position: absolute;
            top: -4px;
            left: -4px;
            background: #121216;
            border: 1px solid rgba(255,255,255,0.2);
            width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
          ">
            ${activity === "driving" ? "🚗" : ""}
            ${activity === "sleeping" ? "😴" : ""}
            ${activity === "idle" ? "⏳" : ""}
          </div>
        ` : ""}

        <!-- Battery Badge -->
        <div style="
          position: absolute;
          bottom: -4px;
          right: -4px;
          background: #121216;
          border: 1px solid rgba(255,255,255,0.2);
          padding: 1px 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          line-height: 10px;
        ">
          <span style="font-size: 8px; font-weight: 900; color: ${batteryLevel < 20 ? "#ff4757" : "#2ed573"}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${isCharging ? "⚡" : ""}${batteryLevel}%
          </span>
        </div>
      </div>
      
      <!-- Name tag -->
      <div style="
        background: rgba(18, 18, 22, 0.9);
        border: 1px solid rgba(255,255,255,0.1);
        padding: 2px 8px;
        border-radius: 8px;
        margin-top: 4px;
        white-space: nowrap;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      ">
        <span style="font-size: 9px; font-weight: 900; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: 0.5px;">
          ${displayName}
        </span>
      </div>
    </div>
  `;
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
    const [leafletLoaded, setLeafletLoaded] = useState(false);
    const mapRef = useRef<any>(null);
    const mapDivRef = useRef<HTMLDivElement>(null);
    const markersRef = useRef<{ [key: string]: any }>({});

    // Expose flyTo ref method to work exactly like Native Mapbox/Google Maps flyTo
    useImperativeHandle(ref, () => ({
      flyTo: (coords: { latitude: number; longitude: number }, zoom = 15) => {
        if (mapRef.current) {
          mapRef.current.setView([coords.latitude, coords.longitude], zoom, {
            animate: true,
            duration: 0.8,
          });
        }
      },
    }));

    // 1. Dynamic CDN Loading of Leaflet CSS and JS (runs only once in browser)
    useEffect(() => {
      if (typeof window === "undefined") return;

      if ((window as any).L) {
        setLeafletLoaded(true);
        return;
      }

      // Inject Leaflet CSS
      const cssId = "leaflet-css-cdn";
      if (!document.getElementById(cssId)) {
        const link = document.createElement("link");
        link.id = cssId;
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // Inject overrides styles for divIcon custom rendering
      const styleId = "leaflet-marker-custom-styles";
      if (!document.getElementById(styleId)) {
        const styleTag = document.createElement("style");
        styleTag.id = styleId;
        styleTag.innerHTML = `
          .custom-leaflet-marker {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
        `;
        document.head.appendChild(styleTag);
      }

      // Inject Leaflet JS
      const scriptId = "leaflet-js-cdn";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.onload = () => {
          setLeafletLoaded(true);
        };
        document.body.appendChild(script);
      } else {
        const checkInterval = setInterval(() => {
          if ((window as any).L) {
            clearInterval(checkInterval);
            setLeafletLoaded(true);
          }
        }, 100);
        return () => clearInterval(checkInterval);
      }
    }, []);

    // 2. Map Initialization & Dynamic Theme Handling
    useEffect(() => {
      if (!leafletLoaded || !mapDivRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      // Clean up previous map if active
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
      }

      // Initialize Leaflet Map
      const map = L.map(mapDivRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([latitude, longitude], 14);

      mapRef.current = map;

      // Load premium styled CartoDB tile layer
      const tileUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

      L.tileLayer(tileUrl, {
        maxZoom: 19,
      }).addTo(map);

      // Disable followUser on map drag
      map.on("dragstart", () => {
        if (onMapPan) onMapPan();
      });

      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          markersRef.current = {};
        }
      };
    }, [leafletLoaded, isDark]);

    // 3. Keep camera centered on coordinate when followUser is active
    useEffect(() => {
      if (!mapRef.current || !followUser) return;
      mapRef.current.panTo([latitude, longitude], { animate: true, duration: 0.8 });
    }, [latitude, longitude, followUser]);

    // 4. Render user and friends markers dynamically with gorgeous neon markers
    useEffect(() => {
      if (!leafletLoaded || !mapRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      const currentMarkers = markersRef.current;
      const activeKeys = new Set<string>();

      // 4a. User Marker (Me)
      const meKey = "user-me";
      activeKeys.add(meKey);
      
      const meHtml = createMarkerHtml(
        userProfile?.avatarEmoji || "🦊",
        userProfile?.displayName || "Saya",
        userBatteryLevel,
        userIsCharging,
        userGhostMode,
        true,
        userIsCharging && userBatteryLevel === 100 ? "online" : undefined
      );

      const meIcon = L.divIcon({
        html: meHtml,
        className: "custom-leaflet-marker",
        iconSize: [60, 80],
        iconAnchor: [30, 60],
      });

      if (currentMarkers[meKey]) {
        currentMarkers[meKey].setLatLng([latitude, longitude]);
        currentMarkers[meKey].setIcon(meIcon);
      } else {
        currentMarkers[meKey] = L.marker([latitude, longitude], { icon: meIcon }).addTo(mapRef.current);
      }

      // 4b. Friend Markers
      if (friends) {
        friends.forEach((friend) => {
          const friendKey = `friend-${friend.uid}`;
          activeKeys.add(friendKey);

          const fHtml = createMarkerHtml(
            friend.avatarEmoji,
            friend.displayName,
            friend.batteryLevel,
            friend.isCharging,
            friend.ghostMode,
            false,
            friend.activity
          );

          const fIcon = L.divIcon({
            html: fHtml,
            className: "custom-leaflet-marker",
            iconSize: [60, 80],
            iconAnchor: [30, 60],
          });

          if (currentMarkers[friendKey]) {
            currentMarkers[friendKey].setLatLng([friend.latitude, friend.longitude]);
            currentMarkers[friendKey].setIcon(fIcon);
          } else {
            currentMarkers[friendKey] = L.marker([friend.latitude, friend.longitude], { icon: fIcon })
              .addTo(mapRef.current);
          }
        });
      }

      // 4c. Clean up removed friends / markers
      Object.keys(currentMarkers).forEach((key) => {
        if (!activeKeys.has(key)) {
          currentMarkers[key].remove();
          delete currentMarkers[key];
        }
      });
    }, [leafletLoaded, latitude, longitude, friends, userProfile, userBatteryLevel, userIsCharging, userGhostMode]);

    // Concentric-ring radar as placeholder while Leaflet assets are downloading from CDN
    const rings = [
      useRef(new Animated.Value(0)).current,
      useRef(new Animated.Value(0)).current,
      useRef(new Animated.Value(0)).current,
      useRef(new Animated.Value(0)).current,
    ];
    const gridOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (leafletLoaded) return;
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

      Animated.timing(gridOpacity, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }).start();
    }, [leafletLoaded]);

    const accent = isDark ? COLORS.cyan : "#0055FF";
    const bg = isDark ? "#06060E" : "#EAECF8";
    const gridColor = isDark ? "rgba(0,240,255,0.03)" : "rgba(0,80,255,0.04)";

    return (
      <View style={[styles.container, { backgroundColor: bg }, style]}>
        {/* Real Leaflet Map for Web */}
        <div 
          ref={mapDivRef} 
          style={{ 
            width: "100%", 
            height: "100%", 
            position: "absolute", 
            zIndex: 1,
            opacity: leafletLoaded ? 1 : 0,
            transition: "opacity 0.4s ease-in-out"
          }} 
        />

        {/* Concentric rings radar as Loading Placeholder */}
        {!leafletLoaded && (
          <View style={styles.radarPlaceholder}>
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

            <Text style={{ position: "absolute", bottom: 40, color: accent, fontSize: 12, fontWeight: "800", opacity: 0.75 }}>
              MEMUAT PETA INTERAKTIF...
            </Text>
          </View>
        )}

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
    overflow: "hidden",
    position: "relative",
  },
  radarPlaceholder: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
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
