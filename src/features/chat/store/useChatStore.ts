/**
 * useChatStore.ts
 *
 * Central Zustand store for the Wander Premium Chat System.
 * Manages conversations, messages, typing, unread counts, and buzz interactions.
 * Uses optimistic UI updates with rollback on failure.
 */
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { chatService } from "@/features/chat/services/chatService";
import { realtimeManager } from "@/shared/services/realtimeManager";
import type {
  Conversation,
  Message,
  MessageType,
  MessageMetadata,
  ChatParticipant,
  BuzzIntensity,
} from "@/features/chat/types/types";

// ─── State Interface ───────────────────────────────────────────────

interface ChatStoreState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  totalUnreadCount: number;

  // Actions
  initializeConversationListener: (uid: string) => () => void;
  openConversation: (conversationId: string, currentUid: string) => void;
  closeConversation: () => void;
  sendMessageAction: (
    conversationId: string,
    currentUid: string,
    currentName: string,
    type: MessageType,
    content: string,
    metadata?: MessageMetadata,
    replyToId?: string
  ) => Promise<void>;
  setTypingAction: (conversationId: string, uid: string, isTyping: boolean) => Promise<void>;
  addReactionAction: (conversationId: string, messageId: string, uid: string, emoji: string) => Promise<void>;
  startDirectChat: (
    currentUid: string,
    currentProfile: ChatParticipant,
    otherUid: string,
    otherProfile: ChatParticipant
  ) => Promise<string>;
  sendBuzzAction: (
    conversationId: string,
    currentUid: string,
    currentName: string,
    intensity: BuzzIntensity
  ) => Promise<void>;
  loadMoreMessages: (conversationId: string, currentUid: string) => Promise<void>;
}

const CACHE_KEY_CONVERSATIONS = "wander_chat_conversations_";

// ─── Store ─────────────────────────────────────────────────────────

export const useChatStore = create<ChatStoreState>((set, get) => {
  let activeMessageUnsub: (() => void) | null = null;

  return {
    conversations: [],
    activeConversationId: null,
    messages: {},
    isLoadingConversations: false,
    isLoadingMessages: false,
    isSending: false,
    totalUnreadCount: 0,

    // ── Initialize conversation list listener ────────────────────
    initializeConversationListener: (uid: string) => {
      set({ isLoadingConversations: true });

      // Load cached conversations for instant render
      AsyncStorage.getItem(CACHE_KEY_CONVERSATIONS + uid)
        .then((cached) => {
          if (cached && get().conversations.length === 0) {
            try {
              const parsed = JSON.parse(cached) as Conversation[];
              const totalUnread = parsed.reduce(
                (sum, c) => sum + (c.unreadCount[uid] || 0),
                0
              );
              set({ conversations: parsed, totalUnreadCount: totalUnread });
            } catch {}
          }
        })
        .catch(() => {});

      const unsub = chatService.listenToConversations(uid, (conversations) => {
        const totalUnread = conversations.reduce(
          (sum, c) => sum + (c.unreadCount[uid] || 0),
          0
        );

        set({
          conversations,
          totalUnreadCount: totalUnread,
          isLoadingConversations: false,
        });

        // Cache for offline instant render
        AsyncStorage.setItem(
          CACHE_KEY_CONVERSATIONS + uid,
          JSON.stringify(conversations)
        ).catch(() => {});
      });

      realtimeManager.register("chat-conversations", unsub);

      return () => {
        unsub();
        realtimeManager.unregister("chat-conversations");
      };
    },

    // ── Open a conversation and start message listener ───────────
    openConversation: (conversationId: string, currentUid: string) => {
      // Close any previous active listener
      if (activeMessageUnsub) {
        activeMessageUnsub();
        activeMessageUnsub = null;
      }

      set({ activeConversationId: conversationId, isLoadingMessages: true });

      // Mark as read
      chatService.markAsRead(conversationId, currentUid).catch(() => {});

      // Update local unread count optimistically
      const convs = get().conversations.map((c) => {
        if (c.id === conversationId) {
          return { ...c, unreadCount: { ...c.unreadCount, [currentUid]: 0 } };
        }
        return c;
      });
      const totalUnread = convs.reduce(
        (sum, c) => sum + (c.unreadCount[currentUid] || 0),
        0
      );
      set({ conversations: convs, totalUnreadCount: totalUnread });

      // Start listening to messages
      const unsub = chatService.listenToMessages(
        conversationId,
        currentUid,
        (messages) => {
          set((state) => ({
            messages: { ...state.messages, [conversationId]: messages },
            isLoadingMessages: false,
          }));
        }
      );

      activeMessageUnsub = unsub;
      realtimeManager.register(`chat-messages-${conversationId}`, unsub);
    },

    // ── Close the active conversation ────────────────────────────
    closeConversation: () => {
      const convId = get().activeConversationId;
      if (activeMessageUnsub) {
        activeMessageUnsub();
        activeMessageUnsub = null;
      }
      if (convId) {
        realtimeManager.unregister(`chat-messages-${convId}`);
      }
      set({ activeConversationId: null });
    },

    // ── Send a message with optimistic UI ────────────────────────
    sendMessageAction: async (
      conversationId,
      currentUid,
      currentName,
      type,
      content,
      metadata,
      replyToId
    ) => {
      const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date().toISOString();

      const optimisticMessage: Message = {
        id: optimisticId,
        conversationId,
        senderUid: currentUid,
        type,
        content,
        metadata,
        reactions: {},
        readBy: { [currentUid]: now },
        createdAt: now,
        replyToId,
        _pending: true,
      };

      // Insert optimistically
      set((state) => {
        const existing = state.messages[conversationId] || [];
        return {
          messages: {
            ...state.messages,
            [conversationId]: [...existing, optimisticMessage],
          },
          isSending: true,
        };
      });

      try {
        await chatService.sendMessage(
          conversationId,
          currentUid,
          currentName,
          type,
          content,
          metadata,
          replyToId
        );
        set({ isSending: false });
      } catch (err) {
        console.error("[ChatStore] Failed to send message:", err);
        // Rollback optimistic message
        set((state) => {
          const existing = state.messages[conversationId] || [];
          return {
            messages: {
              ...state.messages,
              [conversationId]: existing.filter((m) => m.id !== optimisticId),
            },
            isSending: false,
          };
        });
      }
    },

    // ── Set typing indicator ─────────────────────────────────────
    setTypingAction: async (conversationId, uid, isTyping) => {
      try {
        await chatService.setTypingStatus(conversationId, uid, isTyping);
      } catch {}
    },

    // ── Add reaction (optimistic) ────────────────────────────────
    addReactionAction: async (conversationId, messageId, uid, emoji) => {
      // Optimistic update
      set((state) => {
        const msgs = (state.messages[conversationId] || []).map((m) => {
          if (m.id === messageId) {
            return { ...m, reactions: { ...m.reactions, [uid]: emoji } };
          }
          return m;
        });
        return { messages: { ...state.messages, [conversationId]: msgs } };
      });

      try {
        await chatService.addReaction(conversationId, messageId, uid, emoji);
      } catch {
        // Rollback
        set((state) => {
          const msgs = (state.messages[conversationId] || []).map((m) => {
            if (m.id === messageId) {
              const reactions = { ...m.reactions };
              delete reactions[uid];
              return { ...m, reactions };
            }
            return m;
          });
          return { messages: { ...state.messages, [conversationId]: msgs } };
        });
      }
    },

    // ── Start or find a direct chat ──────────────────────────────
    startDirectChat: async (currentUid, currentProfile, otherUid, otherProfile) => {
      // Check for existing conversation
      const existing = await chatService.findDirectConversation(currentUid, otherUid);
      if (existing) return existing.id;

      // Create new conversation
      const conversation = await chatService.createConversation(
        [currentUid, otherUid],
        { [currentUid]: currentProfile, [otherUid]: otherProfile },
        "direct"
      );

      // Add to local state
      set((state) => ({
        conversations: [conversation, ...state.conversations],
      }));

      return conversation.id;
    },

    // ── Send buzz message ────────────────────────────────────────
    sendBuzzAction: async (conversationId, currentUid, currentName, intensity) => {
      await get().sendMessageAction(
        conversationId,
        currentUid,
        currentName,
        "buzz",
        "⚡ BUZZ",
        { buzzIntensity: intensity }
      );
    },

    // ── Load more messages (pagination placeholder) ──────────────
    loadMoreMessages: async (conversationId, currentUid) => {
      // In a full implementation, this would use cursor-based pagination
      // with startAfter() on the oldest loaded message's createdAt
      console.log("[ChatStore] loadMoreMessages called for:", conversationId);
    },
  };
});
