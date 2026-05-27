/**
 * useChatTyping.ts
 *
 * Debounced typing indicator hook for the chat composer.
 * Sends typing: true on keystroke, auto-clears after 3 seconds of inactivity.
 */
import { useCallback, useRef } from "react";
import { useChatStore } from "@/features/chat/store/useChatStore";

const TYPING_TIMEOUT_MS = 3000;

export function useChatTyping(conversationId: string | null, uid: string | null) {
  const setTypingAction = useChatStore((s) => s.setTypingAction);
  const isTypingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onTextChange = useCallback(
    (text: string) => {
      if (!conversationId || !uid) return;

      // Send typing: true if not already
      if (!isTypingRef.current && text.length > 0) {
        isTypingRef.current = true;
        setTypingAction(conversationId, uid, true);
      }

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set auto-clear timeout
      timeoutRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          isTypingRef.current = false;
          setTypingAction(conversationId, uid, false);
        }
      }, TYPING_TIMEOUT_MS);

      // If text is empty, stop typing immediately
      if (text.length === 0 && isTypingRef.current) {
        isTypingRef.current = false;
        setTypingAction(conversationId, uid, false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    },
    [conversationId, uid, setTypingAction]
  );

  const stopTyping = useCallback(() => {
    if (!conversationId || !uid) return;
    if (isTypingRef.current) {
      isTypingRef.current = false;
      setTypingAction(conversationId, uid, false);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [conversationId, uid, setTypingAction]);

  return { onTextChange, stopTyping, isTyping: isTypingRef.current };
}
