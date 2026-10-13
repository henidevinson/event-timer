import React from 'react';
import { WinnersData } from '../types';

interface FinalMomentSectionProps {
  winners: WinnersData;
  onUpdateWinners: (winners: WinnersData) => void;
  onAnnounceWinners: () => void;
}

export const FinalMomentSection: React.FC<FinalMomentSectionProps> = ({
  winners,
  onUpdateWinners,
  onAnnounceWinners,
}) => {
  const [showConfig, setShowConfig] = React.useState(false);

  const handleFieldChange = (field: keyof WinnersData, value: string) => {
    onUpdateWinners({
      ...winners,
      [field]: value,
    });
  };

  return (
    <section className="py-16 sm:py-24 max-w-4xl mx-auto">
      <div className="bg-[#1B1230] border border-[#352746] p-8 sm:p-14 text-center">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#AAA2B8] block mb-3">
          Final Stage
        </span>
        <h2 className="text-3xl sm:text-5xl font-heading font-bold text-[#F7F4FC] uppercase tracking-tight mb-3">
          THE FINAL MOMENT
        </h2>
        <p className="text-sm text-[#AAA2B8] max-w-md mx-auto mb-8 font-normal">
          The ideas have been presented. The results are in.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onAnnounceWinners}
            className="px-8 py-3.5 bg-[#D4AF37] text-[#120D20] hover:bg-[#F2D675] font-mono text-xs uppercase tracking-[0.15em] font-semibold transition-colors cursor-pointer"
          >
            REVEAL THE WINNERS
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-6 py-3.5 border border-[#352746] text-[#AAA2B8] hover:text-[#F7F4FC] hover:border-[#8B5CF6] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            {showConfig ? 'Hide Team Settings' : 'Edit Winning Teams'}
          </button>
        </div>

        {/* Inline winner names editor */}
        {showConfig && (
          <div className="mt-8 pt-8 border-t border-[#352746] text-left max-w-lg mx-auto space-y-4 animate-fade-in font-mono text-xs">
            <span className="text-[#C4B5FD] uppercase tracking-wider text-[11px] block">
              Configure Winner Names
            </span>

            <div>
              <label className="text-[10px] text-[#D4AF37] uppercase tracking-wider block mb-1">
                1st Place Team (Gold)
              </label>
              <input
                type="text"
                value={winners.firstPlace}
                onChange={(e) => handleFieldChange('firstPlace', e.target.value)}
                className="w-full px-3 py-2 bg-[#120D20] border border-[#352746] text-[#F7F4FC] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#C7CBD1] uppercase tracking-wider block mb-1">
                2nd Place Team (Silver)
              </label>
              <input
                type="text"
                value={winners.secondPlace}
                onChange={(e) => handleFieldChange('secondPlace', e.target.value)}
                className="w-full px-3 py-2 bg-[#120D20] border border-[#352746] text-[#F7F4FC] focus:outline-none focus:border-[#C7CBD1]"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#BF8958] uppercase tracking-wider block mb-1">
                3rd Place Team (Bronze / Metallic)
              </label>
              <input
                type="text"
                value={winners.thirdPlace}
                onChange={(e) => handleFieldChange('thirdPlace', e.target.value)}
                className="w-full px-3 py-2 bg-[#120D20] border border-[#352746] text-[#F7F4FC] focus:outline-none focus:border-[#BF8958]"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
