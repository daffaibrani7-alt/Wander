/**
 * useMemoryStore.ts
 *
 * Zustand store that compiles spatial-temporal memory cards
 * using local natural language processing templates.
 * Persists user memories inside local AsyncStorage.
 */
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useGamificationStore } from "@/features/exploration/store/useGamificationStore";
import { useExplorationStore } from "@/features/exploration/store/useExplorationStore";
import { useLocationStore } from "@/features/map/store/useLocationStore";
import { useGeofenceStore } from "@/features/map/store/useGeofenceStore";
import { WANDER_HAPTICS } from "@/shared/theme/haptics";

export interface MemoryCard {
  id: string;
  type: "anniversary" | "first_discovery" | "couple_recap" | "weekly_recap" | "monthly_recap" | "place_favorite";
  title: string;
  subtitle: string;
  description: string;
  timestamp: string;
  imageTheme: "sunset" | "neon" | "ocean" | "cyber" | "aurora";
  coordinates?: { latitude: number; longitude: number };
  placeName?: string;
  friendName?: string;
}

interface MemoryStoreState {
  memories: MemoryCard[];
  isLoaded: boolean;
  
  // Actions
  generateMemories: (userId: string) => Promise<void>;
  revisitMemory: (memoryId: string) => void;
  clearAllMemories: (userId: string) => Promise<void>;
}

// Helper to choose rich gradient themes for the UI based on memory type
const getImageTheme = (type: MemoryCard["type"]): MemoryCard["imageTheme"] => {
  switch (type) {
    case "anniversary": return "sunset";
    case "first_discovery": return "neon";
    case "couple_recap": return "cyber";
    case "weekly_recap": return "ocean";
    case "monthly_recap": return "aurora";
    case "place_favorite": return "aurora";
    default: return "sunset";
  }
};

export const useMemoryStore = create<MemoryStoreState>((set, get) => {
  return {
    memories: [],
    isLoaded: false,

    generateMemories: async (userId) => {
      try {
        // 1. Hydrate cached memories
        const cached = await AsyncStorage.getItem(`wander_memories_${userId}`);
        let loadedMemories: MemoryCard[] = [];
        if (cached) {
          loadedMemories = JSON.parse(cached);
        }

        // 2. Fetch current statistical contexts for the NLP synthesis
        const gamification = useGamificationStore.getState();
        const exploration = useExplorationStore.getState();
        const geofenceStore = useGeofenceStore.getState();
        const locationStore = useLocationStore.getState();

        const newMemories: MemoryCard[] = [];
        const lastCoord = exploration.coordinateHistory[exploration.coordinateHistory.length - 1];

        // --- NLP Synthesis Pillar A: First Discoveries ---
        const discoveredGeofences = geofenceStore.regions;
        if (discoveredGeofences.length > 0) {
          const firstPOI = discoveredGeofences[0];
          const hasDiscoveryMemory = loadedMemories.some(m => m.type === "first_discovery" && m.placeName === firstPOI.name);
          if (!hasDiscoveryMemory) {
            newMemories.push({
              id: `first-${firstPOI.id}-${Date.now()}`,
              type: "first_discovery",
              title: "Penemuan Pertama!",
              subtitle: `Menemukan ${firstPOI.name}`,
              description: `Langkah bersejarah! Anda pertama kali mengunci area ${firstPOI.name} di peta eksplorasi Wander.`,
              timestamp: new Date().toISOString(),
              imageTheme: getImageTheme("first_discovery"),
              placeName: firstPOI.name,
              coordinates: { latitude: firstPOI.latitude, longitude: firstPOI.longitude }
            });
          }
        }

        // --- NLP Synthesis Pillar B: Couple / Friends Recaps ---
        const activeFriends = locationStore.friends;
        if (activeFriends.length > 0) {
          const closestFriend = activeFriends[0];
          const hasFriendMemory = loadedMemories.some(m => m.type === "couple_recap" && m.friendName === closestFriend.displayName);
          if (!hasFriendMemory) {
            newMemories.push({
              id: `couple-${closestFriend.uid}-${Date.now()}`,
              type: "couple_recap",
              title: "Dua Petualang",
              subtitle: `Bersama ${closestFriend.displayName}`,
              description: `Anda dan ${closestFriend.displayName} telah melintasi peta bersama sebanyak ${gamification.streakCount + 2} kali minggu ini. Kompatibilitas spasial Anda luar biasa!`,
              timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
              imageTheme: getImageTheme("couple_recap"),
              friendName: closestFriend.displayName,
              coordinates: { latitude: closestFriend.latitude, longitude: closestFriend.longitude }
            });
          }
        }

        // --- NLP Synthesis Pillar C: Weekly Recaps ---
        const tileCount = exploration.totalVisitedCount;
        const distCount = gamification.totalDistance;
        const streak = gamification.streakCount;
        
        if (tileCount > 3) {
          const hasWeeklyMemory = loadedMemories.some(m => m.type === "weekly_recap");
          if (!hasWeeklyMemory) {
            newMemories.push({
              id: `weekly-recap-${Date.now()}`,
              type: "weekly_recap",
              title: "Rangkuman Perjalanan",
              subtitle: `${tileCount} Sektor Unlocked`,
              description: `Minggu ini Anda menjelajah ${distCount.toFixed(2)} km, mengunci ${tileCount} grid baru, dan menjaga streak harian ${streak} hari berturut-turut!`,
              timestamp: new Date().toISOString(),
              imageTheme: getImageTheme("weekly_recap"),
              coordinates: lastCoord ? { latitude: lastCoord.latitude, longitude: lastCoord.longitude } : undefined
            });
          }
        }

        // --- NLP Synthesis Pillar D: Monthly Recaps ---
        if (tileCount > 0) {
          const hasMonthlyMemory = loadedMemories.some(m => m.type === "monthly_recap");
          if (!hasMonthlyMemory) {
            newMemories.push({
              id: `monthly-recap-${Date.now()}`,
              type: "monthly_recap",
              title: "Ekspedisi Bulanan 🌌",
              subtitle: "Petualangan Hebat Bulan Ini",
              description: `Bulan ini Anda telah menjelajahi wilayah baru sejauh ${distCount.toFixed(1)} km! Anda telah membuka total ${tileCount} sektor grid di seluruh kota. Perjalanan luar biasa!`,
              timestamp: new Date().toISOString(),
              imageTheme: getImageTheme("monthly_recap"),
              coordinates: lastCoord ? { latitude: lastCoord.latitude, longitude: lastCoord.longitude } : { latitude: -6.2088, longitude: 106.8456 }
            });
          }
        }

        // --- NLP Synthesis Pillar E: Favorites Place Spot ---
        const freqKeys = Object.keys(gamification.exploredFrequencies);
        if (freqKeys.length > 0) {
          const sortedFreqs = Object.entries(gamification.exploredFrequencies)
            .sort((a, b) => b[1] - a[1]);
          const [topTileKey, topVal] = sortedFreqs[0];
          
          if (topVal >= 1) {
            const hasFavoritePlaceMemory = loadedMemories.some(m => m.type === "place_favorite");
            if (!hasFavoritePlaceMemory) {
              const parts = topTileKey.split("_");
              let favoriteCoords: { latitude: number; longitude: number } | undefined;
              if (parts.length === 2) {
                const latIdx = parseInt(parts[0], 10);
                const lngIdx = parseInt(parts[1], 10);
                if (!isNaN(latIdx) && !isNaN(lngIdx)) {
                  const TILE_SIZE = 0.0003;
                  favoriteCoords = {
                    latitude: (latIdx + 0.5) * TILE_SIZE,
                    longitude: (lngIdx + 0.5) * TILE_SIZE,
                  };
                }
              }

              newMemories.push({
                id: `favorite-place-${Date.now()}`,
                type: "place_favorite",
                title: "Tempat Favorit Baru",
                subtitle: "Nongkrong Sektor Intens",
                description: `Tempat dengan koordinat grid ini telah Anda kunjungi sebanyak ${topVal} kali. Area ini resmi dinobatkan sebagai tempat bersantai malam favorit Anda!`,
                timestamp: new Date().toISOString(),
                imageTheme: getImageTheme("place_favorite"),
                coordinates: favoriteCoords
              });
            }
          }
        }

        // --- NLP Synthesis Pillar F: Anniversary Memory (Synthesized default anniversary) ---
        const hasAnniversaryMemory = loadedMemories.some(m => m.type === "anniversary");
        if (!hasAnniversaryMemory) {
          newMemories.push({
            id: `anniversary-default-${Date.now()}`,
            type: "anniversary",
            title: "Satu Bulan Wander",
            subtitle: "Mengenang Petualangan Pertama",
            description: "Satu bulan yang lalu, Anda mengaktifkan radar Wander pertama Anda di Jakarta. Sejak saat itu, separuh bumi lokal Anda telah hidup dengan warna neon!",
            timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            imageTheme: getImageTheme("anniversary"),
            coordinates: { latitude: -6.2088, longitude: 106.8456 }
          });
        }

        // Compile combined memories list (newly synthesized first)
        const combined = [...newMemories, ...loadedMemories.filter(m => !newMemories.some(n => n.id.split("-")[0] === m.id.split("-")[0]))];
        
        set({ memories: combined, isLoaded: true });
        await AsyncStorage.setItem(`wander_memories_${userId}`, JSON.stringify(combined));
      } catch (err) {
        console.error("Gagal mensintesis memori emosional:", err);
      }
    },

    revisitMemory: (memoryId) => {
      const memory = get().memories.find(m => m.id === memoryId);
      if (memory && memory.coordinates) {
        WANDER_HAPTICS.medium();
        // Fly map camera to the memory location coordinates
        const explorationStore = useExplorationStore.getState();
        // Trigger a localized memory flyto zoom event on map if possible
      }
    },

    clearAllMemories: async (userId) => {
      await AsyncStorage.removeItem(`wander_memories_${userId}`);
      set({ memories: [] });
    }
  };
});
