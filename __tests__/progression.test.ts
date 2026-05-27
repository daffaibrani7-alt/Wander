import { getLevelInfoFromXP, generateDailyMissions } from "../src/features/achievements/services/progressionEngine";

describe("Progression Engine - XP & Level Metrics", () => {
  test("getLevelInfoFromXP calculates Level 1 details correctly", () => {
    const info = getLevelInfoFromXP(100);
    expect(info.level).toBe(1);
    expect(info.currentLevelXp).toBe(100);
    expect(info.nextLevelXp).toBe(150);
    expect(info.progressPercent).toBeCloseTo(100 / 150);
  });

  test("getLevelInfoFromXP calculates Level 2 boundaries precisely", () => {
    // Level 1 consumes 150 XP. Level 2 needs 500 XP.
    // Total XP = 320 means Level 2 with 170 XP into the level.
    const info = getLevelInfoFromXP(320);
    expect(info.level).toBe(2);
    expect(info.currentLevelXp).toBe(170); // 320 - 150
    expect(info.nextLevelXp).toBe(150 + 350); // Level 2 needs 500 XP
    expect(info.progressPercent).toBeCloseTo(170 / 500);
  });

  test("getLevelInfoFromXP caps progress percent between 0 and 1", () => {
    const info = getLevelInfoFromXP(0);
    expect(info.progressPercent).toBe(0);
  });
});

describe("Seeded Daily Missions Generator - SFC32 Reproducibility", () => {
  const DATE_A = "2026-05-27";
  const DATE_B = "2026-05-28";

  test("generateDailyMissions returns identical results for the same date seed", () => {
    const run1 = generateDailyMissions(DATE_A);
    const run2 = generateDailyMissions(DATE_A);

    expect(run1).toEqual(run2);
    expect(run1.length).toBe(3);
    expect(run1[0].target).toBe(run2[0].target);
  });

  test("generateDailyMissions returns different missions for different date seeds", () => {
    const runA = generateDailyMissions(DATE_A);
    const runB = generateDailyMissions(DATE_B);

    // Seeds are different so at least some targets/titles should differ
    const targetsA = runA.map(m => m.target);
    const targetsB = runB.map(m => m.target);
    
    // We expect date A and date B to generate different randomized combinations
    const same = targetsA.every((val, index) => val === targetsB[index]);
    expect(same).toBe(false);
  });
});
