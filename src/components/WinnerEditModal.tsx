import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { WinnersData } from '../types';

interface WinnerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  winners: WinnersData;
  onSave: (winners: WinnersData) => void;
}

export const WinnerEditModal: React.FC<WinnerEditModalProps> = ({
  isOpen,
  onClose,
  winners,
  onSave,
}) => {
  const [formData, setFormData] = useState<WinnersData>(winners);

  useEffect(() => {
    setFormData(winners);
  }, [winners, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="winners-modal-title"
        className="w-full max-w-lg bg-[#1B1230] border border-[#352746] p-6 sm:p-8 shadow-2xl relative"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#352746]">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#C4B5FD] block">
              Organizer Settings
            </span>
            <h3 id="winners-modal-title" className="text-base font-heading font-semibold text-[#F7F4FC] uppercase tracking-wide mt-0.5">
              Configure Winning Teams
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#AAA2B8] hover:text-[#F7F4FC] p-1 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
          {/* 1st Place (Gold) */}
          <div className="p-4 bg-[#120D20] border border-[#352746]">
            <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider block mb-1">
              First Place Team (Gold)
            </span>
            <input
              type="text"
              value={formData.firstPlace}
              onChange={(e) => setFormData({ ...formData, firstPlace: e.target.value })}
              placeholder="Enter First Place Team Name"
              className="w-full px-3 py-2 bg-[#1B1230] border border-[#352746] text-[#F7F4FC] placeholder-[#AAA2B8]/40 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {/* 2nd Place (Silver) */}
          <div className="p-4 bg-[#120D20] border border-[#352746]">
            <span className="text-[10px] font-bold text-[#C7CBD1] uppercase tracking-wider block mb-1">
              Second Place Team (Silver)
            </span>
            <input
              type="text"
              value={formData.secondPlace}
              onChange={(e) => setFormData({ ...formData, secondPlace: e.target.value })}
              placeholder="Enter Second Place Team Name"
              className="w-full px-3 py-2 bg-[#1B1230] border border-[#352746] text-[#F7F4FC] placeholder-[#AAA2B8]/40 focus:outline-none focus:border-[#C7CBD1]"
            />
          </div>

          {/* 3rd Place (Bronze / Muted Gold) */}
          <div className="p-4 bg-[#120D20] border border-[#352746]">
            <span className="text-[10px] font-bold text-[#BF8958] uppercase tracking-wider block mb-1">
              Third Place Team (Bronze / Metallic)
            </span>
            <input
              type="text"
              value={formData.thirdPlace}
              onChange={(e) => setFormData({ ...formData, thirdPlace: e.target.value })}
              placeholder="Enter Third Place Team Name"
              className="w-full px-3 py-2 bg-[#1B1230] border border-[#352746] text-[#F7F4FC] placeholder-[#AAA2B8]/40 focus:outline-none focus:border-[#BF8958]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#352746]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#352746] text-[#AAA2B8] hover:text-[#F7F4FC] uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#D4AF37] text-[#120D20] hover:bg-[#F2D675] uppercase tracking-wider font-semibold transition-colors cursor-pointer"
            >
              Save Winners
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
