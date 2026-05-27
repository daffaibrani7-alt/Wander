/**
 * badgeSystem.ts
 *
 * Defines the achievements and badge categories, rarities,
 * dynamic styling profiles, and lock requirements for Wander.
 */
import { COLORS } from "@/shared/theme/colors";

export type BadgeRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export type BadgeCategory =
  | "EXPLORATION"
  | "SOCIAL"
  | "MOVEMENT"
  | "CONSISTENCY"
  | "HIDDEN"
  | "SEASONAL";

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  requirement: string;
  rarity: BadgeRarity;
  category: BadgeCategory;
  xpReward: number;
  glowColor: string;
}

export const BADGE_RARITY_PROFILES: Record<
  BadgeRarity,
  { name: string; color: string; bg: string; shadow: string }
> = {
  COMMON: {
    name: "Common",
    color: "#E5E5EA",
    bg: "rgba(229, 229, 234, 0.08)",
    shadow: "rgba(229, 229, 234, 0.2)",
  },
  RARE: {
    name: "Rare",
    color: "#00A2FF",
    bg: "rgba(0, 162, 255, 0.08)",
    shadow: "rgba(0, 162, 255, 0.4)",
  },
  EPIC: {
    name: "Epic",
    color: "#8A3FFC",
    bg: "rgba(138, 63, 252, 0.08)",
    shadow: "rgba(138, 63, 252, 0.6)",
  },
  LEGENDARY: {
    name: "Legendary",
    color: "#FF8A00",
    bg: "rgba(255, 138, 0, 0.08)",
    shadow: "rgba(255, 138, 0, 0.8)",
  },
};

export const BADGES_REGISTRY: Badge[] = [
  // ─── EXPLORATION ──────────────────────────────────────────────────────────
  {
    id: "novice-wanderer",
    name: "Novice Wanderer",
    emoji: "🌱",
    description: "Benih Penjelajah! Langkah awalmu menyusuri dunia.",
    requirement: "Buka 10 grid peta secara kumulatif.",
    rarity: "COMMON",
    category: "EXPLORATION",
    xpReward: 100,
    glowColor: "#E5E5EA",
  },
  {
    id: "city-wanderer",
    name: "City Wanderer",
    emoji: "🏙️",
    description: "Penguasa Kota! Melangkah jauh mengelilingi sudut kota.",
    requirement: "Buka total 100 grid peta secara kumulatif.",
    rarity: "RARE",
    category: "EXPLORATION",
    xpReward: 250,
    glowColor: "#00A2FF",
  },
  {
    id: "hidden-finder",
    name: "Hidden Finder",
    emoji: "🧭",
    description: "Penemu Rahasia! Menemukan tempat tersembunyi jauh dari aman.",
    requirement: "Eksplorasi area berjarak >500m dari Saved Places Anda.",
    rarity: "EPIC",
    category: "HIDDEN",
    xpReward: 300,
    glowColor: "#8A3FFC",
  },
  {
    id: "distance-master",
    name: "Distance Master",
    emoji: "🏃",
    description: "Sang Pelari Marathon! Tempuh jarak kumulatif menakjubkan.",
    requirement: "Capai total jarak perjalanan eksplorasi 20 km.",
    rarity: "LEGENDARY",
    category: "EXPLORATION",
    xpReward: 500,
    glowColor: "#FF8A00",
  },

  // ─── CONSISTENCY ───────────────────────────────────────────────────────────
  {
    id: "frequent-traveler",
    name: "Frequent Traveler",
    emoji: "✈️",
    description: "Konsisten Wanderer! Melakukan perjalanan berulang kali.",
    requirement: "Jelajahi peta Wander pada 3 hari berbeda.",
    rarity: "COMMON",
    category: "CONSISTENCY",
    xpReward: 100,
    glowColor: "#E5E5EA",
  },
  {
    id: "streak-king",
    name: "Streak King",
    emoji: "🔥",
    description: "Penjelajah Militan! Konsisten tanpa terputus.",
    requirement: "Capai streak penjelajahan selama 7 hari berturut-turut.",
    rarity: "EPIC",
    category: "CONSISTENCY",
    xpReward: 350,
    glowColor: "#8A3FFC",
  },

  // ─── MOVEMENT ──────────────────────────────────────────────────────────────
  {
    id: "road-tripper",
    name: "Road Tripper",
    emoji: "🚗",
    description: "Pembalap Jalanan! Menjelajah dalam kecepatan berkendara.",
    requirement: "Buka grid baru saat bergerak pada kecepatan >50 km/jam.",
    rarity: "RARE",
    category: "MOVEMENT",
    xpReward: 200,
    glowColor: "#00A2FF",
  },
  {
    id: "night-explorer",
    name: "Night Explorer",
    emoji: "🌙",
    description: "Kelelawar Malam! Menyusuri jalan sunyi di kala gelap.",
    requirement: "Buka grid baru di larut malam (11 PM - 5 AM).",
    rarity: "RARE",
    category: "MOVEMENT",
    xpReward: 200,
    glowColor: "#00A2FF",
  },
  {
    id: "weekend-explorer",
    name: "Weekend Explorer",
    emoji: "🎡",
    description: "Pejuang Akhir Pekan! Menjelajah saat libur tiba.",
    requirement: "Buka 20 grid baru di hari Sabtu atau Minggu.",
    rarity: "COMMON",
    category: "MOVEMENT",
    xpReward: 150,
    glowColor: "#E5E5EA",
  },

  // ─── SOCIAL & PROGRESSION ──────────────────────────────────────────────────
  {
    id: "social-star",
    name: "Social Star",
    emoji: "👑",
    description: "Konektor Sosial! Teman berhamburan mengelilingimu.",
    requirement: "Hubungkan 3 atau lebih teman aktif di radar peta.",
    rarity: "EPIC",
    category: "SOCIAL",
    xpReward: 300,
    glowColor: "#8A3FFC",
  },
  {
    id: "level-elite",
    name: "Level Elite",
    emoji: "🏆",
    description: "Puncak Pencapaian! Melampaui batas level dasar.",
    requirement: "Tingkatkan XP karakter Anda hingga mencapai Level 5.",
    rarity: "LEGENDARY",
    category: "SEASONAL",
    xpReward: 500,
    glowColor: "#FF8A00",
  },
  {
    id: "seasonal-pioneer",
    name: "Seasonal Pioneer",
    emoji: "🍁",
    description: "Pionir Landmark! Mengunjungi titik-titik kumpul favorit.",
    requirement: "Kunjungi dan verifikasi 3 Saved Places favorit Anda.",
    rarity: "LEGENDARY",
    category: "SEASONAL",
    xpReward: 500,
    glowColor: "#FF8A00",
  },
];
