import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Safe fallback for Firebase Config
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "mock-api-key",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "mock-auth.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "mock-project-id",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "mock.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "mock-sender-id",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "mock-app-id",
};

// Check if credentials are valid (i.e. not placeholders)
export const isFirebaseConfigured = 
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY !== undefined &&
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID !== undefined;

let app;
let db: any = null;

if (isFirebaseConfigured) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
    console.log("🔥 Firebase initialized successfully!");
  } catch (error) {
    console.error("⚠️ Firebase initialization failed:", error);
    db = null;
  }
} else {
  console.log("ℹ️ Running in Wander Simulation Engine mode (Firebase unconfigured).");
}

export { db };
