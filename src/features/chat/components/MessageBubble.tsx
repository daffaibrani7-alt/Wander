/**
 * MessageBubble.tsx
 *
 * Premium message bubble component with support for all message types.
 * Renders text, buzz, location, place, system, and voice messages
 * with appropriate visual treatments.
 */
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import type { Message, ChatParticipant } from "@/features/chat/types/types";
import { COLORS } from "@/shared/theme/colors";
import { RADIUS } from "@/shared/theme/radius";
import { SPACING } from "@/shared/theme/spacing";
import { TYPOGRAPHY } from "@/shared/theme/typography";
import { SHADOWS } from "@/shared/theme/shadows";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderProfile?: ChatParticipant;
  showSenderName?: boolean;
  isRead?: boolean;
  onLongPress?: (message: Message) => void;
  isDark?: boolean;
}

// ─── Reaction Pills ────────────────────────────────────────────────
function ReactionPills({ reactions }: { reactions: Record<string, string> }) {
  const entries = Object.entries(reactions);
  if (entries.length === 0) return null;

  // Group by emoji
  const grouped: Record<string, number> = {};
  entries.forEach(([, emoji]) => {
    grouped[emoji] = (grouped[emoji] || 0) + 1;
  });

  return (
    <View style={reactionStyles.container}>
      {Object.entries(grouped).map(([emoji, count]) => (
        <View key={emoji} style={reactionStyles.pill}>
          <Text style={reactionStyles.emoji}>{emoji}</Text>
          {count > 1 && <Text style={reactionStyles.count}>{count}</Text>}
        </View>
      ))}
    </View>
  );
}

const reactionStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: RADIUS.round,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 2,
  },
  emoji: {
    fontSize: 12,
  },
  count: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});

// ─── Read Receipts ─────────────────────────────────────────────────
function ReadReceipt({ isRead, isPending }: { isRead: boolean; isPending?: boolean }) {
  if (isPending) {
    return <Text style={receiptStyles.pending}>○</Text>;
  }
  return (
    <Text style={[receiptStyles.check, isRead && receiptStyles.read]}>
      {isRead ? "✓✓" : "✓"}
    </Text>
  );
}

const receiptStyles = StyleSheet.create({
  check: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.4)",
    marginLeft: 4,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  read: {
    color: COLORS.cyan,
  },
  pending: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.3)",
    marginLeft: 4,
  },
});

// ─── Timestamp ─────────────────────────────────────────────────────
function MessageTimestamp({ date, isOwn }: { date: string; isOwn: boolean }) {
  const timeStr = useMemo(() => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [date]);

  return (
    <Text
      style={[
        timestampStyles.text,
        isOwn ? timestampStyles.own : timestampStyles.other,
      ]}
    >
      {timeStr}
    </Text>
  );
}

const timestampStyles = StyleSheet.create({
  text: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: 2,
  },
  own: {
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "right",
  },
  other: {
    color: "rgba(255, 255, 255, 0.35)",
    textAlign: "left",
  },
});

// ─── Location Preview ──────────────────────────────────────────────
function LocationPreview({ metadata }: { metadata?: Message["metadata"] }) {
  return (
    <View style={locationStyles.container}>
      <View style={locationStyles.mapPlaceholder}>
        <Text style={locationStyles.pin}>📍</Text>
      </View>
      <Text style={locationStyles.name}>
        {metadata?.placeName || "Shared Location"}
      </Text>
      {metadata?.latitude && metadata?.longitude && (
        <Text style={locationStyles.coords}>
          {metadata.latitude.toFixed(4)}, {metadata.longitude.toFixed(4)}
        </Text>
      )}
    </View>
  );
}

const locationStyles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    overflow: "hidden",
  },
  mapPlaceholder: {
    height: 100,
    backgroundColor: "rgba(0, 240, 255, 0.08)",
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  pin: {
    fontSize: 28,
  },
  name: {
    color: "#FFFFFF",
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  coords: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: 2,
  },
});

// ─── Buzz Message ──────────────────────────────────────────────────
function BuzzBubble({ intensity }: { intensity?: string }) {
  return (
    <View style={buzzStyles.container}>
      <Text style={buzzStyles.icon}>⚡</Text>
      <Text style={buzzStyles.label}>BUZZ</Text>
      <Text style={buzzStyles.intensity}>
        {intensity === "urgent" ? "🔥 Urgent" : intensity === "gentle" ? "💫 Gentle" : ""}
      </Text>
    </View>
  );
}

const buzzStyles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    alignItems: "center",
    gap: 2,
  },
  icon: {
    fontSize: 28,
  },
  label: {
    color: "#FFFFFF",
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: TYPOGRAPHY.letterSpacings.wider,
  },
  intensity: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: TYPOGRAPHY.sizes.sm,
  },
});

// ─── Main Component ────────────────────────────────────────────────
export function MessageBubble({
  message,
  isOwn,
  senderProfile,
  showSenderName = false,
  isRead = false,
  onLongPress,
  isDark = true,
}: MessageBubbleProps) {
  // System messages render centered
  if (message.type === "system") {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{message.content}</Text>
      </View>
    );
  }

  const isBuzz = message.type === "buzz";

  // Buzz messages render full-width
  if (isBuzz) {
    return (
      <Pressable
        onLongPress={() => onLongPress?.(message)}
        style={styles.buzzContainer}
      >
        <View style={styles.buzzGradient}>
          <BuzzBubble intensity={message.metadata?.buzzIntensity} />
        </View>
        <MessageTimestamp date={message.createdAt} isOwn={false} />
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.row,
        isOwn ? styles.rowOwn : styles.rowOther,
      ]}
    >
      {/* Avatar for incoming messages */}
      {!isOwn && (
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>{senderProfile?.avatarEmoji || "🔵"}</Text>
        </View>
      )}

      <View style={[styles.bubbleWrapper, isOwn ? styles.wrapperOwn : styles.wrapperOther]}>
        {/* Sender name for group chats */}
        {showSenderName && !isOwn && senderProfile && (
          <Text style={styles.senderName}>{senderProfile.displayName}</Text>
        )}

        <Pressable
          onLongPress={() => onLongPress?.(message)}
          style={[
            styles.bubble,
            isOwn ? styles.bubbleOwn : styles.bubbleOther,
            message._pending && styles.bubblePending,
          ]}
        >
          {/* Content by type */}
          {message.type === "location" || message.type === "place" ? (
            <LocationPreview metadata={message.metadata} />
          ) : (
            <Text
              style={[
                styles.messageText,
                isOwn ? styles.textOwn : styles.textOther,
              ]}
            >
              {message.content}
            </Text>
          )}

          {/* Timestamp + Read Receipt Row */}
          <View style={styles.metaRow}>
            <MessageTimestamp date={message.createdAt} isOwn={isOwn} />
            {isOwn && (
              <ReadReceipt isRead={isRead} isPending={message._pending} />
            )}
          </View>
        </Pressable>

        {/* Reactions */}
        <ReactionPills reactions={message.reactions} />
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: 2,
    paddingHorizontal: SPACING.md,
  },
  rowOwn: {
    justifyContent: "flex-end",
  },
  rowOther: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.round,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    alignSelf: "flex-end",
    marginBottom: 4,
  },
  avatar: {
    fontSize: 16,
  },
  bubbleWrapper: {
    maxWidth: "75%",
  },
  wrapperOwn: {
    alignItems: "flex-end",
  },
  wrapperOther: {
    alignItems: "flex-start",
  },
  senderName: {
    color: COLORS.cyan,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xxl,
  },
  bubbleOwn: {
    backgroundColor: COLORS.purple,
    borderBottomRightRadius: RADIUS.xs,
    ...SHADOWS.glowPurple,
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  bubbleOther: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderBottomLeftRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  bubblePending: {
    opacity: 0.6,
  },
  messageText: {
    fontSize: TYPOGRAPHY.sizes.base,
    lineHeight: 20,
  },
  textOwn: {
    color: "#FFFFFF",
  },
  textOther: {
    color: "rgba(255, 255, 255, 0.9)",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 2,
  },
  // System messages
  systemContainer: {
    alignItems: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  systemText: {
    color: "rgba(255, 255, 255, 0.35)",
    fontSize: TYPOGRAPHY.sizes.sm,
    fontStyle: "italic",
    textAlign: "center",
  },
  // Buzz messages
  buzzContainer: {
    alignItems: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  buzzGradient: {
    borderRadius: RADIUS.card,
    overflow: "hidden",
    backgroundColor: "rgba(138, 63, 252, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(138, 63, 252, 0.4)",
    width: "100%",
    ...SHADOWS.glowPurple,
  },
});
