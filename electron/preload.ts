import { contextBridge, ipcRenderer } from 'electron';
import {
  FocusQuestAPI,
  StudyMode,
  Task,
  DatabaseBackup,
} from '../src/types';

const api: FocusQuestAPI = {
  // Tasks
  getTasks: (date?: string) => ipcRenderer.invoke('tasks:get', date),
  createTask: (data) => ipcRenderer.invoke('tasks:create', data),
  updateTask: (id: string, updates: Partial<Task>) => ipcRenderer.invoke('tasks:update', id, updates),
  deleteTask: (id: string) => ipcRenderer.invoke('tasks:delete', id),
  reorderTasks: (taskIds: string[]) => ipcRenderer.invoke('tasks:reorder', taskIds),

  // Timer & Sessions
  getActiveSession: () => ipcRenderer.invoke('session:getActive'),
  startSession: (taskId: string, targetSeconds: number, chainId?: string | null) =>
    ipcRenderer.invoke('session:start', taskId, targetSeconds, chainId),
  pauseSession: (sessionId: string) => ipcRenderer.invoke('session:pause', sessionId),
  resumeSession: (sessionId: string) => ipcRenderer.invoke('session:resume', sessionId),
  extendSession: (sessionId: string, additionalSeconds: number) =>
    ipcRenderer.invoke('session:extend', sessionId, additionalSeconds),
  completeSession: (sessionId: string, markTaskCompleted: boolean) =>
    ipcRenderer.invoke('session:complete', sessionId, markTaskCompleted),
  cancelSession: (sessionId: string) => ipcRenderer.invoke('session:cancel', sessionId),

  // Daily Mode & Goal
  getDailySettings: (date?: string) => ipcRenderer.invoke('daily:get', date),
  updateDailyMode: (mode: StudyMode, date?: string) => ipcRenderer.invoke('daily:setMode', mode, date),
  setDailyGoalTarget: (targetTasks: number, date?: string) => ipcRenderer.invoke('daily:setTarget', targetTasks, date),
  claimDailyGoalBonus: (date?: string) => ipcRenderer.invoke('daily:claimBonus', date),

  // Virtual Pet
  getPets: () => ipcRenderer.invoke('pet:getAll'),
  getActivePet: () => ipcRenderer.invoke('pet:getActive'),
  setActivePet: (petId: string) => ipcRenderer.invoke('pet:setActive', petId),
  getInventory: () => ipcRenderer.invoke('pet:getInventory'),
  feedPet: (petId: string, itemId: string) => ipcRenderer.invoke('pet:feed', petId, itemId),
  getRewardLedger: () => ipcRenderer.invoke('pet:getLedger'),

  // Backup
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: (backup: DatabaseBackup) => ipcRenderer.invoke('backup:import', backup),

  // Distraction Monitor & Website Manager
  getDistractionRules: () => ipcRenderer.invoke('distraction:getRules'),
  addDistractionRule: (domain: string, isAllowed: boolean) =>
    ipcRenderer.invoke('distraction:addRule', domain, isAllowed),
  updateDistractionRule: (id: string, updates: Partial<any>) =>
    ipcRenderer.invoke('distraction:updateRule', id, updates),
  deleteDistractionRule: (id: string) => ipcRenderer.invoke('distraction:deleteRule', id),
  toggleDistractionRule: (id: string, enabled: boolean) =>
    ipcRenderer.invoke('distraction:toggleRule', id, enabled),
  getMonitorSettings: () => ipcRenderer.invoke('distraction:getSettings'),
  setMonitorEnabled: (enabled: boolean) => ipcRenderer.invoke('distraction:setMonitorEnabled', enabled),
  setDomainCooldown: (domain: string, minutes?: number) =>
    ipcRenderer.invoke('distraction:setCooldown', domain, minutes),
  onDistractionAlert: (callback: (payload: any) => void) => {
    const listener = (_event: any, payload: any) => callback(payload);
    ipcRenderer.on('distraction:alert', listener);
    return () => {
      ipcRenderer.removeListener('distraction:alert', listener);
    };
  },
};

contextBridge.exposeInMainWorld('focusQuestAPI', api);
