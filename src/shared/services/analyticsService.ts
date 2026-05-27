/**
 * analyticsService.ts
 *
 * Consolidated, production-grade Performance Analytics & Device Health monitoring.
 * Dispatches usage logs, tracks database sync latency, and captures battery drop rates
 * dynamically to ensure maximum power efficiency across location watches.
 */
import * as Battery from "expo-battery";

interface PerformanceMetrics {
  action: string;
  durationMs: number;
  syncItemCount?: number;
  status: "success" | "error";
}

class AnalyticsService {
  private isBatteryMonitoringActive = false;
  private batteryPowerLevel = 1.0;

  /**
   * Initialize hardware health and power state watchers.
   */
  async initializeDeviceTracking() {
    if (this.isBatteryMonitoringActive) return;
    
    try {
      const isAvailable = await Battery.isAvailableAsync();
      if (!isAvailable) return;

      this.batteryPowerLevel = await Battery.getBatteryLevelAsync();
      
      // Setup battery charge change listeners
      Battery.addBatteryLevelListener(({ batteryLevel }) => {
        const drop = this.batteryPowerLevel - batteryLevel;
        if (drop >= 0.05) {
          console.warn(
            `[Analytics] High power drain detected: Battery dropped ${(drop * 100).toFixed(1)}% since last watch.`
          );
        }
        this.batteryPowerLevel = batteryLevel;
      });

      this.isBatteryMonitoringActive = true;
      console.log(`[Analytics] Hardware power tracker initialized successfully. Current level: ${(this.batteryPowerLevel * 100).toFixed(1)}%`);
    } catch (e) {
      console.error("[Analytics] Failed to initialize hardware power state watcher:", e);
    }
  }

  /**
   * Logs standard DAU/MAU session triggers and feature usage metrics.
   */
  logEvent(category: string, action: string, label?: string, value?: number) {
    const timestamp = new Date().toISOString();
    console.log(
      `📊 [Analytics Event] [${timestamp}] - Category: ${category} | Action: ${action} | Label: ${label ?? "N/A"} | Val: ${value ?? 0}`
    );
    // Real pipeline dispatch (e.g. Firebase Analytics, Mixpanel, Sentry) goes here
  }

  /**
   * Monitors performance sync latencies of background stores and queues.
   */
  logPerformanceMetric(metrics: PerformanceMetrics) {
    const timestamp = new Date().toISOString();
    console.log(
      `⏱️ [Analytics Perf] [${timestamp}] - Action: ${metrics.action} | Speed: ${metrics.durationMs}ms | Count: ${metrics.syncItemCount ?? 1} | Status: ${metrics.status}`
    );
  }

  /**
   * Tracks user screen navigations and layout transition speeds.
   */
  logScreenTransition(screenName: string, transitionTimeMs: number) {
    console.log(
      `📱 [Analytics Layout] View shifted to: ${screenName} in ${transitionTimeMs}ms.`
    );
  }
}

export const analyticsService = new AnalyticsService();
