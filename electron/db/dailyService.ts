import { DatabaseSync } from 'node:sqlite';
import { DailySettings, StudyMode } from '../../src/types';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDailySettings(db: DatabaseSync, dateStr?: string): DailySettings {
  const targetDate = dateStr || getTodayDateString();

  const row = db.prepare('SELECT * FROM daily_settings WHERE date = ?').get(targetDate) as unknown as
    | {
        date: string;
        selected_mode: StudyMode;
        daily_goal_target_tasks: number;
        daily_goal_bonus_claimed: number;
        notes: string;
      }
    | undefined;

  if (row) {
    return {
      date: row.date,
      selected_mode: row.selected_mode,
      daily_goal_target_tasks: Number(row.daily_goal_target_tasks),
      daily_goal_bonus_claimed: Boolean(row.daily_goal_bonus_claimed),
      notes: row.notes || '',
    };
  }

  // Insert default setting for the day
  db.prepare(`
    INSERT INTO daily_settings (date, selected_mode, daily_goal_target_tasks, daily_goal_bonus_claimed, notes)
    VALUES (?, 'mixed', 3, 0, '')
  `).run(targetDate);

  return {
    date: targetDate,
    selected_mode: 'mixed',
    daily_goal_target_tasks: 3,
    daily_goal_bonus_claimed: false,
    notes: '',
  };
}

export function updateDailyMode(db: DatabaseSync, mode: StudyMode, dateStr?: string): DailySettings {
  const targetDate = dateStr || getTodayDateString();
  getDailySettings(db, targetDate); // Ensure row exists

  db.prepare('UPDATE daily_settings SET selected_mode = ? WHERE date = ?').run(mode, targetDate);

  return getDailySettings(db, targetDate);
}

export function setDailyGoalTarget(db: DatabaseSync, targetTasks: number, dateStr?: string): DailySettings {
  const targetDate = dateStr || getTodayDateString();
  getDailySettings(db, targetDate);

  db.prepare('UPDATE daily_settings SET daily_goal_target_tasks = ? WHERE date = ?').run(targetTasks, targetDate);

  return getDailySettings(db, targetDate);
}
