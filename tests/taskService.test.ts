import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { initializeDatabase } from '../electron/db/schema';
import * as taskService from '../electron/db/taskService';

describe('Task Management Suite', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    initializeDatabase(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates, edits, and completes a task with proper timestamps and defaults', () => {
    // 1. Create task
    const task = taskService.createTask(db, {
      title: 'Solve LeetCode Tree Problems',
      mode: 'coding',
      target_duration_minutes: 45,
      difficulty: 'hard',
    });

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Solve LeetCode Tree Problems');
    expect(task.mode).toBe('coding');
    expect(task.target_duration_minutes).toBe(45);
    expect(task.difficulty).toBe('hard');
    expect(task.status).toBe('todo');
    expect(task.actual_duration_seconds).toBe(0);
    // Hard + >=45m = 90 + 20 = 110 XP, 3 + 1 = 4 Food
    expect(task.reward_xp).toBe(110);
    expect(task.reward_food).toBe(4);
    expect(task.completed_at).toBeNull();

    // 2. Edit task
    const updated = taskService.updateTask(db, task.id, {
      title: 'Solve LeetCode Graph & Tree Problems',
      target_duration_minutes: 60,
    });

    expect(updated.title).toBe('Solve LeetCode Graph & Tree Problems');
    expect(updated.target_duration_minutes).toBe(60);

    // 3. Complete task
    const completed = taskService.updateTask(db, task.id, {
      status: 'completed',
    });

    expect(completed.status).toBe('completed');
    expect(completed.completed_at).toBeTruthy();
  });

  it('supports task reordering', () => {
    const t1 = taskService.createTask(db, { title: 'Task 1', mode: 'calculation', target_duration_minutes: 25 });
    const t2 = taskService.createTask(db, { title: 'Task 2', mode: 'coding', target_duration_minutes: 30 });
    const t3 = taskService.createTask(db, { title: 'Task 3', mode: 'memorization', target_duration_minutes: 15 });

    // Reorder: t3, t1, t2
    const reordered = taskService.reorderTasks(db, [t3.id, t1.id, t2.id]);
    expect(reordered[0].id).toBe(t3.id);
    expect(reordered[1].id).toBe(t1.id);
    expect(reordered[2].id).toBe(t2.id);
  });

  it('deletes a task cleanly', () => {
    const task = taskService.createTask(db, { title: 'To Delete', mode: 'mixed', target_duration_minutes: 20 });
    const deleted = taskService.deleteTask(db, task.id);
    expect(deleted).toBe(true);

    const check = taskService.getTaskById(db, task.id);
    expect(check).toBeNull();
  });
});
