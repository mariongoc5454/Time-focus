import React, { useState } from 'react';

interface PetSpriteProps {
  species: 'shiba' | 'cat' | 'fox' | 'dragon' | 'owl';
  mood?: 'idle' | 'happy' | 'focusing' | 'eating';
  size?: number;
  interactive?: boolean;
  onPet?: () => void;
}

export const PetSprite: React.FC<PetSpriteProps> = ({
  species,
  mood = 'idle',
  size = 140,
  interactive = false,
  onPet,
}) => {
  const [isWiggling, setIsWiggling] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleClick = (e: React.MouseEvent) => {
    if (!interactive) return;
    setIsWiggling(true);
    setTimeout(() => setIsWiggling(false), 600);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newHeart = { id: Date.now() + Math.random(), x, y };
    setHearts((prev) => [...prev, newHeart]);

    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1000);

    onPet?.();
  };

  const renderPetSvg = () => {
    switch (species) {
      case 'fox':
        return (
          <g>
            {/* Fox Tail */}
            <path
              d="M 100 115 C 130 110, 140 70, 115 50 C 105 40, 95 65, 100 85 Z"
              fill="#f97316"
            />
            <path
              d="M 125 55 C 130 65, 120 75, 115 50 Z"
              fill="#ffffff"
            />
            {/* Body */}
            <ellipse cx="70" cy="100" rx="36" ry="32" fill="#ea580c" />
            <ellipse cx="70" cy="106" rx="22" ry="22" fill="#ffedd5" />
            {/* Head */}
            <circle cx="70" cy="62" r="30" fill="#f97316" />
            {/* Ears */}
            <polygon points="46,45 35,16 60,35" fill="#ea580c" />
            <polygon points="48,42 40,24 58,35" fill="#fee2e2" />
            <polygon points="94,45 105,16 80,35" fill="#ea580c" />
            <polygon points="92,42 100,24 82,35" fill="#fee2e2" />
            {/* Cheeks & White Fur */}
            <path d="M 45 70 C 45 80, 58 86, 70 86 C 82 86, 95 80, 95 70 C 85 75, 55 75, 45 70 Z" fill="#ffffff" />
            {/* Eyes */}
            {mood === 'happy' || mood === 'eating' ? (
              <>
                <path d="M 54 58 Q 60 52 66 58" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M 74 58 Q 80 52 86 58" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
              </>
            ) : mood === 'focusing' ? (
              <>
                <circle cx="60" cy="58" r="3" fill="#1e293b" />
                <circle cx="80" cy="58" r="3" fill="#1e293b" />
                {/* Tiny focus glasses */}
                <circle cx="60" cy="58" r="8" stroke="#8b5cf6" strokeWidth="2" fill="none" />
                <circle cx="80" cy="58" r="8" stroke="#8b5cf6" strokeWidth="2" fill="none" />
                <line x1="68" y1="58" x2="72" y2="58" stroke="#8b5cf6" strokeWidth="2" />
              </>
            ) : (
              <>
                <circle cx="60" cy="58" r="4" fill="#1e293b" />
                <circle cx="62" cy="56" r="1.5" fill="#ffffff" />
                <circle cx="80" cy="58" r="4" fill="#1e293b" />
                <circle cx="82" cy="56" r="1.5" fill="#ffffff" />
              </>
            )}
            {/* Nose & Mouth */}
            <polygon points="68,66 72,66 70,69" fill="#1e293b" />
            <path d="M 68 70 Q 70 72 72 70" stroke="#1e293b" strokeWidth="1.5" fill="none" />
            {/* Star aura on forehead */}
            <polygon points="70,42 72,46 76,47 73,50 74,54 70,52 66,54 67,50 64,47 68,46" fill="#fde047" opacity="0.9" />
          </g>
        );

      case 'shiba':
        return (
          <g>
            {/* Shiba Curly Tail */}
            <path d="M 100 100 C 120 90, 125 70, 110 65 C 95 60, 95 80, 102 95 Z" fill="#d97706" />
            {/* Body */}
            <ellipse cx="70" cy="98" rx="36" ry="30" fill="#f59e0b" />
            <ellipse cx="70" cy="105" rx="22" ry="20" fill="#fef3c7" />
            {/* Red Bandana */}
            <path d="M 52 76 Q 70 92 88 76 L 70 96 Z" fill="#ef4444" />
            {/* Head */}
            <circle cx="70" cy="58" r="28" fill="#f59e0b" />
            {/* Ears */}
            <polygon points="48,42 42,20 62,32" fill="#d97706" />
            <polygon points="50,38 46,24 60,32" fill="#fef3c7" />
            <polygon points="92,42 98,20 78,32" fill="#d97706" />
            <polygon points="90,38 94,24 80,32" fill="#fef3c7" />
            {/* White muzzle & eyebrows */}
            <ellipse cx="70" cy="66" rx="14" ry="10" fill="#fef3c7" />
            <ellipse cx="58" cy="48" rx="3" ry="2" fill="#ffffff" />
            <ellipse cx="82" cy="48" rx="3" ry="2" fill="#ffffff" />
            {/* Eyes */}
            {mood === 'happy' ? (
              <>
                <path d="M 56 56 Q 61 50 66 56" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M 74 56 Q 79 50 84 56" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <circle cx="61" cy="56" r="3.5" fill="#1e293b" />
                <circle cx="62" cy="54" r="1.2" fill="#ffffff" />
                <circle cx="79" cy="56" r="3.5" fill="#1e293b" />
                <circle cx="80" cy="54" r="1.2" fill="#ffffff" />
              </>
            )}
            {/* Nose */}
            <ellipse cx="70" cy="64" rx="3" ry="2" fill="#1e293b" />
          </g>
        );

      case 'cat':
        return (
          <g>
            {/* Moon Cat Tail */}
            <path d="M 98 105 C 130 115, 135 60, 110 55" stroke="#6366f1" strokeWidth="8" strokeLinecap="round" fill="none" />
            {/* Body */}
            <ellipse cx="70" cy="98" rx="34" ry="30" fill="#4338ca" />
            <ellipse cx="70" cy="104" rx="20" ry="20" fill="#6366f1" opacity="0.6" />
            {/* Head */}
            <circle cx="70" cy="58" r="28" fill="#4f46e5" />
            {/* Cat Ears */}
            <polygon points="46,42 38,18 60,32" fill="#4338ca" />
            <polygon points="48,38 42,24 58,32" fill="#ec4899" />
            <polygon points="94,42 102,18 80,32" fill="#4338ca" />
            <polygon points="92,38 98,24 82,32" fill="#ec4899" />
            {/* Crescent Moon on Forehead */}
            <path d="M 67 38 A 6 6 0 0 0 73 48 A 8 8 0 0 1 67 38 Z" fill="#fde047" />
            {/* Whiskers */}
            <line x1="42" y1="64" x2="28" y2="62" stroke="#cbd5e1" strokeWidth="1.5" />
            <line x1="42" y1="68" x2="26" y2="72" stroke="#cbd5e1" strokeWidth="1.5" />
            <line x1="98" y1="64" x2="112" y2="62" stroke="#cbd5e1" strokeWidth="1.5" />
            <line x1="98" y1="68" x2="114" y2="72" stroke="#cbd5e1" strokeWidth="1.5" />
            {/* Eyes (Glowing Amber) */}
            <circle cx="58" cy="58" r="4.5" fill="#f59e0b" />
            <ellipse cx="58" cy="58" rx="1.5" ry="4.5" fill="#0f172a" />
            <circle cx="82" cy="58" r="4.5" fill="#f59e0b" />
            <ellipse cx="82" cy="58" rx="1.5" ry="4.5" fill="#0f172a" />
            {/* Nose */}
            <polygon points="68,66 72,66 70,68" fill="#ec4899" />
          </g>
        );

      case 'dragon':
        return (
          <g>
            {/* Wings */}
            <path d="M 40 85 Q 15 50 35 35 Q 45 60 50 80 Z" fill="#06b6d4" opacity="0.8" />
            <path d="M 100 85 Q 125 50 105 35 Q 95 60 90 80 Z" fill="#06b6d4" opacity="0.8" />
            {/* Body */}
            <ellipse cx="70" cy="98" rx="36" ry="32" fill="#0891b2" />
            <ellipse cx="70" cy="106" rx="22" ry="20" fill="#a5f3fc" />
            {/* Tail */}
            <path d="M 98 112 Q 130 120 135 95" stroke="#0891b2" strokeWidth="10" strokeLinecap="round" fill="none" />
            <polygon points="135,90 145,95 135,102" fill="#22d3ee" />
            {/* Head */}
            <circle cx="70" cy="58" r="28" fill="#06b6d4" />
            {/* Tiny Horns */}
            <polygon points="50,38 42,16 56,28" fill="#f59e0b" />
            <polygon points="90,38 98,16 84,28" fill="#f59e0b" />
            {/* Eyes */}
            <circle cx="58" cy="56" r="4" fill="#a855f7" />
            <circle cx="60" cy="54" r="1.5" fill="#ffffff" />
            <circle cx="82" cy="56" r="4" fill="#a855f7" />
            <circle cx="84" cy="54" r="1.5" fill="#ffffff" />
            {/* Sparkles */}
            <circle cx="70" cy="72" r="2" fill="#fde047" />
          </g>
        );

      case 'owl':
        return (
          <g>
            {/* Owl Body */}
            <ellipse cx="70" cy="85" rx="38" ry="42" fill="#78350f" />
            <ellipse cx="70" cy="92" rx="26" ry="30" fill="#fef3c7" />
            {/* Wings */}
            <ellipse cx="34" cy="85" rx="10" ry="24" fill="#92400e" transform="rotate(10 34 85)" />
            <ellipse cx="106" cy="85" rx="10" ry="24" fill="#92400e" transform="rotate(-10 106 85)" />
            {/* Feather Tuft Ears */}
            <polygon points="44,48 35,26 55,42" fill="#92400e" />
            <polygon points="96,48 105,26 85,42" fill="#92400e" />
            {/* Big Scholar Eyes */}
            <circle cx="54" cy="62" r="14" fill="#fef3c7" stroke="#b45309" strokeWidth="2" />
            <circle cx="54" cy="62" r="7" fill="#1e293b" />
            <circle cx="56" cy="60" r="2.5" fill="#ffffff" />
            <circle cx="86" cy="62" r="14" fill="#fef3c7" stroke="#b45309" strokeWidth="2" />
            <circle cx="86" cy="62" r="7" fill="#1e293b" />
            <circle cx="88" cy="60" r="2.5" fill="#ffffff" />
            {/* Scholar Glasses */}
            <circle cx="54" cy="62" r="15" stroke="#f59e0b" strokeWidth="2.5" fill="none" />
            <circle cx="86" cy="62" r="15" stroke="#f59e0b" strokeWidth="2.5" fill="none" />
            <line x1="69" y1="62" x2="71" y2="62" stroke="#f59e0b" strokeWidth="3" />
            {/* Beak */}
            <polygon points="67,74 73,74 70,82" fill="#f59e0b" />
          </g>
        );
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center select-none ${
        interactive ? 'cursor-pointer' : ''
      } ${isWiggling ? 'animate-pet-wiggle' : 'animate-pet-float'}`}
      style={{ width: size, height: size }}
      title={interactive ? 'Click to pat your pet!' : ''}
    >
      <svg
        viewBox="0 0 140 140"
        width={size}
        height={size}
        className="drop-shadow-lg"
      >
        {renderPetSvg()}
      </svg>

      {/* Floating Hearts Animation */}
      {hearts.map((h) => (
        <span
          key={h.id}
          className="absolute text-rose-500 font-bold pointer-events-none transition-all duration-1000 ease-out"
          style={{
            left: `${h.x}px`,
            top: `${h.y - 20}px`,
            fontSize: '20px',
            animation: 'petFloat 1s ease-out forwards',
          }}
        >
          💖
        </span>
      ))}
    </div>
  );
};
