import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, StyleSheet } from "react-native";
import "@/features/map/services/locationService";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { COLORS } from "@/shared/theme/colors";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";

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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
