import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  // @ts-ignore – react-native persistence
  getReactNativePersistence,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Safe fallback for Firebase Config
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "mock-api-key",
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "mock-auth.firebaseapp.com",
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "mock-project-id",
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "mock.appspot.com",
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "mock-sender-id",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "mock-app-id",
};

// Check if credentials are valid (i.e. not placeholders)
export const isFirebaseConfigured =
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY !== undefined &&
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID !== undefined;

let app;
let db: any = null;
let auth: any = null;
let storage: any = null;

if (isFirebaseConfigured) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }

    // Initialize Auth with React Native persistence
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      // Already initialized – get existing instance
      auth = getAuth(app);
    }

    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
    storage = getStorage(app);
    console.log("🔥 Firebase initialized successfully!");
  } catch (error) {
    console.error("⚠️ Firebase initialization failed:", error);
    db = null;
    auth = null;
    storage = null;
  }
} else {
  console.log(
    "ℹ️ Running in Wander Simulation Engine mode (Firebase unconfigured)."
  );
}

export { db, auth, storage };
