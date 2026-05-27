import { create } from "zustand";
import * as Haptics from "expo-haptics";

interface WidgetStateStore {
  isWidgetSimulatorActive: boolean;
  widgetTheme: "dark" | "light" | "system";

  // Actions
  setWidgetSimulatorActive: (active: boolean) => void;
  toggleWidgetSimulator: () => void;
  setWidgetTheme: (theme: "dark" | "light" | "system") => void;
}

export const useWidgetStore = create<WidgetStateStore>((set, get) => {
  return {
    isWidgetSimulatorActive: false,
    widgetTheme: "dark",

    setWidgetSimulatorActive: (active) => {
      Haptics.selectionAsync().catch(() => {});
      set({ isWidgetSimulatorActive: active });
    },

    toggleWidgetSimulator: () => {
      Haptics.selectionAsync().catch(() => {});
      set({ isWidgetSimulatorActive: !get().isWidgetSimulatorActive });
    },

    setWidgetTheme: (theme) => {
      Haptics.selectionAsync().catch(() => {});
      set({ widgetTheme: theme });
    },
  };
});
