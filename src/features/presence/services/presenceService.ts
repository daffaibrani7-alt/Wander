import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "@/shared/config/firebase";

export interface UserPresence {
  uid: string;
  status: "online" | "idle" | "offline";
  lastSeen: any;
  updatedAt: string;
}

export const presenceService = {
  /**
   * Mengatur status kehadiran (online/idle/offline) pengguna ke Firestore.
   */
  setUserPresence: async (uid: string, status: "online" | "idle" | "offline"): Promise<void> => {
    if (!isFirebaseConfigured || !db) return;
    try {
      const presenceRef = doc(db, "presence", uid);
      await setDoc(
        presenceRef,
        {
          uid,
          status,
          lastSeen: serverTimestamp(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Gagal sinkronisasi presence ke Firestore:", err);
    }
  },

  /**
   * Mendengarkan status kehadiran real-time teman.
   */
  listenToFriendPresence: (uid: string, callback: (presence: UserPresence | null) => void): (() => void) => {
    if (!isFirebaseConfigured || !db) {
      // Graceful simulated presence feedback for simulation mode
      const simulated: UserPresence = {
        uid,
        status: "online",
        lastSeen: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      callback(simulated);
      return () => {};
    }

    try {
      const presenceRef = doc(db, "presence", uid);
      return onSnapshot(
        presenceRef,
        (snapshot) => {
          if (snapshot.exists()) {
            callback(snapshot.data() as UserPresence);
          } else {
            callback(null);
          }
        },
        (err) => {
          console.error(`Error listenToFriendPresence untuk ${uid}:`, err);
        }
      );
    } catch (err) {
      console.error("Gagal memulai snapshot presence:", err);
      callback(null);
      return () => {};
    }
  },
};
