import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { initializeDatabase } from '../electron/db/schema';
import * as sessionService from '../electron/db/sessionService';
import * as taskService from '../electron/db/taskService';
import * as petService from '../electron/db/petService';

describe('Session Pause, Resume & Early Cancellation', () => {
  const testDbPath = path.join(__dirname, 'test_session_pause_resume.db');
  let db: DatabaseSync;

  beforeEach(() => {
    vi.useFakeTimers();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new DatabaseSync(testDbPath);
    initializeDatabase(db);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    vi.useRealTimers();
  });

  it('pauses session immediately, freezes countdown, and excludes paused duration from study time', () => {
    const task = taskService.createTask(db, {
      title: 'Algorithm Problem Solving',
      mode: 'coding',
      target_duration_minutes: 20, // 1200 seconds
    });

    const startEpoch = new Date('2026-10-26T14:00:00Z').getTime();
    vi.setSystemTime(startEpoch);

    // 1. Start studying
    const session = sessionService.startSession(db, task.id, 1200);
    expect(session.status).toBe('studying');
    expect(session.accumulated_seconds).toBe(0);

    // Study for 300 seconds (5 minutes)
    vi.advanceTimersByTime(300 * 1000);

    // 2. Pause session
    const paused = sessionService.pauseSession(db, session.id);
    expect(paused.status).toBe('paused');
    expect(paused.accumulated_seconds).toBe(300);
    expect(paused.start_timestamp).toBe(0);

    // Task actual duration is recorded as 300s
    let refreshedTask = taskService.getTaskById(db, task.id);
    expect(refreshedTask?.actual_duration_seconds).toBe(300);

    // 3. User remains paused for 600 seconds (10 minutes)
    vi.advanceTimersByTime(600 * 1000);

    // Calculate time while paused: elapsed MUST still be 300s, remaining MUST still be 900s
    const pausedProgress = sessionService.calculateCurrentElapsedSeconds(
      sessionService.getSessionById(db, session.id)!
    );
    expect(pausedProgress.elapsedSeconds).toBe(300);
    expect(pausedProgress.remainingSeconds).toBe(900);
    expect(pausedProgress.isOvertime).toBe(false);

    // 4. Repeated clicks to pauseSession when already paused are idempotent
    const doublePause = sessionService.pauseSession(db, session.id);
    expect(doublePause.status).toBe('paused');
    expect(doublePause.accumulated_seconds).toBe(300);

    // 5. Resume session
    const resumeEpoch = startEpoch + 900 * 1000;
    vi.setSystemTime(resumeEpoch);
    const resumed = sessionService.resumeSession(db, session.id);
    expect(resumed.status).toBe('studying');
    expect(resumed.start_timestamp).toBe(resumeEpoch);
    expect(resumed.accumulated_seconds).toBe(300);

    // 6. Repeated clicks to resumeSession when already studying are idempotent
    const doubleResume = sessionService.resumeSession(db, session.id);
    expect(doubleResume.status).toBe('studying');
    expect(doubleResume.accumulated_seconds).toBe(300);

    // 7. Study for another 200 seconds after resuming
    vi.advanceTimersByTime(200 * 1000);
    const resumedProgress = sessionService.calculateCurrentElapsedSeconds(
      sessionService.getSessionById(db, session.id)!
    );
    expect(resumedProgress.elapsedSeconds).toBe(500); // 300 + 200
    expect(resumedProgress.remainingSeconds).toBe(700); // 1200 - 500
  });

  it('handles End Session early: preserves studied time, does NOT award completion XP, keeps prior rewards intact', () => {
    const task = taskService.createTask(db, {
      title: 'Physics Homework',
      mode: 'calculation',
      target_duration_minutes: 30, // 1800 seconds
      reward_xp: 80,
      reward_food: 3,
    });

    const petBefore = petService.getActivePet(db);
    const initialPetXp = petBefore.current_xp;
    const initialLedgerCount = petService.getRewardLedger(db).length;

    // Start session
    const session = sessionService.startSession(db, task.id, 1800);
    expect(session.status).toBe('studying');

    // Study for 450 seconds (7.5 minutes)
    vi.advanceTimersByTime(450 * 1000);

    // User chooses to End Session early without completing the task
    const cancelledSession = sessionService.cancelSession(db, session.id);
    expect(cancelledSession.status).toBe('cancelled');
    expect(cancelledSession.accumulated_seconds).toBe(450);

    // Verify task state
    const cancelledTask = taskService.getTaskById(db, task.id);
    expect(cancelledTask?.status).toBe('todo'); // reset to todo from in_progress
    expect(cancelledTask?.actual_duration_seconds).toBe(450); // studied time preserved
    expect(cancelledTask?.completed_at).toBeNull();

    // Verify Virtual Pet rewards: NO XP awarded, NO ledger entries added
    const petAfter = petService.getActivePet(db);
    expect(petAfter.current_xp).toBe(initialPetXp);
    expect(petService.getRewardLedger(db).length).toBe(initialLedgerCount);
  });
});
