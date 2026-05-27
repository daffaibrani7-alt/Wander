/**
 * reconnectCoordinator.ts
 *
 * Orchestrates offline-to-online transitions.
 * Coordinates database synchronization and triggers offline queue flushes upon connection recovery.
 */
import { useNetworkStore } from "@/shared/store/useNetworkStore";
import { useSyncQueueStore } from "@/shared/store/useSyncQueueStore";
import { listenerRegistry } from "@/shared/realtime/listenerRegistry";
import * as Haptics from "expo-haptics";

class ReconnectCoordinator {
  private wasOffline = false;
  private unsubscribeNetworkStore: (() => void) | null = null;
  private onReconnectCallbacks = new Set<() => void>();

  constructor() {
    this.startMonitoring();
  }

  /**
   * Subscribes to the global Network Store to watch connectivity.
   */
  startMonitoring() {
    this.unsubscribeNetworkStore = useNetworkStore.subscribe((state) => {
      if (state.isOnline) {
        if (this.wasOffline) {
          this.handleReconnect();
          this.wasOffline = false;
        }
      } else {
        this.wasOffline = true;
        console.log("🌐 [ReconnectCoordinator] Device went offline. Queueing sync operations...");
      }
    });
  }

  private handleReconnect() {
    console.log("🌐 [ReconnectCoordinator] Internet connection restored! Synchronizing...");

    // 1. Trigger light success haptic
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}

    // 2. Flush offline location/tiles queue from SyncQueueStore
    try {
      const syncQueue = useSyncQueueStore.getState();
      syncQueue.flushQueue().then(() => {
        console.log("📦 [ReconnectCoordinator] Staged offline write queue successfully flushed to Firestore.");
      }).catch((err: any) => {
        console.warn("[ReconnectCoordinator] Offline write queue flush failed:", err);
      });
    } catch (err: any) {
      console.warn("[ReconnectCoordinator] Could not flush SyncQueueStore:", err);
    }

    // 3. Notify custom subscribers
    this.onReconnectCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.warn("[ReconnectCoordinator] Error in custom reconnect callback:", err);
      }
    });
  }

  /**
   * Registers a custom callback to execute on connection restoration.
   */
  registerReconnectCallback(cb: () => void): () => void {
    this.onReconnectCallbacks.add(cb);
    return () => {
      this.onReconnectCallbacks.delete(cb);
    };
  }

  /**
   * Disposes of network subscriptions.
   */
  dispose() {
    if (this.unsubscribeNetworkStore) {
      this.unsubscribeNetworkStore();
      this.unsubscribeNetworkStore = null;
    }
    this.onReconnectCallbacks.clear();
  }
}

export const reconnectCoordinator = new ReconnectCoordinator();
