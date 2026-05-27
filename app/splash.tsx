import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useRouter } from "expo-router";
import { Compass } from "lucide-react-native";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { COLORS } from "@/shared/theme/colors";

export default function SplashScreen() {
  const router = useRouter();
  const isDark = useThemeStore((state) => state.isDark);
  const theme = COLORS.get(isDark);

  // Animation values
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Spring scaling & fade in
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 12,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Fade in text subtitle after scale completes
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    });

    // Auto transition to login screen after 3.2 seconds
    const redirectTimer = setTimeout(() => {
      router.replace("/login");
    }, 3200);

    return () => clearTimeout(redirectTimer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      >
        <Compass size={96} color={COLORS.cyan} strokeWidth={1.5} />
        <Text style={[styles.title, { color: theme.text }]}>WANDER</Text>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: textOpacity }]}>
        <Text style={[styles.footerText, { color: theme.textMuted }]}>
          Apple Style Social Radar Engine
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 8,
    marginTop: 20,
    fontFamily: "System",
  },
  footer: {
    position: "absolute",
    bottom: 50,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    fontFamily: "System",
  },
});
