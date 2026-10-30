import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { getDatabase, closeDatabase } from './db/database';
import * as taskService from './db/taskService';
import * as petService from './db/petService';
import * as sessionService from './db/sessionService';
import * as dailyService from './db/dailyService';
import * as backupService from './db/backupService';
import * as distractionService from './db/distractionService';
import {
  startExtensionServer,
  stopExtensionServer,
  getMonitorStatus,
  setDomainCooldown,
} from './services/extensionServer';
import { StudyMode, Task, DatabaseBackup, DistractionRule } from '../src/types';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    title: 'FocusQuest',
    backgroundColor: '#0d1117',
    icon: path.join(__dirname, '../renderer/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Check if running in development mode
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL(devServerUrl).catch(() => {
      // If dev server is not ready yet, load local file if exists
      const localFile = path.join(__dirname, '../renderer/index.html');
      mainWindow?.loadFile(localFile).catch(() => {});
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIpcHandlers() {
  const db = getDatabase();

  // Task Handlers
  ipcMain.handle('tasks:get', (_event, date?: string) => {
    return taskService.getTasks(db, date);
  });

  ipcMain.handle(
    'tasks:create',
    (
      _event,
      data: {
        title: string;
        mode: StudyMode;
        target_duration_minutes: number;
        difficulty?: 'easy' | 'medium' | 'hard';
        reward_xp?: number;
        reward_food?: number;
        order_index?: number;
      }
    ) => {
      return taskService.createTask(db, data);
    }
  );

  ipcMain.handle('tasks:update', (_event, id: string, updates: Partial<Task>) => {
    return taskService.updateTask(db, id, updates);
  });

  ipcMain.handle('tasks:delete', (_event, id: string) => {
    return taskService.deleteTask(db, id);
  });

  ipcMain.handle('tasks:reorder', (_event, taskIds: string[]) => {
    return taskService.reorderTasks(db, taskIds);
  });

  // Timer & Session Handlers
  ipcMain.handle('session:getActive', () => {
    return sessionService.getActiveSession(db);
  });

  ipcMain.handle('session:start', (_event, taskId: string, targetSeconds: number, chainId?: string | null) => {
    return sessionService.startSession(db, taskId, targetSeconds, chainId);
  });

  ipcMain.handle('session:pause', (_event, sessionId: string) => {
    return sessionService.pauseSession(db, sessionId);
  });

  ipcMain.handle('session:resume', (_event, sessionId: string) => {
    return sessionService.resumeSession(db, sessionId);
  });

  ipcMain.handle('session:extend', (_event, sessionId: string, additionalSeconds: number) => {
    return sessionService.extendSession(db, sessionId, additionalSeconds);
  });

  ipcMain.handle('session:complete', (_event, sessionId: string, markTaskCompleted: boolean) => {
    return sessionService.completeSession(db, sessionId, markTaskCompleted);
  });

  ipcMain.handle('session:cancel', (_event, sessionId: string) => {
    return sessionService.cancelSession(db, sessionId);
  });

  // Daily Mode & Goal
  ipcMain.handle('daily:get', (_event, date?: string) => {
    return dailyService.getDailySettings(db, date);
  });

  ipcMain.handle('daily:setMode', (_event, mode: StudyMode, date?: string) => {
    return dailyService.updateDailyMode(db, mode, date);
  });

  ipcMain.handle('daily:setTarget', (_event, targetTasks: number, date?: string) => {
    return dailyService.setDailyGoalTarget(db, targetTasks, date);
  });

  ipcMain.handle('daily:claimBonus', (_event, date?: string) => {
    const targetDate = date || dailyService.getTodayDateString();
    return petService.claimDailyGoalBonus(db, targetDate);
  });

  // Virtual Pet
  ipcMain.handle('pet:getAll', () => {
    return petService.getPets(db);
  });

  ipcMain.handle('pet:getActive', () => {
    return petService.getActivePet(db);
  });

  ipcMain.handle('pet:setActive', (_event, petId: string) => {
    return petService.setActivePet(db, petId);
  });

  ipcMain.handle('pet:getInventory', () => {
    return petService.getInventory(db);
  });

  ipcMain.handle('pet:feed', (_event, petId: string, itemId: string) => {
    return petService.feedPet(db, petId, itemId);
  });

  ipcMain.handle('pet:getLedger', () => {
    return petService.getRewardLedger(db);
  });

  // Backup & Restore
  ipcMain.handle('backup:export', () => {
    return backupService.exportBackup(db);
  });

  ipcMain.handle('backup:import', (_event, backup: DatabaseBackup) => {
    return backupService.importBackup(db, backup);
  });

  // Distraction Monitor & Website Manager
  ipcMain.handle('distraction:getRules', () => {
    return distractionService.getDistractionRules(db);
  });

  ipcMain.handle('distraction:addRule', (_event, domain: string, isAllowed: boolean) => {
    return distractionService.addDistractionRule(db, domain, isAllowed);
  });

  ipcMain.handle('distraction:updateRule', (_event, id: string, updates: Partial<DistractionRule>) => {
    return distractionService.updateDistractionRule(db, id, updates);
  });

  ipcMain.handle('distraction:deleteRule', (_event, id: string) => {
    return distractionService.deleteDistractionRule(db, id);
  });

  ipcMain.handle('distraction:toggleRule', (_event, id: string, enabled: boolean) => {
    return distractionService.toggleDistractionRule(db, id, enabled);
  });

  ipcMain.handle('distraction:getSettings', () => {
    const settings = distractionService.getMonitorSettings(db);
    return {
      ...settings,
      status: getMonitorStatus(),
    };
  });

  ipcMain.handle('distraction:setMonitorEnabled', (_event, enabled: boolean) => {
    return distractionService.setMonitorEnabled(db, enabled);
  });

  ipcMain.handle('distraction:setCooldown', (_event, domain: string, minutes?: number) => {
    setDomainCooldown(domain, minutes || 15);
    return true;
  });
}

app.whenReady().then(() => {
  setupIpcHandlers();
  startExtensionServer(() => mainWindow);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopExtensionServer();
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

