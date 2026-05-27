// Mock AsyncStorage for Zustand store
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock firebase/firestore
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
}));

// Mock Firebase config
jest.mock("@/shared/config/firebase", () => ({
  db: {},
  isFirebaseConfigured: false,
}));

import { usePrivacyStore } from "../src/shared/store/usePrivacyStore";

describe("Privacy Engine - Ghost Zones & Location Fuzzing", () => {
  beforeEach(() => {
    // Reset state before each test run
    const store = usePrivacyStore.getState();
    store.setSharingMode("precise");
    store.setInvisibleHours({ enabled: false, startHour: 22, endHour: 6 });
    // Remove mock zones
    const zones = [...store.ghostZones];
    zones.forEach(z => store.removeGhostZone(z.id));
  });

  test("returns precise coordinates when sharingMode is precise and no zones are active", () => {
    const store = usePrivacyStore.getState();
    const inputLat = -6.2088;
    const inputLng = 106.8456;

    const result = store.getFuzzedLocation(inputLat, inputLng);
    expect(result.latitude).toBe(inputLat);
    expect(result.longitude).toBe(inputLng);
    expect(result.fuzzed).toBe(false);
  });

  test("fuzzes location when sharingMode is approximate", () => {
    const store = usePrivacyStore.getState();
    store.setSharingMode("approximate");
    const inputLat = -6.2088;
    const inputLng = 106.8456;

    const result = store.getFuzzedLocation(inputLat, inputLng);
    expect(result.fuzzed).toBe(true);
    expect(result.latitude).not.toBe(inputLat);
    expect(result.longitude).not.toBe(inputLng);
  });

  test("fuzzes location when position falls inside active Ghost Zone boundary", () => {
    const store = usePrivacyStore.getState();
    
    // Add Home Ghost Zone (200m radius around Jakarta center)
    const homeLat = -6.2088;
    const homeLng = 106.8456;
    store.addGhostZone({
      name: "Home",
      latitude: homeLat,
      longitude: homeLng,
      radiusMeters: 200
    });

    // Test coordinates 50m away (inside zone)
    const insideLat = -6.2085;
    const insideLng = 106.8454;
    const resultInside = store.getFuzzedLocation(insideLat, insideLng);
    expect(resultInside.fuzzed).toBe(true);

    // Test coordinates 1km away (outside zone)
    const outsideLat = -6.2200;
    const outsideLng = 106.8500;
    const resultOutside = store.getFuzzedLocation(outsideLat, outsideLng);
    expect(resultOutside.fuzzed).toBe(false);
    expect(resultOutside.latitude).toBe(outsideLat);
  });
});
