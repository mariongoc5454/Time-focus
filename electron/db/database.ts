import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { initializeDatabase } from './schema';

let activeDatabase: DatabaseSync | null = null;
let activeDatabasePath: string = '';

export function getDatabasePath(customPath?: string): string {
  if (customPath) return customPath;
  if (activeDatabasePath) return activeDatabasePath;

  // If running inside electron app
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron');
    if (app && typeof app.getPath === 'function') {
      const userDataDir = app.getPath('userData');
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }
      return path.join(userDataDir, 'focusquest.db');
    }
  } catch {
    // fallback if outside electron runtime
  }

  const fallbackDir = path.resolve(process.cwd(), '.data');
  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }
  return path.join(fallbackDir, 'focusquest.db');
}

export function openDatabase(dbPath?: string): DatabaseSync {
  const targetPath = dbPath || getDatabasePath();
  activeDatabasePath = targetPath;

  const db = new DatabaseSync(targetPath);
  initializeDatabase(db);
  activeDatabase = db;
  return db;
}

export function getDatabase(): DatabaseSync {
  if (!activeDatabase) {
    return openDatabase();
  }
  return activeDatabase;
}

export function closeDatabase(): void {
  if (activeDatabase) {
    try {
      activeDatabase.close();
    } catch {
      // ignore
    }
    activeDatabase = null;
  }
}
