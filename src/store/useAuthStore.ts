import { create } from "zustand";
import { Platform } from "react-native";
import {
  signInWithGoogle,
  signInWithApple,
  signOut,
  onAuthStateChanged,
  configureGoogleSignIn,
} from "../services/authService";
import {
  createOrUpdateUser,
  type UserProfile,
} from "../services/userService";

// ─── State Types ───────────────────────────────────────────────────
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  user: UserProfile | null;
  error: string | null;

  // Actions
  initializeAuth: () => () => void;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  clearError: () => void;
}

// ─── Store ─────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  user: null,
  error: null,

  // Subscribe to Firebase auth state changes for persistent session
  initializeAuth: () => {
    configureGoogleSignIn();

    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await createOrUpdateUser(firebaseUser);
          set({
            isAuthenticated: true,
            user: profile,
            isInitialized: true,
            isLoading: false,
          });
        } catch (error) {
          console.error("❌ Error syncing user profile:", error);
          set({
            isAuthenticated: true,
            user: {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || "Wanderer",
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              provider: "unknown",
              avatarEmoji: "🦊",
              createdAt: null,
              lastSeen: null,
            },
            isInitialized: true,
            isLoading: false,
          });
        }
      } else {
        set({
          isAuthenticated: false,
          user: null,
          isInitialized: true,
          isLoading: false,
        });
      }
    });

    return unsubscribe;
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null });

    // Auto-bypass langsung di Web
    if (Platform.OS === "web") {
      const bypassProfile = {
        uid: "bypass-google",
        displayName: "Harlein 🦊",
        email: "harlein@wander.app",
        photoURL: null,
        provider: "google" as const,
        avatarEmoji: "🦊",
        createdAt: null,
        lastSeen: null,
      };
      set({ isAuthenticated: true, user: bypassProfile, isLoading: false });
      return;
    }

    try {
      const firebaseUser = await signInWithGoogle();
      const profile = await createOrUpdateUser(firebaseUser);
      set({
        isAuthenticated: true,
        user: profile,
        isLoading: false,
      });
    } catch (error: any) {
      const message = error.message || "Login gagal";
      if (message === "CANCELLED") {
        set({ isLoading: false });
        return;
      }

      // Auto-bypass ketika modul native tidak tersedia (misal di Expo Go)
      if (
        message.includes("Play Services") ||
        message.includes("not available") ||
        message.includes("native") ||
        message.includes("Firebase") ||
        message.includes("configured")
      ) {
        console.log("⚠️ Bypassing Google Sign-In with Simulation User...");
        const bypassProfile = {
          uid: "bypass-google",
          displayName: "Harlein 🦊",
          email: "harlein@wander.app",
          photoURL: null,
          provider: "google" as const,
          avatarEmoji: "🦊",
          createdAt: null,
          lastSeen: null,
        };
        set({ isAuthenticated: true, user: bypassProfile, isLoading: false });
        return;
      }

      set({ isLoading: false, error: message });
    }
  },

  loginWithApple: async () => {
    set({ isLoading: true, error: null });

    // Auto-bypass langsung di Web
    if (Platform.OS === "web") {
      const bypassProfile = {
        uid: "bypass-apple",
        displayName: "Harlein 🍎",
        email: "harlein@wander.app",
        photoURL: null,
        provider: "apple" as const,
        avatarEmoji: "🍎",
        createdAt: null,
        lastSeen: null,
      };
      set({ isAuthenticated: true, user: bypassProfile, isLoading: false });
      return;
    }

    try {
      const firebaseUser = await signInWithApple();
      const profile = await createOrUpdateUser(firebaseUser);
      set({
        isAuthenticated: true,
        user: profile,
        isLoading: false,
      });
    } catch (error: any) {
      const message = error.message || "Login gagal";
      if (message === "CANCELLED") {
        set({ isLoading: false });
        return;
      }

      // Auto-bypass ketika modul native tidak tersedia (misal di Expo Go)
      if (
        message.includes("Apple") ||
        message.includes("not available") ||
        message.includes("native") ||
        message.includes("Firebase") ||
        message.includes("configured")
      ) {
        console.log("⚠️ Bypassing Apple Sign-In with Simulation User...");
        const bypassProfile = {
          uid: "bypass-apple",
          displayName: "Harlein 🍎",
          email: "harlein@wander.app",
          photoURL: null,
          provider: "apple" as const,
          avatarEmoji: "🍎",
          createdAt: null,
          lastSeen: null,
        };
        set({ isAuthenticated: true, user: bypassProfile, isLoading: false });
        return;
      }

      set({ isLoading: false, error: message });
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await signOut();
      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || "Logout gagal" });
    }
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),
  clearError: () => set({ error: null }),
}));
