/**
 * SocialOnboardingWalkthrough.tsx
 *
 * A premium, highly animated introduction walkthrough for first-time users.
 * Explains GPS permission contexts, friend location radars, and streak reward multiplier rules.
 * Uses fluid spring cards, glassmorphic filters, and Apple micro-haptic ticks.
 */
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Animated,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";
import { COLORS } from "@/shared/theme/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Step {
  id: string;
  title: string;
  emoji: string;
  subtitle: string;
  description: string;
  gradient: string[];
}

const STEPS: Step[] = [
  {
    id: "step-1",
    title: "Wander 🦊",
    emoji: "🧭",
    subtitle: "Tempat Perjalanan Menjadi Kenangan",
    description: "Selamat datang di ruang di mana langkah Anda bukan sekadar koordinat, tapi jejak kisah hidup. Mari melangkah bersama teman, menyapu kabut di peta, dan mengabadikan setiap tempat yang Anda temukan.",
    gradient: ["#FF5E62", "#FF9966"],
  },
  {
    id: "step-2",
    title: "Detak Kehadiran Teman 📍",
    emoji: "👥",
    subtitle: "Dekat Secara Emosional, Di Mana Pun Berada",
    description: "Merasa dekat tanpa terganggu. Lihat kapan teman Anda sedang bersantai di rumah, berkendara menembus lampu kota, atau terlelap dalam mimpi—semua terhubung secara anggun dan tenang.",
    gradient: ["#00F2FE", "#4FACFE"],
  },
  {
    id: "step-3",
    title: "Jejak Memori Bersama 🔥",
    emoji: "✨",
    subtitle: "Setiap Sudut Menyimpan Cerita",
    description: "Sistem memori cerdas akan mencatat momen ketika Anda mengunjungi tempat baru bersama orang terdekat. Karena tempat terbaik di dunia selalu tentang dengan siapa Anda di sana.",
    gradient: ["#F953C6", "#B91D73"],
  },
  {
    id: "step-4",
    title: "Ruang Aman Anda 🛡️",
    emoji: "🤫",
    subtitle: "Kendali Penuh Atas Privasi",
    description: "Privasi dirancang untuk kenyamanan emosional Anda. Atur Zona Sunyi (Safe Zones) atau Jam Istirahat (Invisible Hours) dengan mudah demi ketenangan penuh kapan pun Anda inginkan.",
    gradient: ["#11998e", "#38ef7d"],
  },
];

export function SocialOnboardingWalkthrough({
  isDark,
  onComplete,
}: {
  isDark: boolean;
  onComplete: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleNext = async () => {
    WANDER_HAPTICS.medium();
    
    if (currentStep >= STEPS.length - 1) {
      // Complete onboarding
      try {
        await AsyncStorage.setItem("wander_onboarding_completed", "true");
      } catch {}
      onComplete();
      return;
    }

    // Spring slide out and slide in transition
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -80,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep((prev) => prev + 1);
      slideAnim.setValue(80);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const step = STEPS[currentStep];
  const accent = step.gradient[0];

  return (
    <View style={styles.overlay}>
      <BlurView
        intensity={80}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />

      {/* Main card center container */}
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
            backgroundColor: isDark ? "rgba(22, 22, 30, 0.85)" : "rgba(255, 255, 255, 0.9)",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          },
        ]}
      >
        {/* Glowing Ambient Gradient behind Emoji */}
        <View style={[styles.ambientGlow, { backgroundColor: accent, opacity: 0.25 }]} />

        {/* Circular Emblem Emoji */}
        <View style={[styles.emblem, { borderColor: accent }]}>
          <Text style={styles.emojiText}>{step.emoji}</Text>
        </View>

        {/* Text Area */}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: isDark ? "#ffffff" : "#121216" }]}>
            {step.title}
          </Text>
          <Text style={[styles.subtitle, { color: accent }]}>
            {step.subtitle}
          </Text>
          <Text
            style={[
              styles.description,
              { color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)" },
            ]}
          >
            {step.description}
          </Text>
        </View>

        {/* Step dots indicator */}
        <View style={styles.indicatorContainer}>
          {STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === currentStep
                      ? accent
                      : isDark
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(0,0,0,0.12)",
                  width: index === currentStep ? 18 : 6,
                },
              ]}
            />
          ))}
        </View>

        {/* Premium Action Snappy button */}
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: accent,
              transform: [{ scale: pressed ? 0.96 : 1.0 }],
            },
          ]}
        >
          <Text style={styles.buttonText}>
            {currentStep === STEPS.length - 1 ? "Mulai Penjelajahan! 🧭" : "Lanjutkan"}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999, // Ensure onboarding overlay is strictly on top of map
  },
  container: {
    width: SCREEN_WIDTH * 0.88,
    borderRadius: 32,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 12,
  },
  ambientGlow: {
    position: "absolute",
    top: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    filter: "blur(40px)",
  },
  emblem: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(18, 18, 22, 0.95)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 10,
  },
  emojiText: {
    fontSize: 44,
  },
  textContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 12,
    fontWeight: "500",
    paddingHorizontal: 8,
  },
  indicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  button: {
    width: "100%",
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
