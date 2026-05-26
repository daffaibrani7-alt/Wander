import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "../src/store/useAuthStore";
import { COLORS } from "../src/theme/colors";
import { useThemeStore } from "../src/store/useThemeStore";

export default function IndexGateway() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isDark = useThemeStore((state) => state.isDark);
  const theme = COLORS.get(isDark);

  useEffect(() => {
    // Elegant redirect sequence: index redirects to Splash initially
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace("/(tabs)/home");
      } else {
        router.replace("/splash");
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color={theme.text} />
    </View>
  );
}
