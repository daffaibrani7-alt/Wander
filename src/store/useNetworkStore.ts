import { create } from "zustand";
import { networkService } from "../services/networkService";

interface NetworkState {
  isOnline: boolean;
  connectionType: string;
  isInitialized: boolean;
  
  initializeNetworkMonitoring: () => () => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => {
  let unsubscribes: (() => void)[] = [];

  return {
    isOnline: networkService.isOnline(),
    connectionType: networkService.getConnectionType(),
    isInitialized: false,

    initializeNetworkMonitoring: () => {
      // Prevent double initialization
      if (get().isInitialized) {
        return () => {};
      }

      console.log("🌐 Network Monitoring initialized!");

      const unsub = networkService.subscribe((isOnline, connectionType) => {
        set({ isOnline, connectionType, isInitialized: true });
      });

      unsubscribes.push(unsub);

      return () => {
        unsub();
        const index = unsubscribes.indexOf(unsub);
        if (index > -1) {
          unsubscribes.splice(index, 1);
        }
      };
    },
  };
});
