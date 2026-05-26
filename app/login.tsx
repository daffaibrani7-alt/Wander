import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../src/store/useAuthStore";
import { useThemeStore } from "../src/store/useThemeStore";
import { COLORS } from "../src/theme/colors";
import { AppleButton } from "../src/components/AppleButton";
import { Compass } from "lucide-react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";

export default function LoginScreen() {
  const router = useRouter();
  const isDark = useThemeStore((state) => state.isDark);
  const theme = COLORS.get(isDark);
  const {
    loginWithGoogle,
    loginWithApple,
    isLoading,
    isAuthenticated,
    error,
    clearError,
  } = useAuthStore();

  // Redirect when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)/home");
    }
  }, [isAuthenticated]);

  // Auto-clear error after 4 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleGoogle = async () => {
    await loginWithGoogle();
  };

  const handleApple = async () => {
    await loginWithApple();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        {/* Brand header */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(100)}
          style={styles.brandContainer}
        >
          <View
            style={[styles.logoBadge, { backgroundColor: COLORS.cyan + "15" }]}
          >
            <Compass size={36} color={COLORS.cyan} strokeWidth={2} />
          </View>
          <Text style={[styles.welcomeText, { color: theme.text }]}>
            Selamat datang di Wander
          </Text>
          <Text style={[styles.descText, { color: theme.textMuted }]}>
            Masuk untuk terhubung secara real-time dengan teman Anda di peta.
          </Text>
        </Animated.View>

        {/* Auth buttons */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(300)}
          style={styles.formContainer}
        >
          {/* Error banner */}
          {error && (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: COLORS.pink + "18" },
              ]}
            >
              <Text style={[styles.errorText, { color: COLORS.pink }]}>
                {error}
              </Text>
            </View>
          )}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.cyan} />
              <Text style={[styles.loadingText, { color: theme.textMuted }]}>
                Mengamankan sesi Anda...
              </Text>
            </View>
          ) : (
            <>
              {/* Google Sign-In */}
              <AppleButton
                title="Lanjutkan dengan Google"
                onPress={handleGoogle}
                variant="primary"
                style={styles.authBtn}
                icon={
                  <Text style={styles.btnIcon}>G</Text>
                }
              />

              {/* Apple Sign-In — iOS only */}
              {Platform.OS === "ios" && (
                <AppleButton
                  title="Lanjutkan dengan Apple"
                  onPress={handleApple}
                  variant="secondary"
                  style={styles.authBtn}
                  icon={
                    <Text
                      style={[
                        styles.btnIcon,
                        { color: theme.text, fontSize: 20 },
                      ]}
                    >
                      
                    </Text>
                  }
                />
              )}
            </>
          )}
        </Animated.View>

        {/* iOS Footer disclaimer */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(500)}
          style={styles.footer}
        >
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            Dengan masuk, Anda menyetujui Ketentuan Layanan & Kebijakan Privasi
            Wander.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
  },
  brandContainer: {
    marginBottom: 44,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
    fontFamily: "System",
  },
  descText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    fontWeight: "500",
    fontFamily: "System",
  },
  formContainer: {
    marginBottom: 40,
    gap: 12,
  },
  authBtn: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  btnIcon: {
    fontSize: 18,
    fontWeight: "800",
    fontFamily: "System",
  },
  errorBanner: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  loadingContainer: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 28,
    right: 28,
    alignItems: "center",
  },
  footerText: {
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
    fontWeight: "500",
  },
});
