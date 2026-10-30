import React, { useState } from 'react';
import { X, Sparkles, Clock, Target, Dumbbell } from 'lucide-react';
import { Task, StudyMode, TaskDifficulty } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    mode: StudyMode;
    target_duration_minutes: number;
    difficulty: TaskDifficulty;
  }) => Promise<void>;
  initialTask?: Task | null;
  defaultMode: StudyMode;
}

const MODE_PRESETS: Record<StudyMode, string[]> = {
  calculation: [
    'Calculus problem set (Exercises 1-10)',
    'Linear algebra matrix practice',
    'Physics mechanics derivations',
    'Past exam timed test',
  ],
  coding: [
    'Implement core data layer feature',
    'Debug and refactor edge case bugs',
    'LeetCode Medium: Tree & Graph practice',
    'Write unit and integration tests',
  ],
  memorization: [
    'Anki / Flashcard review (100 cards)',
    'English vocabulary memorization drill',
    'History / Biology key terms recap',
    'Formula and definition cheat sheet',
  ],
  mixed: [
    'Deep focus study block',
    'Homework & assignment sprint',
    'Weekly review & summaries',
    'Exam prep mixed session',
  ],
};

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
  defaultMode,
}) => {
  const [title, setTitle] = useState(initialTask ? initialTask.title : '');
  const [mode, setMode] = useState<StudyMode>(initialTask ? initialTask.mode : defaultMode);
  const [targetMinutes, setTargetMinutes] = useState<number>(
    initialTask ? initialTask.target_duration_minutes : 30
  );
  const [difficulty, setDifficulty] = useState<TaskDifficulty>(
    initialTask ? initialTask.difficulty : 'medium'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        mode,
        target_duration_minutes: Number(targetMinutes),
        difficulty,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatePreviewReward = () => {
    let xp = 50;
    let food = 2;
    if (difficulty === 'easy') {
      xp = 30;
      food = 1;
    } else if (difficulty === 'hard') {
      xp = 90;
      food = 3;
    }
    if (targetMinutes >= 45) {
      xp += 20;
      food += 1;
    }
    if (targetMinutes >= 90) {
      xp += 30;
      food += 1;
    }
    return { xp, food };
  };

  const rewards = calculatePreviewReward();

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            <Target className="w-5 h-5 text-violet-400" />
            {initialTask ? 'Edit Study Task' : 'Create Study Task'}
          </h2>
          <button onClick={onClose} className="modal-close-btn" type="button">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Study Mode Selector */}
          <div>
            <label className="form-label">Study Mode</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['calculation', 'coding', 'memorization', 'mixed'] as StudyMode[]).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMode(m)}
                  className={`mode-toggle-btn ${mode === m ? 'active' : ''}`}
                >
                  {m === 'calculation' && '🧮 Calc'}
                  {m === 'coding' && '💻 Coding'}
                  {m === 'memorization' && '📖 Memory'}
                  {m === 'mixed' && '⚡ Mixed'}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="form-label">Task Name</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., LeetCode 3 Problems, Calculus Chapter 4..."
              className="form-input-text"
            />
          </div>

          {/* Quick presets for the selected mode */}
          <div>
            <span className="form-label">
              Quick Suggestions for {mode}:
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {MODE_PRESETS[mode].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setTitle(preset)}
                  className="suggestion-chip"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Duration & Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-violet-400" /> Target Duration
              </label>
              <div className="flex items-center gap-2">
                {[25, 45, 60].map((mins) => (
                  <button
                    type="button"
                    key={mins}
                    onClick={() => setTargetMinutes(mins)}
                    className={`duration-chip ${targetMinutes === mins ? 'active' : ''}`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(Math.max(5, Number(e.target.value)))}
                  className="w-20 text-center font-bold"
                />
                <span className="text-xs text-slate-300 font-semibold">minutes</span>
              </div>
            </div>

            <div>
              <label className="form-label flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-amber-400" /> Difficulty
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['easy', 'medium', 'hard'] as TaskDifficulty[]).map((d) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`difficulty-chip ${
                      difficulty === d
                        ? d === 'easy'
                          ? 'active-easy'
                          : d === 'medium'
                          ? 'active-medium'
                          : 'active-hard'
                        : ''
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reward Preview */}
          <div className="reward-preview-box">
            <span className="text-violet-300 font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> Estimated Reward:
            </span>
            <div className="flex items-center gap-3 font-black text-xs">
              <span className="text-amber-400">+{rewards.xp} XP</span>
              <span className="text-emerald-400">+{rewards.food} Food</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgba(255,255,255,0.1)]">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="glass-button glass-button-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialTask ? 'Update Task' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
