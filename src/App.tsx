import React, { useState } from 'react';
import { Header } from './components/Header';
import { CountdownTimer } from './components/CountdownTimer';
import { EvaluationSheet } from './components/EvaluationSheet';
import { FinalMomentSection } from './components/FinalMomentSection';
import { WinnerAnnouncement } from './components/WinnerAnnouncement';
import { WinnerEditModal } from './components/WinnerEditModal';
import { EventStatus, WinnersData } from './types';

const WINNERS_STORAGE_KEY = 'ideathon_winners_data_v1';

const DEFAULT_WINNERS: WinnersData = {
  firstPlace: '',
  firstPlaceProject: '',
  secondPlace: '',
  secondPlaceProject: '',
  thirdPlace: '',
  thirdPlaceProject: '',
};

export default function App() {
  const [eventStatus, setEventStatus] = useState<EventStatus>('NOT STARTED');
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState<boolean>(false);
  const [isEditWinnersOpen, setIsEditWinnersOpen] = useState<boolean>(false);

  // Winners stored in localStorage (purging any mock names from earlier sessions)
  const [winners, setWinners] = useState<WinnersData>(() => {
    try {
      const saved = localStorage.getItem(WINNERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasMock =
          (parsed.firstPlace || '').toLowerCase().includes('quantumleap') ||
          (parsed.secondPlace || '').toLowerCase().includes('neuropulse') ||
          (parsed.thirdPlace || '').toLowerCase().includes('ecotrack');

        if (hasMock) {
          localStorage.removeItem(WINNERS_STORAGE_KEY);
          return DEFAULT_WINNERS;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load saved winners:', e);
    }
    return DEFAULT_WINNERS;
  });

  // Save winners to localStorage when updated
  const handleSaveWinners = (newWinners: WinnersData) => {
    setWinners(newWinners);
    try {
      localStorage.setItem(WINNERS_STORAGE_KEY, JSON.stringify(newWinners));
    } catch (e) {
      console.error('Failed to persist winners to localStorage:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#120D20] text-[#F7F4FC] flex flex-col font-sans selection:bg-[#8B5CF6] selection:text-white">
      {/* 1. Minimal Header */}
      <Header
        status={eventStatus}
        onOpenEditWinners={() => setIsEditWinnersOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6">
        {/* 2. 8-Hour Event Countdown Timer */}
        <CountdownTimer onStatusChange={setEventStatus} />

        {/* 3. Evaluation Sheet & Official Department Rating Rubric */}
        <EvaluationSheet onSyncWinners={handleSaveWinners} />

        {/* 4. The Final Moment - Announce Winners */}
        <FinalMomentSection
          winners={winners}
          onUpdateWinners={handleSaveWinners}
          onAnnounceWinners={() => setIsAnnouncementOpen(true)}
        />
      </main>

      {/* 5. Separate Winner Announcement Presentation Screen (One Winner at a Time) */}
      {isAnnouncementOpen && (
        <WinnerAnnouncement
          winners={winners}
          onUpdateWinners={handleSaveWinners}
          onClose={() => setIsAnnouncementOpen(false)}
        />
      )}

      {/* Organizer Winner Configuration Modal */}
      <WinnerEditModal
        isOpen={isEditWinnersOpen}
        onClose={() => setIsEditWinnersOpen(false)}
        winners={winners}
        onSave={handleSaveWinners}
      />

      {/* Editorial Footer */}
      <footer className="border-t border-[#352746] py-8 text-center text-xs text-[#AAA2B8] font-mono">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-[#F7F4FC] tracking-wider uppercase font-semibold">IDEAFORGE '26</span>
          <span className="text-[11px] tracking-[0.2em] uppercase">EIGHT HOURS · ENDLESS POSSIBILITIES</span>
          <span className="text-[#AAA2B8]">Stage Event Console</span>
        </div>
      </footer>
    </div>
  );
}
