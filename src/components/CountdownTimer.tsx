import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Plus,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { EventStatus, EventTimerState } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { IdeathonLogo } from './IdeathonLogo';

const DEFAULT_DURATION_SECONDS = 8 * 3600; // 8 hours = 28,800 seconds
const STORAGE_KEY = 'ideathon_live_timer_v1';
const AUDIO_ENABLED_KEY = 'ideathon_timer_audio_enabled_v1';

interface CountdownTimerProps {
  onStatusChange: (status: EventStatus) => void;
}

// Ideathon Milestones
const MILESTONES = [
  { percent: 0, label: '0h', name: 'Kickoff & PS Release' },
  { percent: 25, label: '2h', name: 'Ideation & Architecture' },
  { percent: 50, label: '4h', name: 'Mid-Sprint Review' },
  { percent: 75, label: '6h', name: 'Code Freeze & Testing' },
  { percent: 100, label: '8h', name: 'Pitch & Submissions' },
];

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ onStatusChange }) => {
  // 1. Initial State from localStorage with immediate expiration check
  const [timerState, setTimerState] = useState<EventTimerState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: EventTimerState = JSON.parse(saved);
        if (parsed.status === 'LIVE' && parsed.startEpochMs) {
          const calculatedEndMs = parsed.startEpochMs + (parsed.durationSeconds || DEFAULT_DURATION_SECONDS) * 1000;
          const now = Date.now();
          if (now >= calculatedEndMs) {
            return {
              status: 'COMPLETED',
              startEpochMs: parsed.startEpochMs,
              durationSeconds: parsed.durationSeconds || DEFAULT_DURATION_SECONDS,
              endEpochMs: calculatedEndMs,
            };
          } else {
            return {
              status: 'LIVE',
              startEpochMs: parsed.startEpochMs,
              durationSeconds: parsed.durationSeconds || DEFAULT_DURATION_SECONDS,
              endEpochMs: calculatedEndMs,
            };
          }
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse timer state from storage:', e);
    }
    return {
      status: 'NOT STARTED',
      startEpochMs: null,
      durationSeconds: DEFAULT_DURATION_SECONDS,
      endEpochMs: null,
    };
  });

  // Calculate remaining seconds
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (timerState.status === 'LIVE' && timerState.startEpochMs) {
      const endMs = timerState.startEpochMs + timerState.durationSeconds * 1000;
      const left = Math.floor((endMs - Date.now()) / 1000);
      return Math.max(0, left);
    } else if (timerState.status === 'PAUSED' && timerState.pausedRemainingSeconds !== undefined && timerState.pausedRemainingSeconds !== null) {
      return timerState.pausedRemainingSeconds;
    } else if (timerState.status === 'COMPLETED') {
      return 0;
    }
    return timerState.durationSeconds || DEFAULT_DURATION_SECONDS;
  });

  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUDIO_ENABLED_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  // Display format toggle: 4 cards (Days, Hours, Minutes, Seconds) vs 3 cards (Hours, Minutes, Seconds)
  const [showDaysCard, setShowDaysCard] = useState<boolean>(false);

  const intervalRef = useRef<number | null>(null);
  const timerCardRef = useRef<HTMLDivElement>(null);

  // Play synthesized Web Audio buzzer / fanfare (zero external dependencies)
  const playSoundEffect = useCallback((type: 'tick' | 'alarm') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else {
        // Grand 3-tone event completion fanfare
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.18);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.18);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.18 + 0.9);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.18);
          osc.stop(ctx.currentTime + idx * 0.18 + 0.9);
        });
      }
    } catch (err) {
      console.warn('Audio playback not permitted or unavailable:', err);
    }
  }, [soundEnabled]);

  // Persist sound preference
  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(AUDIO_ENABLED_KEY, String(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // 2. Persist state to localStorage & notify parent
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timerState));
    } catch (e) {
      console.error('Failed to save timer state to storage:', e);
    }
    onStatusChange(timerState.status);
  }, [timerState, onStatusChange]);

  // 3. Heartbeat calculation function
  const updateTimerTick = useCallback(() => {
    if (timerState.status !== 'LIVE' || !timerState.startEpochMs) return;

    const endEpochMs = timerState.startEpochMs + timerState.durationSeconds * 1000;
    const now = Date.now();
    const diffMs = endEpochMs - now;
    const leftSec = Math.max(0, Math.floor(diffMs / 1000));

    setRemainingSeconds(leftSec);

    // Subtle tick on last 5 seconds
    if (leftSec > 0 && leftSec <= 5) {
      playSoundEffect('tick');
    }

    if (leftSec <= 0) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      playSoundEffect('alarm');
      setTimerState((prev) => ({
        ...prev,
        status: 'COMPLETED',
        endEpochMs,
      }));
    }
  }, [timerState.status, timerState.startEpochMs, timerState.durationSeconds, playSoundEffect]);

  // 4. Timer interval management
  useEffect(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (timerState.status === 'LIVE' && timerState.startEpochMs) {
      updateTimerTick();
      intervalRef.current = window.setInterval(updateTimerTick, 1000);
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState.status, timerState.startEpochMs, updateTimerTick]);

  // 5. Visibility change sync
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timerState.status === 'LIVE') {
        updateTimerTick();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [timerState.status, updateTimerTick]);

  // 6. Fullscreen toggle & Escape key listener
  const toggleFullscreen = useCallback(async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (document.fullscreenEnabled && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // Fallback to React state-driven fixed overlay
      }
    } else {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch {
        // Ignored
      }
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      // Spacebar toggles Play/Pause in fullscreen
      if (e.code === 'Space' && isFullscreen && e.target === document.body) {
        e.preventDefault();
        if (timerState.status === 'LIVE') {
          handlePauseEvent();
        } else if (timerState.status === 'PAUSED' || timerState.status === 'NOT STARTED') {
          handleStartOrResumeEvent();
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, timerState.status]);

  // 7. Start or Resume Event handler
  const handleStartOrResumeEvent = useCallback(() => {
    if (timerState.status === 'LIVE') return;

    const now = Date.now();

    if (timerState.status === 'PAUSED' && timerState.pausedRemainingSeconds !== undefined && timerState.pausedRemainingSeconds !== null) {
      // Resume from paused remaining seconds
      const resumeSecs = timerState.pausedRemainingSeconds;
      const end = now + resumeSecs * 1000;
      const newState: EventTimerState = {
        status: 'LIVE',
        startEpochMs: now,
        durationSeconds: resumeSecs,
        endEpochMs: end,
        pausedRemainingSeconds: null,
      };

      setTimerState(newState);
      setRemainingSeconds(resumeSecs);
    } else {
      // Fresh start
      const duration = timerState.durationSeconds || DEFAULT_DURATION_SECONDS;
      const end = now + duration * 1000;
      const newState: EventTimerState = {
        status: 'LIVE',
        startEpochMs: now,
        durationSeconds: duration,
        endEpochMs: end,
        pausedRemainingSeconds: null,
      };

      setTimerState(newState);
      setRemainingSeconds(duration);
    }
  }, [timerState.status, timerState.durationSeconds, timerState.pausedRemainingSeconds]);

  // 8. Pause Event handler
  const handlePauseEvent = useCallback(() => {
    if (timerState.status !== 'LIVE') return;

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const currentRemaining = remainingSeconds;
    const newState: EventTimerState = {
      ...timerState,
      status: 'PAUSED',
      pausedRemainingSeconds: currentRemaining,
    };

    setTimerState(newState);
  }, [timerState, remainingSeconds]);

  // 9. Quick Add / Extend Time handler (+15 min or +30 min)
  const handleExtendTime = useCallback((extraSeconds: number) => {
    const newRemaining = remainingSeconds + extraSeconds;
    const newTotalDuration = (timerState.durationSeconds || DEFAULT_DURATION_SECONDS) + extraSeconds;

    if (timerState.status === 'LIVE' && timerState.startEpochMs) {
      const newEnd = Date.now() + newRemaining * 1000;
      setTimerState((prev) => ({
        ...prev,
        durationSeconds: newTotalDuration,
        endEpochMs: newEnd,
      }));
      setRemainingSeconds(newRemaining);
    } else if (timerState.status === 'PAUSED') {
      setTimerState((prev) => ({
        ...prev,
        durationSeconds: newTotalDuration,
        pausedRemainingSeconds: newRemaining,
      }));
      setRemainingSeconds(newRemaining);
    } else if (timerState.status === 'NOT STARTED') {
      setTimerState((prev) => ({
        ...prev,
        durationSeconds: newTotalDuration,
      }));
      setRemainingSeconds(newTotalDuration);
    }
  }, [remainingSeconds, timerState]);

  // 10. Select Preset Duration (8h, 4h, 12h, 24h)
  const handleSelectPreset = (hours: number) => {
    if (timerState.status === 'LIVE') return;
    const secs = hours * 3600;
    const resetState: EventTimerState = {
      status: 'NOT STARTED',
      startEpochMs: null,
      durationSeconds: secs,
      endEpochMs: null,
      pausedRemainingSeconds: null,
    };
    setTimerState(resetState);
    setRemainingSeconds(secs);
  };

  // 11. Reset Event handler
  const handleConfirmReset = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const resetState: EventTimerState = {
      status: 'NOT STARTED',
      startEpochMs: null,
      durationSeconds: DEFAULT_DURATION_SECONDS,
      endEpochMs: null,
      pausedRemainingSeconds: null,
    };

    setTimerState(resetState);
    setRemainingSeconds(DEFAULT_DURATION_SECONDS);
    setShowResetConfirm(false);
  }, []);

  // Format Calculation
  const days = Math.floor(remainingSeconds / 86400);
  const hours = showDaysCard ? Math.floor((remainingSeconds % 86400) / 3600) : Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  // Percentage elapsed
  const totalDuration = timerState.durationSeconds || DEFAULT_DURATION_SECONDS;
  const elapsedSeconds = Math.max(0, totalDuration - remainingSeconds);
  const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / totalDuration) * 100));

  // Flip-Card Visual Component for Single Time Unit
  const FlipCard: React.FC<{
    value: string;
    label: string;
    size?: 'normal' | 'fullscreen';
  }> = ({ value, label, size = 'normal' }) => {
    const isLarge = size === 'fullscreen';

    return (
      <div className="flex flex-col items-center select-none group">
        {/* Main Card Container with Stadium Scoreboard / Flip Aesthetic */}
        <div
          className={`relative rounded-xl sm:rounded-2xl bg-gradient-to-b from-[#241744] via-[#1A1032] to-[#110922] border border-[#4B366D] shadow-[0_12px_32px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.12)] transition-all duration-300 ${
            timerState.status === 'LIVE' ? 'hover:border-[#8B5CF6]/90 hover:shadow-[0_14px_40px_rgba(139,92,246,0.25)]' : ''
          } ${
            isLarge
              ? 'w-24 sm:w-44 md:w-56 lg:w-64 h-32 sm:h-52 md:h-64 lg:h-72'
              : 'w-20 sm:w-28 md:w-36 h-24 sm:h-36 md:h-44'
          } flex items-center justify-center overflow-hidden`}
        >
          {/* Subtle top glare reflection */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.07] to-transparent pointer-events-none" />

          {/* Horizontal Split Flap Notch Line */}
          <div className="absolute inset-x-0 top-1/2 h-[2px] bg-[#0A0516]/90 shadow-[0_1px_0_rgba(255,255,255,0.06)] z-10 pointer-events-none" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-3.5 bg-[#120D20] rounded-r-full border-r border-[#4B366D] z-10 pointer-events-none" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-3.5 bg-[#120D20] rounded-l-full border-l border-[#4B366D] z-10 pointer-events-none" />

          {/* Large Monospace Tabular Digits */}
          <span
            className={`font-mono font-bold tracking-tight text-[#F7F4FC] tabular-nums drop-shadow-[0_4px_14px_rgba(139,92,246,0.3)] z-0 ${
              isLarge
                ? 'text-5xl sm:text-8xl md:text-9xl lg:text-[10rem] leading-none'
                : 'text-4xl sm:text-6xl md:text-7xl leading-none'
            }`}
          >
            {value}
          </span>
        </div>

        {/* Unit Label Badge */}
        <div className="mt-3 sm:mt-4">
          <span
            className={`inline-block font-mono font-bold uppercase tracking-[0.25em] text-[#D4AF37] px-3 py-1 bg-[#1A1032]/80 border border-[#3E2C5B] rounded-full shadow-sm ${
              isLarge ? 'text-xs sm:text-sm md:text-base px-4 py-1.5' : 'text-[10px] sm:text-xs'
            }`}
          >
            {label}
          </span>
        </div>
      </div>
    );
  };

  // Glowing Separator Dots
  const ColonSeparator: React.FC<{ size?: 'normal' | 'fullscreen' }> = ({ size = 'normal' }) => {
    const isLarge = size === 'fullscreen';
    return (
      <div
        className={`flex flex-col items-center justify-center self-center px-1 sm:px-2 ${
          isLarge ? 'gap-4 sm:gap-6' : 'gap-2.5 sm:gap-3.5'
        }`}
      >
        <span
          className={`rounded-full transition-colors ${
            timerState.status === 'LIVE'
              ? 'bg-[#8B5CF6] shadow-[0_0_12px_#8B5CF6] animate-pulse'
              : 'bg-[#4B366D]'
          } ${isLarge ? 'w-2.5 h-2.5 sm:w-4 sm:h-4' : 'w-2 h-2 sm:w-2.5 sm:h-2.5'}`}
        />
        <span
          className={`rounded-full transition-colors ${
            timerState.status === 'LIVE'
              ? 'bg-[#8B5CF6] shadow-[0_0_12px_#8B5CF6] animate-pulse'
              : 'bg-[#4B366D]'
          } ${isLarge ? 'w-2.5 h-2.5 sm:w-4 sm:h-4' : 'w-2 h-2 sm:w-2.5 sm:h-2.5'}`}
        />
      </div>
    );
  };

  return (
    <>
      {/* ======================================================== */}
      {/* STANDARD IN-PAGE EVENT SECTION                           */}
      {/* ======================================================== */}
      <section className="py-12 sm:py-20 border-b border-[#352746]">
        <div className="max-w-4xl mx-auto">
          {/* CENTRALIZED LOGO HERO SECTION */}
          <div className="mb-10 sm:mb-14 flex flex-col items-center justify-center text-center">
            <IdeathonLogo className="w-full max-w-xl sm:max-w-2xl h-auto" />
          </div>

          {/* EVENT COUNTDOWN CONTAINER (Double-click to expand to full screen) */}
          <div
            ref={timerCardRef}
            onDoubleClick={toggleFullscreen}
            title="Double-click to expand to stage full screen"
            className="bg-[#1B1230] border border-[#352746] p-6 sm:p-12 mb-8 relative select-none cursor-pointer transition-all duration-300 hover:border-[#8B5CF6]/50 shadow-2xl rounded-2xl"
          >
            {/* Top Bar of the Countdown Container */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#352746] pb-4 mb-8">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#AAA2B8]">
                  EVENT COUNTDOWN
                </span>
                <span className="hidden sm:inline-block text-[11px] font-mono text-[#AAA2B8]/70">
                  (Double-click to expand)
                </span>
              </div>

              {/* Status Indicator, Format Toggle & Controls */}
              <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono tracking-wider uppercase">
                {/* 4-Box vs 3-Box toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDaysCard((prev) => !prev);
                  }}
                  className="px-2.5 py-1 text-[10px] font-mono border border-[#352746] hover:border-[#8B5CF6] text-[#AAA2B8] hover:text-[#F7F4FC] rounded bg-[#120D20]/50 transition-colors cursor-pointer"
                  title="Toggle Days unit card"
                >
                  {showDaysCard ? '3-BOX (H:M:S)' : '4-BOX (D:H:M:S)'}
                </button>

                {/* Sound Toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSound();
                  }}
                  className="p-1.5 text-[#AAA2B8] hover:text-[#F7F4FC] border border-[#352746] rounded hover:bg-[#352746]/40 transition-colors cursor-pointer"
                  title={soundEnabled ? 'Mute Audio Alarm' : 'Enable Audio Alarm'}
                  aria-label="Sound Toggle"
                >
                  {soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-[#AAA2B8]/60" />
                  )}
                </button>

                {/* Status Badge */}
                {timerState.status === 'LIVE' && (
                  <span className="text-[#C4B5FD] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
                    <span>SESSION IN PROGRESS ({progressPercent.toFixed(1)}%)</span>
                  </span>
                )}
                {timerState.status === 'PAUSED' && (
                  <span className="text-[#F59E0B] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                    <span>PAUSED</span>
                  </span>
                )}
                {timerState.status === 'NOT STARTED' && (
                  <span className="text-[#AAA2B8] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#AAA2B8]" />
                    <span>STANDBY</span>
                  </span>
                )}
                {timerState.status === 'COMPLETED' && (
                  <span className="text-[#D4AF37] flex items-center gap-2 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                    <span>EVENT COMPLETED</span>
                  </span>
                )}

                {/* Fullscreen Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFullscreen();
                  }}
                  className="p-1.5 text-[#AAA2B8] hover:text-[#F7F4FC] hover:bg-[#352746]/40 rounded transition-colors"
                  aria-label="Expand Full Screen"
                  title="Expand to Full Screen"
                >
                  <Maximize2 className="w-4 h-4 text-[#C4B5FD]" />
                </button>
              </div>
            </div>

            {/* Countdown Digits Area */}
            {timerState.status === 'COMPLETED' ? (
              <div className="py-10 text-center animate-fade-in">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] mb-4">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-3xl sm:text-5xl font-heading font-bold text-[#D4AF37] tracking-tight uppercase mb-3">
                  EVENT COMPLETED
                </h3>
                <p className="text-xs sm:text-sm text-[#AAA2B8] max-w-md mx-auto font-mono">
                  The sprint duration has elapsed. Review evaluation rubric marks or proceed to announce the winners.
                </p>
              </div>
            ) : (
              <div className="py-4">
                {/* Segmented Digit Cards Row */}
                <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-5 flex-wrap sm:flex-nowrap">
                  {showDaysCard && (
                    <>
                      <FlipCard value={pad(days)} label="DAYS" />
                      <ColonSeparator />
                    </>
                  )}
                  <FlipCard value={pad(hours)} label="HOURS" />
                  <ColonSeparator />
                  <FlipCard value={pad(minutes)} label="MINUTES" />
                  <ColonSeparator />
                  <FlipCard value={pad(seconds)} label="SECONDS" />
                </div>
              </div>
            )}

            {/* Milestones & Progress Tracker */}
            {timerState.status !== 'NOT STARTED' && (
              <div className="mt-8 pt-6 border-t border-[#352746]">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#AAA2B8] mb-2">
                  <span>PROGRESS</span>
                  <span className="text-[#C4B5FD] font-semibold">{progressPercent.toFixed(1)}% ELAPSED</span>
                </div>
                <div className="w-full h-2 bg-[#120D20] rounded-full overflow-hidden border border-[#352746]">
                  <div
                    className="h-full bg-gradient-to-r from-[#8B5CF6] via-[#C4B5FD] to-[#D4AF37] transition-all duration-1000 ease-linear"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Milestone Step Checkpoints */}
                <div className="grid grid-cols-5 gap-1 mt-3">
                  {MILESTONES.map((milestone) => {
                    const isPassed = progressPercent >= milestone.percent;
                    return (
                      <div key={milestone.percent} className="flex flex-col items-center text-center">
                        <span
                          className={`text-[9px] sm:text-[10px] font-mono font-semibold uppercase ${
                            isPassed ? 'text-[#D4AF37]' : 'text-[#AAA2B8]/60'
                          }`}
                        >
                          {milestone.label}
                        </span>
                        <span
                          className={`hidden sm:inline-block text-[9px] font-mono truncate max-w-[85px] ${
                            isPassed ? 'text-[#F7F4FC]' : 'text-[#AAA2B8]/40'
                          }`}
                        >
                          {milestone.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* CONTROLS: START / PAUSE / RESUME / EXTEND / RESET */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {timerState.status === 'NOT STARTED' && (
                <button
                  onClick={handleStartOrResumeEvent}
                  className="px-6 py-3 bg-[#D4AF37] text-[#120D20] hover:bg-[#F2D675] font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer flex items-center gap-2 rounded shadow-lg"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>START EVENT</span>
                </button>
              )}

              {timerState.status === 'LIVE' && (
                <button
                  onClick={handlePauseEvent}
                  className="px-6 py-3 bg-[#F59E0B] text-[#120D20] hover:bg-[#FBBF24] font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer flex items-center gap-2 rounded shadow-lg"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  <span>PAUSE EVENT</span>
                </button>
              )}

              {timerState.status === 'PAUSED' && (
                <button
                  onClick={handleStartOrResumeEvent}
                  className="px-6 py-3 bg-[#8B5CF6] text-white hover:bg-[#9D76F8] font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer flex items-center gap-2 rounded shadow-lg"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>RESUME EVENT</span>
                </button>
              )}

              {/* Quick Time Extension (+15m / +30m) */}
              {(timerState.status === 'LIVE' || timerState.status === 'PAUSED') && (
                <>
                  <button
                    onClick={() => handleExtendTime(15 * 60)}
                    className="px-3.5 py-3 border border-[#352746] text-[#C4B5FD] hover:bg-[#1B1230] hover:border-[#8B5CF6] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 rounded"
                    title="Add 15 minutes to countdown"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+15 MIN</span>
                  </button>
                  <button
                    onClick={() => handleExtendTime(30 * 60)}
                    className="px-3.5 py-3 border border-[#352746] text-[#C4B5FD] hover:bg-[#1B1230] hover:border-[#8B5CF6] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 rounded"
                    title="Add 30 minutes to countdown"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+30 MIN</span>
                  </button>
                </>
              )}

              {/* Reset Event Button */}
              {timerState.status !== 'NOT STARTED' && (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-5 py-3 border border-[#352746] text-[#F7F4FC] hover:bg-[#1B1230] hover:border-[#8B5CF6] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 rounded"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#AAA2B8]" />
                  <span>RESET EVENT</span>
                </button>
              )}
            </div>

            {/* Duration Presets for Event Organizers (When Standby) */}
            {timerState.status === 'NOT STARTED' && (
              <div className="flex items-center gap-2 text-xs font-mono text-[#AAA2B8]">
                <Clock className="w-3.5 h-3.5 text-[#AAA2B8]" />
                <span className="hidden sm:inline">PRESET:</span>
                {[
                  { label: '8H (Official)', hours: 8 },
                  { label: '4H', hours: 4 },
                  { label: '12H', hours: 12 },
                  { label: '24H', hours: 24 },
                ].map((preset) => {
                  const isCurrent = (timerState.durationSeconds || DEFAULT_DURATION_SECONDS) === preset.hours * 3600;
                  return (
                    <button
                      key={preset.hours}
                      type="button"
                      onClick={() => handleSelectPreset(preset.hours)}
                      className={`px-2.5 py-1 text-[11px] rounded transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#8B5CF6] text-white font-semibold'
                          : 'bg-[#1B1230] border border-[#352746] text-[#AAA2B8] hover:text-[#F7F4FC]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Confirmation modal for Reset Event */}
        <ConfirmModal
          isOpen={showResetConfirm}
          title="Reset Event Countdown?"
          message="This will reset the event timer back to 08:00:00 and restore status to NOT STARTED. This action cannot be undone."
          confirmLabel="Reset Event"
          cancelLabel="Cancel"
          onConfirm={handleConfirmReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      </section>

      {/* ======================================================== */}
      {/* FULL-SCREEN TIMER PRESENTATION OVERLAY (STAGE PROJECTOR) */}
      {/* ======================================================== */}
      {isFullscreen && (
        <div
          onDoubleClick={toggleFullscreen}
          className="fixed inset-0 z-50 bg-[#10091E] text-[#F7F4FC] flex flex-col justify-between items-center p-6 sm:p-10 select-none overflow-hidden animate-fade-in"
        >
          {/* Top Bar in Fullscreen View */}
          <div className="w-full flex items-center justify-between border-b border-[#352746] pb-4">
            <div className="flex items-center gap-3">
              <span className="font-heading font-bold text-sm sm:text-base tracking-wider uppercase text-[#F7F4FC]">
                IDEAFORGE <span className="text-[#8B5CF6]">'26</span>
              </span>
              <span className="text-[#352746]">·</span>
              <span className="font-mono text-xs uppercase tracking-widest text-[#AAA2B8]">
                STAGE COUNTDOWN
              </span>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {/* Play / Pause button directly in fullscreen */}
              {timerState.status === 'LIVE' ? (
                <button
                  type="button"
                  onClick={handlePauseEvent}
                  className="px-3 py-1.5 bg-[#F59E0B] text-[#120D20] text-xs font-mono font-bold uppercase rounded flex items-center gap-1.5 cursor-pointer"
                  title="Pause Timer (Spacebar)"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">PAUSE</span>
                </button>
              ) : timerState.status === 'PAUSED' ? (
                <button
                  type="button"
                  onClick={handleStartOrResumeEvent}
                  className="px-3 py-1.5 bg-[#8B5CF6] text-white text-xs font-mono font-bold uppercase rounded flex items-center gap-1.5 cursor-pointer"
                  title="Resume Timer (Spacebar)"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">RESUME</span>
                </button>
              ) : null}

              {/* Sound Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                className="p-1.5 text-[#AAA2B8] hover:text-[#F7F4FC] border border-[#352746] rounded transition-colors cursor-pointer"
                title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-[#D4AF37]" />
                ) : (
                  <VolumeX className="w-4 h-4 text-[#AAA2B8]/60" />
                )}
              </button>

              {/* Exit Fullscreen */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#352746] hover:border-[#D4AF37] hover:bg-[#1B1230] text-xs font-mono uppercase tracking-wider text-[#F7F4FC] rounded transition-colors cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>EXIT FULL SCREEN</span>
                <span className="hidden sm:inline-block text-[#AAA2B8] text-[10px] ml-1">(Esc)</span>
              </button>
            </div>
          </div>

          {/* Centered Large Display in Fullscreen View */}
          <div className="my-auto text-center w-full px-4 flex flex-col items-center justify-center">
            {/* Prominent Centralized Logo in Expanded Countdown */}
            <div className="mb-6 sm:mb-8 flex items-center justify-center select-none">
              <IdeathonLogo className="max-h-24 sm:max-h-32 md:max-h-40 w-auto max-w-[85vw]" />
            </div>

            <span className="text-xs sm:text-base font-mono uppercase tracking-[0.35em] text-[#D4AF37] block mb-4 sm:mb-8 font-semibold">
              {timerState.status === 'COMPLETED'
                ? 'STAGE COMPLETE'
                : timerState.status === 'PAUSED'
                ? 'SPRINT PAUSED'
                : 'REMAINING SPRINT TIME'}
            </span>

            {timerState.status === 'COMPLETED' ? (
              <div className="py-6 sm:py-12 animate-fade-in">
                <h2 className="text-5xl sm:text-8xl md:text-9xl font-heading font-bold text-[#D4AF37] tracking-tight uppercase mb-4 drop-shadow-[0_4px_25px_rgba(212,175,55,0.4)]">
                  EVENT COMPLETED
                </h2>
                <p className="text-sm sm:text-xl text-[#AAA2B8] font-mono">
                  The sprint countdown has concluded.
                </p>
              </div>
            ) : (
              <div className="w-full max-w-7xl mx-auto">
                {/* Colossal Segmented Digits for Stage Projector */}
                <div className="flex items-center justify-center gap-3 sm:gap-6 md:gap-8 flex-wrap sm:flex-nowrap">
                  {showDaysCard && (
                    <>
                      <FlipCard value={pad(days)} label="DAYS" size="fullscreen" />
                      <ColonSeparator size="fullscreen" />
                    </>
                  )}
                  <FlipCard value={pad(hours)} label="HOURS" size="fullscreen" />
                  <ColonSeparator size="fullscreen" />
                  <FlipCard value={pad(minutes)} label="MINUTES" size="fullscreen" />
                  <ColonSeparator size="fullscreen" />
                  <FlipCard value={pad(seconds)} label="SECONDS" size="fullscreen" />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar in Fullscreen View */}
          <div className="w-full flex items-center justify-between border-t border-[#352746] pt-4 text-[11px] font-mono text-[#AAA2B8]">
            <span>Press <kbd className="px-1.5 py-0.5 bg-[#1B1230] border border-[#352746] rounded text-[#F7F4FC]">Space</kbd> to Pause/Resume</span>
            <span className="text-center">Double-click anywhere or press <kbd className="px-1.5 py-0.5 bg-[#1B1230] border border-[#352746] rounded text-[#F7F4FC]">Esc</kbd> to exit</span>
            <span className="text-right">Stage Event Console · IdeaForge '26</span>
          </div>
        </div>
      )}
    </>
  );
};
