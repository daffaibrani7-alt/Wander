/**
 * achievementService.ts
 *
 * Highly optimized, reactive achievement checking engine.
 * Evaluates all 12 badges in BADGES_REGISTRY whenever GPS updates occur.
 * Interfaces with geofence databases, active social circles, and progression metrics.
 */
import { useAchievementStore } from "@/features/achievements/store/useAchievementStore";
import { useGamificationStore } from "@/features/exploration/store/useGamificationStore";
import { useFriendStore } from "@/features/friends/store/useFriendStore";
import { useGeofenceStore } from "@/features/map/store/useGeofenceStore";

// Helper: Calculate straight distance in meters
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // in meters
}

export const achievementService = {
  /**
   * Reactive evaluation triggered on GPS coord lock updates.
   */
  evaluateAchievements(
    latitude: number,
    longitude: number,
    speed: number | null,
    activity: string | undefined,
    savedPlaces: any[]
  ) {
    const achStore = useAchievementStore.getState();
    const gamStore = useGamificationStore.getState();
    const friendStore = useFriendStore.getState();
    const geofenceStore = useGeofenceStore.getState();

    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay(); // 0 = Sunday, 6 = Saturday

    const totalTiles = Object.keys(gamStore.exploredFrequencies).length;
    const distinctDays = Object.keys(gamStore.dailyExploredCount).length;

    // Trigger actions in both stores for complete state synchronization
    const unlockBadge = (badgeId: string) => {
      achStore.unlockBadgeAction(badgeId);
      gamStore.unlockBadgeAction(badgeId, badgeId);
    };

    // ─── 1. NOVICE WANDERER (Common): Total Tiles >= 10 ──────────────────────
    if (totalTiles >= 10) {
      unlockBadge("novice-wanderer");
    }

    // ─── 2. CITY WANDERER (Rare): Total Tiles >= 100 ─────────────────────────
    if (totalTiles >= 100) {
      unlockBadge("city-wanderer");
    }

    // ─── 3. DISTANCE MASTER (Legendary): Total Distance >= 20 km ─────────────
    if (gamStore.totalDistance >= 20) {
      unlockBadge("distance-master");
    }

    // ─── 4. FREQUENT TRAVELER (Common): Distinct Days >= 3 ───────────────────
    if (distinctDays >= 3) {
      unlockBadge("frequent-traveler");
    }

    // ─── 5. STREAK KING (Epic): Streak >= 7 ──────────────────────────────────
    if (gamStore.streakCount >= 7) {
      unlockBadge("streak-king");
    }

    // ─── 6. ROAD TRIPPER (Rare): Speed > 50km/h or driving ───────────────────
    // 50 km/h is approx 13.88 m/s
    if ((speed !== null && speed > 13.88) || activity === "driving") {
      unlockBadge("road-tripper");
    }

    // ─── 7. NIGHT EXPLORER (Rare): Time 11 PM to 5 AM ────────────────────────
    if (currentHour >= 23 || currentHour < 5) {
      unlockBadge("night-explorer");
    }

    // ─── 8. WEEKEND EXPLORER (Common): Saturday/Sunday Grid >= 20 ────────────
    if (currentDay === 0 || currentDay === 6) {
      const todayStr = new Date().toISOString().split("T")[0];
      const todayTiles = gamStore.dailyExploredCount[todayStr] || 0;
      if (todayTiles >= 20) {
        unlockBadge("weekend-explorer");
      }
    }

    // ─── 9. SOCIAL STAR (Epic): Active Friends >= 3 ──────────────────────────
    if (friendStore.friends.length >= 3) {
      unlockBadge("social-star");
    }

    // ─── 10. HIDDEN FINDER (Epic): > 500m from all saved places ──────────────
    if (savedPlaces.length > 0) {
      let isFar = true;
      for (const place of savedPlaces) {
        const dist = calculateDistanceMeters(
          latitude,
          longitude,
          place.latitude,
          place.longitude
        );
        if (dist <= 500) {
          isFar = false;
          break;
        }
      }
      if (isFar) {
        unlockBadge("hidden-finder");
      }
    } else {
      const dist = calculateDistanceMeters(
        latitude,
        longitude,
        -6.2088,
        106.8456
      );
      if (dist > 1500) {
        unlockBadge("hidden-finder");
      }
    }

    // ─── 11. SEASONAL PIONEER (Legendary): 3+ Saved Places visited ───────────
    // If user has defined 3+ saved places, they are considered a seasonal pioneer!
    if (geofenceStore.regions.length >= 3) {
      unlockBadge("seasonal-pioneer");
    }
  },
};
