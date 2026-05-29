import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import { Compass, Users, User, MessageCircle } from "lucide-react-native";
import { Platform, StyleSheet, Pressable, View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { useChatStore } from "@/features/chat/store/useChatStore";
import { COLORS } from "@/shared/theme/colors";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";

// Premium Spring Animated Tab Button Wrapper with built-in micro-haptics
function TabButton({ children, onPress, accessibilityState, ...props }: any) {
  const selected = accessibilityState?.selected;
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = selected 
      ? withSpring(1.1, { damping: 12, stiffness: 220 }) 
      : withSpring(1, { damping: 12, stiffness: 220 });
  }, [selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = (e: any) => {
    WANDER_HAPTICS.tick(); // iOS tactile tick feedback
    onPress?.(e);
  };

  return (
    <Pressable 
      onPress={handlePress} 
      style={styles.tabPressable} 
      {...props}
    >
      <Animated.View style={[styles.tabAnimatedView, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function TabLayout() {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = COLORS.get(isDark);
  const totalUnreadCount = useChatStore((state) => state.totalUnreadCount);

  const cardBorderColor = isDark
    ? "rgba(255, 255, 255, 0.12)"
    : "rgba(0, 0, 0, 0.06)";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.cyan,
        tabBarInactiveTintColor: isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 0, 0, 0.45)",
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: Platform.OS === "web" ? theme.tabBarBg : "transparent",
            borderColor: cardBorderColor,
          },
        ],
        tabBarBackground: () => (
          Platform.OS === "web" ? null : (
            <BlurView
              intensity={95}
              tint={
                Platform.OS === "ios"
                  ? isDark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"
                  : isDark ? "dark" : "light"
              }
              style={[StyleSheet.absoluteFill, styles.tabBarBlur]}
            />
          )
        ),
        tabBarLabelStyle: styles.tabLabel,
        tabBarButton: (props) => <TabButton {...props} />,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Radar",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <Compass size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
              {focused && <View style={[styles.activeDot, { backgroundColor: COLORS.cyan }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Teman",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <Users size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
              {focused && <View style={[styles.activeDot, { backgroundColor: COLORS.cyan }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <MessageCircle size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
              {focused && <View style={[styles.activeDot, { backgroundColor: COLORS.cyan }]} />}
            </View>
          ),
          tabBarBadge: totalUnreadCount > 0 ? totalUnreadCount : undefined,
          tabBarBadgeStyle: styles.chatBadge,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <User size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
              {focused && <View style={[styles.activeDot, { backgroundColor: COLORS.cyan }]} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 28 : 16,
    left: 20,
    right: 20,
    height: 66,
    borderRadius: 24,
    borderWidth: 1,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 10 : 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  tabBarBlur: {
    borderRadius: 24,
    overflow: "hidden",
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabPressable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabAnimatedView: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    position: "absolute",
    bottom: -8,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginTop: 4,
    fontFamily: "System",
  },
  chatBadge: {
    backgroundColor: COLORS.pink,
    fontSize: 9,
    fontWeight: "900",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#121216",
  },
});
