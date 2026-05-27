/**
 * types.ts
 *
 * Core TypeScript interfaces for the Wander Premium Chat System.
 * Covers conversations, messages, participants, metadata, and buzz interactions.
 */

// ─── Buzz Intensity Levels ─────────────────────────────────────────
export type BuzzIntensity = "gentle" | "normal" | "urgent";

// ─── Message Types ─────────────────────────────────────────────────
export type MessageType =
  | "text"
  | "image"
  | "location"
  | "place"
  | "replay"
  | "buzz"
  | "voice"
  | "system";

// ─── Conversation Type ─────────────────────────────────────────────
export type ConversationType = "direct" | "group";

// ─── Chat Participant ──────────────────────────────────────────────
export interface ChatParticipant {
  uid: string;
  displayName: string;
  avatarEmoji: string;
  photoURL: string | null;
}

// ─── Message Metadata ──────────────────────────────────────────────
export interface MessageMetadata {
  /** Latitude for location/place messages */
  latitude?: number;
  /** Longitude for location/place messages */
  longitude?: number;
  /** Human-readable place name */
  placeName?: string;
  /** Internal place identifier */
  placeId?: string;
  /** Exploration replay session ID */
  replayId?: string;
  /** Map snapshot image (base64 or storage URL) */
  mapSnapshot?: string;
  /** Voice message duration in milliseconds */
  voiceDurationMs?: number;
  /** Buzz message intensity */
  buzzIntensity?: BuzzIntensity;
}

// ─── Last Message Preview ──────────────────────────────────────────
export interface LastMessage {
  content: string;
  type: MessageType;
  senderUid: string;
  senderName: string;
  createdAt: string;
}

// ─── Message ───────────────────────────────────────────────────────
export interface Message {
  id: string;
  conversationId: string;
  senderUid: string;
  type: MessageType;
  content: string;
  metadata?: MessageMetadata;
  /** uid → emoji */
  reactions: Record<string, string>;
  /** uid → ISO timestamp */
  readBy: Record<string, string>;
  createdAt: string;
  /** ISO timestamp for vanish messages */
  expiresAt?: string;
  /** ID of the message being replied to */
  replyToId?: string;
  /** Optimistic UI flag, removed after server confirmation */
  _pending?: boolean;
}

// ─── Conversation ──────────────────────────────────────────────────
export interface Conversation {
  id: string;
  type: ConversationType;
  participantUids: string[];
  participantProfiles: Record<string, ChatParticipant>;
  lastMessage: LastMessage | null;
  createdAt: string;
  updatedAt: string;
  /** Per-user unread message counts: uid → count */
  unreadCount: Record<string, number>;
  /** UIDs currently typing */
  typingUsers: string[];
  /** UIDs who pinned this conversation */
  pinnedBy: string[];
  /** UIDs who muted this conversation */
  mutedBy: string[];
  /** Optional group name */
  groupName?: string;
  /** Optional group emoji icon */
  groupEmoji?: string;
}

// ─── Chat Presence Status ──────────────────────────────────────────
export interface ChatPresenceStatus {
  uid: string;
  isOnline: boolean;
  lastSeenText: string;
  activityLabel: string;
  activityEmoji: string;
}
