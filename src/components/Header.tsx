import React from 'react';
import { EventStatus } from '../types';

interface HeaderProps {
  status: EventStatus;
  onOpenEditWinners: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  onOpenEditWinners,
}) => {
  return (
    <header className="w-full border-b border-[#352746] bg-[#120D20]/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Wordmark */}
        <div className="flex items-center gap-3">
          <span className="font-heading font-bold text-lg sm:text-xl tracking-tight text-[#F7F4FC]">
            IDEAFORGE <span className="text-[#8B5CF6]">'26</span>
          </span>
        </div>

        {/* Right: Understated status indicator & organizer edit */}
        <div className="flex items-center gap-5 text-xs font-mono">
          <button
            onClick={onOpenEditWinners}
            className="hidden sm:inline-block text-[#AAA2B8] hover:text-[#F7F4FC] transition-colors cursor-pointer uppercase tracking-wider underline underline-offset-4 decoration-[#352746]"
          >
            Configure Winners
          </button>

          <div className="flex items-center gap-2 text-[11px] tracking-wider uppercase font-mono">
            {status === 'LIVE' && (
              <span className="flex items-center gap-2 text-[#C4B5FD]">
                <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
                <span className="font-semibold text-[#8B5CF6]">LIVE</span>
              </span>
            )}
            {status === 'PAUSED' && (
              <span className="flex items-center gap-2 text-[#F59E0B]">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <span className="font-semibold text-[#F59E0B]">PAUSED</span>
              </span>
            )}
            {status === 'NOT STARTED' && (
              <span className="flex items-center gap-2 text-[#AAA2B8]">
                <span className="w-2 h-2 rounded-full bg-[#AAA2B8]" />
                <span>NOT STARTED</span>
              </span>
            )}
            {status === 'COMPLETED' && (
              <span className="flex items-center gap-2 text-[#D4AF37]">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                <span className="font-semibold text-[#D4AF37]">COMPLETED</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
