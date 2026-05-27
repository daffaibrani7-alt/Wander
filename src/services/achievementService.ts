import { useGamificationStore } from "../store/useGamificationStore";
import { SavedPlace } from "./geofenceService";

export interface BadgeInfo {
  id: string;
  name: string;
  emoji: string;
  description: string;
  requirement: string;
  color: string;
}

export const ACHIEVEMENTS_LIST: BadgeInfo[] = [
  {
    id: "road-tripper",
    name: "Road Tripper",
    emoji: "🚗",
    description: "Petualang Jalan Raya! Menjelajah dalam kecepatan tinggi.",
    requirement: "Buka grid baru saat berkendara (>50 km/jam).",
    color: "#FF8A00",
  },
  {
    id: "night-explorer",
    name: "Night Explorer",
    emoji: "🌙",
    description: "Penjelajah Malam! Menyusuri kota saat gelap.",
    requirement: "Buka grid baru di malam hari (11 PM - 5 AM).",
    color: "#8A3FFC",
  },
  {
    id: "city-wanderer",
    name: "City Wanderer",
    emoji: "🏙️",
    description: "Penguasa Kota! Melangkah jauh mengelilingi sudut kota.",
    requirement: "Buka total 100 grid peta secara kumulatif.",
    color: "#00F0FF",
  },
  {
    id: "frequent-traveler",
    name: "Frequent Traveler",
    emoji: "✈️",
    description: "Penjelajah Setia! Konsisten menjelajah setiap hari.",
    requirement: "Jelajahi peta Wander pada 3 hari berbeda.",
    color: "#2BE080",
  },
  {
    id: "hidden-finder",
    name: "Hidden Place Finder",
    emoji: "🧭",
    description: "Penemu Harta Karun! Keluar dari zona nyaman harian.",
    requirement: "Jelajahi grid yang berjarak >500m dari Saved Places Anda.",
    color: "#FF5B99",
  },
  {
    id: "weekend-explorer",
    name: "Weekend Explorer",
    emoji: "🎡",
    description: "Pejuang Akhir Pekan! Menjelajah saat libur tiba.",
    requirement: "Buka 20 grid baru di hari Sabtu atau Minggu.",
    color: "#FFC700",
  },
];

// Helper: Calculate straight distance in meters
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
   * Mengevaluasi seluruh pencapaian/badge secara reaktif setelah grid baru dibuka.
   */
  evaluateAchievements(
    latitude: number,
    longitude: number,
    speed: number | null,
    activity: string | undefined,
    savedPlaces: any[]
  ) {
    const store = useGamificationStore.getState();
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay(); // 0 = Sunday, 6 = Saturday

    // 1. NIGHT EXPLORER: Unlocked between 11 PM (23) and 5 AM
    if (currentHour >= 23 || currentHour < 5) {
      store.unlockBadgeAction("night-explorer", "Night Explorer");
    }

    // 2. ROAD TRIPPER: Speed > 50km/h (approx 13.88 m/s) or activity === "driving"
    if ((speed !== null && speed > 13.88) || activity === "driving") {
      store.unlockBadgeAction("road-tripper", "Road Tripper");
    }

    // 3. CITY WANDERER: Visited tiles >= 100
    const totalTiles = Object.keys(store.exploredFrequencies).length;
    if (totalTiles >= 100) {
      store.unlockBadgeAction("city-wanderer", "City Wanderer");
    }

    // 4. FREQUENT TRAVELER: Explored across 3 distinct days
    const distinctDays = Object.keys(store.dailyExploredCount).length;
    if (distinctDays >= 3) {
      store.unlockBadgeAction("frequent-traveler", "Frequent Traveler");
    }

    // 5. WEEKEND EXPLORER: Explore on Saturday (6) or Sunday (0)
    if (currentDay === 0 || currentDay === 6) {
      const todayStr = new Date().toISOString().split("T")[0];
      const todayTiles = store.dailyExploredCount[todayStr] || 0;
      if (todayTiles >= 20) {
        store.unlockBadgeAction("weekend-explorer", "Weekend Explorer");
      }
    }

    // 6. HIDDEN PLACE FINDER: Visited grid is > 500m from all saved places
    if (savedPlaces.length > 0) {
      let isFar = true;
      for (const place of savedPlaces) {
        const dist = calculateDistanceMeters(latitude, longitude, place.latitude, place.longitude);
        if (dist <= 500) {
          isFar = false;
          break;
        }
      }
      if (isFar) {
        store.unlockBadgeAction("hidden-finder", "Hidden Place Finder");
      }
    } else {
      // If no saved places, check distance from standard center Jakarta (-6.2088, 106.8456)
      const dist = calculateDistanceMeters(latitude, longitude, -6.2088, 106.8456);
      if (dist > 1500) {
        store.unlockBadgeAction("hidden-finder", "Hidden Place Finder");
      }
    }
  }
};
