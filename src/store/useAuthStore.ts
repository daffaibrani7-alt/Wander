import { create } from "zustand";

interface UserProfile {
  uid: string;
  displayName: string;
  avatarEmoji: string;
  phone: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: false,
  user: null,

  login: async (username: string) => {
    set({ isLoading: true });
    // Simulate iOS network loading delay for sleek feel
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    set({
      isAuthenticated: true,
      isLoading: false,
      user: {
        uid: "user-me",
        displayName: username || "Me (You)",
        avatarEmoji: "🦊",
        phone: "+62 812-3456-7890",
      },
    });
  },

  logout: async () => {
    set({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    set({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
