/**
 * profileService.ts
 *
 * Operations for updating user profile fields (displayName, bio, avatar picture, and status vibes).
 * Integrates Firestore and handles simulation persistent AsyncStorage backups.
 */
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/shared/config/firebase";
import type { UserProfile } from "@/features/profile/services/userService";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SIMULATED_PROFILE_KEY_PREFIX = "wander_simulated_profile_";

export async function updateProfileData(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    // ─── Simulation Mode Persistence ────────────────────────────────
    // Persists custom profile changes directly inside AsyncStorage.
    // Loads persistently upon user sign-in/initialization.
    try {
      const key = SIMULATED_PROFILE_KEY_PREFIX + uid;
      const val = await AsyncStorage.getItem(key);
      const existing = val ? JSON.parse(val) : {};
      const merged = { ...existing, ...data };
      await AsyncStorage.setItem(key, JSON.stringify(merged));
    } catch (err) {
      console.error("❌ Simulation mode profile save error:", err);
    }
    return;
  }

  // ─── Production Firestore Update ──────────────────────────────────
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      {
        ...data,
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("❌ Firestore profile write error:", error);
    throw error;
  }
}
