/**
 * ChatComposer.tsx
 *
 * Floating glassmorphism message input bar with buzz button, send button,
 * and attachment menu. Uses BlurView for frosted glass effect.
 */
import React, { useState, useCallback, useRef } from "react";
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  Platform,
  Animated,
  KeyboardAvoidingView,
} from "react-native";
import { BlurView } from "expo-blur";
import { Send, Zap, Plus, MapPin, Map, Film } from "lucide-react-native";
import { COLORS } from "@/shared/theme/colors";
import { RADIUS } from "@/shared/theme/radius";
import { SPACING } from "@/shared/theme/spacing";
import { TYPOGRAPHY } from "@/shared/theme/typography";
import { BLUR } from "@/shared/theme/blur";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";

interface ChatComposerProps {
  onSend: (text: string) => void;
  onBuzz: () => void;
  onTextChange?: (text: string) => void;
  onShareLocation?: () => void;
  onSharePlace?: () => void;
  onShareReplay?: () => void;
  isSending?: boolean;
  isDark?: boolean;
}

export function ChatComposer({
  onSend,
  onBuzz,
  onTextChange,
  onShareLocation,
  onSharePlace,
  onShareReplay,
  isSending = false,
  isDark = true,
}: ChatComposerProps) {
  const [text, setText] = useState("");
  const [showAttachments, setShowAttachments] = useState(false);
  const sendScale = useRef(new Animated.Value(1)).current;
  const buzzScale = useRef(new Animated.Value(1)).current;

  const handleTextChange = useCallback(
    (value: string) => {
      setText(value);
      onTextChange?.(value);
    },
    [onTextChange]
  );

  const handleSend = useCallback(() => {
    if (!text.trim() || isSending) return;

    // Spring animation on send
    Animated.sequence([
      Animated.spring(sendScale, {
        toValue: 1.3,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(sendScale, {
        toValue: 1,
        tension: 150,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();

    WANDER_HAPTICS.light();
    onSend(text.trim());
    setText("");
    onTextChange?.("");
  }, [text, isSending, onSend, onTextChange, sendScale]);

  const handleBuzz = useCallback(() => {
    Animated.sequence([
      Animated.spring(buzzScale, {
        toValue: 1.4,
        tension: 250,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(buzzScale, {
        toValue: 1,
        tension: 150,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    WANDER_HAPTICS.heavy();
    onBuzz();
  }, [onBuzz, buzzScale]);

  const toggleAttachments = useCallback(() => {
    WANDER_HAPTICS.tick();
    setShowAttachments((prev) => !prev);
  }, []);

  const theme = COLORS.get(isDark);
  const hasText = text.trim().length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Attachment Menu */}
      {showAttachments && (
        <View style={styles.attachmentMenu}>
          <Pressable
            style={styles.attachmentItem}
            onPress={() => {
              onShareLocation?.();
              setShowAttachments(false);
            }}
          >
            <View style={[styles.attachmentIcon, { backgroundColor: "rgba(0, 240, 255, 0.15)" }]}>
              <MapPin size={18} color={COLORS.cyan} strokeWidth={2} />
            </View>
            <Text style={styles.attachmentLabel}>Location</Text>
          </Pressable>
          <Pressable
            style={styles.attachmentItem}
            onPress={() => {
              onSharePlace?.();
              setShowAttachments(false);
            }}
          >
            <View style={[styles.attachmentIcon, { backgroundColor: "rgba(138, 63, 252, 0.15)" }]}>
              <Map size={18} color={COLORS.purple} strokeWidth={2} />
            </View>
            <Text style={styles.attachmentLabel}>Place</Text>
          </Pressable>
          <Pressable
            style={styles.attachmentItem}
            onPress={() => {
              onShareReplay?.();
              setShowAttachments(false);
            }}
          >
            <View style={[styles.attachmentIcon, { backgroundColor: "rgba(255, 91, 153, 0.15)" }]}>
              <Film size={18} color={COLORS.pink} strokeWidth={2} />
            </View>
            <Text style={styles.attachmentLabel}>Replay</Text>
          </Pressable>
        </View>
      )}

      {/* Composer Bar */}
      <View style={styles.composerWrapper}>
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={BLUR.intensity.heavy}
            tint={BLUR.tint.dark}
            style={styles.blurContainer}
          >
            <ComposerInner
              text={text}
              hasText={hasText}
              isSending={isSending}
              sendScale={sendScale}
              buzzScale={buzzScale}
              theme={theme}
              onTextChange={handleTextChange}
              onSend={handleSend}
              onBuzz={handleBuzz}
              onToggleAttachments={toggleAttachments}
              showAttachments={showAttachments}
            />
          </BlurView>
        ) : (
          <View style={[styles.blurContainer, styles.fallbackBg]}>
            <ComposerInner
              text={text}
              hasText={hasText}
              isSending={isSending}
              sendScale={sendScale}
              buzzScale={buzzScale}
              theme={theme}
              onTextChange={handleTextChange}
              onSend={handleSend}
              onBuzz={handleBuzz}
              onToggleAttachments={toggleAttachments}
              showAttachments={showAttachments}
            />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Inner Composer Content ────────────────────────────────────────

interface ComposerInnerProps {
  text: string;
  hasText: boolean;
  isSending: boolean;
  sendScale: Animated.Value;
  buzzScale: Animated.Value;
  theme: ReturnType<typeof COLORS.get>;
  onTextChange: (text: string) => void;
  onSend: () => void;
  onBuzz: () => void;
  onToggleAttachments: () => void;
  showAttachments: boolean;
}

function ComposerInner({
  text,
  hasText,
  isSending,
  sendScale,
  buzzScale,
  theme,
  onTextChange,
  onSend,
  onBuzz,
  onToggleAttachments,
  showAttachments,
}: ComposerInnerProps) {
  return (
    <View style={styles.innerRow}>
      {/* Attachment Toggle */}
      <Pressable onPress={onToggleAttachments} style={styles.iconBtn}>
        <Plus
          size={20}
          color={showAttachments ? COLORS.cyan : "rgba(255,255,255,0.5)"}
          strokeWidth={2.5}
          style={showAttachments ? { transform: [{ rotate: "45deg" }] } : undefined}
        />
      </Pressable>

      {/* Text Input */}
      <TextInput
        style={[styles.input, { color: theme.text }]}
        placeholder="Message..."
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={text}
        onChangeText={onTextChange}
        multiline
        maxLength={2000}
        textAlignVertical="center"
      />

      {/* Buzz Button */}
      {!hasText && (
        <Animated.View style={{ transform: [{ scale: buzzScale }] }}>
          <Pressable onPress={onBuzz} style={styles.buzzBtn}>
            <Zap size={18} color={COLORS.yellow} strokeWidth={2.5} fill={COLORS.yellow} />
          </Pressable>
        </Animated.View>
      )}

      {/* Send Button */}
      {hasText && (
        <Animated.View style={{ transform: [{ scale: sendScale }] }}>
          <Pressable
            onPress={onSend}
            disabled={isSending}
            style={[styles.sendBtn, isSending && styles.sendBtnDisabled]}
          >
            <Send size={16} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  composerWrapper: {
    paddingHorizontal: SPACING.md,
    paddingBottom: Platform.OS === "ios" ? SPACING.xs : SPACING.sm,
  },
  blurContainer: {
    borderRadius: RADIUS.cardLarge,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  fallbackBg: {
    backgroundColor: "rgba(20, 20, 24, 0.92)",
  },
  innerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minHeight: 44,
    gap: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.round,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.base,
    maxHeight: 100,
    paddingHorizontal: SPACING.sm,
    paddingVertical: Platform.OS === "ios" ? SPACING.sm : SPACING.xs,
    lineHeight: 20,
  },
  buzzBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.round,
    backgroundColor: "rgba(255, 245, 0, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.purple,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  // Attachment menu
  attachmentMenu: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
    backgroundColor: "rgba(20, 20, 24, 0.85)",
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  attachmentItem: {
    alignItems: "center",
    gap: 6,
  },
  attachmentIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.round,
    justifyContent: "center",
    alignItems: "center",
  },
  attachmentLabel: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
