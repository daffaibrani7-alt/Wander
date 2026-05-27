/**
 * chatService.ts
 *
 * Firebase CRUD operations and realtime listeners for the Wander Chat System.
 * Falls back to rich simulated data when Firebase is not configured.
 */
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  type DocumentSnapshot,
  type QuerySnapshot,
} from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "@/shared/config/firebase";
import type {
  Conversation,
  Message,
  MessageType,
  MessageMetadata,
  ChatParticipant,
  LastMessage,
  BuzzIntensity,
} from "@/features/chat/types/types";

// ─── Simulation Data ───────────────────────────────────────────────

const SIM_PARTICIPANTS: Record<string, ChatParticipant> = {
  "sim-1": { uid: "sim-1", displayName: "Aria ✨", avatarEmoji: "🦋", photoURL: null },
  "sim-2": { uid: "sim-2", displayName: "Raka 🔥", avatarEmoji: "🐉", photoURL: null },
  "sim-3": { uid: "sim-3", displayName: "Luna 🌙", avatarEmoji: "🦊", photoURL: null },
};

function generateSimulatedConversations(currentUid: string): Conversation[] {
  const now = new Date();
  const selfProfile: ChatParticipant = {
    uid: currentUid,
    displayName: "You",
    avatarEmoji: "🦊",
    photoURL: null,
  };

  return [
    {
      id: "sim-conv-1",
      type: "direct",
      participantUids: [currentUid, "sim-1"],
      participantProfiles: { [currentUid]: selfProfile, "sim-1": SIM_PARTICIPANTS["sim-1"] },
      lastMessage: {
        content: "Coba cek tempat baru di daerah Senopati! 🗺️",
        type: "text",
        senderUid: "sim-1",
        senderName: "Aria ✨",
        createdAt: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
      },
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
      unreadCount: { [currentUid]: 2 },
      typingUsers: [],
      pinnedBy: [currentUid],
      mutedBy: [],
    },
    {
      id: "sim-conv-2",
      type: "direct",
      participantUids: [currentUid, "sim-2"],
      participantProfiles: { [currentUid]: selfProfile, "sim-2": SIM_PARTICIPANTS["sim-2"] },
      lastMessage: {
        content: "⚡ BUZZ",
        type: "buzz",
        senderUid: "sim-2",
        senderName: "Raka 🔥",
        createdAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      },
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      unreadCount: { [currentUid]: 1 },
      typingUsers: [],
      pinnedBy: [],
      mutedBy: [],
    },
    {
      id: "sim-conv-3",
      type: "group",
      participantUids: [currentUid, "sim-1", "sim-3"],
      participantProfiles: {
        [currentUid]: selfProfile,
        "sim-1": SIM_PARTICIPANTS["sim-1"],
        "sim-3": SIM_PARTICIPANTS["sim-3"],
      },
      lastMessage: {
        content: "Weekend kemana nih? 🌴",
        type: "text",
        senderUid: "sim-3",
        senderName: "Luna 🌙",
        createdAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      },
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      unreadCount: { [currentUid]: 0 },
      typingUsers: ["sim-3"],
      pinnedBy: [],
      mutedBy: [],
      groupName: "Squad Explore 🗺️",
      groupEmoji: "🗺️",
    },
  ];
}

function generateSimulatedMessages(conversationId: string, currentUid: string): Message[] {
  const now = new Date();
  const base = (minAgo: number) => new Date(now.getTime() - minAgo * 60 * 1000).toISOString();

  if (conversationId === "sim-conv-1") {
    return [
      {
        id: "msg-1-1",
        conversationId,
        senderUid: currentUid,
        type: "text",
        content: "Hey Aria! Lagi di mana? 👋",
        reactions: { "sim-1": "❤️" },
        readBy: { [currentUid]: base(30), "sim-1": base(28) },
        createdAt: base(30),
      },
      {
        id: "msg-1-2",
        conversationId,
        senderUid: "sim-1",
        type: "text",
        content: "Lagi explore daerah Kemang nih 🚶‍♀️",
        reactions: {},
        readBy: { "sim-1": base(25), [currentUid]: base(24) },
        createdAt: base(25),
      },
      {
        id: "msg-1-3",
        conversationId,
        senderUid: "sim-1",
        type: "location",
        content: "📍 Shared location",
        metadata: { latitude: -6.2614, longitude: 106.8106, placeName: "Kemang Village" },
        reactions: { [currentUid]: "🔥" },
        readBy: { "sim-1": base(20), [currentUid]: base(19) },
        createdAt: base(20),
      },
      {
        id: "msg-1-4",
        conversationId,
        senderUid: currentUid,
        type: "text",
        content: "Wah asik! Gue juga mau ke sana nanti sore",
        reactions: {},
        readBy: { [currentUid]: base(10), "sim-1": base(8) },
        createdAt: base(10),
      },
      {
        id: "msg-1-5",
        conversationId,
        senderUid: "sim-1",
        type: "text",
        content: "Coba cek tempat baru di daerah Senopati! 🗺️",
        reactions: {},
        readBy: { "sim-1": base(2) },
        createdAt: base(2),
      },
    ];
  }

  if (conversationId === "sim-conv-2") {
    return [
      {
        id: "msg-2-1",
        conversationId,
        senderUid: currentUid,
        type: "text",
        content: "Bro jadi ga explore bareng?",
        reactions: {},
        readBy: { [currentUid]: base(60), "sim-2": base(55) },
        createdAt: base(60),
      },
      {
        id: "msg-2-2",
        conversationId,
        senderUid: "sim-2",
        type: "text",
        content: "Jadi dong! Jam berapa?",
        reactions: {},
        readBy: { "sim-2": base(50), [currentUid]: base(48) },
        createdAt: base(50),
      },
      {
        id: "msg-2-3",
        conversationId,
        senderUid: "sim-2",
        type: "buzz",
        content: "⚡ BUZZ",
        metadata: { buzzIntensity: "normal" },
        reactions: {},
        readBy: { "sim-2": base(15) },
        createdAt: base(15),
      },
    ];
  }

  if (conversationId === "sim-conv-3") {
    return [
      {
        id: "msg-3-1",
        conversationId,
        senderUid: "sim-1",
        type: "text",
        content: "Guys, ada spot baru di Pantai Indah Kapuk!",
        reactions: { [currentUid]: "🤩", "sim-3": "💯" },
        readBy: { "sim-1": base(120), [currentUid]: base(118), "sim-3": base(115) },
        createdAt: base(120),
      },
      {
        id: "msg-3-2",
        conversationId,
        senderUid: currentUid,
        type: "text",
        content: "Seriusan? Yuk kesana besok",
        reactions: { "sim-1": "👍" },
        readBy: { [currentUid]: base(100), "sim-1": base(98), "sim-3": base(95) },
        createdAt: base(100),
      },
      {
        id: "msg-3-3",
        conversationId,
        senderUid: "sim-3",
        type: "text",
        content: "Weekend kemana nih? 🌴",
        reactions: {},
        readBy: { "sim-3": base(60) },
        createdAt: base(60),
      },
    ];
  }

  return [];
}

// ─── Chat Service ──────────────────────────────────────────────────

export const chatService = {
  // ── Create a new conversation ──────────────────────────────────
  createConversation: async (
    participantUids: string[],
    participantProfiles: Record<string, ChatParticipant>,
    type: "direct" | "group" = "direct",
    groupName?: string
  ): Promise<Conversation> => {
    const now = new Date().toISOString();
    const emptyUnread: Record<string, number> = {};
    participantUids.forEach((uid) => { emptyUnread[uid] = 0; });

    const conversation: Omit<Conversation, "id"> = {
      type,
      participantUids,
      participantProfiles,
      lastMessage: null,
      createdAt: now,
      updatedAt: now,
      unreadCount: emptyUnread,
      typingUsers: [],
      pinnedBy: [],
      mutedBy: [],
      groupName,
    };

    if (!isFirebaseConfigured || !db) {
      const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return { ...conversation, id };
    }

    const convRef = await addDoc(collection(db, "conversations"), {
      ...conversation,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { ...conversation, id: convRef.id };
  },

  // ── Find existing direct conversation between two users ────────
  findDirectConversation: async (
    uid1: string,
    uid2: string
  ): Promise<Conversation | null> => {
    if (!isFirebaseConfigured || !db) {
      // In simulation, check simulated conversations
      const simConvs = generateSimulatedConversations(uid1);
      return (
        simConvs.find(
          (c) =>
            c.type === "direct" &&
            c.participantUids.includes(uid1) &&
            c.participantUids.includes(uid2)
        ) || null
      );
    }

    const q = query(
      collection(db, "conversations"),
      where("type", "==", "direct"),
      where("participantUids", "array-contains", uid1)
    );
    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as Omit<Conversation, "id">;
      if (data.participantUids.includes(uid2)) {
        return { ...data, id: docSnap.id };
      }
    }
    return null;
  },

  // ── Send a message ─────────────────────────────────────────────
  sendMessage: async (
    conversationId: string,
    senderUid: string,
    senderName: string,
    type: MessageType,
    content: string,
    metadata?: MessageMetadata,
    replyToId?: string,
    expiresAt?: string
  ): Promise<Message> => {
    const now = new Date().toISOString();
    const message: Omit<Message, "id"> = {
      conversationId,
      senderUid,
      type,
      content,
      metadata,
      reactions: {},
      readBy: { [senderUid]: now },
      createdAt: now,
      expiresAt,
      replyToId,
    };

    if (!isFirebaseConfigured || !db) {
      const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return { ...message, id };
    }

    // Add message to subcollection
    const msgRef = await addDoc(
      collection(db, "conversations", conversationId, "messages"),
      { ...message, createdAt: serverTimestamp() }
    );

    // Update conversation's lastMessage and unreadCounts
    const convRef = doc(db, "conversations", conversationId);
    const convSnap = await getDoc(convRef);
    if (convSnap.exists()) {
      const convData = convSnap.data() as Conversation;
      const newUnread = { ...convData.unreadCount };
      convData.participantUids.forEach((uid) => {
        if (uid !== senderUid) {
          newUnread[uid] = (newUnread[uid] || 0) + 1;
        }
      });

      const lastMsg: LastMessage = {
        content,
        type,
        senderUid,
        senderName,
        createdAt: now,
      };

      await updateDoc(convRef, {
        lastMessage: lastMsg,
        unreadCount: newUnread,
        updatedAt: serverTimestamp(),
      });
    }

    return { ...message, id: msgRef.id };
  },

  // ── Mark conversation as read ──────────────────────────────────
  markAsRead: async (conversationId: string, uid: string): Promise<void> => {
    if (!isFirebaseConfigured || !db) return;

    const convRef = doc(db, "conversations", conversationId);
    await updateDoc(convRef, {
      [`unreadCount.${uid}`]: 0,
    });
  },

  // ── Listen to user's conversations ─────────────────────────────
  listenToConversations: (
    uid: string,
    callback: (conversations: Conversation[]) => void
  ): (() => void) => {
    if (!isFirebaseConfigured || !db) {
      // Deliver simulated conversations after a short delay
      const timer = setTimeout(() => {
        callback(generateSimulatedConversations(uid));
      }, 300);
      return () => clearTimeout(timer);
    }

    const q = query(
      collection(db, "conversations"),
      where("participantUids", "array-contains", uid),
      orderBy("updatedAt", "desc")
    );

    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const conversations: Conversation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        conversations.push({
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
        } as Conversation);
      });
      callback(conversations);
    });
  },

  // ── Listen to messages in a conversation ───────────────────────
  listenToMessages: (
    conversationId: string,
    currentUid: string,
    callback: (messages: Message[]) => void,
    messageLimit: number = 50
  ): (() => void) => {
    if (!isFirebaseConfigured || !db) {
      const timer = setTimeout(() => {
        callback(generateSimulatedMessages(conversationId, currentUid));
      }, 200);
      return () => clearTimeout(timer);
    }

    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "desc"),
      limit(messageLimit)
    );

    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const messages: Message[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        messages.push({
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        } as Message);
      });
      // Return in chronological order (oldest first)
      messages.reverse();
      callback(messages);
    });
  },

  // ── Set typing status ──────────────────────────────────────────
  setTypingStatus: async (
    conversationId: string,
    uid: string,
    isTyping: boolean
  ): Promise<void> => {
    if (!isFirebaseConfigured || !db) return;

    const convRef = doc(db, "conversations", conversationId);
    if (isTyping) {
      await updateDoc(convRef, { typingUsers: arrayUnion(uid) });
    } else {
      await updateDoc(convRef, { typingUsers: arrayRemove(uid) });
    }
  },

  // ── Add reaction to message ────────────────────────────────────
  addReaction: async (
    conversationId: string,
    messageId: string,
    uid: string,
    emoji: string
  ): Promise<void> => {
    if (!isFirebaseConfigured || !db) return;

    const msgRef = doc(db, "conversations", conversationId, "messages", messageId);
    await updateDoc(msgRef, {
      [`reactions.${uid}`]: emoji,
    });
  },

  // ── Remove reaction ────────────────────────────────────────────
  removeReaction: async (
    conversationId: string,
    messageId: string,
    uid: string
  ): Promise<void> => {
    if (!isFirebaseConfigured || !db) return;

    const msgRef = doc(db, "conversations", conversationId, "messages", messageId);
    // Delete the field by setting to deleteField()
    const { deleteField } = await import("firebase/firestore");
    await updateDoc(msgRef, {
      [`reactions.${uid}`]: deleteField(),
    });
  },

  // ── Delete message (soft delete) ───────────────────────────────
  deleteMessage: async (
    conversationId: string,
    messageId: string
  ): Promise<void> => {
    if (!isFirebaseConfigured || !db) return;

    const msgRef = doc(db, "conversations", conversationId, "messages", messageId);
    await updateDoc(msgRef, {
      type: "system",
      content: "🗑️ Message deleted",
      metadata: {},
      reactions: {},
    });
  },
};
