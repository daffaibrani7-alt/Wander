import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, StyleSheet } from "react-native";
import "../src/services/locationService";
import { useThemeStore } from "../src/store/useThemeStore";
import { useAuthStore } from "../src/store/useAuthStore";
import { COLORS } from "../src/theme/colors";

export default function RootLayout() {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = COLORS.get(isDark);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  // Initialize Firebase auth listener on mount
  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => unsubscribe();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDark ? "light" : "dark"} animated />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade_from_bottom",
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="splash" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
