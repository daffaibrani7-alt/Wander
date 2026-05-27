/**
 * useChatPresence.ts
 *
 * Derives human-readable presence status for chat conversation participants
 * from the existing usePresenceStore.
 */
import { useMemo } from "react";
import { usePresenceStore, type FriendActivityState } from "@/features/presence/store/usePresenceStore";
import type { ChatPresenceStatus } from "@/features/chat/types/types";

const ACTIVITY_LABELS: Record<FriendActivityState["activity"], { label: string; emoji: string }> = {
  driving: { label: "Driving", emoji: "🚗" },
  walking: { label: "Walking", emoji: "🚶" },
  home: { label: "At Home", emoji: "🏠" },
  work: { label: "At Work", emoji: "💼" },
  school: { label: "At School", emoji: "📚" },
  cafe: { label: "At Cafe", emoji: "☕" },
  sleeping: { label: "Sleeping", emoji: "💤" },
  traveling: { label: "Traveling", emoji: "✈️" },
  online: { label: "Active Now", emoji: "🟢" },
  idle: { label: "Away", emoji: "🌙" },
};

function formatLastSeen(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Active now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

export function useChatPresence(participantUids: string[], currentUid: string): ChatPresenceStatus[] {
  const friendPresences = usePresenceStore((s) => s.friendPresences);

  return useMemo(() => {
    return participantUids
      .filter((uid) => uid !== currentUid)
      .map((uid) => {
        const presence = friendPresences[uid];
        if (!presence) {
          return {
            uid,
            isOnline: false,
            lastSeenText: "Offline",
            activityLabel: "Offline",
            activityEmoji: "⚫",
          };
        }

        const isOnline = presence.status === "online";
        const activityInfo = ACTIVITY_LABELS[presence.activity] || { label: "Online", emoji: "🟢" };

        return {
          uid,
          isOnline,
          lastSeenText: isOnline ? "Active now" : formatLastSeen(presence.lastSeen || presence.updatedAt),
          activityLabel: activityInfo.label,
          activityEmoji: activityInfo.emoji,
        };
      });
  }, [participantUids, currentUid, friendPresences]);
}
