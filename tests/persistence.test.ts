import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { initializeDatabase } from '../electron/db/schema';
import * as taskService from '../electron/db/taskService';
import * as petService from '../electron/db/petService';
import * as backupService from '../electron/db/backupService';

describe('SQLite Disk Persistence and Backup Suite', () => {
  const diskDbPath = path.resolve(__dirname, 'test_persistence.db');

  beforeEach(() => {
    if (fs.existsSync(diskDbPath)) {
      fs.unlinkSync(diskDbPath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(diskDbPath)) {
      try {
        fs.unlinkSync(diskDbPath);
      } catch {
        // ignore
      }
    }
  });

  it('persists data to disk and reloads accurately upon app relaunch', () => {
    // 1. Session 1: open db, write tasks, feed pet, award rewards
    let db = new DatabaseSync(diskDbPath);
    initializeDatabase(db);

    const task1 = taskService.createTask(db, {
      title: 'Persistent Task Alpha',
      mode: 'coding',
      target_duration_minutes: 40,
    });

    const activePet = petService.getActivePet(db);
    petService.feedPet(db, activePet.id, 'food_berry');
    petService.awardTaskCompletion(db, task1.id);

    // Close the database to simulate quitting the app
    db.close();

    // 2. Session 2: relaunch app and open same database file from disk
    db = new DatabaseSync(diskDbPath);
    initializeDatabase(db);

    // Verify task exists and is complete
    const reloadedTasks = taskService.getTasks(db);
    expect(reloadedTasks.length).toBe(1);
    expect(reloadedTasks[0].title).toBe('Persistent Task Alpha');

    // Verify pet XP and level was preserved
    const reloadedPet = petService.getActivePet(db);
    expect(reloadedPet.current_xp).toBe(70); // 20 from berry + 50 from task

    // Verify reward ledger persisted
    const ledger = petService.getRewardLedger(db);
    expect(ledger.length).toBe(1);
    expect(ledger[0].source_id).toBe(task1.id);

    // 3. Test backup export and import
    const backup = backupService.exportBackup(db);
    expect(backup.tasks.length).toBe(1);
    expect(backup.pets.length).toBeGreaterThan(0);

    // Clean and import to a fresh database
    const freshDb = new DatabaseSync(':memory:');
    initializeDatabase(freshDb);
    const importResult = backupService.importBackup(freshDb, backup);
    expect(importResult.success).toBe(true);

    const importedTasks = taskService.getTasks(freshDb);
    expect(importedTasks.length).toBe(1);
    expect(importedTasks[0].title).toBe('Persistent Task Alpha');

    freshDb.close();
    db.close();
  });
});
