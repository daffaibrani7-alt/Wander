/**
 * ConversationListScreen.tsx
 *
 * Premium iMessage-inspired conversation list with glassmorphism styling,
 * unread badges, typing indicators, and relative timestamps.
 */
import React, { useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Search, MessageCircle } from "lucide-react-native";
import { useChatStore } from "@/features/chat/store/useChatStore";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { COLORS } from "@/shared/theme/colors";
import { RADIUS } from "@/shared/theme/radius";
import { SPACING } from "@/shared/theme/spacing";
import { TYPOGRAPHY } from "@/shared/theme/typography";
import { SHADOWS } from "@/shared/theme/shadows";
import { BLUR } from "@/shared/theme/blur";
import type { Conversation } from "@/features/chat/types/types";

interface ConversationListScreenProps {
  onOpenConversation: (conversationId: string) => void;
}

// ─── Relative Timestamp ────────────────────────────────────────────
function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[new Date(isoDate).getDay()];
  }
  return new Date(isoDate).toLocaleDateString([], { month: "short", day: "numeric" });
}

// ─── Last Message Preview ──────────────────────────────────────────
function getLastMessagePreview(conv: Conversation, currentUid: string): string {
  if (!conv.lastMessage) return "Start a conversation";

  const prefix =
    conv.lastMessage.senderUid === currentUid
      ? "You: "
      : conv.type === "group"
      ? `${conv.lastMessage.senderName.split(" ")[0]}: `
      : "";

  switch (conv.lastMessage.type) {
    case "buzz":
      return `${prefix}⚡ Sent a buzz`;
    case "location":
      return `${prefix}📍 Shared location`;
    case "place":
      return `${prefix}🗺️ Shared a place`;
    case "replay":
      return `${prefix}🎬 Shared a replay`;
    case "voice":
      return `${prefix}🎤 Voice message`;
    case "image":
      return `${prefix}📷 Photo`;
    case "system":
      return conv.lastMessage.content;
    default:
      return `${prefix}${conv.lastMessage.content}`;
  }
}

// ─── Typing Indicator ──────────────────────────────────────────────
function TypingText({ typingUsers, conv, currentUid }: { typingUsers: string[]; conv: Conversation; currentUid: string }) {
  const others = typingUsers.filter((uid) => uid !== currentUid);
  if (others.length === 0) return null;

  const names = others
    .map((uid) => conv.participantProfiles[uid]?.displayName?.split(" ")[0] || "Someone")
    .join(", ");

  return (
    <Text style={typingStyles.text} numberOfLines={1}>
      {names} is typing
      <Text style={typingStyles.dots}> ...</Text>
    </Text>
  );
}

const typingStyles = StyleSheet.create({
  text: {
    color: COLORS.cyan,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontStyle: "italic",
  },
  dots: {
    color: COLORS.cyan,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});

// ─── Conversation Cell ─────────────────────────────────────────────
function ConversationCell({
  conversation,
  currentUid,
  onPress,
  isDark,
}: {
  conversation: Conversation;
  currentUid: string;
  onPress: () => void;
  isDark: boolean;
}) {
  const theme = COLORS.get(isDark);
  const unread = conversation.unreadCount[currentUid] || 0;
  const hasUnread = unread > 0;
  const isTyping = conversation.typingUsers.filter((u) => u !== currentUid).length > 0;

  // Derive display name and avatar
  const otherParticipants = Object.values(conversation.participantProfiles).filter(
    (p) => p.uid !== currentUid
  );
  const displayName =
    conversation.groupName ||
    otherParticipants.map((p) => p.displayName).join(", ") ||
    "Unknown";
  const avatarEmoji =
    conversation.groupEmoji ||
    otherParticipants[0]?.avatarEmoji ||
    "💬";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        cellStyles.container,
        {
          backgroundColor: pressed
            ? "rgba(255, 255, 255, 0.04)"
            : "transparent",
        },
      ]}
    >
      {/* Avatar */}
      <View style={[cellStyles.avatar, hasUnread && cellStyles.avatarUnread]}>
        <Text style={cellStyles.avatarEmoji}>{avatarEmoji}</Text>
        {/* Online indicator dot */}
        <View
          style={[
            cellStyles.statusDot,
            { backgroundColor: COLORS.green },
          ]}
        />
      </View>

      {/* Content */}
      <View style={cellStyles.content}>
        <View style={cellStyles.topRow}>
          <Text
            style={[
              cellStyles.name,
              { color: theme.text },
              hasUnread && cellStyles.nameUnread,
            ]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text
            style={[
              cellStyles.time,
              hasUnread && cellStyles.timeUnread,
            ]}
          >
            {conversation.lastMessage
              ? formatRelativeTime(conversation.lastMessage.createdAt)
              : ""}
          </Text>
        </View>

        <View style={cellStyles.bottomRow}>
          {isTyping ? (
            <TypingText
              typingUsers={conversation.typingUsers}
              conv={conversation}
              currentUid={currentUid}
            />
          ) : (
            <Text
              style={[
                cellStyles.preview,
                hasUnread && cellStyles.previewUnread,
              ]}
              numberOfLines={1}
            >
              {getLastMessagePreview(conversation, currentUid)}
            </Text>
          )}

          {hasUnread && (
            <View style={cellStyles.badge}>
              <Text style={cellStyles.badgeText}>
                {unread > 99 ? "99+" : unread}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const cellStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.round,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarUnread: {
    borderWidth: 2,
    borderColor: COLORS.purple,
    ...SHADOWS.glowPurple,
    shadowOpacity: 0.3,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  statusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: "#000000",
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.medium,
    flex: 1,
    marginRight: 8,
  },
  nameUnread: {
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  time: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: "rgba(255, 255, 255, 0.35)",
  },
  timeUnread: {
    color: COLORS.purple,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  preview: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.base,
    color: "rgba(255, 255, 255, 0.4)",
    marginRight: 8,
  },
  previewUnread: {
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  badge: {
    backgroundColor: COLORS.pink,
    borderRadius: RADIUS.round,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.glowPink,
    shadowOpacity: 0.4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
});

// ─── Empty State ───────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconContainer}>
        <MessageCircle size={48} color={COLORS.purple} strokeWidth={1.5} />
      </View>
      <Text style={emptyStyles.title}>Keheningan Sebelum Cerita</Text>
      <Text style={emptyStyles.subtitle}>
        Langkah terjauh sekalipun berawal dari sapaan hangat. Mari bagikan memori penjelajahan Anda atau kirimkan Buzz manis ke teman untuk memulai cerita baru.
      </Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xxxl,
    paddingBottom: 100,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(138, 63, 252, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: "rgba(138, 63, 252, 0.2)",
  },
  title: {
    color: "#FFFFFF",
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: TYPOGRAPHY.sizes.base,
    textAlign: "center",
    lineHeight: 20,
  },
});

// ─── Main Screen ───────────────────────────────────────────────────
export function ConversationListScreen({ onOpenConversation }: ConversationListScreenProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);
  const user = useAuthStore((s) => s.user);
  const conversations = useChatStore((s) => s.conversations);
  const isLoading = useChatStore((s) => s.isLoadingConversations);
  const initializeConversationListener = useChatStore((s) => s.initializeConversationListener);

  const currentUid = user?.uid || "default-me";

  // Initialize listener
  useEffect(() => {
    if (!currentUid) return;
    const unsub = initializeConversationListener(currentUid);
    return () => unsub();
  }, [currentUid, initializeConversationListener]);

  const renderItem = useCallback(
    ({ item }: { item: Conversation }) => (
      <ConversationCell
        conversation={item}
        currentUid={currentUid}
        onPress={() => onOpenConversation(item.id)}
        isDark={isDark}
      />
    ),
    [currentUid, isDark, onOpenConversation]
  );

  const keyExtractor = useCallback((item: Conversation) => item.id, []);

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      // Pinned conversations first
      const aPinned = a.pinnedBy.includes(currentUid);
      const bPinned = b.pinnedBy.includes(currentUid);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      // Then by updatedAt
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [conversations, currentUid]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={BLUR.intensity.medium}
            tint={BLUR.tint.dark}
            style={styles.headerBlur}
          >
            <HeaderContent theme={theme} />
          </BlurView>
        ) : (
          <View style={[styles.headerBlur, styles.headerFallback]}>
            <HeaderContent theme={theme} />
          </View>
        )}
      </View>

      {/* Conversation List */}
      <FlatList
        data={sortedConversations}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          sortedConversations.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={!isLoading ? <EmptyState /> : null}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ─── Header Content ────────────────────────────────────────────────
function HeaderContent({ theme }: { theme: ReturnType<typeof COLORS.get> }) {
  return (
    <View style={styles.headerInner}>
      <Text style={[styles.headerTitle, { color: theme.text }]}>Percakapan Kita</Text>
      <View style={[styles.searchBar, { backgroundColor: theme.inputBg }]}>
        <Search size={16} color="rgba(255,255,255,0.3)" strokeWidth={2} />
        <Text style={styles.searchPlaceholder}>Cari percakapan...</Text>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 48,
    zIndex: 10,
  },
  headerBlur: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  headerFallback: {
    backgroundColor: "rgba(10, 10, 12, 0.95)",
  },
  headerInner: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.title,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: TYPOGRAPHY.letterSpacings.tight,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  searchPlaceholder: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: TYPOGRAPHY.sizes.base,
  },
  listContent: {
    paddingTop: SPACING.sm,
    paddingBottom: 120,
  },
  listContentEmpty: {
    flex: 1,
  },
});
