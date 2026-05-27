/**
 * ProfileEditor.tsx
 *
 * High-fidelity, Apple Human Interface compliant slide-up profile editor overlay.
 * Uses a native full-screen Modal to overlay tabs and background layers properly.
 * Supports image picking (Library/Camera), crop-compression манипуляции, Bio counters,
 * and custom emoji status configurations.
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Animated,
  Platform,
  Modal,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { BlurView } from "expo-blur";
import { X, Camera, Image as ImageIcon, Check, Smile } from "lucide-react-native";
import { COLORS } from "@/shared/theme/colors";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { useProfileStore } from "@/features/profile/store/useProfileStore";
import { Avatar } from "@/shared/components/Avatar";
import type { UserProfile } from "@/features/profile/services/userService";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Haptics from "expo-haptics";

interface ProfileEditorProps {
  visible: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
}

const PRESET_STATUSES = [
  { emoji: "🦊", label: "Santai" },
  { emoji: "🍿", label: "Nonton" },
  { emoji: "🚗", label: "OTW" },
  { emoji: "🍕", label: "Makan" },
  { emoji: "😴", label: "Tidur" },
  { emoji: "⚡️", label: "Sibuk" },
  { emoji: "🏡", label: "Dirumah" },
  { emoji: "✈️", label: "Traveling" },
];

export function ProfileEditor({
  visible,
  onClose,
  userProfile,
}: ProfileEditorProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  const { isSaving, uploadProgress, updateProfile, uploadProfilePicture, error, clearError } =
    useProfileStore();

  // ─── Form States ────────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [statusEmoji, setStatusEmoji] = useState("🦊");
  const [statusText, setStatusText] = useState("");
  const [localPhotoURL, setLocalPhotoURL] = useState<string | null>(null);

  // ─── Animations ─────────────────────────────────────────────────────────────
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslate = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible && userProfile) {
      // Sync form fields from active user profile
      setDisplayName(userProfile.displayName || "");
      setBio(userProfile.bio || "");
      setStatusEmoji(userProfile.statusEmoji || userProfile.avatarEmoji || "🦊");
      setStatusText(userProfile.statusText || "");
      setLocalPhotoURL(userProfile.photoURL || null);
      clearError();

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslate, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslate, {
          toValue: 600,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, userProfile, backdropOpacity, sheetTranslate, clearError]);

  if (!visible || !userProfile) return null;

  // ─── Image Picking Logic ───────────────────────────────────────────────────
  const handlePickImage = async () => {
    Haptics.selectionAsync().catch(() => {});
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Izin Akses Galeri diperlukan untuk mengganti foto profil!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await processAndUploadImage(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    Haptics.selectionAsync().catch(() => {});
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      alert("Izin Akses Kamera diperlukan untuk mengambil foto baru!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await processAndUploadImage(result.assets[0].uri);
    }
  };

  const processAndUploadImage = async (uri: string) => {
    try {
      // 1:1 Crop Compression: resize to 500x500 at 80% JPEG quality
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 500, height: 500 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const downloadUrl = await uploadProfilePicture(
        userProfile.uid,
        manipulated.uri
      );
      if (downloadUrl) {
        setLocalPhotoURL(downloadUrl);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (err) {
      console.error("❌ Error manipulating/uploading image:", err);
      alert("Gagal memproses foto profil.");
    }
  };

  // ─── Save Action ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    Haptics.selectionAsync().catch(() => {});
    if (!displayName.trim()) {
      alert("Username tidak boleh kosong!");
      return;
    }

    const success = await updateProfile(userProfile.uid, {
      displayName: displayName.trim(),
      bio: bio.trim(),
      statusEmoji,
      statusText: statusText.trim(),
    });

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onClose();
    }
  };

  const glassBg = isDark ? "rgba(12, 12, 18, 0.96)" : "rgba(248, 248, 255, 0.96)";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)";

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Backdrop overlay */}
        <Animated.View
          pointerEvents="auto"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              opacity: backdropOpacity,
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Apple slide-up container */}
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: sheetTranslate }] },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            {Platform.OS === "web" ? (
              <View style={[styles.sheetInner, { backgroundColor: glassBg, borderColor }]}>
                {renderEditorContent()}
              </View>
            ) : (
              <BlurView
                intensity={95}
                tint={isDark ? "dark" : "light"}
                style={styles.blurFill}
              >
                <View style={[styles.sheetInner, { backgroundColor: glassBg, borderColor }]}>
                  {renderEditorContent()}
                </View>
              </BlurView>
            )}
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );

  function renderEditorContent() {
    return (
      <View style={{ flex: 1 }}>
        {/* Top Header Drag-Pill */}
        <View style={styles.dragHandle}>
          <View
            style={[
              styles.handle,
              { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)" },
            ]}
          />
        </View>

        {/* Modal Action Header */}
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            Edit Profil Saya 🎨
          </Text>
          <Pressable
            id="close-profile-editor-btn"
            onPress={onClose}
            style={[styles.closeCircle, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}
          >
            <X size={16} color={theme.textMuted} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {/* Avatar Editing Area */}
          <View style={styles.avatarEditArea}>
            <View style={styles.avatarWrap}>
              <Avatar
                uri={localPhotoURL}
                emoji={statusEmoji}
                size={94}
                showGlow={isSaving}
                glowColor={COLORS.cyan}
              />
              {isSaving && uploadProgress < 100 && (
                <View style={styles.uploadProgressOverlay}>
                  <ActivityIndicator size="small" color={COLORS.cyan} />
                  <Text style={styles.progressText}>{uploadProgress}%</Text>
                </View>
              )}
            </View>

            {/* Quick action buttons */}
            <View style={styles.pickerBtnsRow}>
              <Pressable
                id="camera-photo-btn"
                onPress={handleTakePhoto}
                style={[styles.pickerBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}
              >
                <Camera size={14} color={theme.text} />
                <Text style={[styles.pickerBtnText, { color: theme.text }]}>Kamera</Text>
              </Pressable>
              <Pressable
                id="gallery-photo-btn"
                onPress={handlePickImage}
                style={[styles.pickerBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}
              >
                <ImageIcon size={14} color={theme.text} />
                <Text style={[styles.pickerBtnText, { color: theme.text }]}>Galeri</Text>
              </Pressable>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.formStack}>
            {/* Display Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textMuted }]}>NAMA WANDERER</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: theme.text,
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  },
                ]}
                placeholder="Masukkan nama pengguna..."
                placeholderTextColor={theme.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={25}
              />
            </View>

            {/* Biography */}
            <View style={styles.inputGroup}>
              <View style={styles.labelCountRow}>
                <Text style={[styles.label, { color: theme.textMuted }]}>BIOGRAFI / STATUS</Text>
                <Text style={[styles.counterText, { color: bio.length >= 120 ? COLORS.pink : theme.textMuted }]}>
                  {bio.length}/120
                </Text>
              </View>
              <TextInput
                style={[
                  styles.textInput,
                  styles.textArea,
                  {
                    color: theme.text,
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  },
                ]}
                placeholder="Tulis bio singkat tentang petualanganmu..."
                placeholderTextColor={theme.textMuted}
                value={bio}
                onChangeText={setBio}
                maxLength={120}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Quick status vibe select */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textMuted }]}>VIBE EMOJI SAAT INI</Text>
              <View style={styles.vibeGrid}>
                {PRESET_STATUSES.map((preset) => (
                  <Pressable
                    key={preset.emoji}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setStatusEmoji(preset.emoji);
                    }}
                    style={[
                      styles.vibePill,
                      {
                        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                      },
                      statusEmoji === preset.emoji && {
                        borderColor: COLORS.cyan,
                        backgroundColor: "rgba(0, 240, 255, 0.08)",
                      },
                    ]}
                  >
                    <Text style={styles.vibeEmoji}>{preset.emoji}</Text>
                    <Text
                      style={[
                        styles.vibeLabel,
                        { color: theme.textMuted },
                        statusEmoji === preset.emoji && { color: COLORS.cyan, fontWeight: "700" },
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Custom status text */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textMuted }]}>STATUS AKTIVITAS CUSTOM</Text>
              <View
                style={[
                  styles.statusInputContainer,
                  {
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  },
                ]}
              >
                <View style={styles.smileWrap}>
                  <Smile size={16} color={COLORS.cyan} />
                </View>
                <TextInput
                  style={[styles.statusTextInput, { color: theme.text }]}
                  placeholder="Sedang sibuk apa sekarang?"
                  placeholderTextColor={theme.textMuted}
                  value={statusText}
                  onChangeText={setStatusText}
                  maxLength={40}
                />
              </View>
            </View>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Action buttons stack */}
          <View style={styles.actionBtnsStack}>
            {/* Save */}
            <Pressable
              id="save-profile-btn"
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.saveBtn, { backgroundColor: COLORS.cyan }]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Check size={16} color="#000" strokeWidth={3} />
                  <Text style={styles.saveBtnText}>Simpan Perubahan</Text>
                </>
              )}
            </Pressable>

            {/* Cancel */}
            <Pressable
              id="cancel-profile-btn"
              onPress={onClose}
              disabled={isSaving}
              style={[styles.cancelBtn, { borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)" }]}
            >
              <Text style={[styles.cancelBtnText, { color: theme.text }]}>Batal</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    height: "88%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  blurFill: {
    flex: 1,
  },
  sheetInner: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  dragHandle: {
    alignItems: "center",
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  avatarEditArea: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  avatarWrap: {
    position: "relative",
  },
  uploadProgressOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 47,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  progressText: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 4,
  },
  pickerBtnsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  pickerBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  formStack: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    paddingLeft: 2,
  },
  labelCountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  counterText: {
    fontSize: 10,
    fontWeight: "700",
  },
  textInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "System",
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    paddingBottom: 12,
  },
  vibeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  vibePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  vibeEmoji: {
    fontSize: 15,
  },
  vibeLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  smileWrap: {
    marginRight: 10,
  },
  statusTextInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    fontFamily: "System",
  },
  errorText: {
    color: COLORS.pink,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10,
  },
  actionBtnsStack: {
    marginTop: 24,
    gap: 10,
  },
  saveBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  cancelBtn: {
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
