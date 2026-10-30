import {
  FocusQuestAPI,
  Task,
  TaskDifficulty,
  TaskStatus,
  StudySession,
  StudyMode,
  VirtualPet,
  PetInventoryItem,
  RewardLedgerEntry,
  DailySettings,
  DatabaseBackup,
  FeedPetResult,
  TaskCompletionRewardResult,
  DailyGoalRewardResult,
  DistractionRule,
  MonitorStatus,
  DistractionAlertPayload,
} from '../types';

class FallbackBrowserAPI implements FocusQuestAPI {
  private tasks: Task[] = [];
  private session: StudySession | null = null;
  private pets: VirtualPet[] = [
    { id: 'pet_fox', species: 'fox', name: 'Lumi the Star Fox', level: 1, current_xp: 0, xp_to_next_level: 100, hunger: 60, happiness: 90, is_active: true, unlocked_at: new Date().toISOString() },
    { id: 'pet_shiba', species: 'shiba', name: 'Pochi the Shiba', level: 1, current_xp: 0, xp_to_next_level: 100, hunger: 50, happiness: 80, is_active: false, unlocked_at: new Date().toISOString() }
  ];
  private inventory: PetInventoryItem[] = [
    { id: 'food_berry', item_type: 'food', item_name: 'Star Berry', quantity: 5, xp_value: 20, happiness_value: 25 },
    { id: 'food_fish', item_type: 'food', item_name: 'Celestial Fish', quantity: 2, xp_value: 40, happiness_value: 45 },
    { id: 'food_bento', item_type: 'food', item_name: 'Focus Bento', quantity: 1, xp_value: 80, happiness_value: 70 },
  ];
  private ledger: RewardLedgerEntry[] = [];
  private dailySettings: DailySettings = {
    date: new Date().toISOString().split('T')[0],
    selected_mode: 'mixed',
    daily_goal_target_tasks: 3,
    daily_goal_bonus_claimed: false,
    notes: '',
  };
  private distractionRules: DistractionRule[] = [
    { id: 'rule_1', domain: 'youtube.com', enabled: true, is_allowed: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'rule_2', domain: 'facebook.com', enabled: true, is_allowed: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'rule_3', domain: 'tiktok.com', enabled: true, is_allowed: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'rule_4', domain: 'github.com', enabled: true, is_allowed: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];
  private monitorEnabled: boolean = true;
  private alertListeners: Array<(payload: DistractionAlertPayload) => void> = [];

  async getTasks(): Promise<Task[]> {
    return [...this.tasks];
  }
  async createTask(data: {
    title: string;
    mode: StudyMode;
    target_duration_minutes: number;
    difficulty?: TaskDifficulty;
    status?: TaskStatus;
    reward_xp?: number;
    reward_food?: number;
    order_index?: number;
  }): Promise<Task> {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: 'task_' + Math.random().toString(36).substring(2, 9),
      title: data.title,
      mode: data.mode,
      target_duration_minutes: data.target_duration_minutes,
      difficulty: data.difficulty || 'medium',
      status: data.status || 'todo',
      actual_duration_seconds: 0,
      reward_xp: data.reward_xp || 50,
      reward_food: data.reward_food || 2,
      order_index: data.order_index ?? this.tasks.length,
      created_at: now,
      updated_at: now,
      completed_at: null,
    };
    this.tasks.push(newTask);
    return newTask;
  }
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Task not found');
    this.tasks[idx] = { ...this.tasks[idx], ...updates, updated_at: new Date().toISOString() };
    return this.tasks[idx];
  }
  async deleteTask(id: string): Promise<boolean> {
    this.tasks = this.tasks.filter(t => t.id !== id);
    return true;
  }
  async reorderTasks(taskIds: string[]): Promise<Task[]> {
    const map = new Map(this.tasks.map(t => [t.id, t]));
    this.tasks = taskIds.map((id, index) => {
      const t = map.get(id)!;
      return { ...t, order_index: index };
    });
    return this.tasks;
  }
  private async syncSessionToLocalServer(action: string, taskId?: string, targetSeconds?: number) {
    try {
      await fetch('http://127.0.0.1:48123/api/sync-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FocusQuest-Token': 'focusquest_default_token',
        },
        body: JSON.stringify({ action, taskId, targetSeconds }),
      });
    } catch {
      // ignore if local desktop server is not reachable
    }
  }

  async getActiveSession(): Promise<StudySession | null> {
    return this.session;
  }
  async startSession(taskId: string, targetSeconds: number, chainId?: string | null): Promise<StudySession> {
    const now = new Date().toISOString();
    this.session = {
      id: 'session_' + Math.random().toString(36).substring(2, 9),
      task_id: taskId,
      chain_id: chainId || null,
      status: 'studying',
      start_timestamp: Date.now(),
      accumulated_seconds: 0,
      target_seconds: targetSeconds,
      is_break: false,
      break_duration_seconds: 0,
      created_at: now,
      updated_at: now,
    };
    this.syncSessionToLocalServer('start', taskId, targetSeconds);
    return this.session;
  }
  async pauseSession(): Promise<StudySession> {
    if (this.session && (this.session.status === 'studying' || this.session.status === 'running')) {
      const delta = Math.floor((Date.now() - this.session.start_timestamp) / 1000);
      this.session.accumulated_seconds += delta;
      this.session.status = 'paused';
      this.session.start_timestamp = 0;
      this.syncSessionToLocalServer('pause');
    }
    return this.session!;
  }
  async resumeSession(): Promise<StudySession> {
    if (this.session) {
      this.session.status = 'studying';
      this.session.start_timestamp = Date.now();
      this.syncSessionToLocalServer('resume');
    }
    return this.session!;
  }
  async extendSession(_id: string, additionalSeconds: number): Promise<StudySession> {
    if (this.session) {
      this.session.target_seconds += additionalSeconds;
    }
    return this.session!;
  }
  async completeSession(_id: string, markTaskCompleted: boolean): Promise<{ session: StudySession; rewardResult?: TaskCompletionRewardResult }> {
    if (this.session) {
      this.session.status = 'completed';
      this.syncSessionToLocalServer('complete');
    }
    let rewardResult: TaskCompletionRewardResult | undefined;
    if (markTaskCompleted && this.session) {
      const activePet = this.pets.find(p => p.is_active)!;
      rewardResult = {
        alreadyClaimed: false,
        xpAwarded: 50,
        foodAwarded: 2,
        petLeveledUp: false,
        newPetLevel: activePet.level,
        pet: activePet,
        foodInventory: this.inventory,
      };
    }
    return { session: this.session!, rewardResult };
  }
  async cancelSession(): Promise<StudySession> {
    if (this.session) {
      this.session.status = 'cancelled';
      this.syncSessionToLocalServer('cancel');
    }
    return this.session!;
  }
  async getDailySettings(): Promise<DailySettings> {
    return this.dailySettings;
  }
  async updateDailyMode(mode: StudyMode): Promise<DailySettings> {
    this.dailySettings = {
      ...this.dailySettings,
      selected_mode: mode,
    };
    return { ...this.dailySettings };
  }
  async setDailyGoalTarget(targetTasks: number): Promise<DailySettings> {
    this.dailySettings.daily_goal_target_tasks = targetTasks;
    return this.dailySettings;
  }
  async claimDailyGoalBonus(): Promise<DailyGoalRewardResult> {
    this.dailySettings.daily_goal_bonus_claimed = true;
    const activePet = this.pets.find(p => p.is_active)!;
    return {
      alreadyClaimed: false,
      xpAwarded: 150,
      foodAwarded: 4,
      petLeveledUp: false,
      newPetLevel: activePet.level,
      pet: activePet,
      foodInventory: this.inventory,
    };
  }
  async getPets(): Promise<VirtualPet[]> {
    return [...this.pets];
  }
  async getActivePet(): Promise<VirtualPet> {
    return this.pets.find(p => p.is_active) || this.pets[0];
  }
  async setActivePet(petId: string): Promise<VirtualPet> {
    this.pets.forEach(p => { p.is_active = p.id === petId; });
    return this.getActivePet();
  }
  async getInventory(): Promise<PetInventoryItem[]> {
    return [...this.inventory];
  }
  async feedPet(_petId: string, itemId: string): Promise<FeedPetResult> {
    const item = this.inventory.find(i => i.id === itemId);
    if (item && item.quantity > 0) {
      item.quantity -= 1;
    }
    const pet = await this.getActivePet();
    pet.current_xp += item ? item.xp_value : 20;
    return {
      success: true,
      petLeveledUp: false,
      newPetLevel: pet.level,
      pet,
      foodInventory: this.inventory,
    };
  }
  async getRewardLedger(): Promise<RewardLedgerEntry[]> {
    return [...this.ledger];
  }

  // Distraction Monitor & Website Manager
  async getDistractionRules(): Promise<DistractionRule[]> {
    return [...this.distractionRules];
  }
  async addDistractionRule(domain: string, isAllowed: boolean): Promise<DistractionRule> {
    const newRule: DistractionRule = {
      id: 'rule_' + Math.random().toString(36).substring(2, 9),
      domain,
      enabled: true,
      is_allowed: isAllowed,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.distractionRules.push(newRule);
    return newRule;
  }
  async updateDistractionRule(id: string, updates: Partial<DistractionRule>): Promise<DistractionRule> {
    const idx = this.distractionRules.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Rule not found');
    this.distractionRules[idx] = { ...this.distractionRules[idx], ...updates, updated_at: new Date().toISOString() };
    return this.distractionRules[idx];
  }
  async deleteDistractionRule(id: string): Promise<boolean> {
    this.distractionRules = this.distractionRules.filter(r => r.id !== id);
    return true;
  }
  async toggleDistractionRule(id: string, enabled: boolean): Promise<DistractionRule> {
    return this.updateDistractionRule(id, { enabled });
  }
  async getMonitorSettings(): Promise<{ enabled: boolean; secretToken: string; serverPort: number; status: MonitorStatus }> {
    return {
      enabled: this.monitorEnabled,
      secretToken: 'focusquest_default_token',
      serverPort: 48123,
      status: this.monitorEnabled ? (this.session?.status === 'paused' ? 'paused' : 'active') : 'disabled',
    };
  }
  async setMonitorEnabled(enabled: boolean): Promise<boolean> {
    this.monitorEnabled = enabled;
    return enabled;
  }
  async setDomainCooldown(_domain: string, _minutes?: number): Promise<boolean> {
    return true;
  }
  private lastAlertTimestamp = Date.now();
  private alertPollTimer: NodeJS.Timeout | null = null;

  onDistractionAlert(callback: (payload: DistractionAlertPayload) => void): () => void {
    this.alertListeners.push(callback);

    if (!this.alertPollTimer && typeof window !== 'undefined') {
      this.alertPollTimer = setInterval(async () => {
        try {
          const res = await fetch(`http://127.0.0.1:48123/api/last-alert?since=${this.lastAlertTimestamp}`, {
            headers: { 'X-FocusQuest-Token': 'focusquest_default_token' },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.alert) {
              this.lastAlertTimestamp = data.alert.timestamp;
              this.alertListeners.forEach((cb) => cb(data.alert));
            }
          }
        } catch {
          // ignore
        }
      }, 1500);
    }

    return () => {
      this.alertListeners = this.alertListeners.filter((cb) => cb !== callback);
      if (this.alertListeners.length === 0 && this.alertPollTimer) {
        clearInterval(this.alertPollTimer);
        this.alertPollTimer = null;
      }
    };
  }

  async exportBackup(): Promise<DatabaseBackup> {
    return {
      exportedAt: new Date().toISOString(),
      tasks: this.tasks,
      sessions: this.session ? [this.session] : [],
      pets: this.pets,
      inventory: this.inventory,
      ledger: this.ledger,
      dailySettings: [this.dailySettings],
    };
  }
  async importBackup(backup: DatabaseBackup): Promise<{ success: boolean; message: string }> {
    this.tasks = backup.tasks || [];
    this.pets = backup.pets || this.pets;
    this.inventory = backup.inventory || this.inventory;
    return { success: true, message: 'Restored backup successfully' };
  }
}

export const api: FocusQuestAPI =
  typeof window !== 'undefined' && window.focusQuestAPI
    ? window.focusQuestAPI
    : new FallbackBrowserAPI();
