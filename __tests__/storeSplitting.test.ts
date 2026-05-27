/**
 * storeSplitting.test.ts
 *
 * Unit tests to verify the correctness of the split stores:
 * useBatteryStore, useGhostModeStore, useTrackingStore, useFriendLocationStore.
 */

// ── Mock modules ──────────────────────────────────────────────────
jest.mock("@/shared/config/firebase", () => ({
  db: null,
  auth: null,
  isFirebaseConfigured: false,
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock("expo-location", () => ({
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  requestBackgroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({ coords: { latitude: -6.2, longitude: 106.8 } }),
  watchPositionAsync: jest.fn().mockResolvedValue({ remove: jest.fn() }),
  hasStartedLocationUpdatesAsync: jest.fn().mockResolvedValue(false),
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
}));

jest.mock("expo-battery", () => ({
  BatteryState: {
    UNKNOWN: 0,
    UNPLUGGED: 1,
    CHARGING: 2,
    FULL: 3,
  },
  getBatteryLevelAsync: jest.fn().mockResolvedValue(0.85),
  getBatteryStateAsync: jest.fn().mockResolvedValue(2), // Charging
  isLowPowerModeEnabledAsync: jest.fn().mockResolvedValue(false),
  addBatteryLevelListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addBatteryStateListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addLowPowerModeListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
}));

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
}));

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
}));

import { useBatteryStore } from "../src/features/map/store/useBatteryStore";
import { useGhostModeStore } from "../src/features/map/store/useGhostModeStore";
import { useTrackingStore } from "../src/features/map/store/useTrackingStore";

describe("Scalability Upgrade - Split Store Checks", () => {
  beforeEach(() => {
    // Reset Zustand store states
    useBatteryStore.setState({
      batteryLevel: 100,
      isCharging: false,
      lowPowerMode: false,
      isMonitoring: false,
    });

    useGhostModeStore.setState({
      ghostMode: "precise",
      frozenLocation: null,
      blurryLocation: null,
    });

    useTrackingStore.setState({
      location: null,
      trackingActive: false,
      errorMsg: null,
    });
  });

  test("useBatteryStore can initialize and fetch battery diagnostics", async () => {
    const store = useBatteryStore.getState();
    await store.updateBatteryStatus();

    const state = useBatteryStore.getState();
    expect(state.batteryLevel).toBe(85);
    expect(state.isCharging).toBe(true);
    expect(state.lowPowerMode).toBe(false);
  });

  test("useGhostModeStore applies blurry offset deterministic coordinates fuzzer", () => {
    const store = useGhostModeStore.getState();
    const mockCoords = {
      latitude: -6.2088,
      longitude: 106.8456,
      altitude: null,
      accuracy: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    } as any;

    store.setGhostMode("default-me", "blurry", mockCoords);

    const fuzzed = useGhostModeStore.getState().getOptimizedCoords(mockCoords);
    expect(fuzzed.latitude).not.toBe(mockCoords.latitude);
    expect(fuzzed.longitude).not.toBe(mockCoords.longitude);
  });

  test("useTrackingStore starts tracking active GPS state correctly", async () => {
    const store = useTrackingStore.getState();
    await store.startTracking();

    const state = useTrackingStore.getState();
    expect(state.trackingActive).toBe(true);
    expect(state.location?.latitude).toBe(-6.2);
  });
});
