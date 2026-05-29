/**
 * CircleHubPanel.tsx
 *
 * Immersive spatial "Circle Hub" overlay for group conversations.
 * Includes interactive Meetup Map, Shared Journey timeline, and AI Group Memories.
 * Designed with premium glassmorphism, smooth animations, and English localization.
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { MapPin, Calendar, Sparkles, Navigation, X, Shield, Compass } from "lucide-react-native";
import { COLORS } from "@/shared/theme/colors";
import { RADIUS } from "@/shared/theme/radius";
import { SPACING } from "@/shared/theme/spacing";
import { TYPOGRAPHY } from "@/shared/theme/typography";
import { SHADOWS } from "@/shared/theme/shadows";
import type { Conversation } from "@/features/chat/types/types";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CircleHubPanelProps {
  visible: boolean;
  onClose: () => void;
  conversation: Conversation;
  isDark: boolean;
}

type TabType = "map" | "timeline" | "memories";

const GRADIENT_THEMES = {
  sunset: ["#FF5E62", "#FF9966"],
  neon: ["#00F2FE", "#4FACFE"],
  cyber: ["#F953C6", "#B91D73"],
  ocean: ["#11998e", "#38ef7d"],
  aurora: ["#8A2387", "#E94057", "#F27121"],
};

export function CircleHubPanel({ visible, onClose, conversation, isDark }: CircleHubPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("map");
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const theme = COLORS.get(isDark);

  // Animate panel sliding up on visible change
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      tension: 25,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  if (!visible) return null;

  const handleTabChange = (tab: TabType) => {
    WANDER_HAPTICS.tick();
    setActiveTab(tab);
  };

  const handleDismiss = () => {
    WANDER_HAPTICS.light();
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  // Render Map view with ambient drifting circles representing live members
  const renderMapView = () => {
    const meetup = conversation.meetupLocation;
    const participants = Object.values(conversation.participantProfiles);

    return (
      <View style={styles.tabContent}>
        {/* Mock Map Canvas */}
        <View style={[styles.mapContainer, { borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
          {/* Grid ambient circles representing maps */}
          <View style={styles.gridOverlay}>
            <View style={[styles.mapCircle, styles.circleLg]} />
            <View style={[styles.mapCircle, styles.circleMd]} />
            <View style={[styles.mapCircle, styles.circleSm]} />
          </View>

          {/* Central Meetup Node */}
          {meetup?.active && (
            <View style={styles.meetupNode}>
              <View style={styles.meetupPulse} />
              <View style={styles.meetupCenter}>
                <MapPin size={18} color="#FF5B99" fill="#FF5B99" />
              </View>
              <Text style={styles.meetupLabel}>{meetup.placeName}</Text>
            </View>
          )}

          {/* Drifting Avatar coordinates capsules */}
          {participants.map((p, idx) => {
            const offsets = [
              { top: 50, left: 40 },
              { top: 120, left: 160 },
              { top: 160, left: 80 },
            ];
            const coord = offsets[idx % offsets.length];
            const etas = ["4m away", "8m away", "You"];
            const etaText = etas[idx % etas.length];

            return (
              <View
                key={p.uid}
                style={[
                  styles.driftingCapsule,
                  {
                    top: coord.top,
                    left: coord.left,
                    backgroundColor: isDark ? "rgba(25, 25, 30, 0.9)" : "rgba(240, 240, 246, 0.9)",
                    borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                  },
                ]}
              >
                <Text style={styles.capsuleEmoji}>{p.avatarEmoji || "🦊"}</Text>
                <View style={styles.capsuleTextWrapper}>
                  <Text style={[styles.capsuleName, { color: theme.text }]} numberOfLines={1}>
                    {p.displayName.split(" ")[0]}
                  </Text>
                  <Text style={styles.capsuleEta}>{etaText}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Live Meetup Stats HUD Card */}
        <View style={[styles.hudCard, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }]}>
          <View style={styles.hudRow}>
            <View style={styles.hudLeft}>
              <Text style={[styles.hudTitle, { color: theme.text }]}>Meetup Active Session 📍</Text>
              <Text style={[styles.hudSub, { color: theme.textMuted }]}>
                {meetup?.placeName || "Destination point pending"}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                WANDER_HAPTICS.medium();
                alert("Routing meetup node via map layers...");
              }}
              style={styles.hudBtn}
            >
              <Navigation size={15} color="#000" fill="#000" />
              <Text style={styles.hudBtnText}>Route</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  // Render Journey Timeline vertical logging
  const renderTimelineView = () => {
    const timeline = conversation.timeline || [];

    if (timeline.length === 0) {
      return (
        <View style={styles.emptyTabContent}>
          <Calendar size={32} color={theme.textMuted} style={styles.emptyIcon} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Journey Logs Yet</Text>
          <Text style={[styles.emptySub, { color: theme.textMuted }]}>
            Drop a pin or check in with your group to start compiling this journey!
          </Text>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.timelineScroll}>
        <Text style={[styles.timelineSectionTitle, { color: theme.textMuted }]}>
          COLLABORATIVE EXPLORE LOGS
        </Text>
        
        <View style={styles.timelineWrapper}>
          {timeline.map((item, idx) => {
            const isLast = idx === timeline.length - 1;
            return (
              <View key={item.id} style={styles.timelineRow}>
                {/* Visual vertical nodes connector */}
                <View style={styles.nodeColumn}>
                  <View style={[styles.nodeIconBg, { backgroundColor: COLORS.purple }]}>
                    <Text style={styles.nodeEmoji}>{item.emoji}</Text>
                  </View>
                  {!isLast && <View style={styles.nodeConnectorLine} />}
                </View>

                {/* Text Content */}
                <View style={[styles.timelineCard, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }]}>
                  <View style={styles.timelineCardHeader}>
                    <Text style={[styles.timelineUser, { color: theme.text }]}>{item.user}</Text>
                    <Text style={styles.timelineTime}>{item.time}</Text>
                  </View>
                  <Text style={[styles.timelineText, { color: theme.textMuted }]}>{item.text}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  // Render AI Memories carousel cards
  const renderMemoriesView = () => {
    const memories = conversation.aiMemories || [];

    if (memories.length === 0) {
      return (
        <View style={styles.emptyTabContent}>
          <Sparkles size={32} color={theme.textMuted} style={styles.emptyIcon} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No AI Memories Yet</Text>
          <Text style={[styles.emptySub, { color: theme.textMuted }]}>
            Wander AI needs active explore sessions to automatically bundle nostalgia logs.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.memoriesContainer}>
        <Text style={[styles.memoriesHeaderLabel, { color: theme.textMuted }]}>
          AUTO-GENERATED MEMORY SHARDS ✨
        </Text>
        {memories.map((m) => {
          const themeKey = (m.imageTheme || "sunset") as keyof typeof GRADIENT_THEMES;
          const colors = GRADIENT_THEMES[themeKey] || GRADIENT_THEMES.sunset;
          const bgPrimary = colors[0];

          return (
            <View key={m.id} style={styles.memoryCardWrapper}>
              <View style={[styles.memoryCardBg, { backgroundColor: bgPrimary }]}>
                {/* Secondary overlapping layer */}
                <View style={[styles.memoryCardBgLayer, { backgroundColor: colors[1] || bgPrimary }]} />
              </View>
              <BlurView intensity={isDark ? 50 : 70} tint={isDark ? "dark" : "light"} style={styles.memoryCardBlur}>
                <View style={styles.memoryCardTop}>
                  <Sparkles size={13} color={bgPrimary} fill={bgPrimary} />
                  <Text style={[styles.memoryCardTag, { color: bgPrimary }]}>WANDER AI MEMORY</Text>
                </View>
                <Text style={[styles.memoryCardTitle, { color: theme.text }]}>{m.title}</Text>
                <Text style={[styles.memoryCardDesc, { color: theme.textMuted }]}>{m.description}</Text>
              </BlurView>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const overlayBg = isDark ? "rgba(10, 10, 14, 0.95)" : "rgba(248, 248, 252, 0.95)";
  const modalBorderColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)";

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          backgroundColor: overlayBg,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Circle Header Details */}
      <View style={[styles.header, { borderBottomColor: modalBorderColor }]}>
        <View style={styles.headerInner}>
          <View style={styles.circleStackFrame}>
            <Text style={styles.circleEmoji}>{conversation.groupEmoji || "🧭"}</Text>
          </View>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.groupNameText, { color: theme.text }]}>
              {conversation.groupName || "Circle Hub"}
            </Text>
            <View style={styles.tagRow}>
              <Shield size={10} color={COLORS.purple} style={styles.roleIcon} />
              <Text style={[styles.tagText, { color: theme.textMuted }]}>
                {conversation.groupType?.toUpperCase() || "SOCIAL"} CIRCLE • {conversation.participantUids.length} MEMBERS
              </Text>
            </View>
          </View>
          <Pressable onPress={handleDismiss} style={styles.dismissBtn}>
            <X size={18} color={theme.text} />
          </Pressable>
        </View>

        {/* Immersive segment bar for Circle Hub Tabs */}
        <View style={styles.tabContainer}>
          <Pressable
            onPress={() => handleTabChange("map")}
            style={[styles.tabBtn, activeTab === "map" && [styles.activeTabBtn, { borderBottomColor: COLORS.cyan }]]}
          >
            <MapPin size={15} color={activeTab === "map" ? COLORS.cyan : theme.textMuted} />
            <Text style={[styles.tabLabel, { color: activeTab === "map" ? theme.text : theme.textMuted }]}>
              Meetup Map
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleTabChange("timeline")}
            style={[styles.tabBtn, activeTab === "timeline" && [styles.activeTabBtn, { borderBottomColor: COLORS.purple }]]}
          >
            <Calendar size={15} color={activeTab === "timeline" ? COLORS.purple : theme.textMuted} />
            <Text style={[styles.tabLabel, { color: activeTab === "timeline" ? theme.text : theme.textMuted }]}>
              Shared Journey
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleTabChange("memories")}
            style={[styles.tabBtn, activeTab === "memories" && [styles.activeTabBtn, { borderBottomColor: COLORS.pink }]]}
          >
            <Sparkles size={15} color={activeTab === "memories" ? COLORS.pink : theme.textMuted} />
            <Text style={[styles.tabLabel, { color: activeTab === "memories" ? theme.text : theme.textMuted }]}>
              AI Memories
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Tab Renderers */}
      <View style={styles.body}>
        {activeTab === "map" && renderMapView()}
        {activeTab === "timeline" && renderTimelineView()}
        {activeTab === "memories" && renderMemoriesView()}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 54 : 36,
    borderBottomWidth: 1,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  circleStackFrame: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  circleEmoji: {
    fontSize: 24,
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  groupNameText: {
    fontSize: 16.5,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  roleIcon: {
    marginRight: 4,
  },
  tagText: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  dismissBtn: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabBtn: {
    borderBottomWidth: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  body: {
    flex: 1,
  },
  // Tab Map Styles
  tabContent: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: "space-between",
  },
  mapContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: "hidden",
    position: "relative",
    marginBottom: SPACING.lg,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.06,
  },
  mapCircle: {
    borderWidth: 1.5,
    borderColor: "#FFF",
    borderRadius: 9999,
    position: "absolute",
  },
  circleLg: {
    width: 320,
    height: 320,
  },
  circleMd: {
    width: 200,
    height: 200,
  },
  circleSm: {
    width: 90,
    height: 90,
  },
  meetupNode: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -25,
    marginLeft: -40,
    width: 80,
    alignItems: "center",
    zIndex: 5,
  },
  meetupPulse: {
    position: "absolute",
    top: 5,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 91, 153, 0.25)",
    transform: [{ scale: 1.5 }],
  },
  meetupCenter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 91, 153, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FF5B99",
  },
  meetupLabel: {
    color: "#FF5B99",
    fontSize: 9.5,
    fontWeight: "900",
    marginTop: 4,
    textAlign: "center",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  driftingCapsule: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    ...SHADOWS.medium,
    shadowOpacity: 0.12,
  },
  capsuleEmoji: {
    fontSize: 16,
  },
  capsuleTextWrapper: {
    gap: 1,
  },
  capsuleName: {
    fontSize: 10,
    fontWeight: "800",
    maxWidth: 55,
  },
  capsuleEta: {
    fontSize: 8,
    color: COLORS.cyan,
    fontWeight: "700",
  },
  hudCard: {
    borderRadius: 20,
    padding: 16,
  },
  hudRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hudLeft: {
    gap: 3,
  },
  hudTitle: {
    fontSize: 13.5,
    fontWeight: "900",
  },
  hudSub: {
    fontSize: 11,
  },
  hudBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.cyan,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 4,
  },
  hudBtnText: {
    color: "#000",
    fontSize: 11.5,
    fontWeight: "900",
  },
  // Tab Timeline Styles
  timelineScroll: {
    padding: SPACING.lg,
  },
  timelineSectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: SPACING.lg,
  },
  timelineWrapper: {
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: "row",
    marginBottom: SPACING.md,
    gap: 12,
  },
  nodeColumn: {
    alignItems: "center",
    width: 32,
    position: "relative",
  },
  nodeIconBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  nodeEmoji: {
    fontSize: 15,
  },
  nodeConnectorLine: {
    position: "absolute",
    top: 30,
    bottom: -16,
    width: 2,
    backgroundColor: "rgba(138, 63, 252, 0.15)",
  },
  timelineCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  timelineCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timelineUser: {
    fontSize: 12,
    fontWeight: "800",
  },
  timelineTime: {
    fontSize: 9.5,
    color: "rgba(255,255,255,0.3)",
    fontWeight: "700",
  },
  timelineText: {
    fontSize: 11.5,
    fontWeight: "600",
    lineHeight: 15,
  },
  // Tab Memories Styles
  emptyTabContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xxxl,
    gap: 8,
  },
  emptyIcon: {
    marginBottom: 8,
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  emptySub: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  memoriesContainer: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  memoriesHeaderLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  memoryCardWrapper: {
    height: 140,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  memoryCardBg: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
  },
  memoryCardBgLayer: {
    ...StyleSheet.absoluteFill,
    opacity: 0.8,
    transform: [{ scale: 1.2 }, { rotate: "25deg" }],
  },
  memoryCardBlur: {
    ...StyleSheet.absoluteFill,
    padding: 16,
    justifyContent: "space-between",
  },
  memoryCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  memoryCardTag: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  memoryCardTitle: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  memoryCardDesc: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
  },
});
