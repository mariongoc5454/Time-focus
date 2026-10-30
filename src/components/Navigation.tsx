import React from 'react';
import { LayoutGrid, Timer, Sparkles, Shield } from 'lucide-react';
import { VirtualPet, StudyMode } from '../types';

export type MainTab = 'home' | 'focus' | 'pet' | 'shield';

interface NavigationProps {
  currentTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  activePet: VirtualPet | null;
  selectedMode: StudyMode;
  isFocusRunning?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  activePet,
  selectedMode,
  isFocusRunning = false,
}) => {
  const getModeLabel = (mode: StudyMode) => {
    switch (mode) {
      case 'calculation':
        return '🧮 Calculation';
      case 'coding':
        return '💻 Coding';
      case 'memorization':
        return '📖 Memorization';
      case 'mixed':
        return '⚡ Mixed Mode';
    }
  };

  return (
    <header className="app-header">
      {/* Brand & Mode Tag */}
      <div className="flex items-center gap-4">
        <div
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight text-white block leading-tight">
              FocusQuest
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400 block">
              Study & Virtual Pet
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center px-3.5 py-1 rounded-full bg-[#162032] border border-[rgba(255,255,255,0.12)] text-xs text-slate-200 font-medium">
          <span className="text-slate-400 mr-1.5">Today:</span>
          <span className="text-violet-300 font-bold">{getModeLabel(selectedMode)}</span>
        </div>
      </div>

      {/* 3 Core Navigation Tabs */}
      <nav className="flex items-center gap-2 p-1 bg-[#131b2e] border border-[rgba(255,255,255,0.12)] rounded-2xl shadow-inner">
        <button
          onClick={() => onSelectTab('home')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            currentTab === 'home' ? 'tab-active' : 'tab-inactive'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Home</span>
        </button>

        <button
          onClick={() => onSelectTab('focus')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold relative transition-all ${
            currentTab === 'focus' ? 'tab-active' : 'tab-inactive'
          }`}
        >
          <Timer className="w-4 h-4" />
          <span>Focus Room</span>
          {isFocusRunning && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => onSelectTab('pet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            currentTab === 'pet' ? 'tab-active' : 'tab-inactive'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Pet & Rewards</span>
        </button>

        <button
          onClick={() => onSelectTab('shield')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            currentTab === 'shield' ? 'tab-active' : 'tab-inactive'
          }`}
        >
          <Shield className="w-4 h-4 text-violet-400" />
          <span>Distraction Shield</span>
        </button>
      </nav>

      {/* Active Pet Quick Pill */}
      {activePet && (
        <div
          onClick={() => onSelectTab('pet')}
          className="flex items-center gap-3 px-3.5 py-1.5 rounded-2xl bg-[#162032] hover:bg-[#1e2b42] border border-[rgba(255,255,255,0.12)] cursor-pointer transition-all hover:scale-[1.02]"
        >
          <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-sm border border-amber-500/40">
            {activePet.species === 'fox' && '🦊'}
            {activePet.species === 'shiba' && '🐕'}
            {activePet.species === 'cat' && '🐱'}
            {activePet.species === 'dragon' && '🐲'}
            {activePet.species === 'owl' && '🦉'}
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-white leading-tight">
              {activePet.name.split(' ')[0]}
            </div>
            <div className="text-[10px] text-amber-400 font-semibold leading-none">
              Lv. {activePet.level}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
