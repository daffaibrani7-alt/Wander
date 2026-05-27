/**
 * progressionEngine.ts
 *
 * Calculations for XP metrics, Level boundaries, active streaks,
 * and stable daily/weekly mission generation seeded from date-keys.
 */

export interface Mission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  target: number;
  current: number;
  type: "TILES" | "DISTANCE" | "SAVED_PLACE" | "SPEED";
  completed: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  target: number;
  current: number;
  type: "TILES" | "DISTANCE";
  completed: boolean;
}

/**
 * Calculates Level details from total accumulated XP.
 * Formula:
 * - Level 1: 0 - 150 XP
 * - Level 2: 150 - 500 XP (350 XP required)
 * - Level 3: 500 - 1000 XP (500 XP required)
 * - Level 4: 1000 - 1650 XP (650 XP required)
 */
export function getLevelInfoFromXP(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  let level = 1;
  let xpNeededForNext = 150;
  let accumulatedXp = 0;

  while (totalXp >= accumulatedXp + xpNeededForNext) {
    accumulatedXp += xpNeededForNext;
    level += 1;
    xpNeededForNext = (level - 1) * 350 + 150;
  }

  const currentLevelXp = totalXp - accumulatedXp;
  const nextLevelXp = xpNeededForNext;
  const progressPercent = Math.min(1, Math.max(0, currentLevelXp / nextLevelXp));

  return {
    level,
    currentLevelXp,
    nextLevelXp,
    progressPercent,
  };
}

/**
 * Calculates XP multipliers based on active exploration streaks.
 * Every day of streak gives +10% bonus (e.g. Streak 3 = 1.3x multiplier),
 * capped at a maximum of 1.5x multiplier.
 */
export function getStreakMultiplier(streakCount: number): number {
  const base = 1.0;
  const bonus = streakCount * 0.1;
  return Math.min(1.5, base + bonus);
}

/**
 * Seeded pseudo-random generator to ensure missions are identical for a given day
 * across screen mounts and restarts, but change dynamically on date boundaries.
 */
function sfc32(a: number, b: number, c: number, d: number) {
  return function () {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    var t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

function getSeededRandom(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  const rand = sfc32(h ^ 0xdeaf, h ^ 0xbeef, h ^ 0xcafe, h ^ 0xbabe);
  return rand;
}

/**
 * Generates three daily missions dynamically seeded from the date.
 */
export function generateDailyMissions(dateStr: string): Mission[] {
  const rand = getSeededRandom(dateStr);

  const tileTargets = [5, 10, 15, 20];
  const distTargets = [1, 2, 3, 5];
  const speedTargets = [30, 40, 50, 60];

  const tTarget = tileTargets[Math.floor(rand() * tileTargets.length)];
  const dTarget = distTargets[Math.floor(rand() * distTargets.length)];
  const sTarget = speedTargets[Math.floor(rand() * speedTargets.length)];

  return [
    {
      id: `daily-tiles-${dateStr}`,
      title: "Perintis Jalan Pagi",
      description: `Buka ${tTarget} grid peta baru hari ini.`,
      xpReward: 100,
      target: tTarget,
      current: 0,
      type: "TILES",
      completed: false,
    },
    {
      id: `daily-dist-${dateStr}`,
      title: "Pelari Jarak Jauh",
      description: `Tempuh jarak eksplorasi sejauh ${dTarget} km hari ini.`,
      xpReward: 150,
      target: dTarget,
      current: 0,
      type: "DISTANCE",
      completed: false,
    },
    {
      id: `daily-speed-${dateStr}`,
      title: "Komuter Cepat",
      description: `Eksplorasi area baru dengan kecepatan berkendara >${sTarget} km/jam.`,
      xpReward: 120,
      target: sTarget,
      current: 0,
      type: "SPEED",
      completed: false,
    },
  ];
}

/**
 * Generates two weekly challenges dynamically seeded from the week identifier.
 */
export function generateWeeklyChallenges(weekIdStr: string): Challenge[] {
  const rand = getSeededRandom(weekIdStr);

  const tileTargets = [50, 80, 100, 150];
  const distTargets = [10, 15, 20, 30];

  const tTarget = tileTargets[Math.floor(rand() * tileTargets.length)];
  const dTarget = distTargets[Math.floor(rand() * distTargets.length)];

  return [
    {
      id: `weekly-tiles-${weekIdStr}`,
      title: "Pengembara Agung",
      description: `Buka total ${tTarget} grid baru dalam minggu ini.`,
      xpReward: 300,
      target: tTarget,
      current: 0,
      type: "TILES",
      completed: false,
    },
    {
      id: `weekly-dist-${weekIdStr}`,
      title: "Marathon Wanderer",
      description: `Eksplorasi sejauh ${dTarget} km sepanjang minggu ini.`,
      xpReward: 400,
      target: dTarget,
      current: 0,
      type: "DISTANCE",
      completed: false,
    },
  ];
}
