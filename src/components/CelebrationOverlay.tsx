import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, X } from 'lucide-react';
import { PetSprite } from './PetSprite';
import { VirtualPet } from '../types';

interface CelebrationOverlayProps {
  title: string;
  subtitle: string;
  xpAwarded?: number;
  foodAwarded?: number;
  isLevelUp?: boolean;
  newLevel?: number;
  pet?: VirtualPet;
  onClose: () => void;
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  title,
  subtitle,
  xpAwarded,
  foodAwarded,
  isLevelUp,
  newLevel,
  pet,
  onClose,
}) => {
  useEffect(() => {
    confetti({
      particleCount: isLevelUp ? 100 : 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'],
    });
  }, [isLevelUp]);

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-sm text-center border-violet-500/50 shadow-2xl">
        <button
          onClick={onClose}
          className="modal-close-btn absolute top-4 right-4"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-violet-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            {isLevelUp ? (
              <Trophy className="w-6 h-6 text-white" />
            ) : (
              <Sparkles className="w-6 h-6 text-white" />
            )}
          </div>
        </div>

        <h3 className="text-xl font-black text-white tracking-tight">{title}</h3>
        <p className="text-xs text-slate-300 mt-1">{subtitle}</p>

        {pet && (
          <div className="my-4 flex justify-center">
            <PetSprite species={pet.species} mood="happy" size={110} />
          </div>
        )}

        {/* Reward pills */}
        <div className="flex items-center justify-center gap-3 my-4">
          {xpAwarded !== undefined && xpAwarded > 0 && (
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs">
              +{xpAwarded} XP
            </div>
          )}
          {foodAwarded !== undefined && foodAwarded > 0 && (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
              +{foodAwarded} Food
            </div>
          )}
          {isLevelUp && newLevel && (
            <div className="px-3.5 py-1.5 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-300 font-bold text-xs">
              Reached Level {newLevel}!
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          type="button"
          className="glass-button glass-button-primary w-full py-2.5 rounded-xl font-bold text-xs mt-2"
        >
          Awesome! Continue
        </button>
      </div>
    </div>
  );
};
