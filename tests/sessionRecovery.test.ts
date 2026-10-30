import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { initializeDatabase } from '../electron/db/schema';
import * as taskService from '../electron/db/taskService';
import * as sessionService from '../electron/db/sessionService';

describe('Session Recovery on App Restart', () => {
  const testDbPath = path.resolve(__dirname, 'test_recovery.db');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // ignore
      }
    }
  });

  it('successfully recovers a running session and computes exact remaining time after app restarts', () => {
    const startTime = new Date('2026-10-26T14:00:00Z').getTime();
    vi.setSystemTime(startTime);

    // 1. Initial app run: create task and start 30m (1800s) session
    let db = new DatabaseSync(testDbPath);
    initializeDatabase(db);

    const task = taskService.createTask(db, {
      title: 'Memorize Kanji Vocabulary',
      mode: 'memorization',
      target_duration_minutes: 30,
    });

    const session = sessionService.startSession(db, task.id, 1800);
    expect(session.status).toBe('studying');

    // Simulate 12 minutes (720 seconds) passing while app is running
    vi.advanceTimersByTime(720 * 1000);

    // 2. Simulate sudden app close / crash without explicit pause
    db.close();

    // 3. 5 minutes later, user relaunches the app
    vi.advanceTimersByTime(300 * 1000); // Now total 17 minutes (1020s) elapsed

    // Reopen DB on app relaunch
    db = new DatabaseSync(testDbPath);
    initializeDatabase(db);

    // Recover active session
    const recoveredSession = sessionService.getActiveSession(db);
    expect(recoveredSession).not.toBeNull();
    expect(recoveredSession?.id).toBe(session.id);
    expect(recoveredSession?.status).toBe('studying');
    expect(recoveredSession?.task_id).toBe(task.id);

    // Check calculated elapsed & remaining time
    const progress = sessionService.calculateCurrentElapsedSeconds(recoveredSession!);
    expect(progress.elapsedSeconds).toBe(1020); // 720 + 300 = 1020
    expect(progress.remainingSeconds).toBe(1800 - 1020); // 780s
    expect(progress.isOvertime).toBe(false);

    db.close();
  });
});
