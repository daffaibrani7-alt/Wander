import React from "react";
import { Tabs } from "expo-router";
import { Compass, Users, User } from "lucide-react-native";
import { Platform, StyleSheet } from "react-native";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { COLORS } from "@/shared/theme/colors";

export default function TabLayout() {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = COLORS.get(isDark);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.cyan,
        tabBarInactiveTintColor: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: theme.tabBarBg,
            borderTopColor: theme.cardBorder,
          },
        ],
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Radar",
          tabBarIcon: ({ color, size }) => <Compass size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Teman",
          tabBarIcon: ({ color, size }) => <Users size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <User size={22} color={color} strokeWidth={2} />,
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
    height: 64,
    borderRadius: 24,
    borderWidth: 1,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 8 : 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      },
    }),
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
    fontFamily: "System",
  },
});
