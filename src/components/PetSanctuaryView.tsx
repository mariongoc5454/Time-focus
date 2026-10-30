import React, { useState } from 'react';
import {
  Sparkles,
  Heart,
  Utensils,
  History,
  ShieldCheck,
  Download,
  Upload,
  CheckCircle,
  Lock,
  Smile
} from 'lucide-react';
import {
  VirtualPet,
  PetInventoryItem,
  RewardLedgerEntry,
  DatabaseBackup
} from '../types';
import { PetSprite } from './PetSprite';

interface PetSanctuaryViewProps {
  activePet: VirtualPet | null;
  pets: VirtualPet[];
  inventory: PetInventoryItem[];
  ledger: RewardLedgerEntry[];
  onFeedPet: (petId: string, itemId: string) => Promise<void>;
  onSelectPet: (petId: string) => Promise<void>;
  onExportBackup: () => Promise<DatabaseBackup>;
  onImportBackup: (backup: DatabaseBackup) => Promise<void>;
}

export const PetSanctuaryView: React.FC<PetSanctuaryViewProps> = ({
  activePet,
  pets,
  inventory,
  ledger,
  onFeedPet,
  onSelectPet,
  onExportBackup,
  onImportBackup,
}) => {
  const [activeTab, setActiveTab] = useState<'habitat' | 'roster' | 'ledger'>('habitat');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!activePet) {
    return <div className="p-8 text-center text-slate-300">Loading pet habitat...</div>;
  }

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleFeed = async (item: PetInventoryItem) => {
    if (item.quantity <= 0) return;
    await onFeedPet(activePet.id, item.id);
    showFeedback(`Fed ${activePet.name} 1x ${item.item_name}! (+${item.xp_value} XP)`);
  };

  const handleExport = async () => {
    const backup = await onExportBackup();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `focusquest-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showFeedback('Backup exported successfully!');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string) as DatabaseBackup;
        await onImportBackup(json);
        showFeedback('Backup imported successfully!');
      } catch {
        showFeedback('Error importing backup: invalid JSON format.');
      }
    };
    reader.readAsText(file);
  };

  const getRequiredLevel = (species: string): number => {
    switch (species) {
      case 'fox': return 1;
      case 'shiba': return 3;
      case 'cat': return 5;
      case 'owl': return 8;
      case 'dragon': return 12;
      default: return 1;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      {/* Feedback Alert Pill */}
      {feedbackMsg && (
        <div className="p-3 rounded-2xl bg-violet-600/20 border border-violet-500/40 text-violet-200 text-xs font-bold text-center">
          {feedbackMsg}
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('habitat')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'habitat' ? 'tab-active' : 'tab-inactive'
            }`}
          >
            Habitat & Feeding
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'roster' ? 'tab-active' : 'tab-inactive'
            }`}
          >
            Pet Roster & Unlocks
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ledger' ? 'tab-active' : 'tab-inactive'
            }`}
          >
            Reward History & Ledger
          </button>
        </div>

        {/* Backup & Restore Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 bg-[#162032] border border-[rgba(255,255,255,0.12)] rounded-xl hover:text-white"
            title="Download JSON backup"
          >
            <Download className="w-3.5 h-3.5" />
            Backup
          </button>
          <label className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 bg-[#162032] border border-[rgba(255,255,255,0.12)] rounded-xl hover:text-white cursor-pointer inline-flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            Restore
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* TAB 1: HABITAT & FEEDING */}
      {activeTab === 'habitat' && (
        <div className="space-y-6">
          {/* Pet Habitat Card */}
          <div className="study-card p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
            {/* Left: Pet Interactive Center */}
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-2">
                Click your pet to pat & play!
              </span>
              <div className="p-4 rounded-3xl bg-[#162032] border border-[rgba(255,255,255,0.12)] shadow-inner">
                <PetSprite species={activePet.species} mood="happy" size={170} interactive={true} />
              </div>
              <h3 className="text-xl font-black text-white mt-3">{activePet.name}</h3>
              <span className="text-xs text-slate-400">
                {activePet.species === 'fox' && 'Star Explorer Companion'}
                {activePet.species === 'shiba' && 'Faithful Cheerful Guardian'}
                {activePet.species === 'cat' && 'Mystic Celestial Feline'}
                {activePet.species === 'dragon' && 'Cosmic Astral Dragon'}
                {activePet.species === 'owl' && 'Sage of Focus & Wisdom'}
              </span>
            </div>

            {/* Right: Stats & Level Progression */}
            <div className="flex-1 w-full max-w-md space-y-4">
              {/* Level Pill */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#162032] border border-[rgba(255,255,255,0.12)]">
                <div>
                  <span className="text-xs font-bold text-slate-400 block">Current Stage</span>
                  <span className="text-2xl font-black text-white">Level {activePet.level}</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black text-lg">
                  ★
                </div>
              </div>

              {/* XP Progress Bar */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    Level XP
                  </span>
                  <span className="text-violet-300 font-mono font-bold">
                    {activePet.current_xp} / {activePet.xp_to_next_level} XP
                  </span>
                </div>
                <div className="w-full h-3.5 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700/50">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((activePet.current_xp / activePet.xp_to_next_level) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Happiness & Hunger Stats */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-[#162032] border border-[rgba(255,255,255,0.12)]">
                  <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold mb-1">
                    <Heart className="w-3.5 h-3.5 fill-current" /> Happiness
                  </div>
                  <span className="text-lg font-black text-white">{activePet.happiness} / 100</span>
                </div>

                <div className="p-3 rounded-xl bg-[#162032] border border-[rgba(255,255,255,0.12)]">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold mb-1">
                    <Smile className="w-3.5 h-3.5" /> Fullness
                  </div>
                  <span className="text-lg font-black text-white">{100 - activePet.hunger} / 100</span>
                </div>
              </div>

              {/* No-punishment reminder banner */}
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  No punishments: Your pet never starves, loses levels, or dies if you take a break.
                </span>
              </div>
            </div>
          </div>

          {/* Food Inventory & Feeding Pantry */}
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2 mb-3">
              <Utensils className="w-4 h-4 text-amber-400" />
              Pet Pantry & Feeding (Earned from completing study tasks)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="study-card p-4 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl">
                      {item.id === 'food_berry' && '🍓'}
                      {item.id === 'food_fish' && '🐟'}
                      {item.id === 'food_bento' && '🍱'}
                    </span>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[#182236] text-slate-200 border border-[rgba(255,255,255,0.12)]">
                      Qty: {item.quantity}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">{item.item_name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      +{item.xp_value} XP • +{item.happiness_value} Happiness
                    </p>
                  </div>

                  <button
                    disabled={item.quantity <= 0}
                    onClick={() => handleFeed(item)}
                    className="glass-button glass-button-primary mt-4 w-full py-2 text-xs font-bold disabled:opacity-40"
                  >
                    Feed to {activePet.name.split(' ')[0]}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PET ROSTER & UNLOCKS */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-white">Pet Roster</h3>
              <p className="text-xs text-slate-400">
                Level up by studying to unlock and switch between companions
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pets.map((p) => {
              const reqLevel = getRequiredLevel(p.species);
              const isUnlocked = activePet.level >= reqLevel;
              const isActive = activePet.id === p.id;

              return (
                <div
                  key={p.id}
                  className={`study-card p-5 text-center flex flex-col items-center justify-between transition-all ${
                    isActive
                      ? 'border-violet-500 bg-violet-950/30 shadow-lg shadow-violet-500/20'
                      : !isUnlocked
                      ? 'opacity-40 bg-[#0d121e]'
                      : 'hover:border-slate-500'
                  }`}
                >
                  <div className="flex justify-between w-full items-center mb-2">
                    <span className="text-xs font-bold text-slate-400">
                      Req: Lv. {reqLevel}
                    </span>
                    {isActive ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-violet-600 text-white">
                        ACTIVE
                      </span>
                    ) : isUnlocked ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        UNLOCKED
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#182236] text-slate-400 flex items-center gap-1 border border-[rgba(255,255,255,0.1)]">
                        <Lock className="w-2.5 h-2.5" /> Locked
                      </span>
                    )}
                  </div>

                  <div className="py-2">
                    <PetSprite species={p.species} size={100} mood={isUnlocked ? 'happy' : 'idle'} />
                  </div>

                  <h4 className="text-sm font-extrabold text-white mt-1">{p.name}</h4>

                  <button
                    disabled={!isUnlocked || isActive}
                    onClick={() => onSelectPet(p.id)}
                    className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-violet-600/30 text-violet-300 cursor-default border border-violet-500/40'
                        : isUnlocked
                        ? 'glass-button glass-button-primary'
                        : 'bg-[#182236] text-slate-500 cursor-not-allowed border border-[rgba(255,255,255,0.06)]'
                    }`}
                  >
                    {isActive ? 'Current Companion' : isUnlocked ? 'Select Companion' : `Unlocks at Level ${reqLevel}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: REWARD HISTORY & ANTI-CHEAT LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-violet-400" />
                Anti-Cheat Reward Ledger
              </h3>
              <p className="text-xs text-slate-400">
                Cryptographically tracked rewards ensuring XP is granted strictly once per task
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#182236] text-slate-300 border border-[rgba(255,255,255,0.1)]">
              {ledger.length} Claims Recorded
            </span>
          </div>

          {ledger.length === 0 ? (
            <div className="study-card p-8 text-center text-xs text-slate-400">
              No rewards claimed yet. Complete tasks or daily goals to record rewards.
            </div>
          ) : (
            <div className="study-card overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#101726] border-b border-[rgba(255,255,255,0.1)] text-slate-300 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Claim Time</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">XP Awarded</th>
                    <th className="py-3 px-4">Food Awarded</th>
                    <th className="py-3 px-4">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.08)]">
                  {ledger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#162032]">
                      <td className="py-3 px-4 text-slate-300">
                        {new Date(entry.claimed_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        • {new Date(entry.claimed_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white capitalize">
                        {entry.source_type === 'task_completion' ? 'Task Completed' : 'Daily Goal Bonus'}
                      </td>
                      <td className="py-3 px-4 font-bold text-amber-400">+{entry.xp_amount} XP</td>
                      <td className="py-3 px-4 font-bold text-emerald-400">+{entry.food_amount} Food</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                          <CheckCircle className="w-3 h-3" /> Idempotent
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
