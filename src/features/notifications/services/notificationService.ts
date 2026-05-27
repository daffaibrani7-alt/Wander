import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export const notificationService = {
  /**
   * Meminta izin perizinan notifikasi ke gawai.
   */
  requestPermissions: async (): Promise<boolean> => {
    if (Platform.OS === "web") return false;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        console.warn("Izin notifikasi ditolak oleh pengguna.");
        return false;
      }

      // Android Channel setup
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("wander-alerts", {
          name: "Wander Alerts",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#00F0FF",
        });
      }
      return true;
    } catch (err) {
      console.error("Gagal meminta permission notifikasi:", err);
      return false;
    }
  },

  /**
   * Mengirimkan notifikasi push lokal secara instan.
   */
  sendLocalNotification: async (title: string, body: string, data?: any): Promise<void> => {
    if (Platform.OS === "web") {
      console.log(`🔔 [Notification] Title: ${title} | Body: ${body}`);
      return;
    }
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: data || {},
        },
        trigger: null, // instant
      });
    } catch (err) {
      console.error("Gagal menjadwalkan notifikasi lokal:", err);
    }
  },

  /**
   * Memicu getaran haptic feedback secara aman pada platform simulator/web.
   */
  triggerHaptic: (type: "success" | "warning" | "error" | "selection" | "impact"): void => {
    try {
      switch (type) {
        case "success":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          break;
        case "warning":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          break;
        case "error":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          break;
        case "selection":
          Haptics.selectionAsync().catch(() => {});
          break;
        case "impact":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          break;
      }
    } catch {
      // Degrade gracefully on simulator / web
    }
  },
};
