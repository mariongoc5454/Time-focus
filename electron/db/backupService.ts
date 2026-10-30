import { DatabaseSync } from 'node:sqlite';
import { DatabaseBackup, DailySettings, StudySession } from '../../src/types';
import { getTasks } from './taskService';
import { getPets, getInventory, getRewardLedger } from './petService';

export function exportBackup(db: DatabaseSync): DatabaseBackup {
  const tasks = getTasks(db);
  const sessions = (db.prepare('SELECT * FROM study_sessions').all() as unknown as Array<
    Omit<StudySession, 'is_break'> & { is_break: number }
  >).map((s) => ({
    ...s,
    is_break: Boolean(s.is_break),
  }));
  const pets = getPets(db);
  const inventory = getInventory(db);
  const ledger = getRewardLedger(db);
  const dailySettings = (db.prepare('SELECT * FROM daily_settings').all() as unknown as Array<
    Omit<DailySettings, 'daily_goal_bonus_claimed'> & { daily_goal_bonus_claimed: number }
  >).map((d) => ({
    ...d,
    daily_goal_bonus_claimed: Boolean(d.daily_goal_bonus_claimed),
  }));

  return {
    exportedAt: new Date().toISOString(),
    tasks,
    sessions,
    pets,
    inventory,
    ledger,
    dailySettings,
  };
}

export function importBackup(db: DatabaseSync, backup: DatabaseBackup): { success: boolean; message: string } {
  if (!backup || !Array.isArray(backup.tasks) || !Array.isArray(backup.pets)) {
    throw new Error('Invalid backup data structure.');
  }

  db.exec('BEGIN TRANSACTION;');
  try {
    // 1. Clear existing data
    db.prepare('DELETE FROM study_sessions').run();
    db.prepare('DELETE FROM tasks').run();
    db.prepare('DELETE FROM reward_ledger').run();
    db.prepare('DELETE FROM pet_inventory').run();
    db.prepare('DELETE FROM pets').run();
    db.prepare('DELETE FROM daily_settings').run();

    // 2. Restore pets
    const insertPet = db.prepare(`
      INSERT INTO pets (id, species, name, level, current_xp, xp_to_next_level, hunger, happiness, is_active, unlocked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const pet of backup.pets) {
      insertPet.run(
        pet.id,
        pet.species,
        pet.name,
        pet.level,
        pet.current_xp,
        pet.xp_to_next_level,
        pet.hunger,
        pet.happiness,
        pet.is_active ? 1 : 0,
        pet.unlocked_at
      );
    }

    // 3. Restore inventory
    const insertInv = db.prepare(`
      INSERT INTO pet_inventory (id, item_type, item_name, quantity, xp_value, happiness_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const item of backup.inventory) {
      insertInv.run(item.id, item.item_type, item.item_name, item.quantity, item.xp_value, item.happiness_value);
    }

    // 4. Restore tasks
    const insertTask = db.prepare(`
      INSERT INTO tasks (
        id, title, mode, target_duration_minutes, difficulty, status,
        actual_duration_seconds, reward_xp, reward_food, order_index,
        created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const task of backup.tasks) {
      insertTask.run(
        task.id,
        task.title,
        task.mode,
        task.target_duration_minutes,
        task.difficulty,
        task.status,
        task.actual_duration_seconds,
        task.reward_xp,
        task.reward_food,
        task.order_index,
        task.created_at,
        task.updated_at,
        task.completed_at
      );
    }

    // 5. Restore sessions
    if (backup.sessions) {
      const insertSession = db.prepare(`
        INSERT INTO study_sessions (
          id, task_id, chain_id, status, start_timestamp, accumulated_seconds,
          target_seconds, is_break, break_duration_seconds, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const session of backup.sessions) {
        insertSession.run(
          session.id,
          session.task_id,
          session.chain_id,
          session.status,
          session.start_timestamp,
          session.accumulated_seconds,
          session.target_seconds,
          session.is_break ? 1 : 0,
          session.break_duration_seconds,
          session.created_at,
          session.updated_at
        );
      }
    }

    // 6. Restore ledger
    if (backup.ledger) {
      const insertLedger = db.prepare(`
        INSERT INTO reward_ledger (id, source_type, source_id, xp_amount, food_amount, claimed_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const entry of backup.ledger) {
        insertLedger.run(entry.id, entry.source_type, entry.source_id, entry.xp_amount, entry.food_amount, entry.claimed_at);
      }
    }

    // 7. Restore daily settings
    if (backup.dailySettings) {
      const insertDaily = db.prepare(`
        INSERT INTO daily_settings (date, selected_mode, daily_goal_target_tasks, daily_goal_bonus_claimed, notes)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const ds of backup.dailySettings) {
        insertDaily.run(ds.date, ds.selected_mode, ds.daily_goal_target_tasks, ds.daily_goal_bonus_claimed ? 1 : 0, ds.notes);
      }
    }

    db.exec('COMMIT;');
    return { success: true, message: `Successfully restored backup from ${backup.exportedAt}` };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}
