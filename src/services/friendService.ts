import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  or,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../config/firebase";

export interface Friendship {
  id: string; // uid1_uid2
  uid1: string;
  uid2: string;
  uids: string[];
  createdAt: any;
}

export interface FriendRequest {
  id: string; // senderUid_receiverUid
  senderUid: string;
  receiverUid: string;
  uids: string[];
  createdAt: any;
}

export interface BlockRelationship {
  id: string; // blockerUid_blockedUid
  blockerUid: string;
  blockedUid: string;
  createdAt: any;
}

// Helper: consistent alphabetical ID order
export function getFriendshipId(uid1: string, uid2: string): string {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

// Helper: check if a block exists between two users (2-way check)
export async function isBlockActive(uid1: string, uid2: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  
  try {
    const block1Ref = doc(db, "blocks", `${uid1}_${uid2}`);
    const block2Ref = doc(db, "blocks", `${uid2}_${uid1}`);
    
    const [snap1, snap2] = await Promise.all([getDoc(block1Ref), getDoc(block2Ref)]);
    return snap1.exists() || snap2.exists();
  } catch (err) {
    console.error("Error checking block status:", err);
    return false;
  }
}

// ─── Search Users ──────────────────────────────────────────────────
export async function searchUsers(queryText: string, currentUid: string) {
  if (!isFirebaseConfigured || !db) return [];

  const trimmedQuery = queryText.trim();
  if (!trimmedQuery) return [];

  try {
    const usersCollection = collection(db, "users");
    const q = query(
      usersCollection,
      where("displayName", ">=", trimmedQuery),
      where("displayName", "<=", trimmedQuery + "\uf8ff")
    );
    
    const snapshot = await getDocs(q);
    const results: any[] = [];
    
    // Fetch all active blocks for current user to filter search results
    const blocksQuery = query(collection(db, "blocks"));
    const blocksSnapshot = await getDocs(blocksQuery);
    const blockedUids = new Set<string>();
    
    blocksSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.blockerUid === currentUid) {
        blockedUids.add(data.blockedUid);
      }
      if (data.blockedUid === currentUid) {
        blockedUids.add(data.blockerUid);
      }
    });

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.uid !== currentUid && !blockedUids.has(data.uid)) {
        results.push(data);
      }
    });
    
    return results;
  } catch (err) {
    console.error("Error searching users:", err);
    return [];
  }
}

// ─── Send Friend Request / Auto-Accept ──────────────────────────────
export async function sendFriendRequest(senderUid: string, receiverUid: string) {
  if (!isFirebaseConfigured || !db) return;

  // 1. Block check: abort if either user has blocked the other
  const blocked = await isBlockActive(senderUid, receiverUid);
  if (blocked) {
    throw new Error("Tidak dapat mengirim permintaan pertemanan karena adanya pemblokiran.");
  }

  // 2. Check if a friend request already exists in the opposite direction
  const oppositeRequestId = `${receiverUid}_${senderUid}`;
  const oppositeRequestRef = doc(db, "friendRequests", oppositeRequestId);
  const oppositeRequestSnap = await getDoc(oppositeRequestRef);

  if (oppositeRequestSnap.exists()) {
    // Auto-Accept: Convert opposite request to actual friendship immediately
    await acceptFriendRequest(receiverUid, senderUid);
    return;
  }

  // 3. Create outgoing request
  const requestId = `${senderUid}_${receiverUid}`;
  const docRef = doc(db, "friendRequests", requestId);

  await setDoc(docRef, {
    senderUid,
    receiverUid,
    uids: [senderUid, receiverUid],
    createdAt: serverTimestamp(),
  });
}

// ─── Accept Friend Request ─────────────────────────────────────────
export async function acceptFriendRequest(senderUid: string, receiverUid: string) {
  if (!isFirebaseConfigured || !db) return;

  // 1. Delete friend request in both directions to clean up
  const reqId1 = `${senderUid}_${receiverUid}`;
  const reqId2 = `${receiverUid}_${senderUid}`;
  
  await Promise.all([
    deleteDoc(doc(db, "friendRequests", reqId1)),
    deleteDoc(doc(db, "friendRequests", reqId2))
  ]);

  // 2. Create accepted friendship document
  const friendshipId = getFriendshipId(senderUid, receiverUid);
  const docRef = doc(db, "friends", friendshipId);

  const uid1 = senderUid < receiverUid ? senderUid : receiverUid;
  const uid2 = senderUid < receiverUid ? receiverUid : senderUid;

  await setDoc(docRef, {
    uid1,
    uid2,
    uids: [uid1, uid2],
    createdAt: serverTimestamp(),
  });
}

// ─── Reject / Delete Friend Request ───────────────────────────────
export async function deleteFriendRequest(senderUid: string, receiverUid: string) {
  if (!isFirebaseConfigured || !db) return;

  const reqId = `${senderUid}_${receiverUid}`;
  await deleteDoc(doc(db, "friendRequests", reqId));
}

// ─── Remove Friend (Unfriend) ──────────────────────────────────────
export async function removeFriend(uid1: string, uid2: string) {
  if (!isFirebaseConfigured || !db) return;

  const friendshipId = getFriendshipId(uid1, uid2);
  const docRef = doc(db, "friends", friendshipId);
  await deleteDoc(docRef);
}

// ─── Backwards Compatibility Wrapper for deleteFriendship ─────────
export async function deleteFriendship(uid1: string, uid2: string) {
  await removeFriend(uid1, uid2);
}

// ─── Block User & Clean Up Friendships/Requests ───────────────────
export async function blockUser(blockerUid: string, blockedUid: string) {
  if (!isFirebaseConfigured || !db) return;

  // 1. Delete friends document if active
  const friendshipId = getFriendshipId(blockerUid, blockedUid);
  await deleteDoc(doc(db, "friends", friendshipId));

  // 2. Delete pending friend requests in both directions
  const reqId1 = `${blockerUid}_${blockedUid}`;
  const reqId2 = `${blockedUid}_${blockerUid}`;
  await Promise.all([
    deleteDoc(doc(db, "friendRequests", reqId1)),
    deleteDoc(doc(db, "friendRequests", reqId2))
  ]);

  // 3. Create block relationship document
  const blockId = `${blockerUid}_${blockedUid}`;
  await setDoc(doc(db, "blocks", blockId), {
    blockerUid,
    blockedUid,
    createdAt: serverTimestamp(),
  });
}

// ─── Unblock User ──────────────────────────────────────────────────
export async function unblockUser(blockerUid: string, blockedUid: string) {
  if (!isFirebaseConfigured || !db) return;

  const blockId = `${blockerUid}_${blockedUid}`;
  await deleteDoc(doc(db, "blocks", blockId));
}

// ─── Real-Time Friends Listener (Accepted Only) ───────────────────
export function listenToAcceptedFriends(currentUid: string, callback: (friends: Friendship[]) => void) {
  if (!isFirebaseConfigured || !db) {
    callback([]);
    return () => {};
  }

  const q = query(collection(db, "friends"), where("uids", "array-contains", currentUid));

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
          createdAt: data.createdAt,
        });
      });
      callback(friendships);
    },
    (err) => {
      console.error("Error listening to friends:", err);
    }
  );

  return unsubscribe;
}

// ─── Real-Time Friend Requests Listener ────────────────────────────
export function listenToFriendRequests(currentUid: string, callback: (requests: FriendRequest[]) => void) {
  if (!isFirebaseConfigured || !db) {
    callback([]);
    return () => {};
  }

  const q = query(collection(db, "friendRequests"), where("uids", "array-contains", currentUid));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const requests: FriendRequest[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        requests.push({
          id: docSnap.id,
          senderUid: data.senderUid,
          receiverUid: data.receiverUid,
          uids: data.uids,
          createdAt: data.createdAt,
        });
      });
      callback(requests);
    },
    (err) => {
      console.error("Error listening to friend requests:", err);
    }
  );

  return unsubscribe;
}

// ─── Real-Time Blocks Listener ─────────────────────────────────────
export function listenToBlockedUsers(currentUid: string, callback: (blocks: BlockRelationship[]) => void) {
  if (!isFirebaseConfigured || !db) {
    callback([]);
    return () => {};
  }

  const q = query(collection(db, "blocks"), where("blockerUid", "==", currentUid));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const blocks: BlockRelationship[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        blocks.push({
          id: docSnap.id,
          blockerUid: data.blockerUid,
          blockedUid: data.blockedUid,
          createdAt: data.createdAt,
        });
      });
      callback(blocks);
    },
    (err) => {
      console.error("Error listening to blocked users:", err);
    }
  );

  return unsubscribe;
}
