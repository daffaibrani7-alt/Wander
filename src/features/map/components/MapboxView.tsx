/**
 * MapboxView.tsx  ← dipakai di web
 *
 * Full interactive Leaflet & OpenStreetMap preview pada Web Platform.
 * Menghadirkan peta riil premium CartoDB Dark/Light Matter gratis tanpa token!
 *
 * Performance optimizations:
 *  - Per-marker HTML string cache: setIcon() only called when HTML actually changed
 *  - Dependency array narrowed: marker effect uses refs to avoid running on
 *    unrelated parent re-renders
 *  - setInterval cleanup always returned (no conditional leak)
 */
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
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

// Custom HTML for Leaflet markers matching high-fidelity MapMarker design
function createMarkerHtml(
  avatarEmoji: string,
  photoURL: string | null,
  displayName: string,
  batteryLevel: number,
  isCharging: boolean,
  ghostMode: "precise" | "blurry" | "frozen",
  isMe: boolean,
  activity?: "online" | "idle" | "driving" | "sleeping" | "walking" | "traveling" | "home" | "work" | "school" | "cafe",
  geofence?: "home" | "work" | "school" | "cafe" | "custom" | null
): string {
  // Determine dynamic border colors matching native MapMarker.tsx
  let accentColor = isMe ? COLORS.cyan : "#2BE080";
  if (!isMe) {
    if (ghostMode === "frozen") accentColor = "#8A3FFC";
    else if (ghostMode === "blurry") accentColor = "#FF5B99";
    else if (activity === "driving") accentColor = "#FF8A00";
    else if (activity === "sleeping") accentColor = "#8A3FFC";
    else if (activity === "walking") accentColor = "#FF5B99";
    else if (activity === "traveling") accentColor = "#00F0FF";
  }

  const glowShadow = `0 0 15px ${accentColor}`;

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
        overflow: hidden;
      ">
        ${photoURL ? `
          <img src="${photoURL}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
          <span style="font-size: 22px; display: none;">${avatarEmoji}</span>
        ` : `
          <span style="font-size: 22px;">${avatarEmoji}</span>
        `}
        
        <!-- Activity / Geofence Status Badge -->
        ${(geofence || (activity && activity !== "online")) ? `
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
            ${geofence === "home" || activity === "home" ? "🏡" : ""}
            ${geofence === "work" || activity === "work" ? "💼" : ""}
            ${geofence === "school" || activity === "school" ? "🏫" : ""}
            ${geofence === "cafe" || activity === "cafe" ? "☕" : ""}
            ${!geofence && activity === "driving" ? "🚗" : ""}
            ${!geofence && activity === "walking" ? "🚶" : ""}
            ${!geofence && activity === "sleeping" ? "😴" : ""}
            ${!geofence && activity === "traveling" ? "✈️" : ""}
            ${!geofence && activity === "idle" ? "⏳" : ""}
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

// Custom HTML for Leaflet cluster markers displaying Zenly-style overlapping friend emojis
function createClusterMarkerHtml(friends: FriendLocation[]): string {
  const friendCount = friends.length;
  const displayedEmojis = friends.slice(0, 3).map((f) => f.avatarEmoji);
  const accentColor = "#2BE080"; // Glowing emerald neon border for clusters
  const glowShadow = `0 0 15px ${accentColor}`;

  // Overlap stacking style with incremental margin offsets
  const emojiBlocks = displayedEmojis
    .map((emoji, index) => {
      const offset = index * -10; // overlap 10px
      return `<span style="font-size: 20px; margin-left: ${index > 0 ? `${offset}px` : "0px"}; z-index: ${3 - index}; position: relative; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${emoji}</span>`;
    })
    .join("");

  return `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; user-select: none;">
      <!-- Glowing avatar cluster container -->
      <div style="
        height: 44px;
        padding: 0 14px;
        border-radius: 22px;
        background: rgba(18, 18, 22, 0.95);
        border: 2px solid ${accentColor};
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: ${glowShadow};
        position: relative;
      ">
        <!-- Stack of emojis -->
        <div style="display: flex; align-items: center; justify-content: center;">
          ${emojiBlocks}
        </div>
        
        <!-- Corner Count Badge -->
        <div style="
          position: absolute;
          top: -6px;
          right: -6px;
          background: #ff5b99;
          border: 1px solid rgba(255,255,255,0.2);
          padding: 1px 5px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        ">
          <span style="font-size: 8px; font-weight: 900; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            +${friendCount}
          </span>
        </div>
      </div>
      
      <!-- Summary name tag -->
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
          ${friends.slice(0, 2).map((f) => f.displayName).join(" & ")}${friendCount > 2 ? ` +${friendCount - 2}` : ""}
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
    const [leafletLoaded, setLeafletLoaded] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(14);
    const mapRef = useRef<any>(null);
    const mapDivRef = useRef<HTMLDivElement>(null);
    const markersRef = useRef<{ [key: string]: any }>({});
    // Cache of last-rendered HTML per marker key — only call setIcon when it changes
    const markerHtmlCacheRef = useRef<{ [key: string]: string }>({});
    const explorationLayersRef = useRef<any[]>([]);

    // Store latest props in refs so marker effect can use them without re-running
    const latestPropsRef = useRef({
      latitude, longitude, friends, userProfile,
      userBatteryLevel, userIsCharging, userGhostMode, userActivity, userGeofence,
    });
    useEffect(() => {
      latestPropsRef.current = {
        latitude, longitude, friends, userProfile,
        userBatteryLevel, userIsCharging, userGhostMode, userActivity, userGeofence,
      };
    });

    // Expose flyTo ref method
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

      // Inject override styles for divIcon custom rendering
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
      let checkInterval: ReturnType<typeof setInterval> | null = null;

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
        // Script tag exists but may still be loading — poll until L is available
        checkInterval = setInterval(() => {
          if ((window as any).L) {
            if (checkInterval) clearInterval(checkInterval);
            setLeafletLoaded(true);
          }
        }, 100);
      }

      // Always return cleanup (fixes conditional leak)
      return () => {
        if (checkInterval) clearInterval(checkInterval);
      };
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
        markerHtmlCacheRef.current = {};
      }

      const { latitude: lat, longitude: lng } = latestPropsRef.current;

      // Initialize Leaflet Map
      const map = L.map(mapDivRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([lat, lng], 14);

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

      // Bind dynamic click listener for map pick mode
      map.on("click", (e: any) => {
        if (onMapPress) {
          onMapPress({ latitude: e.latlng.lat, longitude: e.latlng.lng });
        }
      });

      // Synchronize zoom level reactively
      map.on("zoomend", () => {
        setZoomLevel(map.getZoom());
      });

      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          markersRef.current = {};
          markerHtmlCacheRef.current = {};
        }
      };
    }, [leafletLoaded, isDark]); // eslint-disable-line react-hooks/exhaustive-deps

    // 3. Keep camera centred when followUser is active
    useEffect(() => {
      if (!mapRef.current || !followUser) return;
      mapRef.current.panTo([latitude, longitude], { animate: true, duration: 0.8 });
    }, [latitude, longitude, followUser]);

    // 4. Render user and friend markers — only update individual markers whose HTML changed
    useEffect(() => {
      if (!leafletLoaded || !mapRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      const currentMarkers = markersRef.current;
      const htmlCache = markerHtmlCacheRef.current;
      const activeKeys = new Set<string>();

      const {
        latitude: lat,
        longitude: lng,
        friends: currentFriends,
        userProfile: profile,
        userBatteryLevel: battLvl,
        userIsCharging: charging,
        userGhostMode: ghostMode,
        userActivity: activity,
        userGeofence: geofence,
      } = latestPropsRef.current;

      // 4a. User Marker (Me)
      const meKey = "user-me";
      activeKeys.add(meKey);

      const meHtml = createMarkerHtml(
        profile?.statusEmoji || profile?.avatarEmoji || "🦊",
        profile?.photoURL || null,
        profile?.displayName || "Saya",
        battLvl,
        charging,
        ghostMode,
        true,
        activity,
        geofence
      );

      if (currentMarkers[meKey]) {
        currentMarkers[meKey].setLatLng([lat, lng]);
        // Only rebuild icon if HTML actually changed
        if (htmlCache[meKey] !== meHtml) {
          htmlCache[meKey] = meHtml;
          currentMarkers[meKey].setIcon(
            L.divIcon({ html: meHtml, className: "custom-leaflet-marker", iconSize: [60, 80], iconAnchor: [30, 60] })
          );
        }
      } else {
        htmlCache[meKey] = meHtml;
        currentMarkers[meKey] = L.marker([lat, lng], {
          icon: L.divIcon({ html: meHtml, className: "custom-leaflet-marker", iconSize: [60, 80], iconAnchor: [30, 60] }),
        }).addTo(mapRef.current);
      }

      // 4b. Friend Markers & Clusters
      if (currentFriends) {
        const clusteredNodes = getClusteredNodes(currentFriends, zoomLevel);
        const bounds = mapRef.current.getBounds();
        const paddedBounds = bounds.pad(0.1); // 10% padding for smooth reveal on drag

        clusteredNodes.forEach((node) => {
          const nodeKey = node.isCluster ? `cluster-${node.id}` : `friend-${node.id}`;

          // VIEWPORT CULLING: Skip markers that are outside the padded bounds
          const isWithinViewport = paddedBounds.contains([node.latitude, node.longitude]);
          if (!isWithinViewport) {
            if (currentMarkers[nodeKey]) {
              currentMarkers[nodeKey].remove();
              delete currentMarkers[nodeKey];
              delete htmlCache[nodeKey];
            }
            return;
          }

          activeKeys.add(nodeKey);

          const fHtml = node.isCluster
            ? createClusterMarkerHtml(node.friends)
            : createMarkerHtml(
                node.friends[0].avatarEmoji,
                node.friends[0].avatarUrl || null,
                node.friends[0].displayName,
                node.friends[0].batteryLevel,
                node.friends[0].isCharging,
                node.friends[0].ghostMode,
                false,
                node.friends[0].activity,
                node.friends[0].geofence
              );

          const iconSize: [number, number] = node.isCluster ? [100, 80] : [60, 80];
          const iconAnchor: [number, number] = node.isCluster ? [50, 60] : [30, 60];

          if (currentMarkers[nodeKey]) {
            currentMarkers[nodeKey].setLatLng([node.latitude, node.longitude]);
            // Only rebuild icon HTML if it actually changed
            if (htmlCache[nodeKey] !== fHtml) {
              htmlCache[nodeKey] = fHtml;
              currentMarkers[nodeKey].setIcon(
                L.divIcon({ html: fHtml, className: "custom-leaflet-marker", iconSize, iconAnchor })
              );
            }
          } else {
            htmlCache[nodeKey] = fHtml;
            const newMarker = L.marker([node.latitude, node.longitude], {
              icon: L.divIcon({ html: fHtml, className: "custom-leaflet-marker", iconSize, iconAnchor }),
            }).addTo(mapRef.current);

            // Bind click handler for cluster zoom in expansion
            if (node.isCluster) {
              newMarker.on("click", () => {
                Haptics.selectionAsync().catch(() => {});
                mapRef.current.setView([node.latitude, node.longitude], Math.min(17, zoomLevel + 2), { animate: true });
              });
            }

            currentMarkers[nodeKey] = newMarker;
          }
        });
      }

      // 4c. Clean up removed friends / markers
      Object.keys(currentMarkers).forEach((key) => {
        if (!activeKeys.has(key)) {
          currentMarkers[key].remove();
          delete currentMarkers[key];
          delete htmlCache[key];
        }
      });
    }, [leafletLoaded, latitude, longitude, friends, userProfile, userBatteryLevel, userIsCharging, userGhostMode, zoomLevel]);

    // ─── EFFECT #5: EXPLORATION MODE TILES & FOG OVERLAYS ──────────────────
    const isExplorationActive = useExplorationStore((s) => s.isExplorationActive);
    const exploredFrequencies = useGamificationStore((s) => s.exploredFrequencies);
    const exploredTilesArray = useExplorationStore((s) => s.exploredTilesArray);

    useEffect(() => {
      if (!leafletLoaded || !mapRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      // Clean up previous overlay grids
      explorationLayersRef.current.forEach((layer) => layer.remove());
      explorationLayersRef.current = [];

      // Toggle CSS Grayscale / Fog-of-World styling class on map wrapper
      if (mapDivRef.current) {
        if (isExplorationActive) {
          mapDivRef.current.classList.add("exploration-active");
        } else {
          mapDivRef.current.classList.remove("exploration-active");
        }
      }

      if (!isExplorationActive) return;

      // Draw explored tiles dynamically bounded to current viewport to optimize frame rate
      const drawTiles = () => {
        if (!mapRef.current || !L) return;

        // Clear old rectangles
        explorationLayersRef.current.forEach((layer) => layer.remove());
        explorationLayersRef.current = [];

        const bounds = mapRef.current.getBounds();
        const paddedBounds = bounds.pad(0.2); // slight padding for smooth pan reveals

        // Use exploredFrequencies keys to render heat intensity
        const tileKeys = Object.keys(exploredFrequencies);
        const activeKeys = tileKeys.length > 0 ? tileKeys : exploredTilesArray;

        activeKeys.forEach((tileKey) => {
          const [latIdxStr, lngIdxStr] = tileKey.split("_");
          const latIdx = parseInt(latIdxStr, 10);
          const lngIdx = parseInt(lngIdxStr, 10);

          const minLat = latIdx * TILE_SIZE;
          const minLng = lngIdx * TILE_SIZE;
          const maxLat = (latIdx + 1) * TILE_SIZE;
          const maxLng = (lngIdx + 1) * TILE_SIZE;

          const rectBounds = L.latLngBounds([minLat, minLng], [maxLat, maxLng]);

          if (paddedBounds.intersects(rectBounds)) {
            const freq = exploredFrequencies[tileKey] || 1;
            const cosmetic = useGamificationStore.getState().equippedCosmetic;
            
            let baseColor = "#2BE080"; // neon_cyan (emerald glowing)
            if (cosmetic === "sunset_orange") {
              baseColor = "#FF8A00";
            } else if (cosmetic === "cyber_purple") {
              baseColor = "#8A3FFC";
            }

            let strokeColor = baseColor;
            let fillColor = baseColor;
            let opacity = 0.55;
            let fillOpacity = 0.22;
            let weight = 1.0;
            let cellClass = "unlocked-grid-cell-cold";

            if (freq >= 2 && freq <= 4) {
              strokeColor = baseColor;
              fillColor = baseColor;
              opacity = 0.75;
              fillOpacity = 0.48;
              weight = 1.8;
              cellClass = "unlocked-grid-cell-warm";
            } else if (freq >= 5) {
              strokeColor = baseColor;
              fillColor = baseColor;
              opacity = 0.95;
              fillOpacity = 0.84;
              weight = 2.8;
              cellClass = "unlocked-grid-cell-hot";
            }

            const rect = L.rectangle(rectBounds, {
              color: strokeColor,
              weight: weight,
              opacity: opacity,
              fillColor: fillColor,
              fillOpacity: fillOpacity,
              className: cellClass,
            }).addTo(mapRef.current);
            
            explorationLayersRef.current.push(rect);
          }
        });
      };

      // Initial draw
      drawTiles();

      // Draw updates reactively on pan / zoom end to prevent performance lag
      mapRef.current.on("moveend", drawTiles);

      return () => {
        if (mapRef.current) {
          mapRef.current.off("moveend", drawTiles);
        }
        explorationLayersRef.current.forEach((layer) => layer.remove());
        explorationLayersRef.current = [];
      };
    }, [leafletLoaded, isExplorationActive, exploredFrequencies, exploredTilesArray]);

    // ─── EFFECT #6: JOURNEY REPLAY POLYLINE + PULSING BEACON ────────────────
    const isReplaying = useExplorationStore((s) => s.isReplaying);
    const replayCoordinates = useExplorationStore((s) => s.replayCoordinates);
    const replayLayersRef = useRef<any[]>([]);

    useEffect(() => {
      if (!leafletLoaded || !mapRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      // Clean up previous replay layers
      replayLayersRef.current.forEach((layer) => layer.remove());
      replayLayersRef.current = [];

      if (!isReplaying || replayCoordinates.length < 2) return;

      // Draw glowing polyline
      const latlngs = replayCoordinates.map((c: ReplayCoordinate) => [c.latitude, c.longitude]);
      const polyline = L.polyline(latlngs, {
        color: "#8A3FFC",
        weight: 3.5,
        opacity: 0.9,
        lineJoin: "round",
        lineCap: "round",
        className: "replay-polyline",
      }).addTo(mapRef.current);
      replayLayersRef.current.push(polyline);

      // Draw start marker (green dot)
      const startCoord = replayCoordinates[0];
      const startMarker = L.circleMarker([startCoord.latitude, startCoord.longitude], {
        radius: 6,
        color: "#2BE080",
        fillColor: "#2BE080",
        fillOpacity: 1,
        weight: 2,
      }).addTo(mapRef.current);
      replayLayersRef.current.push(startMarker);

      // Draw pulsing beacon at the head (last point)
      const headCoord = replayCoordinates[replayCoordinates.length - 1];
      const beaconHtml = `
        <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
          <div style="
            position:absolute;
            width:20px;height:20px;
            border-radius:50%;
            background:rgba(138,63,252,0.35);
            animation:replayPulse 1.4s ease-out infinite;
          "></div>
          <div style="
            width:10px;height:10px;
            border-radius:50%;
            background:#8A3FFC;
            border:2px solid #fff;
            box-shadow:0 0 8px #8A3FFC;
          "></div>
        </div>
      `;
      const beacon = L.marker([headCoord.latitude, headCoord.longitude], {
        icon: L.divIcon({ html: beaconHtml, className: "replay-beacon", iconSize: [20, 20], iconAnchor: [10, 10] }),
      }).addTo(mapRef.current);
      replayLayersRef.current.push(beacon);

      // Fly to replay path - fit bounds on start, panTo on increment updates
      if (replayCoordinates.length <= 2) {
        mapRef.current.setView([headCoord.latitude, headCoord.longitude], 16, { animate: true, duration: 0.8 });
      } else {
        mapRef.current.panTo([headCoord.latitude, headCoord.longitude], { animate: true, duration: 0.35 });
      }

      return () => {
        replayLayersRef.current.forEach((layer) => layer.remove());
        replayLayersRef.current = [];
      };
    }, [leafletLoaded, isReplaying, replayCoordinates]);

    // Concentric-ring radar placeholder while Leaflet assets are downloading from CDN
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
    }, [leafletLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

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
        {/* Custom CSS for Exploration Fog of World and neon glows */}
        <style>
          {`
            .exploration-active .leaflet-tile-container img {
              filter: grayscale(100%) brightness(35%) contrast(110%) !important;
              transition: filter 0.6s ease-in-out;
            }
            .unlocked-grid-cell-cold {
              filter: drop-shadow(0 0 1px #2BE080);
              transition: opacity 0.4s ease-in-out;
            }
            .unlocked-grid-cell-warm {
              filter: drop-shadow(0 0 3px #2BE080);
              transition: opacity 0.4s ease-in-out;
            }
            .unlocked-grid-cell-hot {
              filter: drop-shadow(0 0 7px #2BE080);
              transition: opacity 0.4s ease-in-out;
            }
            .replay-polyline {
              filter: drop-shadow(0 0 4px #8A3FFC);
            }
            .replay-beacon {
              background: transparent !important;
              border: none !important;
            }
            @keyframes replayPulse {
              0%   { transform: scale(0.6); opacity: 0.85; }
              100% { transform: scale(2.6); opacity: 0; }
            }
          `}
        </style>
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
