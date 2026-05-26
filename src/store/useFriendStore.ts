import { create } from "zustand";
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  deleteFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
  listenToAcceptedFriends,
  listenToFriendRequests,
  listenToBlockedUsers,
} from "../services/friendService";
import { getUserProfile, type UserProfile } from "../services/userService";

interface FriendState {
  friends: UserProfile[];
  incomingRequests: UserProfile[];
  outgoingRequests: UserProfile[];
  blockedUsers: UserProfile[];
  searchResults: UserProfile[];
  isLoading: boolean;
  error: string | null;

  searchUsersAction: (queryText: string, currentUid: string) => Promise<void>;
  sendRequestAction: (currentUid: string, receiverUid: string) => Promise<void>;
  acceptRequestAction: (currentUid: string, senderUid: string) => Promise<void>;
  rejectRequestAction: (currentUid: string, senderUid: string) => Promise<void>;
  removeFriendAction: (currentUid: string, friendUid: string) => Promise<void>;
  blockUserAction: (currentUid: string, blockedUid: string) => Promise<void>;
  unblockUserAction: (currentUid: string, blockedUid: string) => Promise<void>;
  initializeFriendListener: (currentUid: string) => () => void;
}

// In-memory profile cache to avoid redundant database reads for real-time listener updates
const profileCache = new Map<string, UserProfile>();

async function getProfileWithCache(uid: string): Promise<UserProfile | null> {
  if (profileCache.has(uid)) {
    return profileCache.get(uid)!;
  }
  const profile = await getUserProfile(uid);
  if (profile) {
    profileCache.set(uid, profile);
  }
  return profile;
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  blockedUsers: [],
  searchResults: [],
  isLoading: false,
  error: null,

  searchUsersAction: async (queryText: string, currentUid: string) => {
    if (!queryText.trim()) {
      set({ searchResults: [] });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const results = await searchUsers(queryText, currentUid);
      set({ searchResults: results, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  sendRequestAction: async (senderUid: string, receiverUid: string) => {
    try {
      await sendFriendRequest(senderUid, receiverUid);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  acceptRequestAction: async (currentUid: string, senderUid: string) => {
    try {
      await acceptFriendRequest(senderUid, currentUid);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  rejectRequestAction: async (currentUid: string, senderUid: string) => {
    try {
      await deleteFriendRequest(senderUid, currentUid);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  removeFriendAction: async (currentUid: string, friendUid: string) => {
    try {
      await removeFriend(currentUid, friendUid);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  blockUserAction: async (currentUid: string, blockedUid: string) => {
    try {
      await blockUser(currentUid, blockedUid);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  unblockUserAction: async (currentUid: string, blockedUid: string) => {
    try {
      await unblockUser(currentUid, blockedUid);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  initializeFriendListener: (currentUid: string) => {
    set({ isLoading: true });

    // 1. Listen to accepted friends
    const unsubFriends = listenToAcceptedFriends(currentUid, async (friendships) => {
      const activeFriends: UserProfile[] = [];
      const fetchPromises = friendships.map(async (f) => {
        const otherUid = f.uid1 === currentUid ? f.uid2 : f.uid1;
        const profile = await getProfileWithCache(otherUid);
        if (profile) activeFriends.push(profile);
      });
      await Promise.all(fetchPromises);
      set({ friends: activeFriends, isLoading: false });
    });

    // 2. Listen to pending friend requests
    const unsubRequests = listenToFriendRequests(currentUid, async (requests) => {
      const incoming: UserProfile[] = [];
      const outgoing: UserProfile[] = [];
      
      const fetchPromises = requests.map(async (r) => {
        const isIncoming = r.receiverUid === currentUid;
        const otherUid = isIncoming ? r.senderUid : r.receiverUid;
        const profile = await getProfileWithCache(otherUid);
        if (profile) {
          if (isIncoming) {
            incoming.push(profile);
          } else {
            outgoing.push(profile);
          }
        }
      });
      await Promise.all(fetchPromises);
      set({ incomingRequests: incoming, outgoingRequests: outgoing, isLoading: false });
    });

    // 3. Listen to blocked users
    const unsubBlocks = listenToBlockedUsers(currentUid, async (blocks) => {
      const blockedList: UserProfile[] = [];
      const fetchPromises = blocks.map(async (b) => {
        const profile = await getProfileWithCache(b.blockedUid);
        if (profile) blockedList.push(profile);
      });
      await Promise.all(fetchPromises);
      set({ blockedUsers: blockedList, isLoading: false });
    });

    // Return a unified unsubscribe cleanup function
    return () => {
      unsubFriends();
      unsubRequests();
      unsubBlocks();
    };
  },
}));
