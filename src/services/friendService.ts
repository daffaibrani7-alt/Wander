import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../config/firebase";

export interface Friendship {
  id: string;
  uid1: string;
  uid2: string;
  uids: string[];
  status: "pending_uid1_to_uid2" | "pending_uid2_to_uid1" | "accepted";
  updatedAt: any;
}

// Helper: generate consistent ID [uid1]_[uid2] where uid1 < uid2
export function getFriendshipId(uid1: string, uid2: string): string {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

// ─── Search Users ──────────────────────────────────────────────────
export async function searchUsers(queryText: string, currentUid: string) {
  if (!isFirebaseConfigured || !db) return [];

  const trimmedQuery = queryText.trim();
  if (!trimmedQuery) return [];

  try {
    const usersCollection = collection(db, "users");
    // Standard prefixes search (case-sensitive)
    const q = query(
      usersCollection,
      where("displayName", ">=", trimmedQuery),
      where("displayName", "<=", trimmedQuery + "\uf8ff")
    );
    const snapshot = await getDocs(q);
    const results: any[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.uid !== currentUid) {
        results.push(data);
      }
    });
    return results;
  } catch (err) {
    console.error("Error searching users:", err);
    return [];
  }
}

// ─── Send Friend Request ───────────────────────────────────────────
export async function sendFriendRequest(senderUid: string, receiverUid: string) {
  if (!isFirebaseConfigured || !db) return;

  const friendshipId = getFriendshipId(senderUid, receiverUid);
  const docRef = doc(db, "friendships", friendshipId);

  const uid1 = senderUid < receiverUid ? senderUid : receiverUid;
  const uid2 = senderUid < receiverUid ? receiverUid : senderUid;
  
  const status = senderUid < receiverUid ? "pending_uid1_to_uid2" : "pending_uid2_to_uid1";

  await setDoc(docRef, {
    uid1,
    uid2,
    uids: [uid1, uid2],
    status,
    updatedAt: serverTimestamp(),
  });
}

// ─── Accept Friend Request ─────────────────────────────────────────
export async function acceptFriendRequest(uid1: string, uid2: string) {
  if (!isFirebaseConfigured || !db) return;

  const friendshipId = getFriendshipId(uid1, uid2);
  const docRef = doc(db, "friendships", friendshipId);

  await setDoc(
    docRef,
    {
      status: "accepted",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// ─── Reject / Delete Friendship ───────────────────────────────────
export async function deleteFriendship(uid1: string, uid2: string) {
  if (!isFirebaseConfigured || !db) return;

  const friendshipId = getFriendshipId(uid1, uid2);
  const docRef = doc(db, "friendships", friendshipId);

  await deleteDoc(docRef);
}

// ─── Real-Time Listener ────────────────────────────────────────────
export function listenToFriendships(currentUid: string, callback: (friendships: Friendship[]) => void) {
  if (!isFirebaseConfigured || !db) {
    callback([]);
    return () => {};
  }

  const q = query(collection(db, "friendships"), where("uids", "array-contains", currentUid));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const friendships: Friendship[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        friendships.push({
          id: docSnap.id,
          uid1: data.uid1,
          uid2: data.uid2,
          uids: data.uids,
          status: data.status,
          updatedAt: data.updatedAt,
        });
      });
      callback(friendships);
    },
    (err) => {
      console.error("Error listening to friendships:", err);
    }
  );

  return unsubscribe;
}
