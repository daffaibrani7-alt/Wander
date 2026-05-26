import { create } from "zustand";
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  deleteFriendship,
  listenToFriendships,
  type Friendship,
} from "../services/friendService";
import { getUserProfile, type UserProfile } from "../services/userService";

interface FriendState {
  friends: UserProfile[];
  incomingRequests: UserProfile[];
  outgoingRequests: UserProfile[];
  searchResults: UserProfile[];
  isLoading: boolean;
  error: string | null;

  searchUsersAction: (queryText: string, currentUid: string) => Promise<void>;
  sendRequestAction: (currentUid: string, receiverUid: string) => Promise<void>;
  acceptRequestAction: (currentUid: string, senderUid: string) => Promise<void>;
  rejectRequestAction: (currentUid: string, otherUid: string) => Promise<void>;
  initializeFriendListener: (currentUid: string) => () => void;
}

// Cache to prevent repetitive database reads for user profiles
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
    }
  },

  acceptRequestAction: async (currentUid: string, senderUid: string) => {
    try {
      await acceptFriendRequest(currentUid, senderUid);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  rejectRequestAction: async (currentUid: string, otherUid: string) => {
    try {
      await deleteFriendship(currentUid, otherUid);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  initializeFriendListener: (currentUid: string) => {
    set({ isLoading: true });

    const unsubscribe = listenToFriendships(currentUid, async (friendships) => {
      const activeFriends: UserProfile[] = [];
      const incoming: UserProfile[] = [];
      const outgoing: UserProfile[] = [];

      const fetchPromises = friendships.map(async (f) => {
        const otherUid = f.uid1 === currentUid ? f.uid2 : f.uid1;
        const profile = await getProfileWithCache(otherUid);
        if (!profile) return;

        if (f.status === "accepted") {
          activeFriends.push(profile);
        } else if (
          (f.status === "pending_uid1_to_uid2" && f.uid2 === currentUid) ||
          (f.status === "pending_uid2_to_uid1" && f.uid1 === currentUid)
        ) {
          incoming.push(profile);
        } else {
          outgoing.push(profile);
        }
      });

      await Promise.all(fetchPromises);

      set({
        friends: activeFriends,
        incomingRequests: incoming,
        outgoingRequests: outgoing,
        isLoading: false,
      });
    });

    return unsubscribe;
  },
}));
