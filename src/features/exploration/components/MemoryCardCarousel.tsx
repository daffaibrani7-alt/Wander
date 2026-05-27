/**
 * MemoryCardCarousel.tsx
 *
 * A premium, Apple Photos inspired parallax memory card carousel UI.
 * Integrates directly with useMemoryStore for dynamic spatial recaps.
 * Uses micro-haptics and fluid gesture snapping for ultimate premium feel.
 */
import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useMemoryStore, MemoryCard } from "@/features/exploration/store/useMemoryStore";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";
import { COLORS } from "@/shared/theme/colors";
import { BlurView } from "expo-blur";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.82;
const CARD_MARGIN = 12;
const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN * 2;

const GRADIENT_THEMES = {
  sunset: ["#FF5E62", "#FF9966"],
  neon: ["#00F2FE", "#4FACFE"],
  cyber: ["#F953C6", "#B91D73"],
  ocean: ["#11998e", "#38ef7d"],
  aurora: ["#8A2387", "#E94057", "#F27121"],
};

export function MemoryCardCarousel({
  isDark,
  onRevisitMemory,
}: {
  isDark: boolean;
  onRevisitMemory?: (coords: { latitude: number; longitude: number }) => void;
}) {
  const { memories, generateMemories } = useMemoryStore();
  const scrollX = useRef(new Animated.Value(0)).current;
  const lastIndex = useRef(0);

  useEffect(() => {
    // Generate fresh memories on startup
    generateMemories("default-me");
  }, []);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SNAP_INTERVAL);
    if (index !== lastIndex.current) {
      lastIndex.current = index;
      WANDER_HAPTICS.tick(); // Apple premium tick on card snap change
    }
  };

  const renderCard = (memory: MemoryCard, index: number) => {
    const inputRange = [
      (index - 1) * SNAP_INTERVAL,
      index * SNAP_INTERVAL,
      (index + 1) * SNAP_INTERVAL,
    ];

    // Premium Apple Photos Parallax Scaling and Opacities
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.93, 1.0, 0.93],
      extrapolate: "clamp",
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.65, 1.0, 0.65],
      extrapolate: "clamp",
    });

    const rotate = scrollX.interpolate({
      inputRange,
      outputRange: ["-2deg", "0deg", "2deg"],
      extrapolate: "clamp",
    });

    // Parallax shifting background text
    const textTranslateX = scrollX.interpolate({
      inputRange,
      outputRange: [60, 0, -60],
      extrapolate: "clamp",
    });

    const themeColors = GRADIENT_THEMES[memory.imageTheme] || GRADIENT_THEMES.sunset;
    const accentColor = themeColors[0];

    return (
      <Animated.View
        key={memory.id}
        style={[
          styles.cardContainer,
          {
            transform: [{ scale }, { rotate }],
            opacity,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            WANDER_HAPTICS.medium();
            useMemoryStore.getState().revisitMemory(memory.id);
            if (memory.coordinates) {
              onRevisitMemory?.(memory.coordinates);
            }
          }}
          style={({ pressed }) => [
            styles.card,
            { transform: [{ scale: pressed ? 0.98 : 1.0 }] },
          ]}
        >
          {/* Faux Premium Gradient Background (Multi-layered styling) */}
          <View style={[styles.gradientBg, { backgroundColor: accentColor }]}>
            {/* Ambient inner glow layer */}
            <View style={[styles.gradientLayer, { backgroundColor: themeColors[1] || themeColors[0], opacity: 0.85 }]} />
            {themeColors[2] && (
              <View style={[styles.gradientLayer, { backgroundColor: themeColors[2], opacity: 0.6 }]} />
            )}
          </View>

          {/* Premium Glassmorphic text overlay */}
          <BlurView
            intensity={isDark ? 55 : 75}
            tint={isDark ? "dark" : "light"}
            style={styles.cardContent}
          >
            {/* Header Area */}
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTag, { color: accentColor }]}>
                {memory.type.toUpperCase().replace("_", " ")}
              </Text>
              <Text style={[styles.cardDate, { color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }]}>
                {new Date(memory.timestamp).toLocaleDateString("id-ID", { month: "short", day: "numeric" })}
              </Text>
            </View>

            {/* Parallax animated title */}
            <Animated.View style={{ transform: [{ translateX: textTranslateX }] }}>
              <Text style={[styles.cardTitle, { color: isDark ? "#ffffff" : "#121216" }]}>
                {memory.title}
              </Text>
              <Text style={[styles.cardSubtitle, { color: accentColor }]}>
                {memory.subtitle}
              </Text>
            </Animated.View>

            <Text
              style={[
                styles.cardDescription,
                { color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.75)" },
              ]}
              numberOfLines={3}
            >
              {memory.description}
            </Text>

            {memory.coordinates && (
              <View style={styles.coordinatesTag}>
                <Text style={styles.coordinatesText}>📍 Ketuk untuk terbang ke lokasi</Text>
              </View>
            )}
          </BlurView>
        </Pressable>
      </Animated.View>
    );
  };

  if (memories.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: isDark ? "#ffffff" : "#121216" }]}>
          Memori Eksplorasi Anda ✨
        </Text>
        <Text style={[styles.sectionSubtitle, { color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }]}>
          Spatial journey moments generated by AI Presence
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="center"
        contentContainerStyle={styles.scrollContainer}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {memories.map((memory, index) => renderCard(memory, index))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  scrollContainer: {
    paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2 - CARD_MARGIN,
    paddingVertical: 10,
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_MARGIN,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 15,
    elevation: 8,
  },
  card: {
    width: "100%",
    height: 220,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  gradientBg: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
  },
  gradientLayer: {
    ...StyleSheet.absoluteFill,
    transform: [{ scale: 1.2 }, { rotate: "30deg" }],
  },
  cardContent: {
    ...StyleSheet.absoluteFill,
    padding: 20,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTag: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  cardDate: {
    fontSize: 10,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    fontWeight: "500",
  },
  coordinatesTag: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  coordinatesText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
  },
});
