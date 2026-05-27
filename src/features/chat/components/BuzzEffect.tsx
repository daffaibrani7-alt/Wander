/**
 * BuzzEffect.tsx
 *
 * Full-screen buzz animation overlay that triggers when a buzz message is received.
 * Features radial pulse, screen shake, and haptic feedback.
 * Auto-dismisses after 1.5 seconds with fade-out.
 */
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { COLORS } from "@/shared/theme/colors";
import { TYPOGRAPHY } from "@/shared/theme/typography";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";
import type { BuzzIntensity } from "@/features/chat/types/types";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface BuzzEffectProps {
  visible: boolean;
  intensity?: BuzzIntensity;
  senderName?: string;
  onDismiss: () => void;
}

export function BuzzEffect({
  visible,
  intensity = "normal",
  senderName,
  onDismiss,
}: BuzzEffectProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(0.3)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    // Fire haptics based on intensity
    if (intensity === "urgent") {
      WANDER_HAPTICS.heavy();
      setTimeout(() => WANDER_HAPTICS.heavy(), 200);
      setTimeout(() => WANDER_HAPTICS.heavy(), 400);
    } else if (intensity === "gentle") {
      WANDER_HAPTICS.medium();
    } else {
      WANDER_HAPTICS.heavy();
      setTimeout(() => WANDER_HAPTICS.medium(), 250);
    }

    // Shake speed based on intensity
    const shakeDuration = intensity === "urgent" ? 40 : intensity === "gentle" ? 80 : 60;
    const shakeDistance = intensity === "urgent" ? 12 : intensity === "gentle" ? 4 : 8;

    // Animate in
    Animated.parallel([
      // Fade in
      Animated.timing(opacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      // Pulse expansion
      Animated.spring(pulseScale, {
        toValue: 1.5,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }),
      // Icon pop
      Animated.spring(iconScale, {
        toValue: 1,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }),
      // Screen shake
      Animated.sequence([
        ...Array.from({ length: 6 }).flatMap(() => [
          Animated.timing(shakeX, {
            toValue: shakeDistance,
            duration: shakeDuration,
            useNativeDriver: true,
          }),
          Animated.timing(shakeX, {
            toValue: -shakeDistance,
            duration: shakeDuration,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(shakeX, {
          toValue: 0,
          duration: shakeDuration,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Auto-dismiss
    const dismissTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Reset values
        pulseScale.setValue(0.3);
        shakeX.setValue(0);
        iconScale.setValue(0);
        onDismiss();
      });
    }, 1500);

    return () => clearTimeout(dismissTimer);
  }, [visible, intensity, onDismiss, opacity, pulseScale, shakeX, iconScale]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity,
          transform: [{ translateX: shakeX }],
        },
      ]}
      pointerEvents="none"
    >
      {/* Radial pulse */}
      <Animated.View
        style={[
          styles.pulse,
          {
            transform: [{ scale: pulseScale }],
          },
        ]}
      />

      {/* Center content */}
      <Animated.View
        style={[
          styles.centerContent,
          { transform: [{ scale: iconScale }] },
        ]}
      >
        <Text style={styles.buzzIcon}>⚡</Text>
        <Text style={styles.buzzLabel}>BUZZ</Text>
        {senderName && (
          <Text style={styles.senderLabel}>from {senderName}</Text>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(138, 63, 252, 0.15)",
    zIndex: 9999,
  },
  pulse: {
    position: "absolute",
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    backgroundColor: "rgba(138, 63, 252, 0.12)",
    borderWidth: 2,
    borderColor: "rgba(138, 63, 252, 0.3)",
  },
  centerContent: {
    alignItems: "center",
    gap: 4,
  },
  buzzIcon: {
    fontSize: 64,
  },
  buzzLabel: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: TYPOGRAPHY.letterSpacings.widest,
  },
  senderLabel: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginTop: 4,
  },
});
