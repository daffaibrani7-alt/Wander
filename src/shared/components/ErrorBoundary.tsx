import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { AlertTriangle, RefreshCw } from "lucide-react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { COLORS } from "@/shared/theme/colors";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Reusable, production-grade Global Error Boundary component.
 * Catches runtime React layout crashes, log details, and displays
 * an interactive frosted glass fallback state instead of freezing the app.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught runtime crash caught:", error, errorInfo);
  }

  private handleRetry = () => {
    // Play micro-selection vibration tick
    Haptics.selectionAsync().catch(() => {});
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDark = true; // default premium dark OLED styling
      const glassBg = "rgba(18, 18, 22, 0.94)";
      const borderTheme = "rgba(255, 91, 153, 0.15)";
      
      const renderContent = () => (
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <AlertTriangle size={36} color={COLORS.pink} />
          </View>
          <Text style={styles.title}>Terjadi Kesalahan Layout ⚠️</Text>
          <Text style={styles.description}>
            Aplikasi Wander mendeteksi adanya kegagalan rendering pada modul antarmuka ini.
          </Text>
          {this.state.error?.message ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText} numberOfLines={3}>
                {this.state.error.message}
              </Text>
            </View>
          ) : null}
          <Pressable
            id="error-boundary-retry-btn"
            onPress={this.handleRetry}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && { opacity: 0.8 },
            ]}
          >
            <RefreshCw size={14} color="#000" style={{ marginRight: 6 }} />
            <Text style={styles.retryBtnText}>Muat Ulang Tampilan</Text>
          </Pressable>
        </View>
      );

      return (
        <View style={styles.container}>
          {Platform.OS === "web" ? (
            <View style={[styles.blurFill, { backgroundColor: glassBg, borderColor: borderTheme }]}>
              {renderContent()}
            </View>
          ) : (
            <BlurView intensity={90} tint="dark" style={styles.blurFill}>
              <View style={[styles.blurFill, { backgroundColor: glassBg, borderColor: borderTheme }]}>
                {renderContent()}
              </View>
            </BlurView>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#000",
  },
  blurFill: {
    width: "100%",
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
  },
  card: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 91, 153, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
    fontFamily: "System",
  },
  description: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 16,
    fontFamily: "System",
  },
  errorBox: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 20,
  },
  errorText: {
    color: "#FF5B99",
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "monospace",
    textAlign: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.cyan,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: "100%",
  },
  retryBtnText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "System",
  },
});
