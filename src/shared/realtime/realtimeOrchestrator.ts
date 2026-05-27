/**
 * realtimeOrchestrator.ts
 *
 * Central Orchestrator Gateway for lifecycle-aware synchronization.
 * Suspends non-essential Firestore snapshot listeners in the background to prevent
 * battery drain, and triggers rapid reconnection upon returning to the foreground.
 */
import { lifecycleManager } from "@/shared/realtime/lifecycleManager";
import { listenerRegistry } from "@/shared/realtime/listenerRegistry";
import { syncScheduler } from "@/shared/realtime/syncScheduler";
import { reconnectCoordinator } from "@/shared/realtime/reconnectCoordinator";
import { useChatStore } from "@/features/chat/store/useChatStore";
import { useAuthStore } from "@/features/auth/store/useAuthStore";

class RealtimeOrchestrator {
  private isSuspended = false;

  constructor() {
    this.initializeOrchestration();
  }

  /**
   * Subscribes to the central app lifecycle manager.
   */
  initializeOrchestration() {
    lifecycleManager.subscribe((status) => {
      if (status === "background") {
        this.suspendNonEssentialListeners();
      } else if (status === "active") {
        this.resumeEssentialListeners();
      }
    });
  }

  private suspendNonEssentialListeners() {
    if (this.isSuspended) return;
    this.isSuspended = true;

    console.log("🔋 [RealtimeOrchestrator] App went background. Suspending non-essential database listeners...");

    // 1. Flush any pending scheduled writes to database instantly before sleep
    syncScheduler.flushAll().catch(() => {});

    // 2. Unsubscribe active chat listeners (DMs, active conversations)
    try {
      const activeChat = useChatStore.getState().activeConversationId;
      if (activeChat) {
        useChatStore.getState().closeConversation();
        console.log(`🔌 [RealtimeOrchestrator] Suspended message streams for active conversation: ${activeChat}`);
      }
    } catch {}

    // 3. Clear non-critical listeners registered inside the registry
    // Note: We retain critical "chat-conversations" and "locations" listeners if background tracking is needed.
    const activeKeys = listenerRegistry.getActiveKeys();
    const nonEssentialKeys = activeKeys.filter((k) => k.startsWith("chunk_") || k.startsWith("chat-messages-"));
    
    if (nonEssentialKeys.length > 0) {
      listenerRegistry.clearList(nonEssentialKeys);
      console.log(`🔌 [RealtimeOrchestrator] Cleaned up ${nonEssentialKeys.length} non-essential background subscriptions.`);
    }
  }

  private resumeEssentialListeners() {
    if (!this.isSuspended) return;
    this.isSuspended = false;

    console.log("🚀 [RealtimeOrchestrator] App active. Resuming suspended streams...");

    // 1. Re-initialize chat message feed if inside a conversation
    try {
      const currentUid = useAuthStore.getState().user?.uid || "default-me";
      const conversations = useChatStore.getState().conversations;
      const activeChatId = useChatStore.getState().activeConversationId;

      if (activeChatId) {
        useChatStore.getState().openConversation(activeChatId, currentUid);
        console.log(`🚀 [RealtimeOrchestrator] Restored chat stream for conversation: ${activeChatId}`);
      }
    } catch {}

    // 2. Trigger reconnect flushes
    try {
      reconnectCoordinator.startMonitoring();
    } catch {}
  }
}

export const realtimeOrchestrator = new RealtimeOrchestrator();
