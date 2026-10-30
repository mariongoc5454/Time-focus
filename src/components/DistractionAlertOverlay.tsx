import React from 'react';
import { AlertTriangle, BookOpen, Clock, PauseCircle } from 'lucide-react';

interface DistractionAlertOverlayProps {
  domain: string;
  isOpen: boolean;
  onBackToStudy: () => void;
  onIgnoreThisTime: () => void;
  onPauseSession: () => void;
}

export const DistractionAlertOverlay: React.FC<DistractionAlertOverlayProps> = ({
  domain,
  isOpen,
  onBackToStudy,
  onIgnoreThisTime,
  onPauseSession,
}) => {
  if (!isOpen) return null;

  // Capitalize or clean domain display name
  const formattedDomain = domain.replace(/^www\./i, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#121826] border border-amber-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Amber accent top line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-400">
            <AlertTriangle className="w-6 h-6 animate-bounce" />
          </div>

          <div className="flex-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
              Phát Hiện Website Xao Nhãng
            </span>
            <h3 className="text-lg font-extrabold text-white leading-snug">
              Bạn đang ở trên <span className="text-amber-300 font-mono underline">{formattedDomain}</span>.
            </h3>
            <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
              Bạn có muốn quay lại nhiệm vụ học tập không?
            </p>
          </div>
        </div>

        {/* 3 Action Buttons */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={onBackToStudy}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-600/30"
          >
            <BookOpen className="w-4 h-4" />
            Quay lại học
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onIgnoreThisTime}
              className="py-2 px-3 rounded-xl text-xs font-semibold bg-[#1a2337] hover:bg-[#232f48] text-slate-300 border border-[rgba(255,255,255,0.1)] flex items-center justify-center gap-1.5 transition-all"
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Bỏ qua lần này
            </button>

            <button
              onClick={onPauseSession}
              className="py-2 px-3 rounded-xl text-xs font-semibold bg-[#2a1d12] hover:bg-[#382718] text-amber-300 border border-amber-500/40 flex items-center justify-center gap-1.5 transition-all"
            >
              <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
              Tạm dừng phiên học
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-300 mt-4 text-center">
          💡 Chọn &quot;Bỏ qua lần này&quot; sẽ tạm ngừng nhắc nhở trang này trong 15 phút.
        </p>
      </div>
    </div>
  );
};
