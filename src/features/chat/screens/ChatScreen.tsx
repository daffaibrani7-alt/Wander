/**
 * ChatScreen.tsx
 *
 * Full conversation view — the core messaging experience.
 * Features an inverted FlatList with message bubbles, typing indicator,
 * day separators, buzz effect overlay, and floating composer.
 */
import React, { useEffect, useMemo, useCallback, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { ChevronLeft, MoreHorizontal, Compass } from "lucide-react-native";
import { CircleHubPanel } from "@/features/chat/components/CircleHubPanel";
import { useChatStore } from "@/features/chat/store/useChatStore";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { useChatPresence } from "@/features/chat/hooks/useChatPresence";
import { useChatTyping } from "@/features/chat/hooks/useChatTyping";
import { MessageBubble } from "@/features/chat/components/MessageBubble";
import { ChatComposer } from "@/features/chat/components/ChatComposer";
import { BuzzEffect } from "@/features/chat/components/BuzzEffect";
import { COLORS } from "@/shared/theme/colors";
import { RADIUS } from "@/shared/theme/radius";
import { SPACING } from "@/shared/theme/spacing";
import { TYPOGRAPHY } from "@/shared/theme/typography";
import { BLUR } from "@/shared/theme/blur";
import type { Conversation, Message } from "@/features/chat/types/types";

interface ChatScreenProps {
  conversationId: string;
  onBack: () => void;
}

// ─── Typing Indicator Animation ────────────────────────────────────
function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;

  const label = names.length === 1
    ? `${names[0]} is typing`
    : `${names.join(", ")} are typing`;

  return (
    <View style={typingStyles.container}>
      <View style={typingStyles.bubble}>
        <View style={typingStyles.dotsRow}>
          <View style={[typingStyles.dot, typingStyles.dot1]} />
          <View style={[typingStyles.dot, typingStyles.dot2]} />
          <View style={[typingStyles.dot, typingStyles.dot3]} />
        </View>
      </View>
      <Text style={typingStyles.label}>{label}</Text>
    </View>
  );
}

const typingStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
  },
  bubble: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomLeftRadius: RADIUS.xs,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.8,
  },
  label: {
    color: "rgba(255, 255, 255, 0.35)",
    fontSize: TYPOGRAPHY.sizes.sm,
    fontStyle: "italic",
  },
});

// ─── Day Separator ─────────────────────────────────────────────────
function DaySeparator({ date }: { date: string }) {
  const label = useMemo(() => {
    const d = new Date(date);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === now.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [date]);

  return (
    <View style={separatorStyles.container}>
      <View style={separatorStyles.line} />
      <Text style={separatorStyles.label}>{label}</Text>
      <View style={separatorStyles.line} />
    </View>
  );
}

const separatorStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  label: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});

// ─── Reaction Picker ───────────────────────────────────────────────
const QUICK_REACTIONS = ["❤️", "🔥", "😂", "😮", "😢", "👍"];

function ReactionPicker({
  visible,
  onSelect,
  onDismiss,
}: {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onDismiss: () => void;
}) {
  if (!visible) return null;

  return (
    <Pressable style={pickerStyles.overlay} onPress={onDismiss}>
      <View style={pickerStyles.container}>
        {QUICK_REACTIONS.map((emoji) => (
          <Pressable
            key={emoji}
            style={pickerStyles.option}
            onPress={() => onSelect(emoji)}
          >
            <Text style={pickerStyles.emoji}>{emoji}</Text>
          </Pressable>
        ))}
      </View>
    </Pressable>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: 100,
  },
  container: {
    flexDirection: "row",
    backgroundColor: "rgba(30, 30, 35, 0.95)",
    borderRadius: RADIUS.card,
    padding: SPACING.sm,
    gap: 2,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  option: {
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  emoji: {
    fontSize: 26,
  },
});

// ─── Main Screen ───────────────────────────────────────────────────
export function ChatScreen({ conversationId, onBack }: ChatScreenProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);
  const user = useAuthStore((s) => s.user);
  const currentUid = user?.uid || "default-me";
  const currentName = user?.displayName || "You";

  // Chat store
  const openConversation = useChatStore((s) => s.openConversation);
  const closeConversation = useChatStore((s) => s.closeConversation);
  const sendMessageAction = useChatStore((s) => s.sendMessageAction);
  const sendBuzzAction = useChatStore((s) => s.sendBuzzAction);
  const addReactionAction = useChatStore((s) => s.addReactionAction);
  const conversations = useChatStore((s) => s.conversations);
  const messages = useChatStore((s) => s.messages);
  const isSending = useChatStore((s) => s.isSending);
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages);

  // Local state
  const [showBuzz, setShowBuzz] = useState(false);
  const [buzzSender, setBuzzSender] = useState<string | undefined>();
  const [reactionTarget, setReactionTarget] = useState<Message | null>(null);
  const [isCircleHubVisible, setCircleHubVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Find conversation
  const conversation = useMemo(
    () => conversations.find((c) => c.id === conversationId),
    [conversations, conversationId]
  );

  const conversationMessages = messages[conversationId] || [];

  // Derive other participants
  const otherParticipants = useMemo(() => {
    if (!conversation) return [];
    return Object.values(conversation.participantProfiles).filter(
      (p) => p.uid !== currentUid
    );
  }, [conversation, currentUid]);

  const participantUids = conversation?.participantUids || [];
  const presenceStatuses = useChatPresence(participantUids, currentUid);

  const { onTextChange, stopTyping } = useChatTyping(conversationId, currentUid);

  // Open conversation on mount
  useEffect(() => {
    if (currentUid && conversationId) {
      openConversation(conversationId, currentUid);
    }
    return () => {
      stopTyping();
      closeConversation();
    };
  }, [conversationId, currentUid, openConversation, closeConversation, stopTyping]);

  // Detect incoming buzz messages
  const lastMsgRef = useRef<string | null>(null);
  useEffect(() => {
    if (conversationMessages.length === 0) return;
    const lastMsg = conversationMessages[conversationMessages.length - 1];
    if (
      lastMsg.type === "buzz" &&
      lastMsg.senderUid !== currentUid &&
      lastMsg.id !== lastMsgRef.current
    ) {
      lastMsgRef.current = lastMsg.id;
      const sender = conversation?.participantProfiles[lastMsg.senderUid];
      setBuzzSender(sender?.displayName);
      setShowBuzz(true);
    }
  }, [conversationMessages, currentUid, conversation]);

  // Display info
  const displayName = conversation?.groupName ||
    otherParticipants.map((p) => p.displayName).join(", ") ||
    "Chat";

  const primaryPresence = presenceStatuses[0];
  const statusLine = primaryPresence
    ? `${primaryPresence.activityEmoji} ${primaryPresence.activityLabel}`
    : "";

  // Typing users (excluding self)
  const typingNames = useMemo(() => {
    if (!conversation) return [];
    return conversation.typingUsers
      .filter((uid) => uid !== currentUid)
      .map((uid) => conversation.participantProfiles[uid]?.displayName?.split(" ")[0] || "Someone");
  }, [conversation, currentUid]);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleSend = useCallback(
    (text: string) => {
      stopTyping();
      sendMessageAction(conversationId, currentUid, currentName, "text", text);
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    [conversationId, currentUid, currentName, sendMessageAction, stopTyping]
  );

  const handleBuzz = useCallback(() => {
    sendBuzzAction(conversationId, currentUid, currentName, "normal");
  }, [conversationId, currentUid, currentName, sendBuzzAction]);

  const handleLongPress = useCallback((message: Message) => {
    setReactionTarget(message);
  }, []);

  const handleReaction = useCallback(
    (emoji: string) => {
      if (reactionTarget) {
        addReactionAction(conversationId, reactionTarget.id, currentUid, emoji);
      }
      setReactionTarget(null);
    },
    [reactionTarget, conversationId, currentUid, addReactionAction]
  );

  // ── Message List with Day Separators ─────────────────────────────

  type ListItem =
    | { type: "separator"; date: string; key: string }
    | { type: "message"; message: Message; key: string };

  const listData: ListItem[] = useMemo(() => {
    const items: ListItem[] = [];
    let lastDate = "";

    conversationMessages.forEach((msg) => {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== lastDate) {
        items.push({ type: "separator", date: msg.createdAt, key: `sep-${msgDate}` });
        lastDate = msgDate;
      }
      items.push({ type: "message", message: msg, key: msg.id });
    });

    return items;
  }, [conversationMessages]);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === "separator") {
        return <DaySeparator date={item.date} />;
      }

      const msg = item.message;
      const isOwn = msg.senderUid === currentUid;
      const senderProfile = conversation?.participantProfiles[msg.senderUid];
      const isGroup = conversation?.type === "group";

      // Check if read by all others
      const otherUids = participantUids.filter((u) => u !== currentUid);
      const isRead = otherUids.every((uid) => !!msg.readBy[uid]);

      return (
        <MessageBubble
          message={msg}
          isOwn={isOwn}
          senderProfile={senderProfile}
          showSenderName={isGroup}
          isRead={isRead}
          onLongPress={handleLongPress}
          isDark={isDark}
        />
      );
    },
    [currentUid, conversation, participantUids, isDark, handleLongPress]
  );

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Buzz Effect Overlay */}
      <BuzzEffect
        visible={showBuzz}
        intensity="normal"
        senderName={buzzSender}
        onDismiss={() => setShowBuzz(false)}
      />

      {/* Reaction Picker */}
      <ReactionPicker
        visible={reactionTarget !== null}
        onSelect={handleReaction}
        onDismiss={() => setReactionTarget(null)}
      />

      {/* Circle Hub overlay panel */}
      {conversation && (
        <CircleHubPanel
          visible={isCircleHubVisible}
          onClose={() => setCircleHubVisible(false)}
          conversation={conversation}
          isDark={isDark}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={BLUR.intensity.medium}
            tint={BLUR.tint.dark}
            style={styles.headerBlur}
          >
            <ChatHeader
              displayName={displayName}
              statusLine={statusLine}
              onBack={onBack}
              theme={theme}
              isGroup={conversation?.type === "group"}
              onOpenCircleHub={() => setCircleHubVisible(true)}
            />
          </BlurView>
        ) : (
          <View style={[styles.headerBlur, styles.headerFallback]}>
            <ChatHeader
              displayName={displayName}
              statusLine={statusLine}
              onBack={onBack}
              theme={theme}
              isGroup={conversation?.type === "group"}
              onOpenCircleHub={() => setCircleHubVisible(true)}
            />
          </View>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
      />

      {/* Typing Indicator */}
      <TypingIndicator names={typingNames} />

      {/* Composer */}
      <ChatComposer
        onSend={handleSend}
        onBuzz={handleBuzz}
        onTextChange={onTextChange}
        isSending={isSending}
        isDark={isDark}
      />
    </View>
  );
}

// ─── Chat Header ───────────────────────────────────────────────────
function ChatHeader({
  displayName,
  statusLine,
  onBack,
  theme,
  isGroup,
  onOpenCircleHub,
}: {
  displayName: string;
  statusLine: string;
  onBack: () => void;
  theme: ReturnType<typeof COLORS.get>;
  isGroup: boolean;
  onOpenCircleHub: () => void;
}) {
  return (
    <View style={styles.headerInner}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <ChevronLeft size={24} color={COLORS.cyan} strokeWidth={2} />
      </Pressable>

      <View style={styles.headerCenter}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.headerName, { color: theme.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          {isGroup && (
            <Pressable onPress={onOpenCircleHub} style={styles.hubHeaderBadge} id="open-circle-hub">
              <Compass size={11} color={COLORS.cyan} style={{ marginRight: 3 }} />
              <Text style={styles.hubHeaderBadgeText}>Circle Hub</Text>
            </Pressable>
          )}
        </View>
        {statusLine.length > 0 && !isGroup && (
          <Text style={styles.headerStatus}>{statusLine}</Text>
        )}
        {isGroup && (
          <Text style={styles.headerStatusGroup}>Ambient Active Session</Text>
        )}
      </View>

      <Pressable style={styles.moreBtn}>
        <MoreHorizontal size={20} color="rgba(255,255,255,0.5)" strokeWidth={2} />
      </Pressable>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 54 : 40,
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerName: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  headerStatus: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.green,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginTop: 1,
  },
  moreBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  messageList: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  hubHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 240, 255, 0.12)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: "rgba(0, 240, 255, 0.25)",
  },
  hubHeaderBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: COLORS.cyan,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  headerStatusGroup: {
    fontSize: 10.5,
    color: COLORS.cyan,
    fontWeight: "700",
    marginTop: 1,
    letterSpacing: 0.2,
  },
});
