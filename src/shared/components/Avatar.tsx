/**
 * Avatar.tsx
 *
 * Upgraded, highly reusable progressive profile avatar component.
 * Implements animated opacity fades when network images finish loading.
 * Supports customizable sizes, glowing border rings, and automatic emoji/silhouette fallbacks.
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native";
import { User } from "lucide-react-native";
import { COLORS } from "@/shared/theme/colors";
import { useThemeStore } from "@/features/settings/store/useThemeStore";

interface AvatarProps {
  uri?: string | null;
  emoji?: string | null;
  size?: number;
  glowColor?: string;
  showGlow?: boolean;
}

export function Avatar({
  uri,
  emoji,
  size = 64,
  glowColor = COLORS.cyan,
  showGlow = false,
}: AvatarProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // React to URI changes to trigger proper progressive loads
  useEffect(() => {
    if (uri) {
      setLoading(true);
      setError(false);
      opacityAnim.setValue(0);
    } else {
      setLoading(false);
      setError(false);
    }
  }, [uri, opacityAnim]);

  const handleLoadSuccess = () => {
    setLoading(false);
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  };

  const handleLoadError = () => {
    setLoading(false);
    setError(true);
  };

  const containerSize = size;
  const imageSize = size - 6; // Compact spacing inside border

  const renderFallback = () => {
    const themeBg = isDark ? "#1C1C1E" : "#E5E5EA";
    const themeTextColor = isDark ? "#FFF" : "#000";

    return (
      <View
        style={[
          styles.fallbackContainer,
          {
            backgroundColor: themeBg,
            width: imageSize,
            height: imageSize,
            borderRadius: imageSize / 2,
          },
        ]}
      >
        {emoji ? (
          <Text style={[styles.emojiText, { fontSize: size * 0.42 }]}>
            {emoji}
          </Text>
        ) : (
          <User size={size * 0.42} color={themeTextColor} />
        )}
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
          borderColor: showGlow
            ? glowColor
            : isDark
            ? "rgba(255,255,255,0.12)"
            : "rgba(0,0,0,0.08)",
          borderWidth: showGlow ? 2.5 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.innerWrapper,
          {
            width: imageSize,
            height: imageSize,
            borderRadius: imageSize / 2,
          },
        ]}
      >
        {uri && !error ? (
          <>
            <Animated.Image
              source={{ uri }}
              style={[
                styles.image,
                {
                  width: imageSize,
                  height: imageSize,
                  borderRadius: imageSize / 2,
                  opacity: opacityAnim,
                },
              ]}
              onLoad={handleLoadSuccess}
              onError={handleLoadError}
            />
            {loading && (
              <View style={[StyleSheet.absoluteFill, styles.loadingWrap]}>
                <ActivityIndicator size="small" color={COLORS.cyan} />
              </View>
            )}
            {/* Show fallback behind the image while loading */}
            {loading && renderFallback()}
          </>
        ) : (
          renderFallback()
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  innerWrapper: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    position: "relative",
  },
  image: {
    resizeMode: "cover",
  },
  fallbackContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    textAlign: "center",
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    zIndex: 2,
  },
});
