/**
 * lifecycleManager.ts
 *
 * Manages application operational lifecycle transitions (foreground, background, inactive).
 * Broadcasts AppState transitions to enable context-aware optimizations.
 */
import { AppState, type AppStateStatus } from "react-native";

export type LifecycleListener = (status: AppStateStatus) => void;

class LifecycleManager {
  private currentStatus: AppStateStatus = AppState.currentState;
  private listeners = new Set<LifecycleListener>();
  private appStateSubscription: any = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      this.appStateSubscription = AppState.addEventListener("change", this.handleStateChange);
    } catch {
      // Platform fallback (e.g. web/node-runner)
    }
  }

  private handleStateChange = (nextStatus: AppStateStatus) => {
    if (this.currentStatus !== nextStatus) {
      console.log(`📱 [LifecycleManager] App state transitioned: ${this.currentStatus} ➡️ ${nextStatus}`);
      this.currentStatus = nextStatus;
      this.listeners.forEach((listener) => {
        try {
          listener(nextStatus);
        } catch (err) {
          console.warn("[LifecycleManager] Error in listener callback:", err);
        }
      });
    }
  };

  /**
   * Retrieves the current AppState status.
   */
  getStatus(): AppStateStatus {
    return this.currentStatus;
  }

  /**
   * Subscribes a callback to AppState lifecycle changes.
   */
  subscribe(listener: LifecycleListener): () => void {
    this.listeners.add(listener);
    // Execute immediately with current state
    listener(this.currentStatus);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Checks if the app is currently in the active foreground state.
   */
  isForeground(): boolean {
    return this.currentStatus === "active";
  }

  /**
   * Disposes of the native AppState subscription.
   */
  dispose() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.listeners.clear();
  }
}

export const lifecycleManager = new LifecycleManager();
