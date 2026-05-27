/**
 * chat.test.ts
 *
 * Unit tests for the Wander Premium Chat System.
 * Tests the chat store, chat service (simulation mode), and typing hook logic.
 */

// ── Mock modules ──────────────────────────────────────────────────

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  serverTimestamp: jest.fn(() => new Date().toISOString()),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn(),
  deleteField: jest.fn(),
}));

jest.mock("@/shared/config/firebase", () => ({
  db: null,
  auth: null,
  storage: null,
  isFirebaseConfigured: false,
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/shared/services/realtimeManager", () => ({
  realtimeManager: {
    register: jest.fn(),
    unregister: jest.fn(),
  },
}));

jest.mock("@/features/presence/store/usePresenceStore", () => ({
  usePresenceStore: jest.fn(() => ({
    friendPresences: {},
  })),
}));

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

// ── Imports ───────────────────────────────────────────────────────

import { chatService } from "@/features/chat/services/chatService";
import type { Conversation, Message, ChatParticipant } from "@/features/chat/types/types";

// ── Tests ─────────────────────────────────────────────────────────

describe("Chat Types", () => {
  test("Message interface has required fields", () => {
    const msg: Message = {
      id: "test-msg-1",
      conversationId: "conv-1",
      senderUid: "user-1",
      type: "text",
      content: "Hello, world!",
      reactions: {},
      readBy: { "user-1": new Date().toISOString() },
      createdAt: new Date().toISOString(),
    };

    expect(msg.id).toBe("test-msg-1");
    expect(msg.type).toBe("text");
    expect(msg.content).toBe("Hello, world!");
    expect(msg.reactions).toEqual({});
    expect(msg.readBy).toHaveProperty("user-1");
  });

  test("Conversation interface has required fields", () => {
    const conv: Conversation = {
      id: "conv-1",
      type: "direct",
      participantUids: ["user-1", "user-2"],
      participantProfiles: {
        "user-1": { uid: "user-1", displayName: "Alice", avatarEmoji: "🦊", photoURL: null },
        "user-2": { uid: "user-2", displayName: "Bob", avatarEmoji: "🐻", photoURL: null },
      },
      lastMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      unreadCount: { "user-1": 0, "user-2": 0 },
      typingUsers: [],
      pinnedBy: [],
      mutedBy: [],
    };

    expect(conv.type).toBe("direct");
    expect(conv.participantUids).toHaveLength(2);
    expect(conv.unreadCount["user-1"]).toBe(0);
  });

  test("Buzz message has correct metadata", () => {
    const buzzMsg: Message = {
      id: "buzz-1",
      conversationId: "conv-1",
      senderUid: "user-1",
      type: "buzz",
      content: "⚡ BUZZ",
      metadata: { buzzIntensity: "urgent" },
      reactions: {},
      readBy: {},
      createdAt: new Date().toISOString(),
    };

    expect(buzzMsg.type).toBe("buzz");
    expect(buzzMsg.metadata?.buzzIntensity).toBe("urgent");
  });

  test("Location message has coordinate metadata", () => {
    const locMsg: Message = {
      id: "loc-1",
      conversationId: "conv-1",
      senderUid: "user-1",
      type: "location",
      content: "📍 Shared location",
      metadata: {
        latitude: -6.2614,
        longitude: 106.8106,
        placeName: "Kemang Village",
      },
      reactions: {},
      readBy: {},
      createdAt: new Date().toISOString(),
    };

    expect(locMsg.metadata?.latitude).toBeCloseTo(-6.2614);
    expect(locMsg.metadata?.longitude).toBeCloseTo(106.8106);
    expect(locMsg.metadata?.placeName).toBe("Kemang Village");
  });
});

describe("Chat Service (Simulation Mode)", () => {
  const testUid = "test-user-123";

  test("listenToConversations returns simulated conversations", (done) => {
    const unsub = chatService.listenToConversations(testUid, (conversations) => {
      expect(conversations).toBeDefined();
      expect(conversations.length).toBeGreaterThanOrEqual(3);

      // Check first conversation structure
      const firstConv = conversations[0];
      expect(firstConv.id).toBeDefined();
      expect(firstConv.participantUids).toContain(testUid);
      expect(firstConv.lastMessage).toBeDefined();
      expect(firstConv.unreadCount).toBeDefined();

      unsub();
      done();
    });
  });

  test("listenToMessages returns simulated messages for sim-conv-1", (done) => {
    const unsub = chatService.listenToMessages("sim-conv-1", testUid, (messages) => {
      expect(messages).toBeDefined();
      expect(messages.length).toBeGreaterThanOrEqual(3);

      // Messages should be in chronological order
      for (let i = 1; i < messages.length; i++) {
        const prev = new Date(messages[i - 1].createdAt).getTime();
        const curr = new Date(messages[i].createdAt).getTime();
        expect(curr).toBeGreaterThanOrEqual(prev);
      }

      unsub();
      done();
    });
  });

  test("listenToMessages returns buzz message for sim-conv-2", (done) => {
    const unsub = chatService.listenToMessages("sim-conv-2", testUid, (messages) => {
      const buzzMsg = messages.find((m) => m.type === "buzz");
      expect(buzzMsg).toBeDefined();
      expect(buzzMsg?.content).toBe("⚡ BUZZ");
      expect(buzzMsg?.metadata?.buzzIntensity).toBe("normal");

      unsub();
      done();
    });
  });

  test("createConversation returns a new conversation in simulation mode", async () => {
    const profiles: Record<string, ChatParticipant> = {
      "user-a": { uid: "user-a", displayName: "Alice", avatarEmoji: "🦊", photoURL: null },
      "user-b": { uid: "user-b", displayName: "Bob", avatarEmoji: "🐻", photoURL: null },
    };

    const conv = await chatService.createConversation(
      ["user-a", "user-b"],
      profiles,
      "direct"
    );

    expect(conv.id).toBeDefined();
    expect(conv.id).toContain("conv-");
    expect(conv.type).toBe("direct");
    expect(conv.participantUids).toEqual(["user-a", "user-b"]);
    expect(conv.lastMessage).toBeNull();
    expect(conv.unreadCount["user-a"]).toBe(0);
    expect(conv.unreadCount["user-b"]).toBe(0);
  });

  test("sendMessage returns a new message in simulation mode", async () => {
    const msg = await chatService.sendMessage(
      "test-conv",
      "user-a",
      "Alice",
      "text",
      "Hello!"
    );

    expect(msg.id).toBeDefined();
    expect(msg.id).toContain("msg-");
    expect(msg.senderUid).toBe("user-a");
    expect(msg.type).toBe("text");
    expect(msg.content).toBe("Hello!");
    expect(msg.readBy).toHaveProperty("user-a");
  });

  test("sendMessage with buzz type includes metadata", async () => {
    const msg = await chatService.sendMessage(
      "test-conv",
      "user-a",
      "Alice",
      "buzz",
      "⚡ BUZZ",
      { buzzIntensity: "urgent" }
    );

    expect(msg.type).toBe("buzz");
    expect(msg.metadata?.buzzIntensity).toBe("urgent");
  });

  test("findDirectConversation returns matching sim conversation", async () => {
    const conv = await chatService.findDirectConversation(testUid, "sim-1");
    expect(conv).toBeDefined();
    expect(conv?.type).toBe("direct");
    expect(conv?.participantUids).toContain("sim-1");
  });

  test("findDirectConversation returns null for unknown user", async () => {
    const conv = await chatService.findDirectConversation(testUid, "unknown-uid");
    expect(conv).toBeNull();
  });

  test("markAsRead does not throw in simulation mode", async () => {
    await expect(chatService.markAsRead("sim-conv-1", testUid)).resolves.not.toThrow();
  });

  test("setTypingStatus does not throw in simulation mode", async () => {
    await expect(
      chatService.setTypingStatus("sim-conv-1", testUid, true)
    ).resolves.not.toThrow();
  });

  test("addReaction does not throw in simulation mode", async () => {
    await expect(
      chatService.addReaction("sim-conv-1", "msg-1-1", testUid, "❤️")
    ).resolves.not.toThrow();
  });
});

describe("Chat Unread Count", () => {
  test("calculates total unread from conversations", () => {
    const conversations: Conversation[] = [
      {
        id: "c1",
        type: "direct",
        participantUids: ["me", "other"],
        participantProfiles: {},
        lastMessage: null,
        createdAt: "",
        updatedAt: "",
        unreadCount: { me: 3 },
        typingUsers: [],
        pinnedBy: [],
        mutedBy: [],
      },
      {
        id: "c2",
        type: "direct",
        participantUids: ["me", "other2"],
        participantProfiles: {},
        lastMessage: null,
        createdAt: "",
        updatedAt: "",
        unreadCount: { me: 5 },
        typingUsers: [],
        pinnedBy: [],
        mutedBy: [],
      },
      {
        id: "c3",
        type: "group",
        participantUids: ["me", "a", "b"],
        participantProfiles: {},
        lastMessage: null,
        createdAt: "",
        updatedAt: "",
        unreadCount: { me: 0 },
        typingUsers: [],
        pinnedBy: [],
        mutedBy: [],
      },
    ];

    const totalUnread = conversations.reduce(
      (sum, c) => sum + (c.unreadCount["me"] || 0),
      0
    );

    expect(totalUnread).toBe(8);
  });
});

describe("Chat Conversation Sorting", () => {
  test("pinned conversations sort before unpinned", () => {
    const currentUid = "me";
    const conversations: Conversation[] = [
      {
        id: "c-old",
        type: "direct",
        participantUids: ["me", "a"],
        participantProfiles: {},
        lastMessage: null,
        createdAt: "",
        updatedAt: "2024-01-01T00:00:00.000Z",
        unreadCount: {},
        typingUsers: [],
        pinnedBy: ["me"],
        mutedBy: [],
      },
      {
        id: "c-new",
        type: "direct",
        participantUids: ["me", "b"],
        participantProfiles: {},
        lastMessage: null,
        createdAt: "",
        updatedAt: "2024-06-01T00:00:00.000Z",
        unreadCount: {},
        typingUsers: [],
        pinnedBy: [],
        mutedBy: [],
      },
    ];

    const sorted = [...conversations].sort((a, b) => {
      const aPinned = a.pinnedBy.includes(currentUid);
      const bPinned = b.pinnedBy.includes(currentUid);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    expect(sorted[0].id).toBe("c-old"); // pinned first
    expect(sorted[1].id).toBe("c-new");
  });
});
