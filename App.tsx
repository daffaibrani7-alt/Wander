import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, StatusBar, SafeAreaView, Platform, Animated, Dimensions } from "react-native";
import { MapScreen } from "./src/screens/MapScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { GhostModeScreen } from "./src/screens/GhostModeScreen";
import { FriendsScreen } from "./src/screens/FriendsScreen";
import { useBattery } from "./src/hooks/useBattery";
import { useLocation, GhostModeType } from "./src/hooks/useLocation";
import { MockService, FriendLocation } from "./src/services/mockService";
import { GlassCard } from "./src/components/GlassCard";
import { COLORS } from "./src/theme/colors";

const { height } = Dimensions.get("window");

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<"map" | "profile" | "ghost" | "friends">("map");
  
  // Simulation states
  const [isBatterySimulated, setIsBatterySimulated] = useState(false);
  const [simulatedBattery, setSimulatedBattery] = useState(85);
  const [simulatedCharging, setSimulatedCharging] = useState(false);
  const [isLiveFirestore, setIsLiveFirestore] = useState(false);
  
  // Custom interactive overlay notifications
  const [alertText, setAlertText] = useState<string | null>(null);
  const alertAnim = React.useRef(new Animated.Value(-100)).current;

  // Real device sensors
  const deviceBattery = useBattery();
  
  // Derived state (Simulated vs Real)
  const batteryLevel = isBatterySimulated ? simulatedBattery : deviceBattery.batteryLevel;
  const isCharging = isBatterySimulated ? simulatedCharging : deviceBattery.isCharging;

  // Location tracker
  const { location, ghostMode, setGhostMode } = useLocation("user-me", batteryLevel, isCharging);

  // Friend Location tracker
  const [friends, setFriends] = useState<FriendLocation[]>([]);

  // Initialize friends list
  useEffect(() => {
    setFriends(MockService.getFriends(location?.latitude, location?.longitude));
  }, [location]);

  // Tick simulation
  const handleTickSim = () => {
    setFriends(MockService.getFriends(location?.latitude, location?.longitude));
  };

  // Custom visual floating alert
  const triggerNotification = (text: string) => {
    setAlertText(text);
    Animated.sequence([
      Animated.spring(alertAnim, {
        toValue: 50,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }),
      Animated.delay(3500),
      Animated.timing(alertAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAlertText(null);
    });
  };

  // Developer Simulation Triggers
  const handleSimLowBattery = () => {
    setIsBatterySimulated(true);
    setSimulatedBattery(14);
    setSimulatedCharging(false);
    triggerNotification("🔋 Baterai Anda tersisa 14%. Teman Anda akan melihat status Low-Batt!");
  };

  const handleSimToggleCharging = () => {
    setIsBatterySimulated(true);
    setSimulatedCharging(prev => !prev);
    triggerNotification(!simulatedCharging ? "⚡️ Handphone Anda sedang dicas! Teman melihat ikon petir." : "🔌 Kabel cas dicabut.");
  };

  const handleSimAddFriend = () => {
    const names = ["Rian", "Dinda", "Adit", "Siti", "Fahmi", "Nadia"];
    const name = names[Math.floor(Math.random() * names.length)];
    const newFriend = MockService.addMockFriend(name);
    setFriends(prev => [...prev, newFriend]);
    triggerNotification(`🤖 Sim-Engine: Teman baru "${name}" telah ditambahkan ke peta!`);
  };

  const handleCustomAddFriend = (name: string) => {
    const newFriend = MockService.addMockFriend(name);
    setFriends(prev => [...prev, newFriend]);
  };

  const handleSimNotification = () => {
    const alerts = [
      "Bastian baru saja masuk ke mode Frozen 🥶",
      "Aria baru saja mengisi daya handphone-nya ⚡️",
      "Chloe membagikan lokasinya di mode Blurry 👻",
      "Deni mengirimkan permintaan pertemanan baru! 👥",
    ];
    const alertMsg = alerts[Math.floor(Math.random() * alerts.length)];
    triggerNotification(alertMsg);
  };

  const handleTriggerBuzz = (friendName: string) => {
    triggerNotification(`⚡️ Anda mengirim BUZZ ke ${friendName}! Layar mereka akan bergetar.`);
    setTimeout(() => {
      triggerNotification(`⚡️ ${friendName} membalas BUZZ Anda!`);
    }, 2000);
  };

  // Screen transition animator values
  const screenSlideAnim = React.useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (currentScreen !== "map") {
      Animated.spring(screenSlideAnim, {
        toValue: 0,
        tension: 35,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(screenSlideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [currentScreen]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Main Map View Backdrop */}
      <MapScreen
        location={location}
        friends={friends}
        ghostMode={ghostMode}
        onOpenProfile={() => setCurrentScreen("profile")}
        onOpenGhostMode={() => setCurrentScreen("ghost")}
        onOpenFriends={() => setCurrentScreen("friends")}
        onTriggerBuzz={handleTriggerBuzz}
        onTickSim={handleTickSim}
      />

      {/* Floating Animated Local Notifications Banner */}
      {alertText && (
        <Animated.View style={[styles.floatingAlert, { transform: [{ translateY: alertAnim }] }]}>
          <GlassCard style={styles.alertCard}>
            <Text style={styles.alertText}>{alertText}</Text>
          </GlassCard>
        </Animated.View>
      )}

      {/* Sliding Modals overlaying the map (provides outstanding Glassmorphism aesthetic) */}
      {currentScreen !== "map" && (
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              transform: [{ translateY: screenSlideAnim }],
            },
          ]}
        >
          {currentScreen === "profile" && (
            <ProfileScreen
              ghostMode={ghostMode}
              batteryLevel={batteryLevel}
              isCharging={isCharging}
              onClose={() => setCurrentScreen("map")}
              onSimLowBattery={handleSimLowBattery}
              onSimToggleCharging={handleSimToggleCharging}
              onSimAddFriend={handleSimAddFriend}
              onSimNotification={handleSimNotification}
              isLiveFirestore={isLiveFirestore}
              onToggleFirestore={setIsLiveFirestore}
            />
          )}

          {currentScreen === "ghost" && (
            <GhostModeScreen
              ghostMode={ghostMode}
              onChangeMode={(mode) => setGhostMode(mode)}
              onClose={() => setCurrentScreen("map")}
            />
          )}

          {currentScreen === "friends" && (
            <FriendsScreen
              friendsList={friends}
              onAddMockFriend={handleCustomAddFriend}
              onClose={() => setCurrentScreen("map")}
            />
          )}
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
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    backgroundColor: "#121212",
  },
  floatingAlert: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 999,
  },
  alertCard: {
    backgroundColor: "rgba(20, 20, 22, 0.92)",
    borderColor: COLORS.cyan + "35",
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  alertText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 13,
    textAlign: "center",
  },
});
