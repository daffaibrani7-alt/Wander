/**
 * listenerRegistry.ts
 *
 * Registry for active Firestore realtime listeners.
 * Tracks subscription count, prevents memory leaks, and exposes stats to the diagnostic HUD.
 */

export type UnsubscribeCallback = () => void;

class ListenerRegistry {
  private registry = new Map<string, UnsubscribeCallback>();

  /**
   * Registers a database listener. Cleanly unsubscribes duplicates to prevent leaks.
   */
  register(key: string, unsubscribe: UnsubscribeCallback) {
    if (this.registry.has(key)) {
      try {
        this.registry.get(key)!();
      } catch (err) {
        console.warn(`[ListenerRegistry] Duplicate unsubscribe failed for key: ${key}`, err);
      }
    }
    this.registry.set(key, unsubscribe);
  }

  /**
   * Cleanly unsubscribes a specific listener and removes it from the registry.
   */
  unregister(key: string) {
    if (this.registry.has(key)) {
      try {
        this.registry.get(key)!();
      } catch (err) {
        console.warn(`[ListenerRegistry] Unsubscribe failed for key: ${key}`, err);
      }
      this.registry.delete(key);
    }
  }

  /**
   * Retrieves the current number of active realtime listeners.
   */
  getActiveCount(): number {
    return this.registry.size;
  }

  /**
   * Exposes keys of all currently registered active listeners.
   */
  getActiveKeys(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Disposes of a list of listeners by their keys.
   */
  clearList(keys: string[]) {
    keys.forEach((k) => this.unregister(k));
  }

  /**
   * Disposes of all currently registered listeners.
   */
  clearAll() {
    for (const [key, unsub] of this.registry.entries()) {
      try {
        unsub();
      } catch (err) {
        console.warn(`[ListenerRegistry] Cleanup failed during clearAll for key: ${key}`, err);
      }
    }
    this.registry.clear();
    console.log("🧹 [ListenerRegistry] Cleaned up and disposed of all active listeners.");
  }
}

export const listenerRegistry = new ListenerRegistry();
