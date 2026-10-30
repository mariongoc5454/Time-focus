import React, { useState } from 'react';
import { X, Layers, Clock, Coffee, Play, CheckCircle2 } from 'lucide-react';
import { Task } from '../types';

interface ChainedSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onStartChain: (plan: {
    chainId: string;
    selectedTaskIds: string[];
    breakMinutes: number;
    totalMinutes: number;
  }) => void;
}

export const ChainedSessionModal: React.FC<ChainedSessionModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onStartChain,
}) => {
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    pendingTasks.slice(0, 3).map((t) => t.id)
  );
  const [breakMinutes, setBreakMinutes] = useState<number>(5);

  if (!isOpen) return null;

  const toggleTask = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedTasksList = tasks.filter((t) => selectedIds.includes(t.id));
  const studyMinutes = selectedTasksList.reduce((acc, t) => acc + t.target_duration_minutes, 0);
  const totalBreaks = Math.max(0, selectedIds.length - 1) * breakMinutes;
  const totalSessionMinutes = studyMinutes + totalBreaks;

  const handleStart = () => {
    if (selectedIds.length === 0) return;
    const chainId = 'chain_' + Date.now().toString(36);
    onStartChain({
      chainId,
      selectedTaskIds: selectedIds,
      breakMinutes,
      totalMinutes: totalSessionMinutes,
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            <Layers className="w-5 h-5 text-indigo-400" />
            Build Chained Study Session
          </h2>
          <button onClick={onClose} className="modal-close-btn" type="button">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <p className="text-xs text-slate-300 font-medium">
            Combine multiple tasks into one seamless focus block (e.g. 120 minutes) with scheduled breaks between tasks.
          </p>

          {/* Task Selection */}
          <div>
            <label className="form-label">
              Select Tasks for Session ({selectedIds.length} chosen)
            </label>
            <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
              {pendingTasks.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center font-medium">
                  No active tasks. Create tasks first to build a chain.
                </div>
              ) : (
                pendingTasks.map((task) => {
                  const isSelected = selectedIds.includes(task.id);
                  return (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/40 text-white'
                          : 'border-[rgba(255,255,255,0.1)] bg-[#141c2c] text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-indigo-400 bg-indigo-500 text-white'
                              : 'border-slate-500'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <span className="text-xs font-bold text-slate-100">{task.title}</span>
                      </div>
                      <span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {task.target_duration_minutes}m
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Break Duration */}
          <div>
            <label className="form-label flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5 text-amber-400" /> Break Between Tasks
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 5, 10, 15].map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setBreakMinutes(m)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    breakMinutes === m
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                      : 'border-[rgba(255,255,255,0.1)] bg-[#141c2c] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {m === 0 ? 'No Break' : `${m} mins`}
                </button>
              ))}
            </div>
          </div>

          {/* Total Duration Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 to-violet-950/40 border border-indigo-500/30 flex items-center justify-between">
            <div>
              <span className="text-xs text-indigo-300 font-semibold block">Total Session Duration:</span>
              <span className="text-2xl font-black text-white tracking-tight">
                {totalSessionMinutes} mins
              </span>
            </div>
            <div className="text-right text-xs text-slate-300">
              <div>Study: <span className="font-bold text-white">{studyMinutes}m</span></div>
              <div>Breaks: <span className="font-bold text-white">{totalBreaks}m</span></div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgba(255,255,255,0.1)]">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={handleStart}
              className="glass-button glass-button-primary px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Chained Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
