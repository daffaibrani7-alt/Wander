/**
 * pagination.ts
 *
 * Production-grade Cursor Pagination and Data Streaming Utility for Firestore.
 * Supports infinite scrolling, chunked queries, and lazy-loading of list items.
 */
import {
  query,
  limit,
  startAfter,
  getDocs,
  type Query,
  type QueryConstraint,
  type DocumentSnapshot,
  type QuerySnapshot,
} from "firebase/firestore";

export interface PaginatedResult<T> {
  items: T[];
  lastVisible: DocumentSnapshot | null;
  hasMore: boolean;
}

export const paginationUtil = {
  /**
   * Fetches a single page of documents from a Firestore query using cursor-based pagination.
   *
   * @param baseQuery The pre-configured Firestore Query object.
   * @param pageSize Number of items to fetch per page.
   * @param lastVisibleCursor Optional document snapshot cursor to start after.
   */
  fetchPage: async <T>(
    baseQuery: Query,
    pageSize: number,
    lastVisibleCursor: DocumentSnapshot | null = null
  ): Promise<PaginatedResult<T>> => {
    try {
      let q = query(baseQuery, limit(pageSize));
      if (lastVisibleCursor) {
        q = query(q, startAfter(lastVisibleCursor));
      }

      const snapshot: QuerySnapshot = await getDocs(q);
      const items: T[] = [];
      
      snapshot.forEach((docSnap) => {
        items.push({
          ...docSnap.data(),
          id: docSnap.id,
        } as T);
      });

      const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
      const hasMore = snapshot.docs.length === pageSize;

      return {
        items,
        lastVisible,
        hasMore,
      };
    } catch (err) {
      console.error("[PaginationUtil] Error fetching paginated query:", err);
      return {
        items: [],
        lastVisible: null,
        hasMore: false,
      };
    }
  },
};
