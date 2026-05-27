// Mock AsyncStorage for Zustand store
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock firebase/firestore
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncQueueStore } from "../src/shared/store/useSyncQueueStore";

// Mock Firebase config
jest.mock("@/shared/config/firebase", () => ({
  db: {},
  isFirebaseConfigured: false,
}));

// Mock expo-haptics
jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

describe("Offline Sync Queue - Zustand Caching & Deduplication Store", () => {
  const USER_ID = "test-user-123";

  beforeEach(async () => {
    // Reset Zustand store state before each test
    await useSyncQueueStore.getState().clearQueue(USER_ID);
  });

  test("LOCATION pushes should deduplicate and enforce LIFO merge policies", async () => {
    const store = useSyncQueueStore.getState();

    // Enqueue location A
    await store.enqueueSyncItem("LOCATION", USER_ID, { latitude: -6.1, longitude: 106.1 });
    // Enqueue location B (latest location update)
    await store.enqueueSyncItem("LOCATION", USER_ID, { latitude: -6.2, longitude: 106.2 });

    const queue = useSyncQueueStore.getState().queue;

    // We expect only ONE item in the queue for LOCATION + USER_ID, and it should be the latest one (B)
    expect(queue.length).toBe(1);
    expect(queue[0].type).toBe("LOCATION");
    expect(queue[0].payload.latitude).toBe(-6.2);
  });

  test("TILES pushes should merge into a unique Union-Set array", async () => {
    const store = useSyncQueueStore.getState();

    // Enqueue tile batch A
    await store.enqueueSyncItem("TILES", USER_ID, ["10_20", "10_21"]);
    // Enqueue tile batch B (contains duplicate "10_21" plus new "10_22")
    await store.enqueueSyncItem("TILES", USER_ID, ["10_21", "10_22"]);

    const queue = useSyncQueueStore.getState().queue;

    // We expect only ONE item in the queue for TILES + USER_ID
    expect(queue.length).toBe(1);
    expect(queue[0].type).toBe("TILES");
    
    // Payload should contain union-set: ["10_20", "10_21", "10_22"]
    const payload = queue[0].payload as string[];
    expect(payload.length).toBe(3);
    expect(payload).toContain("10_20");
    expect(payload).toContain("10_21");
    expect(payload).toContain("10_22");
  });

  test("FIFO policies are respected for other transaction types", async () => {
    const store = useSyncQueueStore.getState();

    // Enqueue friend action A
    await store.enqueueSyncItem("FRIEND_ACTION", USER_ID, { action: "send", targetUid: "user-2" });
    // Enqueue friend action B
    await store.enqueueSyncItem("FRIEND_ACTION", USER_ID, { action: "accept", targetUid: "user-3" });

    const queue = useSyncQueueStore.getState().queue;

    // Ordering matters so both should remain sequentially in queue
    expect(queue.length).toBe(2);
    expect(queue[0].payload.action).toBe("send");
    expect(queue[1].payload.action).toBe("accept");
  });
});
