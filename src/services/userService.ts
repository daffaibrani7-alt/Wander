import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../config/firebase";
import type { User } from "firebase/auth";

// ─── User Document Type ────────────────────────────────────────────
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  provider: "google" | "apple" | "unknown";
  avatarEmoji: string;
  bio?: string;
  statusEmoji?: string;
  statusText?: string;
  equippedBadgeId?: string | null;
  equippedBadgeEmoji?: string | null;
  level?: number;
  xp?: number;
  createdAt: Timestamp | null;
  lastSeen: Timestamp | null;
}

// Random emoji pool for avatars
const AVATAR_EMOJIS = [
  "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐸", "🐧", "🦉",
  "🐙", "🦋", "🐝", "🦄", "🐳", "🐬", "🦈", "🐢", "🦩",
];

function getRandomEmoji(): string {
  return AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
}

// ─── Determine provider from Firebase user ─────────────────────────
function getProvider(user: User): "google" | "apple" | "unknown" {
  const providerId = user.providerData?.[0]?.providerId;
  if (providerId === "google.com") return "google";
  if (providerId === "apple.com") return "apple";
  return "unknown";
}

// ─── Create or Update User in Firestore ────────────────────────────
export async function createOrUpdateUser(
  firebaseUser: User
): Promise<UserProfile> {
  if (!isFirebaseConfigured || !db) {
    // Return a mock profile in simulation mode
    return {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || "Wanderer",
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
      provider: getProvider(firebaseUser),
      avatarEmoji: getRandomEmoji(),
      createdAt: null,
      lastSeen: null,
    };
  }

  const userRef = doc(db, "users", firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    // User exists → update lastSeen
    const existingData = userSnap.data() as UserProfile;

    await setDoc(
      userRef,
      {
        lastSeen: serverTimestamp(),
        // Update photo in case they changed it
        photoURL: firebaseUser.photoURL || existingData.photoURL,
        // Update displayName in case Apple user name became available
        displayName:
          firebaseUser.displayName ||
          (firebaseUser as any)._appleDisplayName ||
          existingData.displayName,
      },
      { merge: true }
    );

    return {
      ...existingData,
      photoURL: firebaseUser.photoURL || existingData.photoURL,
      displayName:
        firebaseUser.displayName ||
        (firebaseUser as any)._appleDisplayName ||
        existingData.displayName,
    };
  } else {
    // New user → create document
    const displayName =
      firebaseUser.displayName ||
      (firebaseUser as any)._appleDisplayName ||
      "Wanderer";

    const newUser: Omit<UserProfile, "createdAt" | "lastSeen"> & {
      createdAt: any;
      lastSeen: any;
    } = {
      uid: firebaseUser.uid,
      displayName,
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
      provider: getProvider(firebaseUser),
      avatarEmoji: getRandomEmoji(),
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    };

    await setDoc(userRef, newUser);

    return {
      ...newUser,
      createdAt: null, // Will be populated on next read
      lastSeen: null,
    };
  }
}

// ─── Fetch User Profile ────────────────────────────────────────────
export async function getUserProfile(
  uid: string
): Promise<UserProfile | null> {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserProfile;
  }

  return null;
}
