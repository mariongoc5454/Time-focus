import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  CheckCircle,
  PlusCircle,
  AlertCircle,
  StopCircle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  PauseCircle,
  HelpCircle
} from 'lucide-react';
import { Task, StudySession, VirtualPet, MonitorStatus } from '../types';
import { PetSprite } from './PetSprite';

interface FocusRoomViewProps {
  currentTask: Task | null;
  activeSession: StudySession | null;
  activePet: VirtualPet | null;
  tasks: Task[];
  monitorStatus?: MonitorStatus;
  onStartSession: (taskId: string, targetMinutes: number) => void;
  onPauseSession: () => Promise<void> | void;
  onResumeSession: () => Promise<void> | void;
  onExtendSession: (additionalMinutes: number) => void;
  onCompleteSession: (markTaskCompleted: boolean) => void;
  onCancelSession: () => Promise<void> | void;
  onSelectTask: (task: Task) => void;
  onNavigateHome: () => void;
}

export const FocusRoomView: React.FC<FocusRoomViewProps> = ({
  currentTask,
  activeSession,
  activePet,
  tasks,
  monitorStatus = 'disconnected',
  onStartSession,
  onPauseSession,
  onResumeSession,
  onExtendSession,
  onCompleteSession,
  onCancelSession,
  onSelectTask,
  onNavigateHome,
}) => {
  // Timestamp-based reactive timer tick
  const [, setTick] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isEndConfirmOpen, setIsEndConfirmOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  let elapsedSeconds = 0;
  let remainingSeconds = 0;
  let targetSeconds = 0;
  let isRunning = false;
  let isPaused = false;
  let isOvertime = false;

  if (activeSession) {
    isRunning = activeSession.status === 'studying' || activeSession.status === 'running';
    isPaused = activeSession.status === 'paused';
    targetSeconds = activeSession.target_seconds;
    elapsedSeconds = activeSession.accumulated_seconds;

    // Paused time is strictly EXCLUDED: only calculate segment if currently studying
    if (isRunning && activeSession.start_timestamp > 0) {
      const segment = Math.max(0, Math.floor((Date.now() - activeSession.start_timestamp) / 1000));
      elapsedSeconds += segment;
    }

    remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
    isOvertime = elapsedSeconds >= targetSeconds;
  } else if (currentTask) {
    targetSeconds = currentTask.target_duration_minutes * 60;
    remainingSeconds = targetSeconds;
  }

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const currentIndex = currentTask ? pendingTasks.findIndex((t) => t.id === currentTask.id) : -1;
  const nextTask =
    currentIndex >= 0 && currentIndex < pendingTasks.length - 1
      ? pendingTasks[currentIndex + 1]
      : null;

  const handleCompleteAndNext = () => {
    onCompleteSession(true);
    if (autoAdvance && nextTask) {
      setTimeout(() => {
        onSelectTask(nextTask);
        onStartSession(nextTask.id, nextTask.target_duration_minutes);
      }, 500);
    }
  };

  const handlePause = async () => {
    if (isActionLoading) return;
    try {
      setIsActionLoading(true);
      await onPauseSession();
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (isActionLoading) return;
    try {
      setIsActionLoading(true);
      await onResumeSession();
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmEndSession = async () => {
    setIsEndConfirmOpen(false);
    setIsActionLoading(true);
    try {
      await onCancelSession();
    } finally {
      setIsActionLoading(false);
    }
  };

  const renderMonitorBadge = () => {
    switch (monitorStatus) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Giám sát website: Đang hoạt động
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
            Giám sát website: Đang tạm dừng
          </span>
        );
      case 'disabled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            Giám sát: Đã tắt
          </span>
        );
      case 'disconnected':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            Giám sát: Mất kết nối Extension
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      {/* Current Task Selector / Banner */}
      <div className="study-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[240px]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400 block mb-1">
            Nhiệm Vụ Học Hiện Tại
          </span>
          {currentTask ? (
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                {currentTask.title}
              </h2>
              <span className={`badge badge-${currentTask.mode}`}>{currentTask.mode}</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {currentTask.difficulty}
              </span>
            </div>
          ) : (
            <div className="text-sm font-semibold text-slate-300">
              Chưa chọn nhiệm vụ. Hãy chọn một nhiệm vụ bên dưới hoặc quay lại Home.
            </div>
          )}
        </div>

        {/* Task switcher & Monitor Badge */}
        <div className="flex flex-wrap items-center gap-3">
          {renderMonitorBadge()}

          <select
            value={currentTask?.id || ''}
            onChange={(e) => {
              const selected = tasks.find((t) => t.id === e.target.value);
              if (selected) onSelectTask(selected);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold"
          >
            <option value="" disabled>
              Chọn bài tập khác...
            </option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id} className="bg-[#121722] text-white">
                {t.status === 'completed' ? '✓ ' : ''}
                {t.title} ({t.target_duration_minutes}m)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Focus Center */}
      <div
        className={`study-card p-8 text-center flex flex-col items-center justify-center relative transition-all ${
          isOvertime ? 'pulse-overtime bg-[#200e16]' : isRunning ? 'pulse-timer' : isPaused ? 'bg-[#181a24]' : ''
        }`}
      >
        {/* Status indicator */}
        <div className="mb-4">
          {isOvertime ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50 text-xs font-bold animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" />
              Đã hết thời gian! Hãy hoàn thành bài tập hoặc gia hạn thêm giờ bên dưới.
            </span>
          ) : isRunning ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Đang học tập trung
            </span>
          ) : isPaused ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/50 text-sm font-extrabold shadow-lg shadow-amber-500/10">
              ⏸ Phiên học đang tạm dừng.
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#182236] border border-[rgba(255,255,255,0.1)] text-slate-300 text-xs font-bold">
              Sẵn sàng bắt đầu phiên học
            </span>
          )}
        </div>

        {/* Circular / Big Timer Display */}
        <div className="relative my-4 flex items-center justify-center">
          <svg className="w-64 h-64 -rotate-90">
            {/* Background ring */}
            <circle
              cx="128"
              cy="128"
              r="110"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Progress ring */}
            <circle
              cx="128"
              cy="128"
              r="110"
              stroke={isOvertime ? '#f43f5e' : isPaused ? '#eab308' : '#8b5cf6'}
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 110}
              strokeDashoffset={
                2 * Math.PI * 110 * (1 - (targetSeconds > 0 ? remainingSeconds / targetSeconds : 0))
              }
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>

          {/* Center Digital Clock */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`font-mono text-5xl font-black tracking-tight ${
                isOvertime ? 'text-rose-400' : isPaused ? 'text-amber-300' : 'text-white'
              }`}
            >
              {formatTime(remainingSeconds)}
            </span>
            <span className="text-xs font-semibold text-slate-300 mt-1">
              Thời gian thực học: <strong className="text-white">{formatTime(elapsedSeconds)}</strong>
            </span>
            {isPaused && (
              <span className="text-[10px] font-semibold text-amber-400/90 mt-1">
                (Thời gian tạm dừng không được tính vào thời gian học)
              </span>
            )}
          </div>
        </div>

        {/* Primary Controls Bar */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {!activeSession || activeSession.status === 'idle' || activeSession.status === 'completed' || activeSession.status === 'cancelled' ? (
            <button
              disabled={!currentTask || currentTask.status === 'completed'}
              onClick={() => {
                if (currentTask) {
                  onStartSession(currentTask.id, currentTask.target_duration_minutes);
                }
              }}
              className="glass-button glass-button-primary px-8 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-xl disabled:opacity-40"
            >
              <Play className="w-4 h-4 fill-current" />
              Bắt Đầu Học (Start Focus Timer)
            </button>
          ) : isRunning ? (
            /* When Studying / Running: Show visible Pause Session button */
            <>
              <button
                disabled={isActionLoading}
                onClick={handlePause}
                className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-[#2d1f11] text-amber-300 border border-amber-500/40 hover:bg-[#382615] flex items-center gap-2 transition-all shadow-lg"
              >
                <Pause className="w-4 h-4 fill-current" />
                {isActionLoading ? 'Đang xử lý...' : 'Pause Session — Tạm dừng'}
              </button>

              <button
                onClick={() => setIsEndConfirmOpen(true)}
                className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-[#182030] text-slate-300 border border-[rgba(255,255,255,0.1)] hover:bg-[#202a40] flex items-center gap-1.5"
              >
                <StopCircle className="w-4 h-4 text-rose-400" />
                End Session
              </button>
            </>
          ) : isPaused ? (
            /* When Paused: Show Resume Session and End Session buttons */
            <>
              <button
                disabled={isActionLoading}
                onClick={handleResume}
                className="glass-button glass-button-primary px-7 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl"
              >
                <Play className="w-4 h-4 fill-current" />
                {isActionLoading ? 'Đang xử lý...' : 'Resume Session — Tiếp tục'}
              </button>

              <button
                onClick={() => setIsEndConfirmOpen(true)}
                className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-[#2a171c] text-rose-300 border border-rose-500/40 hover:bg-[#351b22] flex items-center gap-1.5"
              >
                <StopCircle className="w-4 h-4" />
                End Session — Kết thúc phiên
              </button>
            </>
          ) : null}

          {/* Complete Task Button */}
          {activeSession && (isRunning || isPaused) && (
            <button
              onClick={handleCompleteAndNext}
              className="glass-button glass-button-success px-6 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Hoàn Thành Task & Nhận Thưởng
            </button>
          )}
        </div>

        {/* Extension Buttons (When near completion or overtime) */}
        {activeSession && (isRunning || isPaused) && (
          <div className="mt-6 pt-5 border-t border-[rgba(255,255,255,0.1)] w-full max-w-md">
            <span className="text-xs font-semibold text-slate-300 block mb-2">
              Gia hạn thêm thời gian học:
            </span>
            <div className="flex items-center justify-center gap-2">
              {[5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  onClick={() => onExtendSession(mins)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#182236] text-violet-300 border border-violet-500/40 hover:bg-[#202d48] flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  +{mins} phút
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Auto-advance option */}
        {nextTask && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              id="autoAdvance"
              checked={autoAdvance}
              onChange={(e) => setAutoAdvance(e.target.checked)}
              className="rounded accent-violet-600 cursor-pointer"
            />
            <label htmlFor="autoAdvance" className="cursor-pointer">
              Tự động chuyển sang bài tiếp theo: <span className="text-white font-bold">{nextTask.title}</span>
            </label>
          </div>
        )}
      </div>

      {/* Cheering Virtual Pet Companion */}
      {activePet && (
        <div className="study-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PetSprite
              species={activePet.species}
              mood={isRunning ? 'focusing' : isPaused ? 'idle' : 'happy'}
              size={65}
            />
            <div>
              <span className="text-xs font-bold text-white block">
                {activePet.name} đang đồng hành cùng bạn!
              </span>
              <p className="text-[11px] text-slate-300">
                {isRunning
                  ? 'Đang đeo kính chăm chú học bài cùng bạn...'
                  : isPaused
                  ? 'Đang kiên nhẫn chờ bạn quay lại học tiếp...'
                  : 'Sẵn sàng cổ vũ cho phiên học tiếp theo của bạn!'}
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateHome}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 bg-[#162032] border border-[rgba(255,255,255,0.1)] rounded-xl hover:text-white"
          >
            Về Trang Chủ
          </button>
        </div>
      )}

      {/* End Session Confirmation Dialog */}
      {isEndConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121826] border border-rose-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Kết thúc phiên học sớm?</h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Thời gian bạn đã học thực tế (<strong className="text-white">{formatTime(elapsedSeconds)}</strong>) sẽ được lưu lại. Task chưa hoàn thành sẽ không nhận được thưởng XP, nhưng XP và phần thưởng trước đó vẫn được giữ nguyên vẹn.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsEndConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#182030] text-slate-300 border border-[rgba(255,255,255,0.1)] hover:bg-[#202a40]"
              >
                Tiếp tục học
              </button>
              <button
                onClick={handleConfirmEndSession}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30"
              >
                Kết thúc phiên
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
