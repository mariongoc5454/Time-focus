import React from 'react';
import {
  Plus,
  Play,
  Layers,
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit2,
  Sparkles,
  Award,
  Clock,
  Target
} from 'lucide-react';
import { Task, StudyMode, VirtualPet, DailySettings } from '../types';
import { PetSprite } from './PetSprite';

interface HomeViewProps {
  tasks: Task[];
  activePet: VirtualPet | null;
  dailySettings: DailySettings | null;
  onSelectMode: (mode: StudyMode) => void;
  onOpenCreateTask: () => void;
  onOpenEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onReorderTasks: (ids: string[]) => void;
  onStartFocusTask: (task: Task) => void;
  onOpenChainedModal: () => void;
  onClaimDailyBonus: () => void;
  onOpenPetSanctuary: () => void;
}

const MODES_INFO: Array<{
  id: StudyMode;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}> = [
  {
    id: 'calculation',
    title: 'Calculation',
    subtitle: 'Math, exercises & derivations',
    icon: '🧮',
    color: 'emerald',
  },
  {
    id: 'coding',
    title: 'Coding',
    subtitle: 'Projects, features & debugging',
    icon: '💻',
    color: 'blue',
  },
  {
    id: 'memorization',
    title: 'Memorization',
    subtitle: 'Flashcards, theory & recall',
    icon: '📖',
    color: 'amber',
  },
  {
    id: 'mixed',
    title: 'Mixed Mode',
    subtitle: 'Flexible multi-topic sprint',
    icon: '⚡',
    color: 'violet',
  },
];

export const HomeView: React.FC<HomeViewProps> = ({
  tasks,
  activePet,
  dailySettings,
  onSelectMode,
  onOpenCreateTask,
  onOpenEditTask,
  onDeleteTask,
  onReorderTasks,
  onStartFocusTask,
  onOpenChainedModal,
  onClaimDailyBonus,
  onOpenPetSanctuary,
}) => {
  const currentMode = dailySettings?.selected_mode || 'mixed';
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const targetCount = dailySettings?.daily_goal_target_tasks || 3;
  const goalMet = completedCount >= targetCount && targetCount > 0;
  const bonusClaimed = Boolean(dailySettings?.daily_goal_bonus_claimed);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newTasks = [...tasks];
    const temp = newTasks[index - 1];
    newTasks[index - 1] = newTasks[index];
    newTasks[index] = temp;
    onReorderTasks(newTasks.map((t) => t.id));
  };

  const handleMoveDown = (index: number) => {
    if (index === tasks.length - 1) return;
    const newTasks = [...tasks];
    const temp = newTasks[index + 1];
    newTasks[index + 1] = newTasks[index];
    newTasks[index] = temp;
    onReorderTasks(newTasks.map((t) => t.id));
  };

  const formatStudiedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hrs}h ${rem}m`;
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
      {/* 1. Today's Study Mode Selection */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            1. Select Today's Focus Mode
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            Tailors suggested templates and progress focus
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MODES_INFO.map((m) => {
            const isSelected = currentMode === m.id;
            return (
              <div
                key={m.id}
                onClick={() => onSelectMode(m.id)}
                className={`study-mode-card ${isSelected ? 'active' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{m.icon}</span>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 ${
                      isSelected
                        ? 'border-violet-400 bg-violet-500'
                        : 'border-slate-500 bg-transparent'
                    }`}
                  />
                </div>
                <h3 className="text-sm font-bold text-white">{m.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{m.subtitle}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Middle Row: Daily Goal & Pet Widget Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Daily Goal Card (2 cols) */}
        <div className="lg:col-span-2 study-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Today's Study Goal</h3>
                <p className="text-xs text-slate-400">
                  Target: Complete {targetCount} tasks today
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-lg font-black text-white">
                {completedCount} / {targetCount}
              </span>
              <span className="text-xs text-slate-400 block font-medium">completed</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="my-4">
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-400 transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round((completedCount / targetCount) * 100))}%`,
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-300 font-medium">
              {goalMet
                ? '🎉 Daily goal achieved!'
                : `Need ${Math.max(0, targetCount - completedCount)} more task(s) to unlock daily bonus.`}
            </span>

            {goalMet && !bonusClaimed && (
              <button
                onClick={onClaimDailyBonus}
                className="glass-button glass-button-success px-3.5 py-1.5 text-xs font-bold animate-bounce"
              >
                <Award className="w-3.5 h-3.5" />
                Claim Bonus (+150 XP & Bento!)
              </button>
            )}

            {bonusClaimed && (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Daily Bonus Claimed
              </span>
            )}
          </div>
        </div>

        {/* Pet Quick Glance Card (1 col) */}
        {activePet && (
          <div
            onClick={onOpenPetSanctuary}
            className="study-card p-5 flex flex-col justify-between cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block">
                  Study Companion
                </span>
                <h4 className="text-sm font-extrabold text-white group-hover:text-violet-300 transition-colors">
                  {activePet.name}
                </h4>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300">
                Lv. {activePet.level}
              </span>
            </div>

            <div className="flex items-center justify-center py-2">
              <PetSprite species={activePet.species} mood="idle" size={85} />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                <span>XP Progress</span>
                <span className="text-violet-300 font-bold font-mono">
                  {activePet.current_xp} / {activePet.xp_to_next_level} XP
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((activePet.current_xp / activePet.xp_to_next_level) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Today's Tasks Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>Today's Study Tasks</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#182236] text-slate-300">
                {tasks.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Complete tasks to track real time and earn pet rewards
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {tasks.filter((t) => t.status !== 'completed').length > 1 && (
              <button
                onClick={onOpenChainedModal}
                className="glass-button px-3.5 py-2 text-xs font-bold text-indigo-300 border-indigo-500/30 hover:border-indigo-500"
                title="Chain tasks into a 120m deep focus session"
              >
                <Layers className="w-3.5 h-3.5" />
                Chain 120m Session
              </button>
            )}

            <button
              onClick={onOpenCreateTask}
              className="glass-button glass-button-primary px-4 py-2 text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>
        </div>

        {/* Tasks List */}
        {tasks.length === 0 ? (
          <div className="study-card p-10 text-center border-dashed border-[rgba(255,255,255,0.15)]">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/20 text-violet-400 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No tasks created yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Add your first task to start your focus timer and begin feeding your virtual pet!
            </p>
            <button
              onClick={onOpenCreateTask}
              className="glass-button glass-button-primary px-4 py-2 text-xs font-bold mt-4"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Task
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tasks.map((task, index) => {
              const isCompleted = task.status === 'completed';
              const isInProgress = task.status === 'in_progress';

              return (
                <div
                  key={task.id}
                  className={`task-row ${
                    isCompleted ? 'completed' : isInProgress ? 'in-progress' : ''
                  }`}
                >
                  {/* Left: Reorder arrows & Title info */}
                  <div className="flex items-center gap-3 min-w-[260px] flex-1">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="text-slate-400 hover:text-white disabled:opacity-20 p-0.5 bg-transparent border-none"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === tasks.length - 1}
                        className="text-slate-400 hover:text-white disabled:opacity-20 p-0.5 bg-transparent border-none"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-bold ${
                            isCompleted ? 'line-through text-slate-500' : 'text-white'
                          }`}
                        >
                          {task.title}
                        </span>

                        <span className={`badge badge-${task.mode}`}>
                          {task.mode}
                        </span>

                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {task.difficulty}
                        </span>

                        {isInProgress && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 animate-pulse">
                            Active in Focus Room
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1 font-medium text-slate-300">
                          <Clock className="w-3 h-3 text-violet-400" /> Target: {task.target_duration_minutes}m
                        </span>
                        <span>•</span>
                        <span className="font-medium text-slate-300">
                          Studied: {formatStudiedTime(task.actual_duration_seconds)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Rewards & Action buttons */}
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 text-xs font-bold">
                      <span className="text-amber-400">+{task.reward_xp} XP</span>
                      <span className="text-emerald-400">+{task.reward_food} Food</span>
                    </div>

                    {!isCompleted ? (
                      <button
                        onClick={() => onStartFocusTask(task)}
                        className="glass-button glass-button-primary px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Focus
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
                        ✓ Completed
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenEditTask(task)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-[#182236] border border-[rgba(255,255,255,0.1)] transition-colors"
                        title="Edit task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 rounded-lg text-rose-300 hover:text-rose-100 bg-[#2d121c] border border-rose-500/30 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
