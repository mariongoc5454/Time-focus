import { DatabaseSync } from 'node:sqlite';
import { Task, StudyMode, TaskDifficulty, TaskStatus } from '../../src/types';
import crypto from 'crypto';

export function calculateTaskRewards(targetMinutes: number, difficulty: TaskDifficulty): { xp: number; food: number } {
  let baseXP = 50;
  let baseFood = 2;

  switch (difficulty) {
    case 'easy':
      baseXP = 30;
      baseFood = 1;
      break;
    case 'medium':
      baseXP = 50;
      baseFood = 2;
      break;
    case 'hard':
      baseXP = 90;
      baseFood = 3;
      break;
  }

  // Bonus for longer focused sessions
  if (targetMinutes >= 45) {
    baseXP += 20;
    baseFood += 1;
  }
  if (targetMinutes >= 90) {
    baseXP += 30;
    baseFood += 1;
  }

  return { xp: baseXP, food: baseFood };
}

export function getTasks(db: DatabaseSync, dateStr?: string): Task[] {
  let query = 'SELECT * FROM tasks';
  const params: string[] = [];

  if (dateStr) {
    query += ' WHERE date(created_at) = ? OR date(completed_at) = ?';
    params.push(dateStr, dateStr);
  }

  query += ' ORDER BY order_index ASC, created_at ASC';

  const rows = db.prepare(query).all(...params) as unknown as Task[];
  return rows;
}

export function getTaskById(db: DatabaseSync, id: string): Task | null {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as unknown as Task | undefined;
  return row || null;
}

export function createTask(
  db: DatabaseSync,
  data: {
    title: string;
    mode: StudyMode;
    target_duration_minutes: number;
    difficulty?: TaskDifficulty;
    status?: TaskStatus;
    reward_xp?: number;
    reward_food?: number;
    order_index?: number;
  }
): Task {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const difficulty = data.difficulty || 'medium';
  const calculatedRewards = calculateTaskRewards(data.target_duration_minutes, difficulty);

  const rewardXp = data.reward_xp ?? calculatedRewards.xp;
  const rewardFood = data.reward_food ?? calculatedRewards.food;

  // Calculate order index if not provided
  let orderIndex = data.order_index;
  if (orderIndex === undefined) {
    const maxOrderRow = db.prepare('SELECT MAX(order_index) as maxOrder FROM tasks').get() as { maxOrder: number | null };
    orderIndex = (maxOrderRow?.maxOrder ?? -1) + 1;
  }

  const stmt = db.prepare(`
    INSERT INTO tasks (
      id, title, mode, target_duration_minutes, difficulty, status,
      actual_duration_seconds, reward_xp, reward_food, order_index,
      created_at, updated_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialStatus: TaskStatus = data.status || 'todo';
  stmt.run(
    id,
    data.title.trim(),
    data.mode,
    data.target_duration_minutes,
    difficulty,
    initialStatus,
    0,
    rewardXp,
    rewardFood,
    orderIndex,
    now,
    now,
    initialStatus === 'completed' ? now : null
  );

  return getTaskById(db, id)!;
}

export function updateTask(db: DatabaseSync, id: string, updates: Partial<Task>): Task {
  const existing = getTaskById(db, id);
  if (!existing) {
    throw new Error(`Task with id ${id} not found.`);
  }

  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title.trim());
  }
  if (updates.mode !== undefined) {
    fields.push('mode = ?');
    values.push(updates.mode);
  }
  if (updates.target_duration_minutes !== undefined) {
    fields.push('target_duration_minutes = ?');
    values.push(updates.target_duration_minutes);
  }
  if (updates.difficulty !== undefined) {
    fields.push('difficulty = ?');
    values.push(updates.difficulty);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
    if (updates.status === 'completed' && !existing.completed_at) {
      fields.push('completed_at = ?');
      values.push(now);
    } else if (updates.status !== 'completed' && existing.completed_at) {
      fields.push('completed_at = ?');
      values.push(null);
    }
  }
  if (updates.actual_duration_seconds !== undefined) {
    fields.push('actual_duration_seconds = ?');
    values.push(updates.actual_duration_seconds);
  }
  if (updates.reward_xp !== undefined) {
    fields.push('reward_xp = ?');
    values.push(updates.reward_xp);
  }
  if (updates.reward_food !== undefined) {
    fields.push('reward_food = ?');
    values.push(updates.reward_food);
  }
  if (updates.order_index !== undefined) {
    fields.push('order_index = ?');
    values.push(updates.order_index);
  }

  fields.push('updated_at = ?');
  values.push(now);

  values.push(id);

  const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);

  return getTaskById(db, id)!;
}

export function deleteTask(db: DatabaseSync, id: string): boolean {
  db.exec('BEGIN TRANSACTION;');
  try {
    // Delete any sessions linked to this task
    db.prepare('DELETE FROM study_sessions WHERE task_id = ?').run(id);
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    db.exec('COMMIT;');
    return result.changes > 0;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function reorderTasks(db: DatabaseSync, taskIds: string[]): Task[] {
  db.exec('BEGIN TRANSACTION;');
  try {
    const updateStmt = db.prepare('UPDATE tasks SET order_index = ?, updated_at = ? WHERE id = ?');
    const now = new Date().toISOString();
    taskIds.forEach((id, index) => {
      updateStmt.run(index, now, id);
    });
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return getTasks(db);
}
