/**
 * ConversationListScreen.tsx
 *
 * Gorgeous Instagram-style DM and Active Presence Notes interface.
 * Features glassmorphic thought bubbles, horizontal notes tray,
 * interactive note creation, dynamic filtering, and clean spatial typography.
 * Now enriched with a premium Social Circle Creator wizard featuring
 * animated live avatar stacking, smart name suggestions, and circle type badges.
 * Completely localized in English.
 */
import React, { useEffect, useMemo, useCallback, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  TextInput,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { BlurView } from "expo-blur";
import { Search, Camera, Video, Plus, Check, ChevronDown, Sparkles } from "lucide-react-native";
import { useChatStore } from "@/features/chat/store/useChatStore";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { COLORS } from "@/shared/theme/colors";
import { RADIUS } from "@/shared/theme/radius";
import { SPACING } from "@/shared/theme/spacing";
import { TYPOGRAPHY } from "@/shared/theme/typography";
import { SHADOWS } from "@/shared/theme/shadows";
import { BLUR } from "@/shared/theme/blur";
import type { Conversation, ChatParticipant } from "@/features/chat/types/types";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CACHE_KEY_USER_NOTE = "wander_user_note_";

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
  if (diffDays === 1) return "1d";
  if (diffDays < 7) return `${diffDays}d`;
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

// ─── Thought Bubble Notes Tray Item ───────────────────────────────
function NoteTrayItem({
  avatarEmoji,
  displayName,
  noteText,
  isSelf,
  onPress,
  isDark,
}: {
  avatarEmoji: string;
  displayName: string;
  noteText: string;
  isSelf?: boolean;
  onPress: () => void;
  isDark: boolean;
}) {
  const theme = COLORS.get(isDark);
  const bubbleBg = isDark ? "rgba(35, 35, 42, 0.95)" : "rgba(240, 240, 246, 0.95)";
  const cardBorderColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)";

  return (
    <Pressable onPress={onPress} style={noteItemStyles.container}>
      <View style={noteItemStyles.bubbleContainer}>
        {/* Floating thought bubble */}
        {noteText.length > 0 ? (
          <View style={[noteItemStyles.bubble, { backgroundColor: bubbleBg, borderColor: cardBorderColor }]}>
            <Text style={[noteItemStyles.bubbleText, { color: theme.text }]} numberOfLines={2}>
              {noteText}
            </Text>
            {/* Thought tail dots */}
            <View style={[noteItemStyles.tail1, { backgroundColor: bubbleBg, borderColor: cardBorderColor }]} />
            <View style={[noteItemStyles.tail2, { backgroundColor: bubbleBg, borderColor: cardBorderColor }]} />
          </View>
        ) : isSelf ? (
          <View style={[noteItemStyles.bubblePrompt, { backgroundColor: bubbleBg, borderColor: cardBorderColor }]}>
            <Text style={[noteItemStyles.bubblePromptText, { color: theme.textMuted }]}>
              Share a thought
            </Text>
            <View style={[noteItemStyles.tail1, { backgroundColor: bubbleBg, borderColor: cardBorderColor }]} />
            <View style={[noteItemStyles.tail2, { backgroundColor: bubbleBg, borderColor: cardBorderColor }]} />
          </View>
        ) : null}

        {/* Avatar */}
        <View style={[noteItemStyles.avatar, { borderColor: cardBorderColor }]}>
          <Text style={noteItemStyles.avatarEmoji}>{avatarEmoji}</Text>
          {isSelf && (
            <View style={noteItemStyles.plusBadge}>
              <Plus size={10} color="#FFFFFF" strokeWidth={3} />
            </View>
          )}
          {!isSelf && (
            <View style={[noteItemStyles.onlineIndicator, { backgroundColor: COLORS.green }]} />
          )}
        </View>
      </View>
      <Text style={[noteItemStyles.nameText, { color: theme.textMuted }]} numberOfLines={1}>
        {isSelf ? "Your note" : displayName.split(" ")[0]}
      </Text>
    </Pressable>
  );
}

const noteItemStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: 84,
    marginRight: SPACING.md,
  },
  bubbleContainer: {
    height: 104,
    justifyContent: "flex-end",
    alignItems: "center",
    position: "relative",
    width: "100%",
  },
  bubble: {
    position: "absolute",
    top: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 55,
    maxWidth: 82,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.medium,
    shadowOpacity: 0.08,
  },
  bubblePrompt: {
    position: "absolute",
    top: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bubblePromptText: {
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
  },
  bubbleText: {
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 12,
  },
  tail1: {
    position: "absolute",
    bottom: -4,
    left: "50%",
    marginLeft: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 0.5,
  },
  tail2: {
    position: "absolute",
    bottom: -9,
    left: "50%",
    marginLeft: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    borderWidth: 0.5,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarEmoji: {
    fontSize: 28,
  },
  plusBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#0095f6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#000",
  },
  nameText: {
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
});

// ─── Instagram Notes Tray ──────────────────────────────────────────
function InstagramNotesTray({
  isDark,
  userNote,
  onOpenSelfNote,
  onOpenFriendConversation,
  conversations,
  currentUid,
}: {
  isDark: boolean;
  userNote: string;
  onOpenSelfNote: () => void;
  onOpenFriendConversation: (conversationId: string) => void;
  conversations: Conversation[];
  currentUid: string;
}) {
  const theme = COLORS.get(isDark);
  const scrollBorderColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)";

  // Extract unique active participants with notes
  const activeFriends = useMemo(() => {
    const list: { uid: string; displayName: string; avatarEmoji: string; noteText: string; conversationId: string }[] = [];
    const seedNotes: Record<string, string> = {
      "sim-1": "Coffee time? ☕",
      "sim-2": "Exploring 🗺️",
      "sim-3": "Buzz me! ⚡",
    };

    conversations.forEach((conv) => {
      const otherPart = Object.values(conv.participantProfiles).find((p) => p.uid !== currentUid);
      if (otherPart) {
        // Only map if they have simulated notes
        const mockNote = seedNotes[otherPart.uid];
        if (mockNote) {
          list.push({
            uid: otherPart.uid,
            displayName: otherPart.displayName,
            avatarEmoji: otherPart.avatarEmoji || "💬",
            noteText: mockNote,
            conversationId: conv.id,
          });
        }
      }
    });

    return list;
  }, [conversations, currentUid]);

  return (
    <View style={[notesTrayStyles.tray, { borderBottomColor: scrollBorderColor }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={notesTrayStyles.scroll}>
        {/* User Self Note */}
        <NoteTrayItem
          avatarEmoji="🦊"
          displayName="You"
          noteText={userNote}
          isSelf
          onPress={onOpenSelfNote}
          isDark={isDark}
        />

        {/* Friends Notes */}
        {activeFriends.map((friend) => (
          <NoteTrayItem
            key={friend.uid}
            avatarEmoji={friend.avatarEmoji}
            displayName={friend.displayName}
            noteText={friend.noteText}
            onPress={() => {
              WANDER_HAPTICS.tick();
              onOpenFriendConversation(friend.conversationId);
            }}
            isDark={isDark}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const notesTrayStyles = StyleSheet.create({
  tray: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1.5,
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
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

  const cardBorderColor = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        cellStyles.container,
        {
          backgroundColor: pressed
            ? isDark
              ? "rgba(255, 255, 255, 0.04)"
              : "rgba(0, 0, 0, 0.03)"
            : "transparent",
        },
      ]}
    >
      {/* High-fidelity avatar */}
      <View style={[cellStyles.avatarFrame, { borderColor: cardBorderColor }]}>
        <Text style={cellStyles.avatarEmoji}>{avatarEmoji}</Text>
        <View style={[cellStyles.onlineIndicator, { backgroundColor: COLORS.green }]} />
      </View>

      {/* Content */}
      <View style={cellStyles.content}>
        <View style={cellStyles.nameRow}>
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
          {conversation.groupType && (
            <View style={[cellStyles.circleTypeTag, { backgroundColor: "rgba(138, 63, 252, 0.12)", borderColor: "rgba(138, 63, 252, 0.25)" }]}>
              <Text style={cellStyles.circleTypeTagText}>{conversation.groupType.toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={cellStyles.messagePreviewRow}>
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
                hasUnread && [cellStyles.previewUnread, { color: theme.text }],
              ]}
              numberOfLines={1}
            >
              {getLastMessagePreview(conversation, currentUid)}
            </Text>
          )}
          <Text style={cellStyles.bulletTime}>
            • {conversation.lastMessage ? formatRelativeTime(conversation.lastMessage.createdAt) : ""}
          </Text>
        </View>
      </View>

      {/* Action items / unread badge */}
      <View style={cellStyles.rightActions}>
        {hasUnread ? (
          <View style={cellStyles.blueUnreadDot} />
        ) : (
          <Pressable
            onPress={() => {
              WANDER_HAPTICS.light();
              alert("Quick reply photo capture simulation triggered!");
            }}
            style={cellStyles.cameraBtn}
          >
            <Camera size={20} color="rgba(255, 255, 255, 0.4)" strokeWidth={2} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const cellStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    gap: SPACING.md,
  },
  avatarFrame: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarEmoji: {
    fontSize: 26,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2,
    borderColor: "#000",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 14.5,
    fontWeight: "600",
    maxWidth: SCREEN_WIDTH * 0.45,
  },
  nameUnread: {
    fontWeight: "800",
  },
  circleTypeTag: {
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 0.5,
  },
  circleTypeTagText: {
    fontSize: 7.5,
    fontWeight: "900",
    color: COLORS.purple,
    letterSpacing: 0.2,
  },
  messagePreviewRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  preview: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.45)",
    maxWidth: SCREEN_WIDTH * 0.5,
  },
  previewUnread: {
    fontWeight: "700",
  },
  bulletTime: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.35)",
    marginLeft: 4,
  },
  rightActions: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  blueUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0095f6",
  },
  cameraBtn: {
    padding: 6,
  },
});

// ─── Empty State ───────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconContainer}>
        <Plus size={36} color={COLORS.purple} strokeWidth={1.5} />
      </View>
      <Text style={emptyStyles.title}>No Messages Yet</Text>
      <Text style={emptyStyles.subtitle}>
        Every great adventure starts with a warm greeting. Share a note above or open your friend's profile to send them a Buzz!
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
    paddingTop: 80,
    paddingBottom: 100,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(138, 63, 252, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: "rgba(138, 63, 252, 0.15)",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16.5,
    fontWeight: "800",
    marginBottom: SPACING.xs,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18.5,
  },
});

// ─── Main Screen Component ──────────────────────────────────────────
export function ConversationListScreen({ onOpenConversation }: ConversationListScreenProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);
  const user = useAuthStore((s) => s.user);
  const conversations = useChatStore((s) => s.conversations);
  const isLoading = useChatStore((s) => s.isLoadingConversations);
  const initializeConversationListener = useChatStore((s) => s.initializeConversationListener);

  const currentUid = user?.uid || "default-me";

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [isNoteModalVisible, setNoteModalVisible] = useState(false);
  const [userNote, setUserNote] = useState("");
  const [noteInputText, setNoteInputText] = useState("");

  // Group Creator Wizard States
  const [isCircleCreatorVisible, setCircleCreatorVisible] = useState(false);
  const [circleName, setCircleName] = useState("");
  const [circleEmoji, setCircleEmoji] = useState("🧭");
  const [selectedCircleType, setSelectedCircleType] = useState<"trip" | "hangout" | "family" | "close" | "exploration">("exploration");
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [creatorSearchQuery, setCreatorSearchQuery] = useState("");

  // Initialize listener
  useEffect(() => {
    if (!currentUid) return;
    const unsub = initializeConversationListener(currentUid);

    // Hydrate User Note Cache
    AsyncStorage.getItem(CACHE_KEY_USER_NOTE + currentUid)
      .then((val) => {
        if (val) {
          setUserNote(val);
        }
      })
      .catch(() => {});

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

  // Filter and sort conversations
  const filteredConversations = useMemo(() => {
    let list = [...conversations];
    
    // Sort
    list.sort((a, b) => {
      const aPinned = a.pinnedBy.includes(currentUid);
      const bPinned = b.pinnedBy.includes(currentUid);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    // Search query filter
    if (searchQuery.trim().length > 0) {
      list = list.filter((conv) => {
        const others = Object.values(conv.participantProfiles).filter((p) => p.uid !== currentUid);
        return others.some((p) => p.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
      });
    }

    return list;
  }, [conversations, currentUid, searchQuery]);

  // Extract unique active participants list for Group Creator selection
  const friendsList = useMemo(() => {
    const list: { uid: string; displayName: string; avatarEmoji: string }[] = [];
    const uids = new Set<string>();

    conversations.forEach((conv) => {
      Object.values(conv.participantProfiles).forEach((p) => {
        if (p.uid !== currentUid && !uids.has(p.uid)) {
          uids.add(p.uid);
          list.push({
            uid: p.uid,
            displayName: p.displayName,
            avatarEmoji: p.avatarEmoji,
          });
        }
      });
    });

    return list;
  }, [conversations, currentUid]);

  // Filter friends list for Search
  const filteredFriendsForCreator = useMemo(() => {
    if (creatorSearchQuery.trim().length === 0) return friendsList;
    return friendsList.filter((f) => f.displayName.toLowerCase().includes(creatorSearchQuery.toLowerCase()));
  }, [friendsList, creatorSearchQuery]);

  // Selected Friends Names
  const selectedFriendNames = useMemo(() => {
    return friendsList.filter((f) => selectedFriends.has(f.uid)).map((f) => f.displayName.split(" ")[0]);
  }, [friendsList, selectedFriends]);

  // Compute Smart Name Suggestions based on members & circle type
  const smartSuggestions = useMemo(() => {
    if (selectedFriendNames.length === 0) return [];
    const combined = selectedFriendNames.slice(0, 2).join(" & ");
    switch (selectedCircleType) {
      case "exploration":
        return [`${combined} Squad 🧭`, "Discovery Club 🧭", "Senopati Wanderers 🧭"];
      case "hangout":
        return [`${combined} Hangout 🍻`, "Weekly Chilling 🍻", "Vibe Circle 🍻"];
      case "trip":
        return [`${combined} Trip ✈️`, "Bali Escapade ✈️", "Spontaneous Trip ✈️"];
      case "close":
        return [`${combined} Inner Circle 💖`, "Besties Hub 💫", "Close Shards 💖"];
      case "family":
        return ["Family Circle 🏡", "Home Tree 🏡", "Family Root 🏡"];
      default:
        return [];
    }
  }, [selectedFriendNames, selectedCircleType]);

  // Handle Note Share
  const handleShareNote = async () => {
    WANDER_HAPTICS.heavy();
    const finalNoteText = noteInputText.trim().slice(0, 60);
    setUserNote(finalNoteText);
    await AsyncStorage.setItem(CACHE_KEY_USER_NOTE + currentUid, finalNoteText);
    setNoteModalVisible(false);
  };

  const handleOpenSelfNoteModal = () => {
    WANDER_HAPTICS.light();
    setNoteInputText(userNote);
    setNoteModalVisible(true);
  };

  // Toggle friend selection in wizard
  const handleToggleFriendSelection = (uid: string) => {
    WANDER_HAPTICS.tick();
    const newSet = new Set(selectedFriends);
    if (newSet.has(uid)) {
      newSet.delete(uid);
    } else {
      newSet.add(uid);
    }
    setSelectedFriends(newSet);
  };

  // Handle Create Circle Action
  const handleCreateSocialCircle = async () => {
    if (circleName.trim().length === 0 || selectedFriends.size === 0) return;
    WANDER_HAPTICS.heavy();

    const selfProfile: ChatParticipant = {
      uid: currentUid,
      displayName: user?.displayName || "You",
      avatarEmoji: "🦊",
      photoURL: null,
    };

    const participantProfiles: Record<string, ChatParticipant> = {
      [currentUid]: selfProfile,
    };

    selectedFriends.forEach((uid) => {
      const friend = friendsList.find((f) => f.uid === uid);
      if (friend) {
        participantProfiles[uid] = {
          uid,
          displayName: friend.displayName,
          avatarEmoji: friend.avatarEmoji,
          photoURL: null,
        };
      }
    });

    const newGroupId = await useChatStore
      .getState()
      .createGroupAction(currentUid, selfProfile, participantProfiles, circleName.trim(), circleEmoji, selectedCircleType);

    // Reset wizard
    setCircleName("");
    setCircleEmoji("🧭");
    setSelectedCircleType("exploration");
    setSelectedFriends(new Set());
    setCreatorSearchQuery("");
    setCircleCreatorVisible(false);

    // Open newly created circle chat room instantly
    onOpenConversation(newGroupId);
  };

  const headerBorderColor = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)";
  const modalBg = isDark ? "rgba(16, 16, 20, 0.98)" : "rgba(250, 250, 252, 0.98)";

  const CIRCLE_TYPES = [
    { type: "exploration", label: "Squad 🧭", emoji: "🧭" },
    { type: "hangout", label: "Hangout 🍻", emoji: "🍻" },
    { type: "trip", label: "Trip ✈️", emoji: "✈️" },
    { type: "close", label: "Close 💖", emoji: "💖" },
    { type: "family", label: "Family 🏡", emoji: "🏡" },
  ] as const;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Instagram Header */}
      <View style={[styles.header, { borderBottomColor: headerBorderColor }]}>
        <View style={styles.headerInner}>
          <Pressable onPress={() => WANDER_HAPTICS.light()} style={styles.titleWrapper}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {user?.displayName ? user.displayName.split(" ")[0].toLowerCase() : "daffaibrani7"}
            </Text>
            <Text style={[styles.headerChevron, { color: theme.textMuted }]}> 🔽</Text>
          </Pressable>

          <View style={styles.headerRightActions}>
            <Pressable onPress={() => WANDER_HAPTICS.light()} style={styles.headerBtn}>
              <Video size={22} color={theme.text} />
            </Pressable>
            <Pressable
              onPress={() => {
                WANDER_HAPTICS.light();
                setCircleCreatorVisible(true);
              }}
              style={styles.headerBtn}
              id="start-circle-creator"
            >
              <Plus size={22} color={theme.text} />
            </Pressable>
          </View>
        </View>

        {/* Real search bar */}
        <View style={styles.searchBarWrapper}>
          <View style={[styles.searchBar, { backgroundColor: theme.inputBg }]}>
            <Search size={16} color="rgba(255,255,255,0.3)" strokeWidth={2} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
        </View>
      </View>

      {/* Conversations List with Instagram Notes Header */}
      <FlatList
        data={filteredConversations}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          filteredConversations.length === 0 && styles.listContentEmpty,
        ]}
        ListHeaderComponent={
          <InstagramNotesTray
            isDark={isDark}
            userNote={userNote}
            onOpenSelfNote={handleOpenSelfNoteModal}
            onOpenFriendConversation={onOpenConversation}
            conversations={conversations}
            currentUid={currentUid}
          />
        }
        ListEmptyComponent={!isLoading ? <EmptyState /> : null}
        showsVerticalScrollIndicator={false}
      />

      {/* Note Creation Modal Overlay */}
      {isNoteModalVisible && (
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.4)" }]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContentWrapper}>
            <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={[styles.modalCard, { backgroundColor: modalBg }]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setNoteModalVisible(false)} style={styles.modalHeaderBtn}>
                  <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>Cancel</Text>
                </Pressable>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Share a thought</Text>
                <Pressable onPress={handleShareNote} style={styles.modalHeaderBtn}>
                  <Text style={[styles.modalShareText, { color: noteInputText.trim().length > 0 ? "#0095f6" : "rgba(255,255,255,0.2)" }]}>
                    Share
                  </Text>
                </Pressable>
              </View>

              {/* Dynamic thought preview area */}
              <View style={styles.modalPreviewArea}>
                <View style={styles.modalBubbleWrapper}>
                  {noteInputText.trim().length > 0 ? (
                    <View style={[styles.modalBubble, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)" }]}>
                      <Text style={[styles.modalBubbleText, { color: theme.text }]}>{noteInputText.slice(0, 60)}</Text>
                      <View style={[styles.modalBubbleTail1, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)" }]} />
                      <View style={[styles.modalBubbleTail2, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)" }]} />
                    </View>
                  ) : (
                    <View style={[styles.modalBubbleEmpty, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)" }]}>
                      <Text style={[styles.modalBubbleEmptyText, { color: theme.textMuted }]}>Type something...</Text>
                    </View>
                  )}
                  <View style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarEmoji}>🦊</Text>
                  </View>
                </View>
              </View>

              {/* Input Area */}
              <View style={styles.modalInputArea}>
                <TextInput
                  style={[styles.modalTextInput, { color: theme.text, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}
                  placeholder="What's on your mind?..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  maxLength={60}
                  value={noteInputText}
                  onChangeText={setNoteInputText}
                  autoFocus
                  multiline
                  blurOnSubmit
                />
                <Text style={styles.modalCharCounter}>
                  {noteInputText.length}/60
                </Text>
              </View>
            </BlurView>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Premium Group & Social Circle Creation Modal Overlay */}
      {isCircleCreatorVisible && (
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.4)" }]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContentWrapper}>
            <BlurView intensity={95} tint={isDark ? "dark" : "light"} style={[styles.modalCardLarge, { backgroundColor: modalBg }]}>
              
              {/* Creator Header */}
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setCircleCreatorVisible(false)} style={styles.modalHeaderBtn}>
                  <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>Cancel</Text>
                </Pressable>
                <Text style={[styles.modalTitle, { color: theme.text }]}>New Social Circle</Text>
                <Pressable
                  onPress={handleCreateSocialCircle}
                  disabled={circleName.trim().length === 0 || selectedFriends.size === 0}
                  style={styles.modalHeaderBtn}
                >
                  <Text
                    style={[
                      styles.modalShareText,
                      { color: (circleName.trim().length > 0 && selectedFriends.size > 0) ? COLORS.purple : "rgba(255,255,255,0.2)" },
                    ]}
                  >
                    Create
                  </Text>
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.creatorScroll}>
                
                {/* 1. Live Avatar Stack Preview */}
                <View style={[styles.stackPreviewContainer, { borderColor: headerBorderColor }]}>
                  {selectedFriends.size > 0 ? (
                    <View style={styles.stackOuter}>
                      <View style={styles.stackFrame}>
                        {Array.from(selectedFriends).map((friendUid, idx) => {
                          const friend = friendsList.find((f) => f.uid === friendUid);
                          if (!friend) return null;
                          return (
                            <View
                              key={friendUid}
                              style={[
                                styles.stackedAvatarItem,
                                {
                                  left: idx * 24,
                                  zIndex: 20 - idx,
                                  backgroundColor: isDark ? "#1C1C24" : "#F0F0F6",
                                  borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
                                },
                              ]}
                            >
                              <Text style={styles.stackedAvatarEmojiText}>{friend.avatarEmoji}</Text>
                            </View>
                          );
                        })}
                      </View>
                      <Text style={[styles.stackCountLabel, { color: theme.text }]}>
                        {selectedFriends.size} Member{selectedFriends.size > 1 ? "s" : ""} Selected
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.emptyStackWrapper}>
                      <Text style={[styles.emptyStackText, { color: theme.textMuted }]}>
                        Add friends below to compile this circle stack 🦊
                      </Text>
                    </View>
                  )}
                </View>

                {/* 2. Group Emojis & Custom Name Input */}
                <View style={styles.creatorInputSection}>
                  <View style={styles.emojiPickerContainer}>
                    <TextInput
                      style={[styles.emojiInput, { color: theme.text, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}
                      value={circleEmoji}
                      onChangeText={(e) => setCircleEmoji(e.slice(0, 2))}
                      maxLength={2}
                    />
                    <Text style={styles.emojiPickerLabel}>Avatar Emoji</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[styles.circleNameTextInput, { color: theme.text, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}
                      placeholder="Enter Circle Name"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={circleName}
                      onChangeText={setCircleName}
                      maxLength={24}
                    />
                    <Text style={styles.emojiPickerLabel}>Circle Name</Text>
                  </View>
                </View>

                {/* 3. Smart Name Suggestions */}
                {smartSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <Text style={[styles.suggestionsHeader, { color: theme.textMuted }]}>
                      SMART NAME SUGGESTIONS ✨
                    </Text>
                    <View style={styles.suggestionsRow}>
                      {smartSuggestions.map((suggestion) => (
                        <Pressable
                          key={suggestion}
                          onPress={() => {
                            WANDER_HAPTICS.light();
                            setCircleName(suggestion.slice(0, -2).trim());
                            setCircleEmoji(suggestion.slice(-2));
                          }}
                          style={[styles.suggestionPill, { backgroundColor: isDark ? "rgba(138, 63, 252, 0.08)" : "rgba(138, 63, 252, 0.04)" }]}
                        >
                          <Text style={styles.suggestionPillText}>{suggestion}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {/* 4. Circle Category Selector */}
                <View style={styles.suggestionsContainer}>
                  <Text style={[styles.suggestionsHeader, { color: theme.textMuted }]}>
                    CIRCLE SOCIAL TYPE
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.circleTypeScroll}>
                    {CIRCLE_TYPES.map((c) => {
                      const isActive = selectedCircleType === c.type;
                      return (
                        <Pressable
                          key={c.type}
                          onPress={() => {
                            WANDER_HAPTICS.light();
                            setSelectedCircleType(c.type);
                            setCircleEmoji(c.emoji);
                          }}
                          style={[
                            styles.circleTypePill,
                            {
                              backgroundColor: isActive
                                ? COLORS.purple
                                : isDark
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(0,0,0,0.03)",
                            },
                          ]}
                        >
                          <Text style={[styles.circleTypeLabel, { color: isActive ? "#FFF" : theme.textMuted }]}>
                            {c.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* 5. Friend Selector Section */}
                <View style={styles.suggestionsContainer}>
                  <Text style={[styles.suggestionsHeader, { color: theme.textMuted }]}>
                    ADD MEMBERS
                  </Text>
                  
                  {/* Creator Search Bar */}
                  <View style={[styles.creatorSearchBar, { backgroundColor: theme.inputBg }]}>
                    <Search size={14} color="rgba(255,255,255,0.3)" />
                    <TextInput
                      style={[styles.creatorSearchInput, { color: theme.text }]}
                      placeholder="Search friends"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={creatorSearchQuery}
                      onChangeText={setCreatorSearchQuery}
                      autoCorrect={false}
                    />
                  </View>

                  {/* Friends List selection rows */}
                  <View style={styles.friendsSelectGrid}>
                    {filteredFriendsForCreator.length === 0 ? (
                      <Text style={[styles.emptyFriendsSearch, { color: theme.textMuted }]}>
                        No friends found
                      </Text>
                    ) : (
                      filteredFriendsForCreator.map((f) => {
                        const isChecked = selectedFriends.has(f.uid);
                        return (
                          <Pressable
                            key={f.uid}
                            onPress={() => handleToggleFriendSelection(f.uid)}
                            style={[
                              styles.friendSelectRow,
                              {
                                backgroundColor: isChecked
                                  ? "rgba(138, 63, 252, 0.08)"
                                  : "rgba(255,255,255,0.02)",
                                borderColor: isChecked ? "rgba(138, 63, 252, 0.3)" : "rgba(255,255,255,0.04)",
                              },
                            ]}
                          >
                            <View style={styles.friendRowLeft}>
                              <Text style={styles.friendRowEmoji}>{f.avatarEmoji}</Text>
                              <Text style={[styles.friendRowName, { color: theme.text }]}>{f.displayName}</Text>
                            </View>
                            <View
                              style={[
                                styles.checkboxOuter,
                                {
                                  borderColor: isChecked ? COLORS.purple : "rgba(255,255,255,0.3)",
                                  backgroundColor: isChecked ? COLORS.purple : "transparent",
                                },
                              ]}
                            >
                              {isChecked && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                            </View>
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                </View>

              </ScrollView>
            </BlurView>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

// ─── Main Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 54 : 40,
    zIndex: 10,
    borderBottomWidth: 1,
  },
  headerInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  headerChevron: {
    fontSize: 10.5,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerBtn: {
    padding: 4,
  },
  searchBarWrapper: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 12,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 110,
  },
  listContentEmpty: {
    flex: 1,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContentWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: SCREEN_WIDTH * 0.88,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 16,
    overflow: "hidden",
  },
  modalCardLarge: {
    width: SCREEN_WIDTH * 0.92,
    height: SCREEN_HEIGHT * 0.84,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 16,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalHeaderBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalTitle: {
    fontSize: 15.5,
    fontWeight: "800",
  },
  modalShareText: {
    fontSize: 14.5,
    fontWeight: "800",
  },
  modalPreviewArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  modalBubbleWrapper: {
    alignItems: "center",
    position: "relative",
    height: 120,
    justifyContent: "flex-end",
    width: "100%",
  },
  modalBubble: {
    position: "absolute",
    top: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.06)",
    maxWidth: SCREEN_WIDTH * 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBubbleEmpty: {
    position: "absolute",
    top: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBubbleText: {
    fontSize: 12.5,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 15.5,
  },
  modalBubbleEmptyText: {
    fontSize: 10,
    fontStyle: "italic",
  },
  modalBubbleTail1: {
    position: "absolute",
    bottom: -4,
    left: "50%",
    marginLeft: -4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  modalBubbleTail2: {
    position: "absolute",
    bottom: -9,
    left: "50%",
    marginLeft: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatarEmoji: {
    fontSize: 32,
  },
  modalInputArea: {
    gap: 8,
    alignItems: "stretch",
  },
  modalTextInput: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    fontWeight: "600",
    minHeight: 48,
    textAlignVertical: "top",
  },
  modalCharCounter: {
    alignSelf: "flex-end",
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    fontWeight: "700",
  },
  // Circle Creator styles
  creatorScroll: {
    paddingBottom: 24,
    gap: 16,
  },
  stackPreviewContainer: {
    height: 74,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  emptyStackWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStackText: {
    fontSize: 11.5,
    fontWeight: "600",
    textAlign: "center",
  },
  stackOuter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  stackFrame: {
    position: "relative",
    height: 40,
    flex: 1,
  },
  stackedAvatarItem: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stackedAvatarEmojiText: {
    fontSize: 20,
  },
  stackCountLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  creatorInputSection: {
    flexDirection: "row",
    gap: 12,
  },
  emojiPickerContainer: {
    width: 68,
    alignItems: "center",
  },
  emojiInput: {
    width: 60,
    height: 44,
    borderRadius: 12,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
  },
  emojiPickerLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    marginTop: 4,
    textAlign: "center",
  },
  circleNameTextInput: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  suggestionsContainer: {
    gap: 6,
  },
  suggestionsHeader: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  suggestionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  suggestionPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "rgba(138, 63, 252, 0.25)",
  },
  suggestionPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.purple,
  },
  circleTypeScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  circleTypePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  circleTypeLabel: {
    fontSize: 11.5,
    fontWeight: "800",
  },
  creatorSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 34,
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 6,
    marginBottom: 8,
  },
  creatorSearchInput: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    padding: 0,
  },
  friendsSelectGrid: {
    gap: 6,
  },
  emptyFriendsSearch: {
    textAlign: "center",
    fontSize: 12,
    fontStyle: "italic",
    paddingVertical: 12,
  },
  friendSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  friendRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  friendRowEmoji: {
    fontSize: 22,
  },
  friendRowName: {
    fontSize: 13,
    fontWeight: "700",
  },
  checkboxOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
