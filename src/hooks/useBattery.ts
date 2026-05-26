import { useState, useEffect } from "react";
import * as Battery from "expo-battery";
import { Platform } from "react-native";

export interface BatteryState {
  batteryLevel: number;
  isCharging: boolean;
}

export function useBattery(): BatteryState {
  const [batteryState, setBatteryState] = useState<BatteryState>({
    batteryLevel: 100,
    isCharging: false,
  });

  useEffect(() => {
    let isMounted = true;
    let subscription: Battery.Subscription | null = null;

    async function checkBattery() {
      try {
        const isAvailable = await Battery.isAvailableAsync();
        if (!isAvailable) {
          // Fallback for web/simulator
          setBatteryState({ batteryLevel: 78, isCharging: true });
          return;
        }

        const level = await Battery.getBatteryLevelAsync();
        const status = await Battery.getBatteryStateAsync();

        if (isMounted) {
          setBatteryState({
            batteryLevel: Math.round(level * 100),
            isCharging: status === Battery.BatteryState.CHARGING || status === Battery.BatteryState.FULL,
          });
        }

        // Subscribe to changes
        subscription = Battery.addBatteryStateListener(({ batteryState: nextStatus }) => {
          if (isMounted) {
            setBatteryState(prev => ({
              ...prev,
              isCharging: nextStatus === Battery.BatteryState.CHARGING || nextStatus === Battery.BatteryState.FULL,
            }));
          }
        });

        // Also add battery level listener
        const levelSub = Battery.addBatteryLevelListener(({ batteryLevel: nextLevel }) => {
          if (isMounted) {
            setBatteryState(prev => ({
              ...prev,
              batteryLevel: Math.round(nextLevel * 100),
            }));
          }
        });

        return () => {
          levelSub.remove();
        };
      } catch (err) {
        console.warn("Battery sensor not available on this device", err);
        if (isMounted) {
          setBatteryState({ batteryLevel: 85, isCharging: false });
        }
      }
    }

    checkBattery();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  return batteryState;
}
