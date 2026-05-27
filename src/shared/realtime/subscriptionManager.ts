/**
 * subscriptionManager.ts
 *
 * Implements Firestore IN Query Chunking and Batched Realtime Listeners.
 * Divides an arbitrary array of UIDs into batches of 30 (Firestore IN limit),
 * listens to each batch, aggregates updates, and exposes a unified stream.
 */
import { collection, query, where, onSnapshot, type Query } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/shared/config/firebase";
import { listenerRegistry } from "@/shared/realtime/listenerRegistry";

export type ChunkUpdateCallback<T> = (data: T[]) => void;

class SubscriptionManager {
  /**
   * Subscribes to document updates for a large list of UIDs by chunking them.
   * Exposes a unified unsubscribe callback.
   *
   * @param uids Array of document UIDs to query.
   * @param collectionName Name of the Firestore collection.
   * @param uidField The document field name carrying the UID (defaults to "uid").
   * @param callback Aggregated update callback.
   * @returns Unsubscribe function.
   */
  subscribeToUids<T>(
    uids: string[],
    collectionName: string,
    uidField: string = "uid",
    callback: ChunkUpdateCallback<T>
  ): () => void {
    if (uids.length === 0) {
      callback([]);
      return () => {};
    }

    if (!isFirebaseConfigured || !db) {
      // Bypassed if Firebase is not active
      return () => {};
    }

    // Chunk size: 30 (Firestore maximum for "in" operator)
    const CHUNK_SIZE = 30;
    const chunks: string[][] = [];
    for (let i = 0; i < uids.length; i += CHUNK_SIZE) {
      chunks.push(uids.slice(i, i + CHUNK_SIZE));
    }

    const unsubscribes: (() => void)[] = [];
    const aggregatedData = new Map<string, T>();
    const chunkCount = chunks.length;

    console.log(`📡 [SubscriptionManager] Chunking list of ${uids.length} UIDs into ${chunkCount} Firestore queries.`);

    chunks.forEach((chunk, index) => {
      const q = query(
        collection(db, collectionName),
        where(uidField, "in", chunk)
      );

      const registryKey = `chunk_${collectionName}_${index}_${Date.now()}`;

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          snapshot.forEach((docSnap) => {
            const id = docSnap.id;
            const data = { ...docSnap.data(), id } as T;
            aggregatedData.set(id, data);
          });

          // Delete items from memory if they are not in the snapshot but were previously in this chunk
          // (Handles document deletions)
          const snapshotIds = new Set(snapshot.docs.map((d) => d.id));
          chunk.forEach((uid) => {
            if (!snapshotIds.has(uid)) {
              aggregatedData.delete(uid);
            }
          });

          // Deliver combined aggregated results
          callback(Array.from(aggregatedData.values()));
        },
        (err) => {
          console.error(`[SubscriptionManager] Firestore chunk query ${index} failed:`, err);
        }
      );

      unsubscribes.push(unsub);
      listenerRegistry.register(registryKey, unsub);
    });

    return () => {
      console.log(`📡 [SubscriptionManager] Unsubscribing ${unsubscribes.length} chunk listeners for ${collectionName}.`);
      unsubscribes.forEach((unsub, idx) => {
        unsub();
      });
    };
  }
}

export const subscriptionManager = new SubscriptionManager();
