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

// In-memory profile cache with TTL (5 minutes) and LRU eviction (max 200 entries)
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_SIZE = 200;

interface CacheEntry {
  profile: UserProfile;
  cachedAt: number;
}

const profileCache = new Map<string, CacheEntry>();

function _cacheSet(uid: string, profile: UserProfile): void {
  // LRU eviction: delete oldest entry when at capacity
  if (profileCache.size >= CACHE_MAX_SIZE && !profileCache.has(uid)) {
    const oldestKey = profileCache.keys().next().value;
    if (oldestKey) profileCache.delete(oldestKey);
  }
  profileCache.set(uid, { profile, cachedAt: Date.now() });
}

async function getProfileWithCache(uid: string): Promise<UserProfile | null> {
  const entry = profileCache.get(uid);

  if (entry) {
    const isStale = Date.now() - entry.cachedAt > CACHE_TTL_MS;
    if (!isStale) {
      return entry.profile;
    }
    // Serve stale value immediately but refresh in background
    getUserProfile(uid).then((fresh) => {
      if (fresh) _cacheSet(uid, fresh);
    }).catch(() => {});
    return entry.profile;
  }

  const profile = await getUserProfile(uid);
  if (profile) {
    _cacheSet(uid, profile);
  }
  return profile;
}

/** Call on sign-out to prevent stale profiles leaking between sessions */
export function clearProfileCache(): void {
  profileCache.clear();
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
