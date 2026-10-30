import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { initializeDatabase } from '../electron/db/schema';
import * as taskService from '../electron/db/taskService';
import * as sessionService from '../electron/db/sessionService';

describe('Timer Expiration & Overtime Handling', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    initializeDatabase(db);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    db.close();
  });

  it('does NOT automatically complete task when timer hits 0; allows extending or finishing', () => {
    const task = taskService.createTask(db, {
      title: 'Matrix Algebra Problem Set',
      mode: 'calculation',
      target_duration_minutes: 20,
    });

    const startTime = new Date('2026-10-26T16:00:00Z').getTime();
    vi.setSystemTime(startTime);

    // Start 20 minute session (1200 seconds)
    const session = sessionService.startSession(db, task.id, 1200);

    // Fast-forward 25 minutes (1500 seconds - past target!)
    vi.advanceTimersByTime(1500 * 1000);

    const progress = sessionService.calculateCurrentElapsedSeconds(
      sessionService.getSessionById(db, session.id)!
    );

    // Timer reached 0
    expect(progress.remainingSeconds).toBe(0);
    expect(progress.isOvertime).toBe(true);
    expect(progress.elapsedSeconds).toBe(1500);

    // CRITICAL: Task MUST still NOT be completed!
    const taskCheck = taskService.getTaskById(db, task.id);
    expect(taskCheck?.status).toBe('in_progress');
    expect(taskCheck?.completed_at).toBeNull();

    // User chooses to extend by 10 minutes (+600s)
    const extended = sessionService.extendSession(db, session.id, 600);
    expect(extended.target_seconds).toBe(1800); // 1200 + 600

    const progressAfterExtend = sessionService.calculateCurrentElapsedSeconds(extended);
    expect(progressAfterExtend.isOvertime).toBe(false);
    expect(progressAfterExtend.remainingSeconds).toBe(300); // 1800 - 1500 = 300s remaining

    // User finishes and completes the task
    const { session: finishedSession } = sessionService.completeSession(db, session.id, true);
    expect(finishedSession.status).toBe('completed');

    const completedTask = taskService.getTaskById(db, task.id);
    expect(completedTask?.status).toBe('completed');
  });
});
