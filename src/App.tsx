import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, MainTab } from './components/Navigation';
import { HomeView } from './components/HomeView';
import { FocusRoomView } from './components/FocusRoomView';
import { PetSanctuaryView } from './components/PetSanctuaryView';
import { WebsiteManagerView } from './components/WebsiteManagerView';
import { TaskModal } from './components/TaskModal';
import { ChainedSessionModal } from './components/ChainedSessionModal';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { api } from './services/api';
import {
  Task,
  StudySession,
  VirtualPet,
  PetInventoryItem,
  RewardLedgerEntry,
  DailySettings,
  StudyMode,
  TaskDifficulty,
  DatabaseBackup,
  MonitorStatus,
} from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<MainTab>('home');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [currentFocusTask, setCurrentFocusTask] = useState<Task | null>(null);

  const [activePet, setActivePet] = useState<VirtualPet | null>(null);
  const [pets, setPets] = useState<VirtualPet[]>([]);
  const [inventory, setInventory] = useState<PetInventoryItem[]>([]);
  const [ledger, setLedger] = useState<RewardLedgerEntry[]>([]);
  const [dailySettings, setDailySettings] = useState<DailySettings | null>(null);
  const [monitorStatus, setMonitorStatus] = useState<MonitorStatus>('disconnected');

  // Modals & Overlays
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isChainedModalOpen, setIsChainedModalOpen] = useState(false);

  // Celebration overlay state
  const [celebration, setCelebration] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    xpAwarded?: number;
    foodAwarded?: number;
    isLevelUp?: boolean;
    newLevel?: number;
    pet?: VirtualPet;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [fetchedTasks, fetchedSession, fetchedDaily, fetchedPets, fetchedActivePet, fetchedInv, fetchedLedger] =
        await Promise.all([
          api.getTasks(),
          api.getActiveSession(),
          api.getDailySettings(),
          api.getPets(),
          api.getActivePet(),
          api.getInventory(),
          api.getRewardLedger(),
        ]);

      setTasks(fetchedTasks);
      setActiveSession(fetchedSession);
      setDailySettings(fetchedDaily);
      setPets(fetchedPets);
      setActivePet(fetchedActivePet);
      setInventory(fetchedInv);
      setLedger(fetchedLedger);

      // If there's an active session, align the currentFocusTask
      if (fetchedSession) {
        const found = fetchedTasks.find((t) => t.id === fetchedSession.task_id);
        if (found) setCurrentFocusTask(found);
      } else if (!currentFocusTask && fetchedTasks.length > 0) {
        const firstPending = fetchedTasks.find((t) => t.status !== 'completed') || fetchedTasks[0];
        setCurrentFocusTask(firstPending);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  }, [currentFocusTask]);

  useEffect(() => {
    loadData();

    // Monitor status & active session poll interval
    const pollTimer = setInterval(async () => {
      try {
        const [settings, currentSession] = await Promise.all([
          api.getMonitorSettings(),
          api.getActiveSession(),
        ]);
        setMonitorStatus(settings.status);
        if (currentSession) {
          setActiveSession(currentSession);
        }
      } catch {
        // ignore
      }
    }, 2000);

    return () => {
      clearInterval(pollTimer);
    };
  }, [loadData]);

  // Mode Selection
  const handleSelectMode = async (mode: StudyMode) => {
    const updated = await api.updateDailyMode(mode);
    setDailySettings({ ...updated, selected_mode: mode });
  };

  // Task Actions
  const handleSaveTask = async (data: {
    title: string;
    mode: StudyMode;
    target_duration_minutes: number;
    difficulty: TaskDifficulty;
  }) => {
    if (editingTask) {
      await api.updateTask(editingTask.id, data);
    } else {
      await api.createTask({
        ...data,
        status: 'todo',
      });
    }
    await loadData();
    setEditingTask(null);
  };

  const handleDeleteTask = async (id: string) => {
    await api.deleteTask(id);
    if (currentFocusTask?.id === id) {
      setCurrentFocusTask(null);
    }
    await loadData();
  };

  const handleReorderTasks = async (ids: string[]) => {
    const reordered = await api.reorderTasks(ids);
    setTasks(reordered);
  };

  // Focus Timer Actions
  const handleStartSession = async (taskId: string, targetMinutes: number, chainId: string | null = null) => {
    const session = await api.startSession(taskId, targetMinutes * 60, chainId);
    setActiveSession(session);
    const task = tasks.find((t) => t.id === taskId);
    if (task) setCurrentFocusTask(task);
    setCurrentTab('focus');
    await loadData();
  };

  const handlePauseSession = async () => {
    if (!activeSession) return;
    const session = await api.pauseSession(activeSession.id);
    setActiveSession(session);
    await loadData();
  };

  const handleResumeSession = async () => {
    if (!activeSession) return;
    const session = await api.resumeSession(activeSession.id);
    setActiveSession(session);
    await loadData();
  };

  const handleExtendSession = async (additionalMinutes: number) => {
    if (!activeSession) return;
    const session = await api.extendSession(activeSession.id, additionalMinutes * 60);
    setActiveSession(session);
    await loadData();
  };

  const handleCompleteSession = async (markTaskCompleted: boolean) => {
    if (!activeSession) return;
    const result = await api.completeSession(activeSession.id, markTaskCompleted);
    setActiveSession(null);

    if (result.rewardResult && !result.rewardResult.alreadyClaimed) {
      setCelebration({
        isOpen: true,
        title: result.rewardResult.petLeveledUp ? '🎉 Level Up!' : '🌟 Task Completed!',
        subtitle: result.rewardResult.petLeveledUp
          ? `Your pet leveled up to Level ${result.rewardResult.newPetLevel}!`
          : `Great job focusing! You earned XP and Food for your pet.`,
        xpAwarded: result.rewardResult.xpAwarded,
        foodAwarded: result.rewardResult.foodAwarded,
        isLevelUp: result.rewardResult.petLeveledUp,
        newLevel: result.rewardResult.newPetLevel,
        pet: result.rewardResult.pet,
      });
    }

    await loadData();
  };

  const handleCancelSession = async () => {
    if (!activeSession) return;
    await api.cancelSession(activeSession.id);
    setActiveSession(null);
    await loadData();
  };

  const handleClaimDailyBonus = async () => {
    const result = await api.claimDailyGoalBonus();
    if (!result.alreadyClaimed) {
      setCelebration({
        isOpen: true,
        title: '🏆 Daily Goal Mastered!',
        subtitle: 'You completed your daily study target! Enjoy the bonus feast!',
        xpAwarded: result.xpAwarded,
        foodAwarded: result.foodAwarded,
        isLevelUp: result.petLeveledUp,
        newLevel: result.newPetLevel,
        pet: result.pet,
      });
    }
    await loadData();
  };

  // Pet Actions
  const handleFeedPet = async (petId: string, itemId: string) => {
    const result = await api.feedPet(petId, itemId);
    if (result.petLeveledUp) {
      setCelebration({
        isOpen: true,
        title: '🎉 Pet Leveled Up!',
        subtitle: `${result.pet.name} is now Level ${result.newPetLevel}!`,
        isLevelUp: true,
        newLevel: result.newPetLevel,
        pet: result.pet,
      });
    }
    await loadData();
  };

  const handleSelectPet = async (petId: string) => {
    await api.setActivePet(petId);
    await loadData();
  };

  const handleExportBackup = async () => {
    return await api.exportBackup();
  };

  const handleImportBackup = async (backup: DatabaseBackup) => {
    await api.importBackup(backup);
    await loadData();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080b11] text-slate-100">
      {/* Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activePet={activePet}
        selectedMode={dailySettings?.selected_mode || 'mixed'}
        isFocusRunning={activeSession?.status === 'running'}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {currentTab === 'home' && (
          <HomeView
            tasks={tasks}
            activePet={activePet}
            dailySettings={dailySettings}
            onSelectMode={handleSelectMode}
            onOpenCreateTask={() => {
              setEditingTask(null);
              setIsTaskModalOpen(true);
            }}
            onOpenEditTask={(task) => {
              setEditingTask(task);
              setIsTaskModalOpen(true);
            }}
            onDeleteTask={handleDeleteTask}
            onReorderTasks={handleReorderTasks}
            onStartFocusTask={(task) => {
              setCurrentFocusTask(task);
              handleStartSession(task.id, task.target_duration_minutes);
            }}
            onOpenChainedModal={() => setIsChainedModalOpen(true)}
            onClaimDailyBonus={handleClaimDailyBonus}
            onOpenPetSanctuary={() => setCurrentTab('pet')}
          />
        )}

        {currentTab === 'focus' && (
          <FocusRoomView
            currentTask={currentFocusTask}
            activeSession={activeSession}
            activePet={activePet}
            tasks={tasks}
            monitorStatus={monitorStatus}
            onStartSession={(taskId, targetMinutes) => handleStartSession(taskId, targetMinutes)}
            onPauseSession={handlePauseSession}
            onResumeSession={handleResumeSession}
            onExtendSession={handleExtendSession}
            onCompleteSession={handleCompleteSession}
            onCancelSession={handleCancelSession}
            onSelectTask={(task) => setCurrentFocusTask(task)}
            onNavigateHome={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'pet' && (
          <PetSanctuaryView
            activePet={activePet}
            pets={pets}
            inventory={inventory}
            ledger={ledger}
            onFeedPet={handleFeedPet}
            onSelectPet={handleSelectPet}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
          />
        )}

        {currentTab === 'shield' && (
          <WebsiteManagerView onBackToHome={() => setCurrentTab('home')} />
        )}
      </main>


      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        initialTask={editingTask}
        defaultMode={dailySettings?.selected_mode || 'mixed'}
      />

      <ChainedSessionModal
        isOpen={isChainedModalOpen}
        onClose={() => setIsChainedModalOpen(false)}
        tasks={tasks}
        onStartChain={(plan) => {
          if (plan.selectedTaskIds.length > 0) {
            const firstTaskId = plan.selectedTaskIds[0];
            const firstTask = tasks.find((t) => t.id === firstTaskId);
            if (firstTask) {
              handleStartSession(firstTask.id, firstTask.target_duration_minutes, plan.chainId);
            }
          }
        }}
      />

      {celebration.isOpen && (
        <CelebrationOverlay
          title={celebration.title}
          subtitle={celebration.subtitle}
          xpAwarded={celebration.xpAwarded}
          foodAwarded={celebration.foodAwarded}
          isLevelUp={celebration.isLevelUp}
          newLevel={celebration.newLevel}
          pet={celebration.pet}
          onClose={() => setCelebration((prev) => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
};
export default App;
