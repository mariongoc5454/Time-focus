export type StudyMode = 'calculation' | 'coding' | 'memorization' | 'mixed';

export type TaskDifficulty = 'easy' | 'medium' | 'hard';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  title: string;
  mode: StudyMode;
  target_duration_minutes: number;
  difficulty: TaskDifficulty;
  status: TaskStatus;
  actual_duration_seconds: number;
  reward_xp: number;
  reward_food: number;
  order_index: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export type SessionStatus = 'ready' | 'studying' | 'paused' | 'completed' | 'cancelled' | 'idle' | 'running';

export interface DistractionRule {
  id: string;
  domain: string;
  enabled: boolean;
  is_allowed: boolean; // false = blocked / distracting, true = allowed / whitelist
  created_at: string;
  updated_at: string;
}

export type MonitorStatus = 'active' | 'paused' | 'disconnected' | 'disabled';

export interface DistractionAlertPayload {
  domain: string;
  timestamp: number;
}

export interface StudySession {
  id: string;
  task_id: string;
  chain_id: string | null;
  status: SessionStatus;
  start_timestamp: number; // Date.now() when running segment started
  accumulated_seconds: number; // Seconds counted prior to current segment
  target_seconds: number;
  is_break: boolean;
  break_duration_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface ChainedSessionPlan {
  chainId: string;
  totalDurationMinutes: number;
  tasks: Array<{
    taskId: string;
    targetMinutes: number;
    breakMinutesAfter: number;
  }>;
}

export interface VirtualPet {
  id: string;
  species: 'shiba' | 'cat' | 'fox' | 'dragon' | 'owl';
  name: string;
  level: number;
  current_xp: number;
  xp_to_next_level: number;
  hunger: number;
  happiness: number;
  is_active: boolean;
  unlocked_at: string;
}

export interface PetInventoryItem {
  id: string;
  item_type: 'food' | 'treat' | 'toy';
  item_name: string;
  quantity: number;
  xp_value: number;
  happiness_value: number;
}

export interface RewardLedgerEntry {
  id: string;
  source_type: 'task_completion' | 'daily_goal';
  source_id: string;
  xp_amount: number;
  food_amount: number;
  claimed_at: string;
}

export interface DailySettings {
  date: string;
  selected_mode: StudyMode;
  daily_goal_target_tasks: number;
  daily_goal_bonus_claimed: boolean;
  notes: string;
}

export interface TaskCompletionRewardResult {
  alreadyClaimed: boolean;
  xpAwarded: number;
  foodAwarded: number;
  petLeveledUp: boolean;
  newPetLevel: number;
  pet: VirtualPet;
  foodInventory: PetInventoryItem[];
}

export interface DailyGoalRewardResult {
  alreadyClaimed: boolean;
  xpAwarded: number;
  foodAwarded: number;
  petLeveledUp: boolean;
  newPetLevel: number;
  pet: VirtualPet;
  foodInventory: PetInventoryItem[];
}

export interface FeedPetResult {
  success: boolean;
  message?: string;
  petLeveledUp: boolean;
  newPetLevel: number;
  pet: VirtualPet;
  foodInventory: PetInventoryItem[];
}

export interface DatabaseBackup {
  exportedAt: string;
  tasks: Task[];
  sessions: StudySession[];
  pets: VirtualPet[];
  inventory: PetInventoryItem[];
  ledger: RewardLedgerEntry[];
  dailySettings: DailySettings[];
}

export interface FocusQuestAPI {
  // Tasks
  getTasks: (date?: string) => Promise<Task[]>;
  createTask: (data: {
    title: string;
    mode: StudyMode;
    target_duration_minutes: number;
    difficulty?: TaskDifficulty;
    status?: TaskStatus;
    reward_xp?: number;
    reward_food?: number;
    order_index?: number;
  }) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<boolean>;
  reorderTasks: (taskIds: string[]) => Promise<Task[]>;

  // Timer & Sessions
  getActiveSession: () => Promise<StudySession | null>;
  startSession: (taskId: string, targetSeconds: number, chainId?: string | null) => Promise<StudySession>;
  pauseSession: (sessionId: string) => Promise<StudySession>;
  resumeSession: (sessionId: string) => Promise<StudySession>;
  extendSession: (sessionId: string, additionalSeconds: number) => Promise<StudySession>;
  completeSession: (sessionId: string, markTaskCompleted: boolean) => Promise<{ session: StudySession; rewardResult?: TaskCompletionRewardResult }>;
  cancelSession: (sessionId: string) => Promise<StudySession>;

  // Daily Mode & Goal
  getDailySettings: (date?: string) => Promise<DailySettings>;
  updateDailyMode: (mode: StudyMode, date?: string) => Promise<DailySettings>;
  setDailyGoalTarget: (targetTasks: number, date?: string) => Promise<DailySettings>;
  claimDailyGoalBonus: (date?: string) => Promise<DailyGoalRewardResult>;

  // Virtual Pet
  getPets: () => Promise<VirtualPet[]>;
  getActivePet: () => Promise<VirtualPet>;
  setActivePet: (petId: string) => Promise<VirtualPet>;
  getInventory: () => Promise<PetInventoryItem[]>;
  feedPet: (petId: string, itemId: string) => Promise<FeedPetResult>;
  getRewardLedger: () => Promise<RewardLedgerEntry[]>;

  // Distraction Monitor & Website Manager
  getDistractionRules: () => Promise<DistractionRule[]>;
  addDistractionRule: (domain: string, isAllowed: boolean) => Promise<DistractionRule>;
  updateDistractionRule: (id: string, updates: Partial<DistractionRule>) => Promise<DistractionRule>;
  deleteDistractionRule: (id: string) => Promise<boolean>;
  toggleDistractionRule: (id: string, enabled: boolean) => Promise<DistractionRule>;
  getMonitorSettings: () => Promise<{ enabled: boolean; secretToken: string; serverPort: number; status: MonitorStatus }>;
  setMonitorEnabled: (enabled: boolean) => Promise<boolean>;
  setDomainCooldown?: (domain: string, minutes?: number) => Promise<boolean>;
  onDistractionAlert?: (callback: (payload: DistractionAlertPayload) => void) => () => void;

  // Backup & Restore
  exportBackup: () => Promise<DatabaseBackup>;
  importBackup: (backup: DatabaseBackup) => Promise<{ success: boolean; message: string }>;
}

declare global {
  interface Window {
    focusQuestAPI: FocusQuestAPI;
  }
}
