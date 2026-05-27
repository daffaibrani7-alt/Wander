/**
 * LocationConsentModal.tsx
 *
 * Apple-style "Allow Location Access" privacy consent pre-prompt.
 * Shown on first launch before any GPS tracking begins.
 * Matches iOS Human Interface Guidelines spacing and language.
 */
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Dimensions,
  Platform,
  Modal,
} from "react-native";
import { BlurView } from "expo-blur";
import { MapPin, Navigation, Shield, Users } from "lucide-react-native";
import { COLORS } from "@/shared/theme/colors";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface LocationConsentModalProps {
  visible: boolean;
  onAllowAlways: () => void;
  onAllowOnce: () => void;
  onDeny: () => void;
}

const PRIVACY_FEATURES: { icon: React.ReactNode; title: string; desc: string }[] = [
  {
    icon: <Users size={18} color={COLORS.cyan} />,
    title: "Bagikan lokasi dengan teman",
    desc: "Tampilkan posisi Anda secara real-time di peta teman.",
  },
  {
    icon: <MapPin size={18} color="#2BE080" />,
    title: "Mode Eksplorasi Peta",
    desc: "Lacak area yang sudah pernah Anda kunjungi secara anonim.",
  },
  {
    icon: <Navigation size={18} color={COLORS.pink} />,
    title: "Navigasi & Geofencing",
    desc: "Notifikasi otomatis saat tiba di tempat favorit.",
  },
  {
    icon: <Shield size={18} color="#FFA500" />,
    title: "Data tetap privat",
    desc: "Lokasi hanya dibagikan ke teman yang Anda setujui.",
  },
];

export function LocationConsentModal({
  visible,
  onAllowAlways,
  onAllowOnce,
  onDeny,
}: LocationConsentModalProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  // ── Animations ─────────────────────────────────────────────────────────────
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslate = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const mapPinBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslate, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();

      // Map pin bounce loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(mapPinBounce, {
            toValue: -10,
            duration: 600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(mapPinBounce, {
            toValue: 0,
            duration: 500,
            easing: Easing.in(Easing.bounce),
            useNativeDriver: true,
          }),
          Animated.delay(800),
        ])
      ).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslate, {
          toValue: SCREEN_HEIGHT,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  const glassBg = isDark ? "rgba(12, 12, 18, 0.97)" : "rgba(248, 248, 255, 0.97)";
  const borderColor = isDark ? "rgba(0, 240, 255, 0.15)" : "rgba(0, 85, 255, 0.1)";

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDeny}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop */}
        <Animated.View
          pointerEvents="auto"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(0, 0, 0, 0.65)",
              opacity: backdropOpacity,
            },
          ]}
        />

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: sheetTranslate }] },
          ]}
        >
          {Platform.OS === "web" ? (
            <View style={[styles.sheetInner, { backgroundColor: glassBg, borderColor }]}>
              {renderContent()}
            </View>
          ) : (
            <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.blurFill}>
              <View style={[styles.sheetInner, { backgroundColor: glassBg, borderColor }]}>
                {renderContent()}
              </View>
            </BlurView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );

  function renderContent() {
    return (
      <>
        {/* Drag Handle */}
        <View style={styles.dragHandle}>
          <View
            style={[
              styles.handle,
              { backgroundColor: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.18)" },
            ]}
          />
        </View>

        {/* Icon + App Name */}
        <View style={styles.iconRow}>
          <Animated.View
            style={[
              styles.mapPinCircle,
              { transform: [{ translateY: mapPinBounce }] },
            ]}
          >
            <MapPin size={36} color={COLORS.cyan} strokeWidth={2} />
          </Animated.View>
        </View>

        {/* Headline */}
        <Text style={[styles.headline, { color: theme.text }]}>
          Izinkan "Wander" mengakses lokasi Anda?
        </Text>
        <Text style={[styles.subheadline, { color: theme.textMuted }]}>
          Lokasi Anda digunakan untuk fitur-fitur berikut:
        </Text>

        {/* Feature List */}
        <View style={styles.featureList}>
          {PRIVACY_FEATURES.map((item, idx) => (
            <View key={idx} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>{item.icon}</View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.featureDesc, { color: theme.textMuted }]}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Privacy note */}
        <View style={[styles.privacyNote, { borderColor: isDark ? "rgba(255,165,0,0.3)" : "rgba(255,165,0,0.5)" }]}>
          <Shield size={12} color="#FFA500" />
          <Text style={[styles.privacyNoteText, { color: "#FFA500" }]}>
            Wander tidak pernah menjual data lokasi Anda.
          </Text>
        </View>

        {/* CTA Buttons */}
        <View style={styles.btnStack}>
          {/* Always Allow — Primary CTA */}
          <Pressable
            id="location-consent-always"
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              onAllowAlways();
            }}
            style={styles.btnAlways}
          >
            <Text style={styles.btnAlwaysText}>Izinkan Selalu</Text>
          </Pressable>

          {/* Allow While Using — Secondary CTA */}
          <Pressable
            id="location-consent-once"
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onAllowOnce();
            }}
            style={[styles.btnOnce, { borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)" }]}
          >
            <Text style={[styles.btnOnceText, { color: theme.text }]}>Izinkan Saat Digunakan</Text>
          </Pressable>

          {/* Deny — Destructive */}
          <Pressable
            id="location-consent-deny"
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onDeny();
            }}
            style={styles.btnDeny}
          >
            <Text style={styles.btnDenyText}>Jangan Izinkan</Text>
          </Pressable>
        </View>
      </>
    );
  }
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  blurFill: {
    flex: 1,
  },
  sheetInner: {
    paddingBottom: 40,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  dragHandle: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  iconRow: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  mapPinCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(0, 240, 255, 0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(0, 240, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  headline: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginHorizontal: 28,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  subheadline: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    marginHorizontal: 32,
    lineHeight: 18,
  },
  featureList: {
    marginTop: 20,
    marginHorizontal: 20,
    gap: 14,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
  featureDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  privacyNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 20,
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "rgba(255, 165, 0, 0.06)",
  },
  privacyNoteText: {
    fontSize: 11,
    fontWeight: "500",
    flex: 1,
    lineHeight: 15,
  },
  btnStack: {
    marginTop: 20,
    marginHorizontal: 20,
    gap: 10,
  },
  btnAlways: {
    backgroundColor: COLORS.cyan,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  btnAlwaysText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  btnOnce: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  btnOnceText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  btnDeny: {
    paddingVertical: 10,
    alignItems: "center",
  },
  btnDenyText: {
    fontSize: 13.5,
    color: "#FF3B30",
    fontWeight: "500",
  },
});
