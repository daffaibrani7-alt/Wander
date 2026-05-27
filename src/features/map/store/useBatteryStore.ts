/**
 * useBatteryStore.ts
 *
 * Decoupled Zustand store for device battery level, charging source state,
 * and low-power modes. Isolates battery event monitoring to reduce rerenders.
 */
import { create } from "zustand";
import * as Battery from "expo-battery";

interface BatteryState {
  batteryLevel: number;
  isCharging: boolean;
  lowPowerMode: boolean;
  isMonitoring: boolean;

  // Actions
  updateBatteryStatus: () => Promise<void>;
  startBatteryMonitoring: () => () => void;
}

export const useBatteryStore = create<BatteryState>((set, get) => {
  let batLevelSub: any = null;
  let batStateSub: any = null;
  let powerModeSub: any = null;

  return {
    batteryLevel: 100,
    isCharging: false,
    lowPowerMode: false,
    isMonitoring: false,

    updateBatteryStatus: async () => {
      try {
        const level = await Battery.getBatteryLevelAsync();
        const levelPercent = Math.round(level * 100);
        const state = await Battery.getBatteryStateAsync();
        const isCharging =
          state === Battery.BatteryState.CHARGING ||
          state === Battery.BatteryState.FULL;
        const lowPowerMode = await Battery.isLowPowerModeEnabledAsync();

        set({ batteryLevel: levelPercent, isCharging, lowPowerMode });
      } catch {
        // Simulator fallback
      }
    },

    startBatteryMonitoring: () => {
      if (get().isMonitoring) {
        return () => {};
      }

      set({ isMonitoring: true });
      get().updateBatteryStatus().catch(() => {});

      try {
        batLevelSub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
          set({ batteryLevel: Math.round(batteryLevel * 100) });
        });

        batStateSub = Battery.addBatteryStateListener(({ batteryState }) => {
          const isCharging =
            batteryState === Battery.BatteryState.CHARGING ||
            batteryState === Battery.BatteryState.FULL;
          set({ isCharging });
        });

        powerModeSub = Battery.addLowPowerModeListener(({ lowPowerMode }) => {
          set({ lowPowerMode });
        });
      } catch {
        // Battery listeners not supported
      }

      return () => {
        if (batLevelSub) {
          batLevelSub.remove();
          batLevelSub = null;
        }
        if (batStateSub) {
          batStateSub.remove();
          batStateSub = null;
        }
        if (powerModeSub) {
          powerModeSub.remove();
          powerModeSub = null;
        }
        set({ isMonitoring: false });
      };
    },
  };
});
