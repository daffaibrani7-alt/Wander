import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { MapPin, Plus, Trash2, X, Check, Navigation } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { COLORS } from "@/shared/theme/colors";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { useGeofenceStore, GeofenceRegion } from "@/features/map/store/useGeofenceStore";
import { auth } from "@/shared/config/firebase";
import * as Haptics from "expo-haptics";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

interface SavedPlacesManagerProps {
  visible: boolean;
  onClose: () => void;
  isMapPickMode: boolean;
  setMapPickMode: (active: boolean) => void;
  pickedCoords: { latitude: number; longitude: number } | null;
  setPickedCoords: (coords: { latitude: number; longitude: number } | null) => void;
}

const EMOJIS = ["🏡", "💼", "🏫", "☕", "🌲", "🎮", "🛍️", "❤️", "📍"];
const TYPES: Array<"home" | "work" | "school" | "cafe" | "custom"> = [
  "home",
  "work",
  "school",
  "cafe",
  "custom",
];
const TYPE_LABELS = {
  home: "Rumah",
  work: "Kantor",
  school: "Sekolah",
  cafe: "Kafe",
  custom: "Kustom",
};

const RADIUS_PRESETS = [100, 200, 500, 1000];

export function SavedPlacesManager({
  visible,
  onClose,
  isMapPickMode,
  setMapPickMode,
  pickedCoords,
  setPickedCoords,
}: SavedPlacesManagerProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  const {
    regions,
    addSavedPlaceAction,
    deleteSavedPlaceAction,
  } = useGeofenceStore();

  const [isAdding, setIsAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"home" | "work" | "school" | "cafe" | "custom">("custom");
  const [emoji, setEmoji] = useState("📍");
  const [radius, setRadius] = useState(200); // default 200m
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Sync animations
  useEffect(() => {
    if (visible && !isMapPickMode) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 25,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, isMapPickMode]);

  // Sync picked coordinates from map
  useEffect(() => {
    if (pickedCoords) {
      setLatitude(pickedCoords.latitude);
      setLongitude(pickedCoords.longitude);
      setIsAdding(true);
      setMapPickMode(false);
    }
  }, [pickedCoords]);

  const handleStartAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setLabel("");
    setType("custom");
    setEmoji("📍");
    setRadius(200);
    setLatitude(null);
    setLongitude(null);
    setPickedCoords(null);
    setIsAdding(true);
  };

  const handleCancelAdd = () => {
    Haptics.selectionAsync().catch(() => {});
    setIsAdding(false);
  };

  const handleTriggerMapPick = () => {
    Haptics.selectionAsync().catch(() => {});
    setMapPickMode(true);
  };

  const handleSavePlace = async () => {
    const currentUser = auth?.currentUser;
    const uid = currentUser?.uid || "default-me";

    if (!label.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      alert("Masukkan nama tempat terlebih dahulu.");
      return;
    }

    if (latitude === null || longitude === null) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      alert("Silakan pilih koordinat lokasi di peta.");
      return;
    }

    const placeId = `custom_${Date.now()}`;
    const newPlace = {
      placeId,
      label: label.trim(),
      type,
      emoji,
      latitude,
      longitude,
      radius,
    };

    try {
      await addSavedPlaceAction(uid, newPlace);
      setIsAdding(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePlace = async (placeId: string) => {
    const currentUser = auth?.currentUser;
    const uid = currentUser?.uid || "default-me";
    try {
      await deleteSavedPlaceAction(uid, placeId);
    } catch (e) {
      console.error(e);
    }
  };

  const renderItem = (region: GeofenceRegion) => {
    const distText = `${region.radius}m`;
    const labelColor = region.type === "home" ? COLORS.green : region.type === "work" ? COLORS.cyan : COLORS.purple;

    return (
      <View key={region.id} style={[styles.placeRow, { borderColor: theme.border }]}>
        <View style={styles.placeInfo}>
          <View style={[styles.avatarBox, { backgroundColor: "rgba(255, 255, 255, 0.05)", borderColor: labelColor }]}>
            <Text style={styles.avatarEmoji}>{region.emoji || "📍"}</Text>
          </View>
          <View style={styles.placeDetails}>
            <Text style={[styles.placeLabel, { color: theme.text }]}>{region.name}</Text>
            <Text style={[styles.placeSub, { color: theme.textMuted }]}>
              {TYPE_LABELS[region.type]} • Radius {distText}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => handleDeletePlace(region.id)}
          style={({ pressed }) => [styles.deleteBtn, pressed && styles.btnPressed]}
        >
          <Trash2 size={18} color={COLORS.pink} />
        </Pressable>
      </View>
    );
  };

  return (
    <>
      {/* Dynamic top pick coordinates instructions banner */}
      {isMapPickMode && (
        <View style={styles.bannerContainer}>
          <BlurView intensity={90} tint="dark" style={styles.bannerBlur}>
            <View style={styles.bannerContent}>
              <Navigation size={18} color={COLORS.cyan} style={styles.bannerIcon} />
              <View style={styles.bannerTextCol}>
                <Text style={styles.bannerTitle}>Pilih Lokasi Baru</Text>
                <Text style={styles.bannerSub}>Tap koordinat mana saja pada peta...</Text>
              </View>
              <Pressable
                onPress={() => setMapPickMode(false)}
                style={styles.bannerClose}
              >
                <X size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </BlurView>
        </View>
      )}

      {/* Slide up sheet */}
      {visible && !isMapPickMode && (
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {Platform.OS === "web" ? (
            <View style={[styles.webFallback, { backgroundColor: isDark ? "rgba(10, 10, 14, 0.98)" : "rgba(240, 240, 245, 0.98)", borderColor: theme.border }]}>
              <Header title={isAdding ? "Tambah Lokasi" : "Tempat Favorit Saya"} onClose={onClose} />
              {isAdding ? renderAddForm() : renderList()}
            </View>
          ) : (
            <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={[styles.blurSheet, { borderColor: theme.border }]}>
              <Header title={isAdding ? "Tambah Lokasi" : "Tempat Favorit Saya"} onClose={onClose} />
              {isAdding ? renderAddForm() : renderList()}
            </BlurView>
          )}
        </Animated.View>
      )}
    </>
  );

  function Header({ title, onClose }: { title: string; onClose: () => void }) {
    return (
      <View style={styles.header}>
        <View style={styles.headerIndicator} />
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{title}</Text>
          <Pressable onPress={onClose} style={styles.headerClose}>
            <X size={18} color={theme.text} />
          </Pressable>
        </View>
      </View>
    );
  }

  function renderList() {
    return (
      <View style={styles.content}>
        <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent}>
          {regions.length === 0 ? (
            <View style={styles.emptyState}>
              <MapPin size={48} color={theme.textMuted} style={styles.emptyIcon} />
              <Text style={[styles.emptyTitle, { color: theme.textMuted }]}>Belum ada tempat disimpan</Text>
              <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                Simpan tempat-tempat penting seperti Rumah, Kantor untuk memantau kehadiran Anda dan teman.
              </Text>
            </View>
          ) : (
            regions.map(renderItem)
          )}
        </ScrollView>

        <Pressable
          onPress={handleStartAdd}
          style={[styles.floatingAddBtn, { backgroundColor: COLORS.purple }]}
        >
          <Plus size={20} color="#FFFFFF" style={styles.addBtnIcon} />
          <Text style={styles.addBtnText}>Simpan Tempat Baru</Text>
        </Pressable>
      </View>
    );
  }

  function renderAddForm() {
    return (
      <View style={styles.content}>
        <ScrollView style={styles.scrollList} contentContainerStyle={styles.formScroll}>
          {/* Label input */}
          <Text style={[styles.fieldLabel, { color: theme.text }]}>Nama Tempat</Text>
          <TextInput
            placeholder="e.g., Kopi Favorit Saya"
            placeholderTextColor={theme.textMuted}
            value={label}
            onChangeText={setLabel}
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          />

          {/* Place type selection */}
          <Text style={[styles.fieldLabel, { color: theme.text }]}>Kategori Tempat</Text>
          <View style={styles.typeRow}>
            {TYPES.map((t) => {
              const active = type === t;
              const border = active ? COLORS.cyan : theme.border;
              const bg = active ? "rgba(0, 240, 255, 0.1)" : "rgba(255,255,255,0.02)";
              return (
                <Pressable
                  key={t}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setType(t);
                    // Match default emoji
                    if (t === "home") setEmoji("🏡");
                    else if (t === "work") setEmoji("💼");
                    else if (t === "school") setEmoji("🏫");
                    else if (t === "cafe") setEmoji("☕");
                  }}
                  style={[styles.typeBtn, { borderColor: border, backgroundColor: bg }]}
                >
                  <Text style={[styles.typeBtnText, { color: active ? COLORS.cyan : theme.text }]}>
                    {TYPE_LABELS[t]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Emoji selection */}
          <Text style={[styles.fieldLabel, { color: theme.text }]}>Emoji Penanda</Text>
          <View style={styles.emojiRow}>
            {EMOJIS.map((e) => {
              const active = emoji === e;
              return (
                <Pressable
                  key={e}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setEmoji(e);
                  }}
                  style={[styles.emojiBtn, active && styles.emojiBtnActive]}
                >
                  <Text style={styles.emojiBtnText}>{e}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Preset Radius selector (Clean, precise, zero native dependencies) */}
          <Text style={[styles.fieldLabel, { color: theme.text }]}>Jangkauan Radius</Text>
          <View style={styles.presetRadiusRow}>
            {RADIUS_PRESETS.map((r) => {
              const active = radius === r;
              const border = active ? COLORS.purple : theme.border;
              const bg = active ? "rgba(138, 63, 252, 0.15)" : "rgba(255,255,255,0.02)";
              return (
                <Pressable
                  key={r}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setRadius(r);
                  }}
                  style={[styles.presetRadiusBtn, { borderColor: border, backgroundColor: bg }]}
                >
                  <Text style={[styles.presetRadiusBtnText, { color: active ? COLORS.purple : theme.text }]}>
                    {r}m
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Coordinates selection */}
          <Text style={[styles.fieldLabel, { color: theme.text }]}>Koordinat Lokasi</Text>
          {latitude !== null && longitude !== null ? (
            <View style={[styles.coordPanel, { backgroundColor: "rgba(255,255,255,0.03)", borderColor: theme.border }]}>
              <MapPin size={16} color={COLORS.green} style={styles.coordIcon} />
              <Text style={[styles.coordText, { color: theme.text }]}>
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleTriggerMapPick}
            style={[styles.mapPickBtn, { borderColor: COLORS.cyan, backgroundColor: "rgba(0, 240, 255, 0.05)" }]}
          >
            <Navigation size={16} color={COLORS.cyan} style={styles.mapPickIcon} />
            <Text style={[styles.mapPickText, { color: COLORS.cyan }]}>
              {latitude !== null ? "Ubah Lokasi di Peta" : "Pilih Lokasi di Peta"}
            </Text>
          </Pressable>
        </ScrollView>

        {/* Action Save/Cancel Buttons */}
        <View style={styles.formActions}>
          <Pressable
            onPress={handleCancelAdd}
            style={[styles.actionBtn, styles.cancelBtn, { borderColor: theme.border }]}
          >
            <Text style={[styles.actionBtnText, { color: theme.text }]}>Batal</Text>
          </Pressable>
          <Pressable
            onPress={handleSavePlace}
            style={[styles.actionBtn, styles.saveBtn, { backgroundColor: COLORS.cyan }]}
          >
            <Check size={18} color="#000000" style={styles.saveIcon} />
            <Text style={[styles.actionBtnText, { color: "#000" }]}>Simpan</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.70,
    zIndex: 99,
  },
  blurSheet: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1.5,
    overflow: "hidden",
  },
  webFallback: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1.5,
  },
  header: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  headerIndicator: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  headerClose: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  placeInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  placeDetails: {
    flex: 1,
  },
  placeLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  placeSub: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.8,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255, 91, 153, 0.08)",
  },
  btnPressed: {
    opacity: 0.7,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    opacity: 0.35,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
    opacity: 0.7,
  },
  floatingAddBtn: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 24 : 16,
    left: 20,
    right: 20,
    height: 52,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  addBtnIcon: {
    marginRight: 8,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  formScroll: {
    paddingBottom: 48,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
    opacity: 0.9,
  },
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: "700",
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  typeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: "800",
  },
  emojiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  emojiBtn: {
    width: SCREEN_WIDTH > 400 ? 38 : 34,
    height: SCREEN_WIDTH > 400 ? 38 : 34,
    borderRadius: SCREEN_WIDTH > 400 ? 19 : 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  emojiBtnActive: {
    borderColor: COLORS.cyan,
    backgroundColor: "rgba(0, 240, 255, 0.1)",
  },
  emojiBtnText: {
    fontSize: 18,
  },
  presetRadiusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  presetRadiusBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  presetRadiusBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  coordPanel: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  coordIcon: {
    marginRight: 8,
  },
  coordText: {
    fontSize: 13,
    fontWeight: "800",
  },
  mapPickBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  mapPickIcon: {
    marginRight: 8,
    transform: [{ rotate: "45deg" }],
  },
  mapPickText: {
    fontSize: 13,
    fontWeight: "900",
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    borderWidth: 1.5,
  },
  saveBtn: {
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  saveIcon: {
    marginRight: 6,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "900",
  },

  // Pick Coordinates Top Banner styles
  bannerContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 32,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  bannerBlur: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(0, 240, 255, 0.4)",
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bannerIcon: {
    marginRight: 12,
    transform: [{ rotate: "45deg" }],
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  bannerSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  bannerClose: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
});

export default SavedPlacesManager;
