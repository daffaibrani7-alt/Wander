import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../src/store/useAuthStore";
import { useThemeStore } from "../src/store/useThemeStore";
import { COLORS } from "../src/theme/colors";
import { AppleButton } from "../src/components/AppleButton";
import { Compass } from "lucide-react-native";

export default function LoginScreen() {
  const router = useRouter();
  const isDark = useThemeStore((state) => state.isDark);
  const theme = COLORS.get(isDark);
  const { login, isLoading } = useAuthStore();
  const [username, setUsername] = useState("");

  const handleLogin = async () => {
    const finalName = username.trim() || "Daffa Ibrani";
    await login(finalName);
    router.replace("/(tabs)/home");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      <View style={styles.content}>
        {/* Apple Maps / ChatGPT style minimalist top brand */}
        <View style={styles.brandContainer}>
          <View style={[styles.logoBadge, { backgroundColor: COLORS.cyan + "15" }]}>
            <Compass size={36} color={COLORS.cyan} strokeWidth={2} />
          </View>
          <Text style={[styles.welcomeText, { color: theme.text }]}>
            Selamat datang di Wander
          </Text>
          <Text style={[styles.descText, { color: theme.textMuted }]}>
            Masuk untuk terhubung secara real-time dengan teman Anda di peta Apple-Style.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Text style={[styles.inputLabel, { color: theme.textMuted }]}>
            NAMA PENGGUNA
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Masukkan nama Anda..."
            placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
            value={username}
            onChangeText={setUsername}
            editable={!isLoading}
          />

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.cyan} />
              <Text style={[styles.loadingText, { color: theme.textMuted }]}>
                Mengamankan radar lokasi Anda...
              </Text>
            </View>
          ) : (
            <AppleButton
              title="Masuk secara Instan"
              onPress={handleLogin}
              variant="primary"
              style={styles.loginBtn}
            />
          )}
        </View>

        {/* iOS Footer disclaimer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            Dengan masuk, Anda menyetujui Ketentuan Layanan & Kebijakan Privasi Wander.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 20,
    fontFamily: "System",
  },
  loginBtn: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
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
