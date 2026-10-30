import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { initializeDatabase } from '../electron/db/schema';
import * as taskService from '../electron/db/taskService';
import * as sessionService from '../electron/db/sessionService';

describe('Timer Session & Timestamp Suitability', () => {
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

  it('accurately tracks time using timestamps and excludes paused periods from actual study time', () => {
    const task = taskService.createTask(db, {
      title: 'Calculus Exercises',
      mode: 'calculation',
      target_duration_minutes: 25,
    });

    const startTime = new Date('2026-10-26T10:00:00Z').getTime();
    vi.setSystemTime(startTime);

    // 1. Start session (25 minutes = 1500 seconds)
    const session = sessionService.startSession(db, task.id, 1500);
    expect(session.status).toBe('studying');
    expect(session.start_timestamp).toBe(startTime);
    expect(session.accumulated_seconds).toBe(0);

    // Verify task status switched to in_progress
    const inProgressTask = taskService.getTaskById(db, task.id);
    expect(inProgressTask?.status).toBe('in_progress');

    // 2. Advance time by 600 seconds (10 minutes)
    vi.advanceTimersByTime(600 * 1000);

    let progress = sessionService.calculateCurrentElapsedSeconds(
      sessionService.getSessionById(db, session.id)!
    );
    expect(progress.elapsedSeconds).toBe(600);
    expect(progress.remainingSeconds).toBe(900);
    expect(progress.isOvertime).toBe(false);

    // 3. Pause session
    const paused = sessionService.pauseSession(db, session.id);
    expect(paused.status).toBe('paused');
    expect(paused.accumulated_seconds).toBe(600);
    expect(paused.start_timestamp).toBe(0);

    // Check task's actual_duration_seconds has recorded the 600s
    let refreshedTask = taskService.getTaskById(db, task.id);
    expect(refreshedTask?.actual_duration_seconds).toBe(600);

    // 4. Advance time by 300 seconds (5 minutes) while paused
    vi.advanceTimersByTime(300 * 1000);

    // Elapsed seconds MUST still be 600 (paused time does NOT count!)
    progress = sessionService.calculateCurrentElapsedSeconds(
      sessionService.getSessionById(db, session.id)!
    );
    expect(progress.elapsedSeconds).toBe(600);
    expect(progress.remainingSeconds).toBe(900);

    // 5. Resume session
    const resumed = sessionService.resumeSession(db, session.id);
    expect(resumed.status).toBe('studying');
    expect(resumed.start_timestamp).toBe(startTime + 900 * 1000);

    // 6. Study for another 400 seconds
    vi.advanceTimersByTime(400 * 1000);
    progress = sessionService.calculateCurrentElapsedSeconds(
      sessionService.getSessionById(db, session.id)!
    );
    expect(progress.elapsedSeconds).toBe(1000); // 600 + 400
    expect(progress.remainingSeconds).toBe(500);

    // 7. Complete session
    const { session: completedSession } = sessionService.completeSession(db, session.id, true);
    expect(completedSession.status).toBe('completed');
    expect(completedSession.accumulated_seconds).toBe(1000);

    refreshedTask = taskService.getTaskById(db, task.id);
    expect(refreshedTask?.actual_duration_seconds).toBe(1000);
    expect(refreshedTask?.status).toBe('completed');
  });
});
