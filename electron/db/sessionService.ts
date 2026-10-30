import { DatabaseSync } from 'node:sqlite';
import { StudySession, SessionStatus, TaskCompletionRewardResult } from '../../src/types';
import crypto from 'crypto';
import { updateTask, getTaskById } from './taskService';
import { awardTaskCompletion } from './petService';

interface DbSessionRow {
  id: string;
  task_id: string;
  chain_id: string | null;
  status: SessionStatus;
  start_timestamp: number;
  accumulated_seconds: number;
  target_seconds: number;
  is_break: number;
  break_duration_seconds: number;
  created_at: string;
  updated_at: string;
}

function mapRowToSession(row: DbSessionRow): StudySession {
  return {
    id: row.id,
    task_id: row.task_id,
    chain_id: row.chain_id,
    status: row.status,
    start_timestamp: Number(row.start_timestamp),
    accumulated_seconds: Number(row.accumulated_seconds),
    target_seconds: Number(row.target_seconds),
    is_break: Boolean(row.is_break),
    break_duration_seconds: Number(row.break_duration_seconds),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function getSessionById(db: DatabaseSync, id: string): StudySession | null {
  const row = db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(id) as unknown as DbSessionRow | undefined;
  return row ? mapRowToSession(row) : null;
}

export function getActiveSession(db: DatabaseSync): StudySession | null {
  // Find currently studying, running, or paused session
  const row = db
    .prepare("SELECT * FROM study_sessions WHERE status IN ('studying', 'running', 'paused') ORDER BY updated_at DESC LIMIT 1")
    .get() as unknown as DbSessionRow | undefined;

  if (!row) return null;
  return mapRowToSession(row);
}

export function startSession(
  db: DatabaseSync,
  taskId: string,
  targetSeconds: number,
  chainId: string | null = null
): StudySession {
  const now = new Date().toISOString();
  const nowEpoch = Date.now();

  // Cancel any currently active sessions first to avoid conflicts
  db.prepare("UPDATE study_sessions SET status = 'cancelled', updated_at = ? WHERE status IN ('studying', 'running', 'paused')").run(now);

  // Ensure task exists in DB before inserting into study_sessions (Foreign Key requirement)
  if (getTaskById(db, taskId)) {
    updateTask(db, taskId, { status: 'in_progress' });
  } else {
    db.prepare(`
      INSERT OR REPLACE INTO tasks (
        id, title, mode, target_duration_minutes, difficulty, status,
        actual_duration_seconds, reward_xp, reward_food, order_index,
        created_at, updated_at, completed_at
      ) VALUES (?, 'Focus Task', 'mixed', ?, 'medium', 'in_progress', 0, 50, 2, 0, ?, ?, null)
    `).run(taskId, Math.max(1, Math.round(targetSeconds / 60)), now, now);
  }

  const sessionId = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO study_sessions (
      id, task_id, chain_id, status, start_timestamp, accumulated_seconds,
      target_seconds, is_break, break_duration_seconds, created_at, updated_at
    ) VALUES (?, ?, ?, 'studying', ?, 0, ?, 0, 0, ?, ?)
  `);

  stmt.run(sessionId, taskId, chainId, nowEpoch, targetSeconds, now, now);

  return getSessionById(db, sessionId)!;
}

export function pauseSession(db: DatabaseSync, sessionId: string): StudySession {
  const session = getSessionById(db, sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found.`);
  }

  // Idempotent: if already paused or not actively studying, return as is
  if (session.status !== 'studying' && session.status !== 'running') {
    return session;
  }

  const nowEpoch = Date.now();
  const now = new Date().toISOString();

  // Calculate elapsed seconds during this active segment
  const elapsedSegmentSeconds = Math.max(0, Math.floor((nowEpoch - session.start_timestamp) / 1000));
  const newAccumulated = session.accumulated_seconds + elapsedSegmentSeconds;

  db.prepare(`
    UPDATE study_sessions
    SET status = 'paused', start_timestamp = 0, accumulated_seconds = ?, updated_at = ?
    WHERE id = ?
  `).run(newAccumulated, now, sessionId);

  // Update task's actual duration seconds with the segment studied
  const task = getTaskById(db, session.task_id);
  if (task) {
    const updatedTaskDuration = task.actual_duration_seconds + elapsedSegmentSeconds;
    updateTask(db, session.task_id, { actual_duration_seconds: updatedTaskDuration });
  }

  return getSessionById(db, sessionId)!;
}

export function resumeSession(db: DatabaseSync, sessionId: string): StudySession {
  const session = getSessionById(db, sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found.`);
  }

  // Idempotent: if already studying, return as is
  if (session.status === 'studying' || session.status === 'running') {
    return session;
  }

  const nowEpoch = Date.now();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE study_sessions
    SET status = 'studying', start_timestamp = ?, updated_at = ?
    WHERE id = ?
  `).run(nowEpoch, now, sessionId);

  return getSessionById(db, sessionId)!;
}

export function extendSession(db: DatabaseSync, sessionId: string, additionalSeconds: number): StudySession {
  const session = getSessionById(db, sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found.`);
  }

  const newTarget = session.target_seconds + additionalSeconds;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE study_sessions
    SET target_seconds = ?, updated_at = ?
    WHERE id = ?
  `).run(newTarget, now, sessionId);

  return getSessionById(db, sessionId)!;
}

export function completeSession(
  db: DatabaseSync,
  sessionId: string,
  markTaskCompleted: boolean
): { session: StudySession; rewardResult?: TaskCompletionRewardResult } {
  const session = getSessionById(db, sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found.`);
  }

  const nowEpoch = Date.now();
  const now = new Date().toISOString();

  let finalAccumulated = session.accumulated_seconds;
  let finalSegment = 0;

  if (session.status === 'studying' || session.status === 'running') {
    finalSegment = Math.max(0, Math.floor((nowEpoch - session.start_timestamp) / 1000));
    finalAccumulated += finalSegment;
  }

  db.prepare(`
    UPDATE study_sessions
    SET status = 'completed', start_timestamp = 0, accumulated_seconds = ?, updated_at = ?
    WHERE id = ?
  `).run(finalAccumulated, now, sessionId);

  // Update task actual duration
  const task = getTaskById(db, session.task_id);
  if (task && finalSegment > 0) {
    updateTask(db, session.task_id, {
      actual_duration_seconds: task.actual_duration_seconds + finalSegment,
    });
  }

  let rewardResult: TaskCompletionRewardResult | undefined;

  if (markTaskCompleted) {
    updateTask(db, session.task_id, { status: 'completed' });
    rewardResult = awardTaskCompletion(db, session.task_id);
  }

  return {
    session: getSessionById(db, sessionId)!,
    rewardResult,
  };
}

export function cancelSession(db: DatabaseSync, sessionId: string): StudySession {
  const session = getSessionById(db, sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found.`);
  }

  const nowEpoch = Date.now();
  const now = new Date().toISOString();

  let finalAccumulated = session.accumulated_seconds;
  let finalSegment = 0;

  if (session.status === 'studying' || session.status === 'running') {
    finalSegment = Math.max(0, Math.floor((nowEpoch - session.start_timestamp) / 1000));
    finalAccumulated += finalSegment;
  }

  db.prepare(`
    UPDATE study_sessions
    SET status = 'cancelled', start_timestamp = 0, accumulated_seconds = ?, updated_at = ?
    WHERE id = ?
  `).run(finalAccumulated, now, sessionId);

  // Update task's actual duration with studied time and reset status to todo
  const task = getTaskById(db, session.task_id);
  if (task) {
    updateTask(db, session.task_id, {
      actual_duration_seconds: task.actual_duration_seconds + finalSegment,
      status: task.status === 'in_progress' ? 'todo' : task.status,
    });
  }

  return getSessionById(db, sessionId)!;
}

/**
 * Calculates current real elapsed time and remaining time using timestamps
 */
export function calculateCurrentElapsedSeconds(session: StudySession): {
  elapsedSeconds: number;
  remainingSeconds: number;
  isOvertime: boolean;
} {
  let elapsed = session.accumulated_seconds;
  const isStudying = session.status === 'studying' || session.status === 'running';

  if (isStudying && session.start_timestamp > 0) {
    const segment = Math.max(0, Math.floor((Date.now() - session.start_timestamp) / 1000));
    elapsed += segment;
  }

  const remaining = Math.max(0, session.target_seconds - elapsed);
  const isOvertime = elapsed >= session.target_seconds;

  return {
    elapsedSeconds: elapsed,
    remainingSeconds: remaining,
    isOvertime,
  };
}
