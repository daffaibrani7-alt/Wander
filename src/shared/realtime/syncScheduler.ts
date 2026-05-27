/**
 * syncScheduler.ts
 *
 * Coordinates write-throttling and debounced synchronization tasks.
 * Prevents Firestore write spikes by buffering, debouncing, and scheduling non-critical updates.
 */

export interface SyncTask {
  key: string;
  execute: () => Promise<void>;
  priority: "high" | "low";
}

class SyncScheduler {
  private pendingTasks = new Map<string, SyncTask>();
  private activeTimeouts = new Map<string, any>();

  /**
   * Schedules a sync task.
   * If a task with the same key is already scheduled, it debounces the execution.
   * High priority tasks bypass debouncing and execute immediately.
   *
   * @param key Unique identifier for the sync operation (e.g. "location_sync")
   * @param execute Async function containing the write operation
   * @param delayMs Debounce delay in milliseconds (defaults to 3000ms)
   * @param priority Task priority (defaults to "low")
   */
  schedule(key: string, execute: () => Promise<void>, delayMs: number = 3000, priority: "high" | "low" = "low") {
    // If high priority, cancel scheduled timeouts and execute immediately
    if (priority === "high") {
      this.cancel(key);
      execute().catch((err) => console.warn(`[SyncScheduler] High priority task ${key} failed:`, err));
      return;
    }

    // Cancel existing timeout to debounce
    this.cancel(key);

    const task: SyncTask = { key, execute, priority };
    this.pendingTasks.set(key, task);

    const timeout = setTimeout(async () => {
      this.activeTimeouts.delete(key);
      this.pendingTasks.delete(key);
      try {
        await execute();
      } catch (err) {
        console.warn(`[SyncScheduler] Scheduled task ${key} failed:`, err);
      }
    }, delayMs);

    this.activeTimeouts.set(key, timeout);
  }

  /**
   * Cancels a scheduled task by key.
   */
  cancel(key: string) {
    if (this.activeTimeouts.has(key)) {
      clearTimeout(this.activeTimeouts.get(key));
      this.activeTimeouts.delete(key);
    }
    this.pendingTasks.delete(key);
  }

  /**
   * Triggers all pending tasks immediately.
   */
  async flushAll() {
    const tasks = Array.from(this.pendingTasks.values());
    this.pendingTasks.clear();
    
    for (const [key, timeout] of this.activeTimeouts.entries()) {
      clearTimeout(timeout);
    }
    this.activeTimeouts.clear();

    for (const task of tasks) {
      try {
        await task.execute();
      } catch (err) {
        console.warn(`[SyncScheduler] Flush task ${task.key} failed:`, err);
      }
    }
  }
}

export const syncScheduler = new SyncScheduler();
