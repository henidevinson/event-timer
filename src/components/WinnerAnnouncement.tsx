import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { WinnersData } from '../types';
import { 
  triggerThirdPlaceConfetti, 
  triggerSecondPlaceConfetti, 
  triggerFirstPlaceConfetti,
  clearConfetti 
} from '../utils/confetti';
import { soundManager } from '../utils/audio';

interface WinnerAnnouncementProps {
  winners: WinnersData;
  onUpdateWinners: (winners: WinnersData) => void;
  onClose: () => void;
}

type RevealStage = 
  | 'intro'
  | 'thirdCountdown'
  | 'thirdReveal'
  | 'secondCountdown'
  | 'secondReveal'
  | 'firstCountdown'
  | 'firstReveal'
  | 'podium';

export const WinnerAnnouncement: React.FC<WinnerAnnouncementProps> = ({
  winners,
  onUpdateWinners,
  onClose,
}) => {
  const hasConfiguredWinners = Boolean(
    (winners.firstPlace || '').trim() ||
    (winners.secondPlace || '').trim() ||
    (winners.thirdPlace || '').trim()
  );

  const [stage, setStage] = useState<RevealStage>('intro');
  const [countdownNumber, setCountdownNumber] = useState<number>(10);
  const [isEditingNames, setIsEditingNames] = useState<boolean>(!hasConfiguredWinners);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundManager.getMuted());

  const countdownIntervalRef = useRef<number | null>(null);
  const isCountingDownRef = useRef<boolean>(false);

  // Clean up all intervals and state
  const clearAllTimers = () => {
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    isCountingDownRef.current = false;
  };

  useEffect(() => {
    return () => {
      clearAllTimers();
      clearConfetti();
    };
  }, []);

  const handleToggleSound = () => {
    const newMuted = soundManager.toggleMute();
    setIsMuted(newMuted);
  };

  const handleClose = () => {
    clearAllTimers();
    clearConfetti();
    onClose();
  };

  // Generic 10 to 1 countdown runner
  const runCountdown = (targetCountdownStage: 'thirdCountdown' | 'secondCountdown' | 'firstCountdown') => {
    if (isCountingDownRef.current) return;
    clearAllTimers();

    isCountingDownRef.current = true;
    setStage(targetCountdownStage);
    setCountdownNumber(10);
    soundManager.playTick(10);

    let current = 10;
    countdownIntervalRef.current = window.setInterval(() => {
      current -= 1;
      if (current >= 1) {
        setCountdownNumber(current);
        soundManager.playTick(current);
      } else {
        // Countdown completed: clear timer and reveal corresponding winner
        clearAllTimers();
        if (targetCountdownStage === 'thirdCountdown') {
          setStage('thirdReveal');
          triggerThirdPlaceConfetti();
          soundManager.playRevealFanfare();
        } else if (targetCountdownStage === 'secondCountdown') {
          setStage('secondReveal');
          triggerSecondPlaceConfetti();
          soundManager.playRevealFanfare();
        } else if (targetCountdownStage === 'firstCountdown') {
          setStage('firstReveal');
          triggerFirstPlaceConfetti();
          soundManager.playRevealFanfare();
        }
      }
    }, 1000);
  };

  // STEP 1 -> STEP 2: Start third-place countdown
  const handleBeginReveal = () => {
    runCountdown('thirdCountdown');
  };

  // STEP 2 -> STEP 3: Start second-place countdown
  const handleStartSecondPlaceCountdown = () => {
    runCountdown('secondCountdown');
  };

  // STEP 3 -> STEP 4: Start first-place countdown
  const handleStartFirstPlaceCountdown = () => {
    runCountdown('firstCountdown');
  };

  // Restart announcement: returns to intro state without clearing saved winner names
  const handleRestartReveal = () => {
    clearAllTimers();
    clearConfetti();
    setStage('intro');
    setCountdownNumber(10);
  };

  const handleFieldChange = (field: keyof WinnersData, val: string) => {
    onUpdateWinners({
      ...winners,
      [field]: val,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#120D20] text-[#F7F4FC] flex flex-col justify-between overflow-y-auto selection:bg-[#8B5CF6] selection:text-white">
      {/* Top Bar Navigation */}
      <header className="p-6 sm:p-8 flex items-center justify-between border-b border-[#352746] relative z-20">
        <div className="flex items-center gap-3">
          <span className="font-heading font-semibold text-xs uppercase tracking-[0.2em] text-[#C4B5FD]">
            IDEAFORGE'26
          </span>
          <span className="text-[#352746]">·</span>
          <span className="text-xs font-mono uppercase tracking-widest text-[#AAA2B8]">
            WINNER CEREMONY
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Subtle audio mute toggle */}
          <button
            onClick={handleToggleSound}
            className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#AAA2B8] hover:text-[#F7F4FC] cursor-pointer transition-colors px-2 py-1 border border-[#352746] hover:border-[#8B5CF6]"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-[#AAA2B8]" />
                <span className="hidden sm:inline text-[10px]">SOUND OFF</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#C4B5FD]" />
                <span className="hidden sm:inline text-[10px] text-[#C4B5FD]">SOUND ON</span>
              </>
            )}
          </button>

          <button
            onClick={handleClose}
            className="text-xs font-mono uppercase tracking-wider text-[#AAA2B8] hover:text-[#F7F4FC] underline underline-offset-4 cursor-pointer transition-colors"
          >
            Exit Presentation
          </button>
        </div>
      </header>

      {/* Main Stage Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center my-auto max-w-4xl mx-auto w-full relative z-10">
        {/* ========================================================= */}
        {/* STEP 1: INTRODUCTION                                      */}
        {/* ========================================================= */}
        {stage === 'intro' && (
          <div className="space-y-8 animate-fade-in w-full">
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#C4B5FD] block mb-4">
                The Final Decision
              </span>
              <h2 className="text-4xl sm:text-7xl font-heading font-bold uppercase tracking-tight text-[#F7F4FC]">
                THE RESULTS ARE IN
              </h2>
              <p className="text-base sm:text-xl text-[#AAA2B8] mt-4 font-normal tracking-wide">
                Every idea brought us here.
              </p>
            </div>

            {/* Warning note if winners are not yet entered */}
            {!hasConfiguredWinners && (
              <div className="bg-[#1B1230] border border-[#D4AF37]/40 p-4 max-w-md mx-auto text-xs font-mono text-[#F2D675] text-center">
                <span className="font-semibold block mb-1">Winning Teams Pending</span>
                <span className="text-[#AAA2B8]">Enter team names below or sync from the Rubric Leaderboard before revealing.</span>
              </div>
            )}

            {/* Organizer settings / edit team names */}
            <div className="max-w-md mx-auto pt-2">
              <button
                type="button"
                onClick={() => setIsEditingNames(!isEditingNames)}
                className="text-xs font-mono text-[#AAA2B8] hover:text-[#C4B5FD] underline underline-offset-4 cursor-pointer mb-4"
              >
                {isEditingNames ? 'Hide Team Inputs' : 'Verify / Edit Winner Names'}
              </button>

              {isEditingNames && (
                <div className="bg-[#1B1230] border border-[#352746] p-6 text-left space-y-4 animate-fade-in font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-[#D4AF37] uppercase tracking-wider block mb-1">
                      First Place Team (Gold)
                    </span>
                    <input
                      type="text"
                      value={winners.firstPlace}
                      onChange={(e) => handleFieldChange('firstPlace', e.target.value)}
                      placeholder="Enter 1st Place Team"
                      className="w-full px-3 py-2 bg-[#120D20] border border-[#352746] text-[#F7F4FC] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#C7CBD1] uppercase tracking-wider block mb-1">
                      Second Place Team (Silver)
                    </span>
                    <input
                      type="text"
                      value={winners.secondPlace}
                      onChange={(e) => handleFieldChange('secondPlace', e.target.value)}
                      placeholder="Enter 2nd Place Team"
                      className="w-full px-3 py-2 bg-[#120D20] border border-[#352746] text-[#F7F4FC] focus:outline-none focus:border-[#C7CBD1]"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#BF8958] uppercase tracking-wider block mb-1">
                      Third Place Team (Bronze / Metallic)
                    </span>
                    <input
                      type="text"
                      value={winners.thirdPlace}
                      onChange={(e) => handleFieldChange('thirdPlace', e.target.value)}
                      placeholder="Enter 3rd Place Team"
                      className="w-full px-3 py-2 bg-[#120D20] border border-[#352746] text-[#F7F4FC] focus:outline-none focus:border-[#BF8958]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4">
              <button
                onClick={handleBeginReveal}
                className="px-10 py-4 bg-[#D4AF37] text-[#120D20] hover:bg-[#F2D675] font-mono text-sm uppercase tracking-[0.2em] font-semibold transition-colors cursor-pointer shadow-lg"
              >
                BEGIN REVEAL
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2A: THIRD-PLACE COUNTDOWN (10 TO 1)                  */}
        {/* ========================================================= */}
        {stage === 'thirdCountdown' && (
          <div className="flex flex-col items-center justify-center">
            <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.3em] text-[#BF8958] mb-6 block font-semibold">
              THIRD PLACE
            </span>

            {/* Large centered number with smooth fade & scale */}
            <div 
              key={`third-${countdownNumber}`}
              className="animate-subtle-countdown font-heading text-9xl sm:text-[16rem] md:text-[20rem] font-bold text-[#F7F4FC] tracking-tighter tabular-nums select-none leading-none my-4"
            >
              {countdownNumber}
            </div>

            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#AAA2B8] mt-6">
              Counting Down to Third Place
            </span>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2B: THIRD-PLACE WINNER REVEAL + CONFETTI             */}
        {/* ========================================================= */}
        {stage === 'thirdReveal' && (
          <div className="space-y-6 animate-winner-reveal w-full max-w-3xl">
            <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-[#BF8958] block font-semibold">
              THIRD PLACE
            </span>

            <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-heading font-bold text-[#F7F4FC] tracking-tight uppercase break-words leading-tight">
              <span className="text-[#E8BD95]">{winners.thirdPlace.trim() || 'Third Place Winner'}</span>
            </h2>

            <p className="text-sm sm:text-base text-[#AAA2B8] font-normal tracking-wide">
              Recognising an outstanding idea.
            </p>

            <div className="pt-12 sm:pt-16">
              <button
                onClick={handleStartSecondPlaceCountdown}
                className="px-8 py-3.5 border border-[#352746] hover:border-[#BF8958] text-[#F7F4FC] hover:bg-[#1B1230] font-mono text-xs uppercase tracking-[0.15em] font-semibold transition-colors cursor-pointer"
              >
                REVEAL SECOND PLACE
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3A: SECOND-PLACE COUNTDOWN (10 TO 1)                 */}
        {/* ========================================================= */}
        {stage === 'secondCountdown' && (
          <div className="flex flex-col items-center justify-center">
            <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.3em] text-[#C7CBD1] mb-6 block font-semibold">
              SECOND PLACE
            </span>

            <div 
              key={`second-${countdownNumber}`}
              className="animate-subtle-countdown font-heading text-9xl sm:text-[16rem] md:text-[20rem] font-bold text-[#F7F4FC] tracking-tighter tabular-nums select-none leading-none my-4"
            >
              {countdownNumber}
            </div>

            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#AAA2B8] mt-6">
              Counting Down to Second Place
            </span>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3B: SECOND-PLACE WINNER REVEAL + CONFETTI            */}
        {/* ========================================================= */}
        {stage === 'secondReveal' && (
          <div className="space-y-6 animate-winner-reveal w-full max-w-3xl">
            <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-[#C7CBD1] block font-semibold">
              SECOND PLACE
            </span>

            <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-heading font-bold text-[#F7F4FC] tracking-tight uppercase break-words leading-tight">
              <span className="text-[#E2E8F0]">{winners.secondPlace.trim() || 'Second Place Winner'}</span>
            </h2>

            <p className="text-sm sm:text-base text-[#AAA2B8] font-normal tracking-wide">
              An idea that stood out.
            </p>

            <div className="pt-12 sm:pt-16">
              <button
                onClick={handleStartFirstPlaceCountdown}
                className="px-8 py-3.5 bg-[#D4AF37] text-[#120D20] hover:bg-[#F2D675] font-mono text-xs uppercase tracking-[0.15em] font-semibold transition-colors cursor-pointer"
              >
                REVEAL THE WINNER
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 4A: FIRST-PLACE COUNTDOWN (10 TO 1)                  */}
        {/* ========================================================= */}
        {stage === 'firstCountdown' && (
          <div className="flex flex-col items-center justify-center">
            <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.3em] text-[#D4AF37] mb-6 block font-semibold">
              FIRST PLACE
            </span>

            <div 
              key={`first-${countdownNumber}`}
              className="animate-subtle-countdown font-heading text-9xl sm:text-[16rem] md:text-[20rem] font-bold text-[#F7F4FC] tracking-tighter tabular-nums select-none leading-none my-4"
            >
              {countdownNumber}
            </div>

            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#AAA2B8] mt-6">
              Counting Down to the Grand Champion
            </span>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 4B: FIRST-PLACE WINNER REVEAL + GRAND CELEBRATION    */}
        {/* ========================================================= */}
        {stage === 'firstReveal' && (
          <div className="w-full max-w-4xl space-y-8 animate-winner-reveal">
            <div>
              <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.3em] text-[#C4B5FD] block mb-2 font-medium">
                AND THE WINNER IS
              </span>
              <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-[#D4AF37] block font-semibold">
                FIRST PLACE
              </span>
            </div>

            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-heading font-bold text-[#F7F4FC] tracking-tight uppercase break-words leading-none">
              <span className="text-[#F2D675]">{winners.firstPlace.trim() || 'Grand Champion'}</span>
            </h1>

            <p className="text-sm sm:text-lg text-[#AAA2B8] font-normal tracking-wide pt-2">
              Grand Champion of IdeaForge'26.
            </p>

            <div className="pt-12 sm:pt-16 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={handleClose}
                className="px-8 py-3.5 bg-[#D4AF37] text-[#120D20] hover:bg-[#F2D675] font-mono text-xs uppercase tracking-[0.15em] font-semibold transition-colors cursor-pointer"
              >
                BACK TO EVENT
              </button>

              <button
                onClick={handleRestartReveal}
                className="px-6 py-3.5 border border-[#352746] text-[#AAA2B8] hover:text-[#F7F4FC] hover:border-[#8B5CF6] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                RESTART REVEAL
              </button>

              <button
                onClick={() => setStage('podium')}
                className="px-6 py-3.5 border border-[#352746] text-[#C4B5FD] hover:text-[#F7F4FC] hover:border-[#8B5CF6] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                VIEW COMPLETE PODIUM
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 5: FULL PODIUM RECAP SCREEN                          */}
        {/* ========================================================= */}
        {stage === 'podium' && (
          <div className="w-full max-w-5xl space-y-12 animate-winner-reveal">
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#C4B5FD] block mb-2">
                Official Results
              </span>
              <h2 className="text-3xl sm:text-6xl font-heading font-bold text-[#F7F4FC] uppercase tracking-tight">
                THE FINAL PODIUM
              </h2>
            </div>

            {/* Three-tier podium: 3rd Left, 1st Center Elevated, 2nd Right */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
              {/* 3rd Place - Left */}
              <div className="bg-[#1B1230] border border-[#352746] p-6 text-center order-2 md:order-1 flex flex-col justify-between min-h-[220px]">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#BF8958] font-bold block mb-2">
                    3RD PLACE
                  </span>
                  <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#E8BD95] uppercase break-words">
                    {winners.thirdPlace.trim() || 'Third Place Pending'}
                  </h3>
                </div>
                <div className="mt-6 pt-4 border-t border-[#352746] text-[10px] font-mono uppercase tracking-wider text-[#AAA2B8]">
                  Bronze Distinction
                </div>
              </div>

              {/* 1st Place - Center Elevated */}
              <div className="bg-[#1B1230] border-2 border-[#D4AF37] p-8 text-center order-1 md:order-2 flex flex-col justify-between min-h-[280px] shadow-2xl relative">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-[#120D20] text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-0.5">
                  CHAMPION
                </div>
                <div>
                  <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#D4AF37] font-bold block mb-3">
                    1ST PLACE
                  </span>
                  <h3 className="text-2xl sm:text-4xl font-heading font-bold text-[#F2D675] uppercase break-words leading-tight">
                    {winners.firstPlace.trim() || 'First Place Pending'}
                  </h3>
                </div>
                <div className="mt-8 pt-4 border-t border-[#352746] text-xs font-mono uppercase tracking-widest text-[#F2D675] font-semibold">
                  Grand Winner
                </div>
              </div>

              {/* 2nd Place - Right */}
              <div className="bg-[#1B1230] border border-[#352746] p-6 text-center order-3 md:order-3 flex flex-col justify-between min-h-[240px]">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#C7CBD1] font-bold block mb-2">
                    2ND PLACE
                  </span>
                  <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#E2E8F0] uppercase break-words">
                    {winners.secondPlace.trim() || 'Second Place Pending'}
                  </h3>
                </div>
                <div className="mt-6 pt-4 border-t border-[#352746] text-[10px] font-mono uppercase tracking-wider text-[#AAA2B8]">
                  Silver Honor
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={handleClose}
                className="px-8 py-3.5 bg-[#D4AF37] text-[#120D20] hover:bg-[#F2D675] font-mono text-xs uppercase tracking-[0.15em] font-semibold transition-colors cursor-pointer"
              >
                BACK TO EVENT
              </button>

              <button
                onClick={handleRestartReveal}
                className="px-6 py-3.5 border border-[#352746] text-[#AAA2B8] hover:text-[#F7F4FC] hover:border-[#8B5CF6] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                RESTART REVEAL
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Stage Footer */}
      <footer className="p-6 sm:p-8 text-center text-[11px] font-mono text-[#AAA2B8] border-t border-[#352746] relative z-20">
        <span>IDEAFORGE'26 · STAGE PRESENTATION</span>
      </footer>
    </div>
  );
};
