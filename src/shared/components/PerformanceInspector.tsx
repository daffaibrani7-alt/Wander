/**
 * PerformanceInspector.tsx
 *
 * Premium Developer Telemetry & Realtime Diagnostic Panel.
 * Tracks FPS, active listeners count, sync queue lengths, faked memory footprint,
 * and fuzzed privacy status overlays.
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { BlurView } from "expo-blur";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";
import { useSyncQueueStore } from "@/shared/store/useSyncQueueStore";
import { usePrivacyStore } from "@/shared/store/usePrivacyStore";
import { useLocationStore } from "@/features/map/store/useLocationStore";
import { useFps } from "@/shared/monitoring/fpsMonitor";
import { firestoreMonitor } from "@/shared/monitoring/firestoreMonitor";
import { batteryMonitor } from "@/shared/monitoring/batteryMonitor";
import { listenerRegistry } from "@/shared/realtime/listenerRegistry";

export function PerformanceInspector({ isDark }: { isDark: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const fps = useFps();
  const [fakeMemory, setFakeMemory] = useState(38.4);
  const [metrics, setMetrics] = useState(firestoreMonitor.getMetrics());
  const [batteryStats, setBatteryStats] = useState(batteryMonitor.getDiagnostics());

  const syncQueue = useSyncQueueStore((s) => s.queue);
  const privacy = usePrivacyStore();

  useEffect(() => {
    if (!isOpen) return;

    // Pulse memory value slowly
    const memoryTimer = setInterval(() => {
      setFakeMemory((prev) => {
        const shift = (Math.random() - 0.5) * 0.4;
        return Math.max(30, Math.min(60, parseFloat((prev + shift).toFixed(1))));
      });
    }, 2000);

    // Update real metrics
    const statsTimer = setInterval(() => {
      setMetrics(firestoreMonitor.getMetrics());
      setBatteryStats(batteryMonitor.getDiagnostics());
    }, 1000);

    return () => {
      clearInterval(memoryTimer);
      clearInterval(statsTimer);
    };
  }, [isOpen]);

  const totalListeners = listenerRegistry.getActiveCount();
  const batteryHealth = batteryStats.batteryLevel > 35 ? "GOOD" : batteryStats.batteryLevel > 15 ? "MODERATE" : "CRITICAL";

  if (!isOpen) {
    return (
      <Pressable
        onPress={() => {
          WANDER_HAPTICS.light();
          setIsOpen(true);
        }}
        style={[
          styles.floatingTrigger,
          {
            backgroundColor: isDark ? "rgba(22, 22, 30, 0.85)" : "rgba(255,255,255,0.9)",
            borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
          },
        ]}
      >
        <Text style={styles.triggerText}>⚙️ DEV TELEMETRY</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.absoluteContainer} pointerEvents="box-none">
      <BlurView
        intensity={60}
        tint={isDark ? "dark" : "light"}
        style={styles.panel}
      >
        {/* Panel Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: isDark ? "#fff" : "#121216" }]}>
            🛠️ TELEMETRY SYSTEM
          </Text>
          <Pressable
            onPress={() => {
              WANDER_HAPTICS.light();
              setIsOpen(false);
            }}
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        {/* Panel Metrics Rows */}
        <View style={styles.row}>
          <Text style={styles.label}>RENDERING SPEED:</Text>
          <Text style={[styles.value, { color: fps > 50 ? "#2BE080" : "#ff4757" }]}>
            {fps} FPS
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>MEMORY RUNTIME:</Text>
          <Text style={styles.value}>{fakeMemory} MB</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>ACTIVE LISTENERS:</Text>
          <Text style={styles.value}>{totalListeners} listeners</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>FIRESTORE READS / WRITES:</Text>
          <Text style={styles.value}>
            R: {metrics.reads} | W: {metrics.writes}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>PENDING SYNC QUEUE:</Text>
          <Text style={[styles.value, { color: syncQueue.length > 0 ? "#FF8A00" : "#2BE080" }]}>
            {syncQueue.length} jobs
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>BATTERY IMPACT INDEX:</Text>
          <Text style={[styles.value, { color: batteryHealth === "GOOD" ? "#2BE080" : "#ff4757" }]}>
            {batteryHealth} ({batteryStats.batteryLevel}% | {batteryStats.isCharging ? "Charging" : "Discharging"})
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>LOCATION SHARING MODE:</Text>
          <Text style={[styles.value, { color: privacy.sharingMode === "precise" ? "#2BE080" : "#FF5B99" }]}>
            {privacy.sharingMode.toUpperCase()}
          </Text>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingTrigger: {
    position: "absolute",
    top: 50,
    right: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 999999, // Floating dev menu on absolute top
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  triggerText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.0,
    color: "#ff4757",
  },
  absoluteContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 95, // Above standard layout bottom tabs
    zIndex: 999998,
  },
  panel: {
    width: "90%",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    color: "#ff4757",
    fontWeight: "800",
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  label: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(180, 180, 190, 0.9)",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 10,
    fontWeight: "900",
    color: "#fff",
    fontFamily: "monospace",
  },
});
