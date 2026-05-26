import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Animated,
  Image,
  Alert,
  Platform,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { User, Users, Shield, Compass, Navigation, Zap, MessageCircle } from "lucide-react-native";
import { COLORS } from "../theme/colors";
import { GlassCard } from "../components/GlassCard";
import { IconButton } from "../components/IconButton";
import { MapMarker } from "../components/MapMarker";
import { FriendLocation } from "../services/mockService";
import { GhostModeType } from "../hooks/useLocation";

interface MapScreenProps {
  location: any;
  friends: FriendLocation[];
  ghostMode: GhostModeType;
  onOpenProfile: () => void;
  onOpenGhostMode: () => void;
  onOpenFriends: () => void;
  onTriggerBuzz: (friendName: string) => void;
  onTickSim: () => void;
}

const { width, height } = Dimensions.get("window");

export function MapScreen({
  location,
  friends,
  ghostMode,
  onOpenProfile,
  onOpenGhostMode,
  onOpenFriends,
  onTriggerBuzz,
  onTickSim,
}: MapScreenProps) {
  const mapRef = useRef<MapView>(null);
  const [selectedFriend, setSelectedFriend] = useState<FriendLocation | null>(null);
  
  // Animation value for bottom sheet
  const slideAnim = useRef(new Animated.Value(height)).current;
  // Radar wave scale for Web Fallback
  const radarAnim = useRef(new Animated.Value(1)).current;

  // Sync simulation updates every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      onTickSim();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Web Fallback Radar animation
  useEffect(() => {
    if (Platform.OS === "web") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(radarAnim, {
            toValue: 2,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(radarAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, []);

  // Slide up panel when a friend is selected
  const handleSelectFriend = (friend: FriendLocation) => {
    setSelectedFriend(friend);
    
    // Zoom map to friend location
    if (mapRef.current && friend.latitude && friend.longitude) {
      mapRef.current.animateToRegion({
        latitude: friend.latitude - 0.003, // slight offset to leave space for bottom card
        longitude: friend.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 1000);
    }

    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 30,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleClosePanel = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setSelectedFriend(null);
    });
  };

  const zoomToUser = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude - 0.002,
        longitude: location.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }, 1000);
    }
  };

  // Custom styling JSON to give the maps a very modern dark Zenly look
  const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#1A1A1E" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1A1A1E" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#74747A" }] },
    { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#2E2E33" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#8E8E93" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1C241E" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#2C2C30" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1A1A1E" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3C3C42" }] },
    { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4E4E54" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0D1821" }] },
  ];

  // Render Web-friendly Animated Radar Map Fallback
  const renderWebFallback = () => {
    const userX = width / 2;
    const userY = height / 2.3;

    return (
      <View style={styles.webContainer}>
        {/* Animated radar rings representing mapping space */}
        <Animated.View 
          style={[
            styles.radarWave, 
            { 
              transform: [{ scale: radarAnim }],
              opacity: radarAnim.interpolate({ inputRange: [1, 2], outputRange: [0.6, 0] })
            }
          ]} 
        />
        <View style={[styles.radarGridRing, { width: 220, height: 220 }]} />
        <View style={[styles.radarGridRing, { width: 440, height: 440 }]} />
        <View style={styles.gridLineH} />
        <View style={styles.gridLineV} />

        <View style={styles.webHelpTextCard}>
          <Text style={styles.webHelpTitle}>Interactive Web Map HUD 📡</Text>
          <Text style={styles.webHelpDesc}>
            Menampilkan visualisasi lokasi teman di simulator web.
          </Text>
        </View>

        {/* User Marker Center */}
        <View style={[styles.fallbackMarker, { left: userX - 25, top: userY - 30 }]}>
          <MapMarker
            displayName="Me"
            avatarUrl=""
            avatarEmoji="🦊"
            batteryLevel={98}
            isCharging={false}
            ghostMode={ghostMode}
            isMe={true}
          />
        </View>

        {/* Friends Markers mapped relative to center */}
        {friends.map((friend) => {
          // Calculate arbitrary visual offsets for mock rendering
          let offsetLat = -0.004;
          let offsetLng = 0.004;
          if (location && friend.latitude) {
            offsetLat = (friend.latitude - location.latitude) * 15000;
            offsetLng = (friend.longitude - location.longitude) * 15000;
          } else {
            if (friend.uid === "sim-1") { offsetLat = -80; offsetLng = 100; }
            if (friend.uid === "sim-2") { offsetLat = 120; offsetLng = -120; }
            if (friend.uid === "sim-3") { offsetLat = 40; offsetLng = 140; }
          }

          const left = userX - 25 + offsetLng;
          const top = userY - 30 - offsetLat; // latitude goes north (negative pixel Y)

          return (
            <Pressable
              key={friend.uid}
              onPress={() => handleSelectFriend(friend)}
              style={[styles.fallbackMarker, { left, top }]}
            >
              <MapMarker
                displayName={friend.displayName}
                avatarUrl={friend.avatarUrl}
                avatarEmoji={friend.avatarEmoji}
                batteryLevel={friend.batteryLevel}
                isCharging={friend.isCharging}
                ghostMode={friend.ghostMode}
              />
            </Pressable>
          );
        })}
      </View>
    );
  };

  const isWeb = Platform.OS === "web";

  return (
    <View style={styles.container}>
      {/* 1. Map View (Native or Web Fallback) */}
      {isWeb ? (
        renderWebFallback()
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          customMapStyle={darkMapStyle}
          initialRegion={{
            latitude: location ? location.latitude - 0.001 : -6.2088,
            longitude: location ? location.longitude : 106.8456,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }}
          showsUserLocation={false}
        >
          {/* User Marker */}
          {location && (
            <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }}>
              <MapMarker
                displayName="Me"
                avatarUrl=""
                avatarEmoji="🦊"
                batteryLevel={98}
                isCharging={false}
                ghostMode={ghostMode}
                isMe={true}
              />
            </Marker>
          )}

          {/* Friends Markers */}
          {friends.map((friend) => (
            <Marker
              key={friend.uid}
              coordinate={{ latitude: friend.latitude, longitude: friend.longitude }}
              onPress={() => handleSelectFriend(friend)}
            >
              <MapMarker
                displayName={friend.displayName}
                avatarUrl={friend.avatarUrl}
                avatarEmoji={friend.avatarEmoji}
                batteryLevel={friend.batteryLevel}
                isCharging={friend.isCharging}
                ghostMode={friend.ghostMode}
              />
            </Marker>
          ))}
        </MapView>
      )}

      {/* 2. Floating Top Search Card */}
      <View style={styles.topContainer}>
        <GlassCard style={styles.searchHeader}>
          <Pressable style={styles.searchInner} onPress={onOpenFriends}>
            <View style={[styles.searchActiveCircle, { backgroundColor: COLORS.green }]} />
            <Text style={styles.searchText}>Cari atau tambahkan teman...</Text>
          </Pressable>
        </GlassCard>
      </View>

      {/* 3. Floating Sidebar Control Buttons */}
      <View style={styles.sidebarContainer}>
        <IconButton
          icon={<User size={22} color="#FFF" />}
          onPress={onOpenProfile}
          style={styles.sidebarBtn}
        />
        <IconButton
          icon={<Shield size={22} color={ghostMode !== "precise" ? COLORS.pink : "#FFF"} />}
          onPress={onOpenGhostMode}
          style={styles.sidebarBtn}
        />
        <IconButton
          icon={<Users size={22} color="#FFF" />}
          onPress={onOpenFriends}
          style={styles.sidebarBtn}
        />
        {!isWeb && (
          <IconButton
            icon={<Compass size={22} color="#FFF" />}
            onPress={zoomToUser}
            style={styles.sidebarBtn}
          />
        )}
      </View>

      {/* 4. Sliding Bottom Sheet Card (Clicked Friend Details) */}
      {selectedFriend && (
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <GlassCard style={styles.detailCard}>
            {/* Drag Handle Indicator */}
            <Pressable onPress={handleClosePanel} style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </Pressable>

            {/* Friend Details Content */}
            <View style={styles.cardInfoRow}>
              <Image source={{ uri: selectedFriend.avatarUrl }} style={styles.detailAvatar} />
              <View style={styles.detailMeta}>
                <View style={styles.nameRow}>
                  <Text style={styles.detailName}>{selectedFriend.displayName}</Text>
                  <Text style={styles.detailVibe}>{selectedFriend.avatarEmoji}</Text>
                </View>
                <Text style={styles.detailDistance}>
                  📍 Jarak: {selectedFriend.distanceText || "Menghitung..."}
                </Text>
                <Text style={styles.detailUpdate}>
                  🕒 Status: {selectedFriend.statusText || "Aktif"}
                </Text>
              </View>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => {
                  onTriggerBuzz(selectedFriend.displayName);
                  handleClosePanel();
                }}
                style={[styles.actionBtn, { backgroundColor: COLORS.yellow }]}
              >
                <Zap size={18} color="#000" fill="#000" />
                <Text style={[styles.actionText, { color: "#000" }]}>Buzz ⚡️</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  Alert.alert("Fitur Chat", `Membuka ruang obrolan dengan ${selectedFriend.displayName}...`);
                  handleClosePanel();
                }}
                style={[styles.actionBtn, { backgroundColor: "rgba(255,255,255,0.08)" }]}
              >
                <MessageCircle size={18} color="#FFF" />
                <Text style={styles.actionText}>Chat</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  Alert.alert("Navigasi", `Merutekan perjalanan ke lokasi ${selectedFriend.displayName}...`);
                  handleClosePanel();
                }}
                style={[styles.actionBtn, { backgroundColor: "rgba(255,255,255,0.08)" }]}
              >
                <Navigation size={18} color="#FFF" />
                <Text style={styles.actionText}>Rute</Text>
              </Pressable>
            </View>
          </GlassCard>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  map: {
    width: width,
    height: height,
  },
  topContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    zIndex: 99,
  },
  searchHeader: {
    padding: 14,
    borderRadius: 20,
  },
  searchInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchActiveCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  searchText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    fontWeight: "600",
  },
  sidebarContainer: {
    position: "absolute",
    right: 20,
    top: 130,
    zIndex: 99,
    alignItems: "center",
  },
  sidebarBtn: {
    marginBottom: 16,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  detailCard: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderRadius: 28,
  },
  dragHandleContainer: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 10,
  },
  dragHandle: {
    width: 40,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  cardInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  detailAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2C2C2E",
  },
  detailMeta: {
    marginLeft: 16,
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFF",
  },
  detailVibe: {
    marginLeft: 6,
    fontSize: 16,
  },
  detailDistance: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
    fontWeight: "700",
  },
  detailUpdate: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    marginTop: 3,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    borderRadius: 14,
    width: "31%",
  },
  actionText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 12,
    marginLeft: 6,
  },
  
  // Web Fallback styles
  webContainer: {
    width: width,
    height: height,
    backgroundColor: "#0D0D10",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  radarWave: {
    position: "absolute",
    width: 440,
    height: 440,
    borderRadius: 220,
    borderWidth: 2,
    borderColor: "rgba(0, 240, 255, 0.15)",
  },
  radarGridRing: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  gridLineH: {
    position: "absolute",
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  gridLineV: {
    position: "absolute",
    height: "100%",
    width: 1,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  webHelpTextCard: {
    position: "absolute",
    top: 130,
    left: 20,
    backgroundColor: "rgba(24, 24, 27, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 10,
    maxWidth: 240,
  },
  webHelpTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: COLORS.cyan,
  },
  webHelpDesc: {
    fontSize: 9,
    color: "rgba(255,255,255,0.4)",
    marginTop: 4,
  },
  fallbackMarker: {
    position: "absolute",
    zIndex: 10,
  },
});
export default MapScreen;
