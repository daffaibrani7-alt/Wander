/**
 * batteryMonitor.ts
 *
 * Measures device battery drainage velocity and profiles tracking draw rates.
 * Powers battery diagnostics inside the Developer Performance HUD.
 */
import { useBatteryStore } from "@/features/map/store/useBatteryStore";

class BatteryMonitor {
  private startBattery: number | null = null;
  private startTime: number = Date.now();

  /**
   * Starts a profiling window to measure drainage rates over time.
   */
  startSession() {
    this.startBattery = useBatteryStore.getState().batteryLevel;
    this.startTime = Date.now();
  }

  /**
   * Computes the average battery drainage velocity in percentage points per hour.
   */
  getDrainRatePerHour(): number {
    if (this.startBattery === null) {
      this.startSession();
      return 0;
    }

    const currentBattery = useBatteryStore.getState().batteryLevel;
    const timePassedMs = Date.now() - this.startTime;
    const timePassedHours = timePassedMs / 3600000;

    if (timePassedHours < 0.01) {
      return 0; // Prevent division by zero or jittery stats initially
    }

    const drainAmount = this.startBattery - currentBattery;
    if (drainAmount <= 0) return 0; // Battery was plugged in or did not drain yet

    return Math.round((drainAmount / timePassedHours) * 10) / 10;
  }

  /**
   * Retrieves active battery statistics.
   */
  getDiagnostics() {
    const batteryStore = useBatteryStore.getState();
    return {
      batteryLevel: batteryStore.batteryLevel,
      isCharging: batteryStore.isCharging,
      lowPowerMode: batteryStore.lowPowerMode,
      drainRate: this.getDrainRatePerHour(),
    };
  }
}

export const batteryMonitor = new BatteryMonitor();
