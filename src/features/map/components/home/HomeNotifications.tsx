import React from "react";
import { NotificationCenter } from "@/features/notifications/components/NotificationCenter";

interface HomeNotificationsProps {
  visible: boolean;
  onClose: () => void;
}

export function HomeNotifications({ visible, onClose }: HomeNotificationsProps) {
  if (!visible) return null;

  return (
    <NotificationCenter
      visible={visible}
      onClose={onClose}
    />
  );
}
