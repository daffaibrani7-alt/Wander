/**
 * firestoreMonitor.ts
 *
 * Tracks active Firestore reads and writes executed during the user's active session.
 * Visualizes transaction costs in real-time on the Diagnostic HUD.
 */

class FirestoreMonitor {
  private reads: number = 0;
  private writes: number = 0;

  /**
   * Tracks a successful document read transaction.
   * @param count Number of documents read (defaults to 1).
   */
  incrementReads(count: number = 1) {
    this.reads += count;
  }

  /**
   * Tracks a successful document write transaction.
   * @param count Number of documents written (defaults to 1).
   */
  incrementWrites(count: number = 1) {
    this.writes += count;
  }

  /**
   * Retrieves active read and write counters.
   */
  getMetrics() {
    return {
      reads: this.reads,
      writes: this.writes,
      estimatedCostUSD: this.reads * 0.000006 + this.writes * 0.000018, // standard Firestore costs
    };
  }

  /**
   * Resets session counters.
   */
  reset() {
    this.reads = 0;
    this.writes = 0;
  }
}

export const firestoreMonitor = new FirestoreMonitor();
