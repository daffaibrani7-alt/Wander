import { Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";

export type NetworkStatusCallback = (isOnline: boolean, connectionType: string) => void;

class NetworkService {
  private listeners: Set<NetworkStatusCallback> = new Set();
  private isOnlineState = true;
  private connectionTypeState = "unknown";
  private unsubscriber: (() => void) | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        this.isOnlineState = window.navigator.onLine;
        this.connectionTypeState = "wifi"; // default approximation for web

        const handleOnline = () => this.updateState(true, "wifi");
        const handleOffline = () => this.updateState(false, "none");

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        this.unsubscriber = () => {
          window.removeEventListener("online", handleOnline);
          window.removeEventListener("offline", handleOffline);
        };
      }
    } else {
      // Native (iOS/Android) NetInfo setup
      this.unsubscriber = NetInfo.addEventListener((state) => {
        const online = !!state.isConnected && !!state.isInternetReachable;
        const connType = state.type || "unknown";
        this.updateState(online, connType);
      });

      // Fetch initial state asynchronously on native
      NetInfo.fetch().then((state) => {
        const online = !!state.isConnected && !!state.isInternetReachable;
        const connType = state.type || "unknown";
        this.updateState(online, connType);
      }).catch(() => {});
    }
  }

  private updateState(isOnline: boolean, connectionType: string) {
    if (this.isOnlineState !== isOnline || this.connectionTypeState !== connectionType) {
      this.isOnlineState = isOnline;
      this.connectionTypeState = connectionType;
      this.listeners.forEach((callback) => callback(isOnline, connectionType));
    }
  }

  /**
   * Returns current synchronous snapshot of network connectivity.
   */
  public isOnline(): boolean {
    return this.isOnlineState;
  }

  /**
   * Returns connection type (e.g. wifi, cellular, none, unknown)
   */
  public getConnectionType(): string {
    return this.connectionTypeState;
  }

  /**
   * Subscribe to network changes. Returns an unsubscribe cleanup function.
   */
  public subscribe(callback: NetworkStatusCallback): () => void {
    this.listeners.add(callback);
    // Fire immediately with current state
    callback(this.isOnlineState, this.connectionTypeState);

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Manually cleanup/tear down the service if needed (mainly for tests)
   */
  public destroy() {
    if (this.unsubscriber) {
      this.unsubscriber();
      this.unsubscriber = null;
    }
    this.listeners.clear();
  }
}

export const networkService = new NetworkService();
