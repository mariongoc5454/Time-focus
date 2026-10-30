import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { initializeDatabase } from '../electron/db/schema';
import * as taskService from '../electron/db/taskService';
import * as petService from '../electron/db/petService';

describe('Anti-Cheat & Idempotent Rewards Suite', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    initializeDatabase(db);
  });

  afterEach(() => {
    db.close();
  });

  it('guarantees XP and food are awarded strictly ONCE per task', () => {
    const task = taskService.createTask(db, {
      title: 'Review Physics Optics',
      mode: 'memorization',
      target_duration_minutes: 30,
      difficulty: 'medium',
    });

    const initialPet = petService.getActivePet(db);
    expect(initialPet.current_xp).toBe(0);

    // 1. First claim
    const firstReward = petService.awardTaskCompletion(db, task.id);
    expect(firstReward.alreadyClaimed).toBe(false);
    expect(firstReward.xpAwarded).toBe(50);
    expect(firstReward.foodAwarded).toBe(2);

    const petAfterFirst = petService.getActivePet(db);
    expect(petAfterFirst.current_xp).toBe(50);

    // 2. Second claim (e.g. repeated button click, or restored state)
    const secondReward = petService.awardTaskCompletion(db, task.id);
    expect(secondReward.alreadyClaimed).toBe(true);
    expect(secondReward.xpAwarded).toBe(0);
    expect(secondReward.foodAwarded).toBe(0);

    // Pet XP must REMAIN 50, not double!
    const petAfterSecond = petService.getActivePet(db);
    expect(petAfterSecond.current_xp).toBe(50);

    // Ledger has exactly one entry for this task
    const ledger = petService.getRewardLedger(db);
    const taskEntries = ledger.filter((e) => e.source_id === task.id);
    expect(taskEntries.length).toBe(1);
  });

  it('guarantees daily goal bonus is claimed only once per day', () => {
    const today = '2026-10-26';

    // 1. First daily claim
    const firstClaim = petService.claimDailyGoalBonus(db, today);
    expect(firstClaim.alreadyClaimed).toBe(false);
    expect(firstClaim.xpAwarded).toBe(150);

    // 2. Second daily claim
    const secondClaim = petService.claimDailyGoalBonus(db, today);
    expect(secondClaim.alreadyClaimed).toBe(true);
    expect(secondClaim.xpAwarded).toBe(0);
  });
});
