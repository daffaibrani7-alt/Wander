import { create } from "zustand";

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: true, // Default to a gorgeous dark OLED Apple style
  toggleTheme: () => set((state) => ({ isDark: !state.isDark })),
  setTheme: (dark: boolean) => set({ isDark: dark }),
}));
