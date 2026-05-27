/**
 * realtimeManager.ts
 *
 * Centralized, production-grade Realtime Listener Registry and Sync Coordinator.
 * Manages active database snapshot subscriptions, de-duplicates listeners,
 * and handles graceful cleanups to prevent memory leaks and redundant costs.
 */
class RealtimeManager {
  private listeners = new Map<string, () => void>();

  /**
   * Registers a new live database subscription cleanup hook.
   * If a listener with the same unique key already exists, it unregisters
   * the duplicate first to prevent leaks.
   */
  register(key: string, unsubscribe: () => void) {
    if (this.listeners.has(key)) {
      try {
        this.listeners.get(key)!();
      } catch (e) {
        console.warn(`[RealtimeManager] Failed cleaning duplicate listener for key: ${key}`, e);
      }
    }
    this.listeners.set(key, unsubscribe);
  }

  /**
   * Unregisters and calls the unsubscribe cleanup hook for a specific listener.
   */
  unregister(key: string) {
    if (this.listeners.has(key)) {
      try {
        this.listeners.get(key)!();
      } catch (e) {
        console.warn(`[RealtimeManager] Error unsubscribing listener for key: ${key}`, e);
      }
      this.listeners.delete(key);
    }
  }

  /**
   * Disposes of all currently active database listeners cleanly.
   * Typically called on user logout or hard app resets.
   */
  clearAll() {
    for (const [key, unsub] of this.listeners.entries()) {
      try {
        unsub();
      } catch (e) {
        console.warn(`[RealtimeManager] Error clearing listener for key: ${key}`, e);
      }
    }
    this.listeners.clear();
    console.log("[RealtimeManager] Disposed of all active live database listeners.");
  }
}

export const realtimeManager = new RealtimeManager();
