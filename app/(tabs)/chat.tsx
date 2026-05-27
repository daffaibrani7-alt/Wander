/**
 * chat.tsx
 *
 * Chat tab route — renders ConversationListScreen as default view
 * and ChatScreen as a pushed view within the tab.
 */
import React, { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { ConversationListScreen } from "@/features/chat/screens/ConversationListScreen";
import { ChatScreen } from "@/features/chat/screens/ChatScreen";
import { useThemeStore } from "@/features/settings/store/useThemeStore";
import { COLORS } from "@/shared/theme/colors";

export default function ChatTab() {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const handleOpenConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
  }, []);

  const handleBack = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {activeConversationId ? (
        <ChatScreen
          conversationId={activeConversationId}
          onBack={handleBack}
        />
      ) : (
        <ConversationListScreen onOpenConversation={handleOpenConversation} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
