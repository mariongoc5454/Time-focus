import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { initializeDatabase } from '../electron/db/schema';
import * as taskService from '../electron/db/taskService';
import * as sessionService from '../electron/db/sessionService';

describe('Chained Session Suite (e.g. 120-minute study session)', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    initializeDatabase(db);
  });

  afterEach(() => {
    db.close();
  });

  it('chains multiple tasks into a 120-minute master study session with breaks and transitions', () => {
    // Plan:
    // Task 1: 50 mins
    // Break: 10 mins
    // Task 2: 50 mins
    // Break: 10 mins
    // Total = 120 mins
    const t1 = taskService.createTask(db, {
      title: 'Deep Work: System Design',
      mode: 'coding',
      target_duration_minutes: 50,
    });

    const t2 = taskService.createTask(db, {
      title: 'Practice: Algorithmic Problems',
      mode: 'coding',
      target_duration_minutes: 50,
    });

    const chainId = 'chain_120_session_abc';

    // 1. Start first segment of chain
    const session1 = sessionService.startSession(db, t1.id, 50 * 60, chainId);
    expect(session1.chain_id).toBe(chainId);
    expect(session1.task_id).toBe(t1.id);
    expect(session1.target_seconds).toBe(3000); // 50m

    // 2. Complete first task in chain
    const result1 = sessionService.completeSession(db, session1.id, true);
    expect(result1.session.status).toBe('completed');
    expect(result1.rewardResult?.alreadyClaimed).toBe(false);

    const refreshedT1 = taskService.getTaskById(db, t1.id);
    expect(refreshedT1?.status).toBe('completed');

    // 3. Start second segment of chain
    const session2 = sessionService.startSession(db, t2.id, 50 * 60, chainId);
    expect(session2.chain_id).toBe(chainId);
    expect(session2.task_id).toBe(t2.id);

    // 4. Complete second task in chain
    const result2 = sessionService.completeSession(db, session2.id, true);
    expect(result2.session.status).toBe('completed');
    expect(result2.rewardResult?.alreadyClaimed).toBe(false);

    const refreshedT2 = taskService.getTaskById(db, t2.id);
    expect(refreshedT2?.status).toBe('completed');

    // Check all sessions belonging to the chain
    const chainSessions = db
      .prepare('SELECT * FROM study_sessions WHERE chain_id = ?')
      .all(chainId) as unknown as Array<{ id: string; status: string; task_id: string }>;

    expect(chainSessions.length).toBe(2);
    expect(chainSessions.every((s) => s.status === 'completed')).toBe(true);
  });
});
