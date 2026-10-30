import { DatabaseSync } from 'node:sqlite';
import {
  VirtualPet,
  PetInventoryItem,
  RewardLedgerEntry,
  TaskCompletionRewardResult,
  DailyGoalRewardResult,
  FeedPetResult
} from '../../src/types';
import crypto from 'crypto';
import { getTaskById } from './taskService';

export function getPets(db: DatabaseSync): VirtualPet[] {
  const rows = db.prepare('SELECT * FROM pets ORDER BY level DESC, name ASC').all() as unknown as Array<
    Omit<VirtualPet, 'is_active'> & { is_active: number }
  >;

  return rows.map((r) => ({
    ...r,
    is_active: Boolean(r.is_active),
  }));
}

export function getActivePet(db: DatabaseSync): VirtualPet {
  const row = db.prepare('SELECT * FROM pets WHERE is_active = 1 LIMIT 1').get() as unknown as
    | (Omit<VirtualPet, 'is_active'> & { is_active: number })
    | undefined;

  if (row) {
    return {
      ...row,
      is_active: true,
    };
  }

  // Fallback to first pet
  const firstPet = db.prepare('SELECT * FROM pets LIMIT 1').get() as unknown as
    | (Omit<VirtualPet, 'is_active'> & { is_active: number })
    | undefined;

  if (firstPet) {
    db.prepare('UPDATE pets SET is_active = 1 WHERE id = ?').run(firstPet.id);
    return {
      ...firstPet,
      is_active: true,
    };
  }

  throw new Error('No pets found in database.');
}

export function setActivePet(db: DatabaseSync, petId: string): VirtualPet {
  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare('UPDATE pets SET is_active = 0').run();
    db.prepare('UPDATE pets SET is_active = 1 WHERE id = ?').run(petId);
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
  return getActivePet(db);
}

export function getInventory(db: DatabaseSync): PetInventoryItem[] {
  return db.prepare('SELECT * FROM pet_inventory ORDER BY item_type ASC, item_name ASC').all() as unknown as PetInventoryItem[];
}

export function getRewardLedger(db: DatabaseSync): RewardLedgerEntry[] {
  return db.prepare('SELECT * FROM reward_ledger ORDER BY claimed_at DESC').all() as unknown as RewardLedgerEntry[];
}

export function addXPToPet(pet: VirtualPet, xpToAdd: number): {
  pet: VirtualPet;
  leveledUp: boolean;
  newLevel: number;
} {
  let level = pet.level;
  let currentXP = pet.current_xp + xpToAdd;
  let xpNeeded = pet.xp_to_next_level;
  let leveledUp = false;

  while (currentXP >= xpNeeded) {
    currentXP -= xpNeeded;
    level += 1;
    xpNeeded = level * 100;
    leveledUp = true;
  }

  const updatedPet: VirtualPet = {
    ...pet,
    level,
    current_xp: currentXP,
    xp_to_next_level: xpNeeded,
    happiness: Math.min(100, pet.happiness + (leveledUp ? 25 : 5)),
  };

  return {
    pet: updatedPet,
    leveledUp,
    newLevel: level,
  };
}

export function awardTaskCompletion(db: DatabaseSync, taskId: string): TaskCompletionRewardResult {
  const activePet = getActivePet(db);

  // Check ledger for idempotency
  const existingLedger = db
    .prepare("SELECT * FROM reward_ledger WHERE source_type = 'task_completion' AND source_id = ?")
    .get(taskId) as unknown as RewardLedgerEntry | undefined;

  if (existingLedger) {
    return {
      alreadyClaimed: true,
      xpAwarded: 0,
      foodAwarded: 0,
      petLeveledUp: false,
      newPetLevel: activePet.level,
      pet: activePet,
      foodInventory: getInventory(db),
    };
  }

  const task = getTaskById(db, taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found.`);
  }

  const xpReward = task.reward_xp;
  const foodReward = task.reward_food;
  const now = new Date().toISOString();

  db.exec('BEGIN TRANSACTION;');
  try {
    // 1. Record in ledger
    const ledgerId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO reward_ledger (id, source_type, source_id, xp_amount, food_amount, claimed_at)
      VALUES (?, 'task_completion', ?, ?, ?, ?)
    `).run(ledgerId, taskId, xpReward, foodReward, now);

    // 2. Add food to inventory (add berry by default)
    const berryRow = db.prepare("SELECT quantity FROM pet_inventory WHERE id = 'food_berry'").get() as { quantity: number } | undefined;
    if (berryRow) {
      db.prepare("UPDATE pet_inventory SET quantity = quantity + ? WHERE id = 'food_berry'").run(foodReward);
    } else {
      db.prepare(`
        INSERT INTO pet_inventory (id, item_type, item_name, quantity, xp_value, happiness_value)
        VALUES ('food_berry', 'food', 'Star Berry', ?, 20, 25)
      `).run(foodReward);
    }

    // 3. Add XP and check level up
    const { pet: updatedPet, leveledUp, newLevel } = addXPToPet(activePet, xpReward);

    db.prepare(`
      UPDATE pets
      SET level = ?, current_xp = ?, xp_to_next_level = ?, happiness = ?
      WHERE id = ?
    `).run(updatedPet.level, updatedPet.current_xp, updatedPet.xp_to_next_level, updatedPet.happiness, updatedPet.id);

    db.exec('COMMIT;');

    return {
      alreadyClaimed: false,
      xpAwarded: xpReward,
      foodAwarded: foodReward,
      petLeveledUp: leveledUp,
      newPetLevel: newLevel,
      pet: updatedPet,
      foodInventory: getInventory(db),
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function claimDailyGoalBonus(db: DatabaseSync, dateStr: string): DailyGoalRewardResult {
  const activePet = getActivePet(db);

  // Check ledger for idempotency
  const existingLedger = db
    .prepare("SELECT * FROM reward_ledger WHERE source_type = 'daily_goal' AND source_id = ?")
    .get(dateStr) as unknown as RewardLedgerEntry | undefined;

  if (existingLedger) {
    return {
      alreadyClaimed: true,
      xpAwarded: 0,
      foodAwarded: 0,
      petLeveledUp: false,
      newPetLevel: activePet.level,
      pet: activePet,
      foodInventory: getInventory(db),
    };
  }

  const bonusXP = 150;
  const bonusBerry = 3;
  const bonusBento = 1;
  const totalFoodAwarded = bonusBerry + bonusBento;
  const now = new Date().toISOString();

  db.exec('BEGIN TRANSACTION;');
  try {
    const ledgerId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO reward_ledger (id, source_type, source_id, xp_amount, food_amount, claimed_at)
      VALUES (?, 'daily_goal', ?, ?, ?, ?)
    `).run(ledgerId, dateStr, bonusXP, totalFoodAwarded, now);

    // Update daily settings
    db.prepare('UPDATE daily_settings SET daily_goal_bonus_claimed = 1 WHERE date = ?').run(dateStr);

    // Update inventory
    db.prepare("UPDATE pet_inventory SET quantity = quantity + ? WHERE id = 'food_berry'").run(bonusBerry);
    db.prepare("UPDATE pet_inventory SET quantity = quantity + ? WHERE id = 'food_bento'").run(bonusBento);

    // Add XP to active pet
    const { pet: updatedPet, leveledUp, newLevel } = addXPToPet(activePet, bonusXP);

    db.prepare(`
      UPDATE pets
      SET level = ?, current_xp = ?, xp_to_next_level = ?, happiness = ?
      WHERE id = ?
    `).run(updatedPet.level, updatedPet.current_xp, updatedPet.xp_to_next_level, updatedPet.happiness, updatedPet.id);

    db.exec('COMMIT;');

    return {
      alreadyClaimed: false,
      xpAwarded: bonusXP,
      foodAwarded: totalFoodAwarded,
      petLeveledUp: leveledUp,
      newPetLevel: newLevel,
      pet: updatedPet,
      foodInventory: getInventory(db),
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function feedPet(db: DatabaseSync, petId: string, itemId: string): FeedPetResult {
  const item = db.prepare('SELECT * FROM pet_inventory WHERE id = ?').get(itemId) as unknown as
    | PetInventoryItem
    | undefined;

  if (!item || item.quantity <= 0) {
    return {
      success: false,
      message: 'Item not available or out of stock.',
      petLeveledUp: false,
      newPetLevel: 1,
      pet: getActivePet(db),
      foodInventory: getInventory(db),
    };
  }

  const petRow = db.prepare('SELECT * FROM pets WHERE id = ?').get(petId) as unknown as
    | (Omit<VirtualPet, 'is_active'> & { is_active: number })
    | undefined;

  if (!petRow) {
    throw new Error(`Pet ${petId} not found.`);
  }

  const currentPet: VirtualPet = {
    ...petRow,
    is_active: Boolean(petRow.is_active),
  };

  db.exec('BEGIN TRANSACTION;');
  try {
    // 1. Decrement item quantity
    db.prepare('UPDATE pet_inventory SET quantity = quantity - 1 WHERE id = ?').run(itemId);

    // 2. Add XP and happiness
    const { pet: updatedPet, leveledUp, newLevel } = addXPToPet(currentPet, item.xp_value);

    // Pet fullness / hunger adjustment
    const newHunger = Math.max(0, currentPet.hunger - 15);
    const newHappiness = Math.min(100, updatedPet.happiness + item.happiness_value);

    db.prepare(`
      UPDATE pets
      SET level = ?, current_xp = ?, xp_to_next_level = ?, hunger = ?, happiness = ?
      WHERE id = ?
    `).run(newLevel, updatedPet.current_xp, updatedPet.xp_to_next_level, newHunger, newHappiness, petId);

    db.exec('COMMIT;');

    const refreshedPet: VirtualPet = {
      ...updatedPet,
      hunger: newHunger,
      happiness: newHappiness,
    };

    return {
      success: true,
      petLeveledUp: leveledUp,
      newPetLevel: newLevel,
      pet: refreshedPet,
      foodInventory: getInventory(db),
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}
