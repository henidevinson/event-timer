import React, { useState, useEffect } from 'react';
import { TeamEvaluation, RubricParamDefinition, WinnersData } from '../types';
import { ConfirmModal } from './ConfirmModal';
import * as XLSX from 'xlsx';

export const RUBRIC_PARAMETERS: RubricParamDefinition[] = [
  { slNo: 1, parameter: 'Problem Understanding', maxMarks: 10, multiplicationFactor: 2 },
  { slNo: 2, parameter: 'Innovation & Creativity', maxMarks: 15, multiplicationFactor: 3 },
  { slNo: 3, parameter: 'Proposed Solution', maxMarks: 15, multiplicationFactor: 3 },
  { slNo: 4, parameter: 'Technical Implementation', maxMarks: 20, multiplicationFactor: 4 },
  { slNo: 6, parameter: 'Impact & Scalability', maxMarks: 10, multiplicationFactor: 2 },
  { slNo: 8, parameter: 'Presentation & Communication', maxMarks: 15, multiplicationFactor: 1 },
  { slNo: 9, parameter: 'Teamwork & Q&A', maxMarks: 15, multiplicationFactor: 1 },
];

const STORAGE_KEY_EVALUATIONS = 'ideathon_rubric_evaluations_v2';
const LEGACY_STORAGE_KEYS = [
  'ideathon_rubric_evaluations_v1',
  'ideathon_rubric_evaluations',
  'ideathon_evaluations',
];

const isMockTeam = (item: TeamEvaluation): boolean => {
  const name = (item.teamName || '').toLowerCase();
  const id = (item.teamId || '').toLowerCase();
  return (
    name.includes('quantumleap') ||
    name.includes('neuropulse') ||
    name.includes('ecotrack') ||
    name.includes('biosynthetica') ||
    name.includes('cybersentinel') ||
    name.includes('hypervibe') ||
    name.includes('sample') ||
    name.includes('mock') ||
    name.includes('demo') ||
    name.includes('unnamed') ||
    name.includes('team alpha') ||
    name.includes('team beta') ||
    id.includes('t-01') ||
    id.includes('t-04') ||
    id.includes('t-07')
  );
};

const getInitialEmptyScores = (): Record<number, { rating: number; marksSecured: number }> => {
  const initialScores: Record<number, { rating: number; marksSecured: number }> = {};
  RUBRIC_PARAMETERS.forEach((p) => {
    initialScores[p.slNo] = { rating: 0, marksSecured: 0 };
  });
  return initialScores;
};

interface InteractiveRubricProps {
  onSyncWinners?: (winners: WinnersData) => void;
}

export const InteractiveRubric: React.FC<InteractiveRubricProps> = ({ onSyncWinners }) => {
  // Evaluated teams list - initialized with zero mock data
  const [evaluations, setEvaluations] = useState<TeamEvaluation[]>(() => {
    try {
      // Purge legacy storage keys that held mock data
      LEGACY_STORAGE_KEYS.forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch (_) {}
      });

      const saved = localStorage.getItem(STORAGE_KEY_EVALUATIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out any mock/sample items that might linger
          return parsed.filter((item: TeamEvaluation) => !isMockTeam(item));
        }
      }
    } catch (e) {
      console.error('Failed to parse saved evaluations:', e);
    }
    return [];
  });

  // Current active evaluation form state
  const [activeEvalId, setActiveEvalId] = useState<string | null>(null);
  const [problemStatementId, setProblemStatementId] = useState<string>('');
  const [problemStatementTitle, setProblemStatementTitle] = useState<string>('');
  const [theme, setTheme] = useState<string>('');
  const [psCategory, setPsCategory] = useState<'Software' | 'Hardware' | 'Software/Hardware'>('Software');
  const [teamId, setTeamId] = useState<string>('');
  const [teamName, setTeamName] = useState<string>('');
  const [teamMembersName, setTeamMembersName] = useState<string>('');

  // Scores map: param slNo -> { rating, marksSecured }
  const [scores, setScores] = useState<Record<number, { rating: number; marksSecured: number }>>(() => {
    return getInitialEmptyScores();
  });

  const [notification, setNotification] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(true);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Sync evaluations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EVALUATIONS, JSON.stringify(evaluations));
    } catch (e) {
      console.error('Failed to save evaluations:', e);
    }
  }, [evaluations]);

  // Flash notifications
  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Calculate live total marks secured
  const totalMarksSecured = Object.values(scores).reduce(
    (sum, val) => sum + (Number(val.marksSecured) || 0),
    0
  );

  // Rating click handler
  const handleRatingChange = (param: RubricParamDefinition, rating: number) => {
    // For Sl 8 and 9, if multiplicationFactor is 1 and maxMarks is 15:
    // When rating 0-5 is chosen, scale proportionally up to maxMarks (rating * 3) or rating * factor
    let calculatedMarks = rating * param.multiplicationFactor;
    if (param.maxMarks === 15 && param.multiplicationFactor === 1) {
      // 5 -> 15, 4 -> 12, 3 -> 9, 2 -> 6, 1 -> 3, 0 -> 0
      calculatedMarks = Math.min(15, rating * 3);
    } else {
      calculatedMarks = Math.min(param.maxMarks, calculatedMarks);
    }

    setScores((prev) => ({
      ...prev,
      [param.slNo]: {
        rating,
        marksSecured: calculatedMarks,
      },
    }));
  };

  // Direct marks override handler
  const handleDirectMarksChange = (param: RubricParamDefinition, valueStr: string) => {
    if (valueStr === '') {
      setScores((prev) => ({
        ...prev,
        [param.slNo]: {
          rating: 0,
          marksSecured: 0,
        },
      }));
      return;
    }

    const parsed = parseInt(valueStr, 10);
    const num = isNaN(parsed) ? 0 : Math.max(0, Math.min(param.maxMarks, parsed));
    // Approximate rating
    let derivedRating = 0;
    if (param.maxMarks === 10) derivedRating = Math.round(num / 2);
    else if (param.maxMarks === 15) derivedRating = Math.round(num / 3);
    else if (param.maxMarks === 20) derivedRating = Math.round(num / 4);

    setScores((prev) => ({
      ...prev,
      [param.slNo]: {
        rating: Math.min(5, Math.max(0, derivedRating)),
        marksSecured: num,
      },
    }));
  };

  // Reset form to blank new evaluation
  const handleNewEvaluation = () => {
    setActiveEvalId(null);
    setProblemStatementId('');
    setProblemStatementTitle('');
    setTheme('');
    setPsCategory('Software');
    setTeamId('');
    setTeamName('');
    setTeamMembersName('');

    const defaultScores: Record<number, { rating: number; marksSecured: number }> = {};
    RUBRIC_PARAMETERS.forEach((p) => {
      defaultScores[p.slNo] = { rating: 0, marksSecured: 0 };
    });
    setScores(defaultScores);
    notify('Form cleared for new team evaluation.');
  };

  // Load a team evaluation into form
  const handleLoadEvaluation = (evalItem: TeamEvaluation) => {
    setActiveEvalId(evalItem.id);
    setProblemStatementId(evalItem.problemStatementId);
    setProblemStatementTitle(evalItem.problemStatementTitle);
    setTheme(evalItem.theme);
    setPsCategory(evalItem.psCategory);
    setTeamId(evalItem.teamId);
    setTeamName(evalItem.teamName);
    setTeamMembersName(evalItem.teamMembersName);
    setScores(evalItem.scores);
    notify(`Loaded evaluation for ${evalItem.teamName} (${evalItem.teamId}).`);
  };

  // Save or update evaluation
  const handleSaveEvaluation = () => {
    if (!teamName.trim() || !teamId.trim()) {
      notify('Please enter both Team ID and Team Name before saving.');
      return;
    }

    const newEval: TeamEvaluation = {
      id: activeEvalId || `eval-${Date.now()}`,
      department: 'DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING',
      problemStatementId: problemStatementId.trim() || '—',
      problemStatementTitle: problemStatementTitle.trim() || '—',
      theme: theme.trim() || '—',
      psCategory,
      teamId: teamId.trim(),
      teamName: teamName.trim(),
      teamMembersName: teamMembersName.trim() || '—',
      scores,
      totalMarks: totalMarksSecured,
      evaluatedAt: Date.now(),
    };

    setEvaluations((prev) => {
      const existingIdx = prev.findIndex((e) => e.id === newEval.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = newEval;
        return copy;
      }
      return [newEval, ...prev];
    });

    setActiveEvalId(newEval.id);
    notify(`Evaluation saved: ${newEval.teamName} secured ${totalMarksSecured}/100.`);
  };

  // Delete single evaluation
  const handleDeleteEvaluation = (id: string, name: string) => {
    setEvaluations((prev) => prev.filter((e) => e.id !== id));
    if (activeEvalId === id) {
      handleNewEvaluation();
    }
    notify(`Removed evaluation for ${name}.`);
  };

  // Request clear all evaluations modal
  const handleClearAllEvaluations = () => {
    if (evaluations.length === 0) return;
    setShowClearConfirm(true);
  };

  // Execute clearing of all evaluations
  const handleConfirmClearAll = () => {
    setEvaluations([]);
    handleNewEvaluation();
    try {
      localStorage.removeItem(STORAGE_KEY_EVALUATIONS);
      LEGACY_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.error(e);
    }
    setShowClearConfirm(false);
    notify('All evaluation records have been cleared.');
  };

  // Sync top 3 to main stage winners
  const handleSyncWinnersToStage = () => {
    if (!onSyncWinners) return;
    const sorted = [...evaluations].sort((a, b) => b.totalMarks - a.totalMarks);

    if (sorted.length < 1) {
      notify('No evaluated teams available to sync.');
      return;
    }

    const first = sorted[0];
    const second = sorted.length > 1 ? sorted[1] : undefined;
    const third = sorted.length > 2 ? sorted[2] : undefined;

    const newWinners: WinnersData = {
      firstPlace: first ? first.teamName : '',
      firstPlaceProject: first ? first.problemStatementTitle : '',
      secondPlace: second ? second.teamName : '',
      secondPlaceProject: second ? second.problemStatementTitle : '',
      thirdPlace: third ? third.teamName : '',
      thirdPlaceProject: third ? third.problemStatementTitle : '',
    };

    onSyncWinners(newWinners);
    const summary = [
      first ? `1st: ${first.teamName}` : '',
      second ? `2nd: ${second.teamName}` : '',
      third ? `3rd: ${third.teamName}` : '',
    ].filter(Boolean).join(', ');
    notify(`Stage winners synced: ${summary}`);
  };

  // Export all to Excel (.xlsx)
  const handleExportExcel = () => {
    if (evaluations.length === 0) {
      notify('No evaluation records to export.');
      return;
    }

    const sorted = [...evaluations].sort((a, b) => b.totalMarks - a.totalMarks);

    const sheetRows = sorted.map((item, index) => ({
      'Rank': index + 1,
      'Team ID': item.teamId,
      'Team Name': item.teamName,
      'Team Members': item.teamMembersName,
      'Problem Statement ID': item.problemStatementId,
      'Problem Statement Title': item.problemStatementTitle,
      'Theme': item.theme,
      'Category': item.psCategory,
      'Problem Understanding (10)': item.scores[1]?.marksSecured ?? 0,
      'Innovation & Creativity (15)': item.scores[2]?.marksSecured ?? 0,
      'Proposed Solution (15)': item.scores[3]?.marksSecured ?? 0,
      'Technical Implementation (20)': item.scores[4]?.marksSecured ?? 0,
      'Impact & Scalability (10)': item.scores[6]?.marksSecured ?? 0,
      'Presentation & Communication (15)': item.scores[8]?.marksSecured ?? 0,
      'Teamwork & Q&A (15)': item.scores[9]?.marksSecured ?? 0,
      'Total Marks (100)': item.totalMarks,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Evaluation Rubric Results');
    XLSX.writeFile(wb, 'IdeaForge26_Evaluation_Rubric_Master.xlsx');
    notify('Excel evaluation sheet downloaded.');
  };

  // Print official evaluation rubric
  const handlePrintRubric = () => {
    window.print();
  };

  const sortedLeaderboard = [...evaluations].sort((a, b) => b.totalMarks - a.totalMarks);

  return (
    <div className="space-y-8 font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1B1230] border border-[#D4AF37] text-[#F7F4FC] px-5 py-3 text-xs font-mono shadow-2xl flex items-center gap-3 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Rubric Container */}
      <div className="bg-[#1B1230] border border-[#352746] p-6 sm:p-10 relative overflow-hidden print:border-none print:p-2 print:bg-white print:text-black">
        {/* Subtle accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8B5CF6] via-[#D4AF37] to-[#8B5CF6] print:hidden" />

        {/* Top Header: Department & Rubric Title */}
        <div className="text-center pb-8 border-b border-[#352746] print:border-black/30">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#C4B5FD] font-semibold block mb-2 print:text-black">
            DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING
          </span>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#F7F4FC] tracking-tight uppercase print:text-black">
            IDEAFORGE 2K26 IDEATHON
          </h2>
          <p className="text-sm font-mono text-[#D4AF37] uppercase tracking-[0.15em] mt-1 print:text-black">
            Rating-Based Evaluation Rubric
          </p>
        </div>

        {/* Top Actions Bar (Hidden on Print) */}
        <div className="py-4 border-b border-[#352746] flex flex-wrap items-center justify-between gap-3 text-xs font-mono print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-[#AAA2B8]">Active Record:</span>
            <span className="text-[#F7F4FC] font-semibold">
              {teamName || 'New Team'} {teamId ? `(${teamId})` : ''}
            </span>
            <span className="text-[#352746]">·</span>
            <span className="text-[#D4AF37] font-bold">{totalMarksSecured} / 100 Marks</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleNewEvaluation}
              className="px-3 py-1.5 border border-[#352746] hover:bg-[#120D20] text-[#AAA2B8] hover:text-[#F7F4FC] transition-colors cursor-pointer"
            >
              New Team
            </button>
            <button
              onClick={handleSaveEvaluation}
              className="px-4 py-1.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white font-semibold transition-colors cursor-pointer shadow-sm"
            >
              Save Evaluation
            </button>
            <button
              onClick={handlePrintRubric}
              className="px-3 py-1.5 border border-[#352746] hover:bg-[#120D20] text-[#AAA2B8] hover:text-[#F7F4FC] transition-colors cursor-pointer"
            >
              Print Rubric
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 border border-[#352746] hover:bg-[#120D20] text-[#D4AF37] hover:text-[#F2D675] transition-colors cursor-pointer"
            >
              Export Excel
            </button>
          </div>
        </div>

        {/* Team & Problem Statement Metadata Form */}
        <div className="my-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs font-mono print:text-black">
          {/* Problem Statement ID */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#AAA2B8] block mb-1.5 print:text-black font-semibold">
              Problem Statement ID:
            </label>
            <input
              type="text"
              value={problemStatementId}
              onChange={(e) => setProblemStatementId(e.target.value)}
              placeholder="Enter Problem Statement ID"
              className="w-full px-3 py-2 bg-[#120D20] border border-[#352746] text-[#F7F4FC] placeholder-[#AAA2B8]/40 focus:outline-none focus:border-[#8B5CF6] print:bg-white print:text-black print:border-gray-400"
            />
          </div>

          {/* Problem Statement Title */}
          <div className="md:col-span-2">
            <label className="text-[11px] uppercase tracking-wider text-[#AAA2B8] block mb-1.5 print:text-black font-semibold">
              Problem Statement Title:
            </label>
            <input
              type="text"
              value={problemStatementTitle}
              onChange={(e) => setProblemStatementTitle(e.target.value)}
              placeholder="Enter Problem Statement Title"
              className="w-full px-3 py-2 bg-[#120D20] border border-[#352746] text-[#F7F4FC] placeholder-[#AAA2B8]/40 focus:outline-none focus:border-[#8B5CF6] print:bg-white print:text-black print:border-gray-400"
            />
          </div>

          {/* Theme */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#AAA2B8] block mb-1.5 print:text-black font-semibold">
              Theme:
            </label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Enter Theme"
              className="w-full px-3 py-2 bg-[#120D20] border border-[#352746] text-[#F7F4FC] placeholder-[#AAA2B8]/40 focus:outline-none focus:border-[#8B5CF6] print:bg-white print:text-black print:border-gray-400"
            />
          </div>

          {/* PS Category */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#AAA2B8] block mb-1.5 print:text-black font-semibold">
              PS Category - Software/Hardware:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Software', 'Hardware', 'Software/Hardware'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setPsCategory(cat)}
                  className={`py-2 px-2 text-[10px] uppercase font-semibold text-center border transition-colors cursor-pointer ${
                    psCategory === cat
                      ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white'
                      : 'bg-[#120D20] border-[#352746] text-[#AAA2B8] hover:text-[#F7F4FC]'
                  } print:bg-white print:border-gray-400 print:text-black`}
                >
                  {cat === 'Software/Hardware' ? 'Both' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Team ID */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#AAA2B8] block mb-1.5 print:text-black font-semibold">
              Team ID:
            </label>
            <input
              type="text"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              placeholder="Enter Team ID"
              className="w-full px-3 py-2 bg-[#120D20] border border-[#352746] text-[#F7F4FC] placeholder-[#AAA2B8]/40 focus:outline-none focus:border-[#8B5CF6] print:bg-white print:text-black print:border-gray-400"
            />
          </div>

          {/* Team Name */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#AAA2B8] block mb-1.5 print:text-black font-semibold">
              Team Name:
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter Team Name"
              className="w-full px-3 py-2 bg-[#120D20] border border-[#352746] text-[#F7F4FC] placeholder-[#AAA2B8]/40 focus:outline-none focus:border-[#8B5CF6] print:bg-white print:text-black print:border-gray-400 font-semibold"
            />
          </div>

          {/* Team Members Name */}
          <div className="md:col-span-2">
            <label className="text-[11px] uppercase tracking-wider text-[#AAA2B8] block mb-1.5 print:text-black font-semibold">
              Team Members Name:
            </label>
            <input
              type="text"
              value={teamMembersName}
              onChange={(e) => setTeamMembersName(e.target.value)}
              placeholder="Enter Team Members Name"
              className="w-full px-3 py-2 bg-[#120D20] border border-[#352746] text-[#F7F4FC] placeholder-[#AAA2B8]/40 focus:outline-none focus:border-[#8B5CF6] print:bg-white print:text-black print:border-gray-400"
            />
          </div>
        </div>

        {/* Rubric Evaluation Table */}
        <div className="border border-[#352746] bg-[#120D20] overflow-x-auto print:border-black">
          <table className="w-full text-left text-xs font-mono border-collapse print:text-black">
            <thead>
              <tr className="bg-[#1B1230] text-[#AAA2B8] border-b border-[#352746] uppercase tracking-wider text-[11px] print:bg-gray-100 print:text-black print:border-black">
                <th className="py-3 px-3 w-14 text-center font-semibold">Sl. No.</th>
                <th className="py-3 px-4 font-semibold">Evaluation Parameter</th>
                <th className="py-3 px-3 w-24 text-center font-semibold">Max. Marks</th>
                <th className="py-3 px-4 min-w-[200px] text-center font-semibold">Rating (0–5)</th>
                <th className="py-3 px-3 w-28 text-center font-semibold">Multiplication Factor</th>
                <th className="py-3 px-4 w-32 text-right font-semibold">Marks Secured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#352746] print:divide-black/40">
              {RUBRIC_PARAMETERS.map((param) => {
                const currentScore = scores[param.slNo] || { rating: 0, marksSecured: 0 };
                const isMaxed = currentScore.marksSecured === param.maxMarks;

                return (
                  <tr
                    key={param.slNo}
                    className="hover:bg-[#1B1230]/70 transition-colors print:hover:bg-transparent"
                  >
                    {/* Sl. No. */}
                    <td className="py-3.5 px-3 text-center text-[#AAA2B8] font-semibold print:text-black">
                      {param.slNo}
                    </td>

                    {/* Evaluation Parameter */}
                    <td className="py-3.5 px-4 font-medium text-[#F7F4FC] print:text-black">
                      <div className="flex flex-col">
                        <span className="text-sm font-heading font-semibold text-[#F7F4FC] print:text-black">
                          {param.parameter}
                        </span>
                        <span className="text-[10px] text-[#AAA2B8] print:hidden">
                          Parameter max weightage: {param.maxMarks} marks
                        </span>
                      </div>
                    </td>

                    {/* Max. Marks */}
                    <td className="py-3.5 px-3 text-center font-bold text-[#F7F4FC] print:text-black">
                      {param.maxMarks}
                    </td>

                    {/* Rating (0–5) interactive selector */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 print:hidden">
                        {[0, 1, 2, 3, 4, 5].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleRatingChange(param, val)}
                            className={`w-7 h-7 text-xs font-mono font-bold rounded-none border transition-all cursor-pointer ${
                              currentScore.rating === val
                                ? 'bg-[#D4AF37] border-[#D4AF37] text-[#120D20] shadow-sm'
                                : 'bg-[#1B1230] border-[#352746] text-[#AAA2B8] hover:text-[#F7F4FC] hover:border-[#8B5CF6]'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                      <span className="hidden print:inline font-bold">
                        {currentScore.rating} / 5
                      </span>
                    </td>

                    {/* Multiplication Factor */}
                    <td className="py-3.5 px-3 text-center text-[#C4B5FD] font-semibold print:text-black">
                      × {param.multiplicationFactor}
                    </td>

                    {/* Marks Secured */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 print:inline">
                        <input
                          type="number"
                          min={0}
                          max={param.maxMarks}
                          value={currentScore.marksSecured === 0 ? '' : currentScore.marksSecured}
                          placeholder="0"
                          onChange={(e) => handleDirectMarksChange(param, e.target.value)}
                          className={`w-14 px-2 py-1 text-right text-xs font-mono font-bold border focus:outline-none print:hidden ${
                            isMaxed
                              ? 'bg-[#120D20] border-[#D4AF37] text-[#F2D675]'
                              : 'bg-[#120D20] border-[#352746] text-[#F7F4FC] focus:border-[#8B5CF6]'
                          }`}
                        />
                        <span className="text-[#AAA2B8] print:text-black font-semibold">
                          / {param.maxMarks}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* TOTAL ROW */}
              <tr className="bg-[#1B1230] text-[#F7F4FC] font-bold border-t-2 border-[#D4AF37]/70 print:bg-gray-100 print:text-black print:border-black">
                <td className="py-4 px-3 text-center font-heading uppercase text-xs text-[#D4AF37] print:text-black">
                  Σ
                </td>
                <td className="py-4 px-4 font-heading uppercase text-sm tracking-wider text-[#D4AF37] print:text-black">
                  TOTAL
                </td>
                <td className="py-4 px-3 text-center text-sm font-mono text-[#D4AF37] print:text-black">
                  100
                </td>
                <td className="py-4 px-4 text-center text-xs text-[#AAA2B8] print:hidden">
                  Aggregated Score from 7 Parameters
                </td>
                <td className="py-4 px-3 text-center text-xs text-[#AAA2B8] print:text-black">
                  —
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-lg font-heading font-extrabold text-[#D4AF37] print:text-black">
                    {totalMarksSecured}
                  </span>
                  <span className="text-xs text-[#AAA2B8] ml-1 font-mono print:text-black">
                    / 100
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Print Signatures Block (Only visible on Print) */}
        <div className="hidden print:grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-black text-xs font-mono text-center">
          <div>
            <div className="border-b border-black mb-2 pb-8"></div>
            <p className="font-bold">Faculty Coordinator</p>
            <p className="text-[10px] text-gray-600">Department of CSE</p>
          </div>
          <div>
            <div className="border-b border-black mb-2 pb-8"></div>
            <p className="font-bold">Head of the Department (HOD)</p>
            <p className="text-[10px] text-gray-600">Department of CSE</p>
          </div>
        </div>

        {/* Bottom Save and Quick Action Bar */}
        <div className="mt-8 pt-6 border-t border-[#352746] flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveEvaluation}
              className="px-6 py-3 bg-[#D4AF37] hover:bg-[#F2D675] text-[#120D20] font-mono text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer"
            >
              SAVE THIS EVALUATION
            </button>
            <button
              onClick={handleNewEvaluation}
              className="px-4 py-3 border border-[#352746] hover:bg-[#120D20] text-[#AAA2B8] hover:text-[#F7F4FC] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              CLEAR / RESET
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#AAA2B8]">
              {evaluations.length} Team{evaluations.length === 1 ? '' : 's'} Evaluated
            </span>
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="px-4 py-2 border border-[#352746] hover:border-[#8B5CF6] text-[#C4B5FD] text-xs font-mono uppercase tracking-wider cursor-pointer"
            >
              {showLeaderboard ? 'Hide Leaderboard' : 'View Leaderboard'}
            </button>
          </div>
        </div>
      </div>

      {/* Evaluated Teams Leaderboard & Winners Sync */}
      {showLeaderboard && (
        <div className="bg-[#1B1230] border border-[#352746] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#352746]">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#AAA2B8] block">
                EVALUATION RECORDS
              </span>
              <h3 className="text-lg sm:text-xl font-heading font-bold text-[#F7F4FC] uppercase tracking-tight mt-0.5">
                Evaluated Teams Leaderboard
              </h3>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {evaluations.length > 0 && (
                <button
                  onClick={handleClearAllEvaluations}
                  className="px-3 py-2 border border-red-500/40 hover:border-red-500 text-red-400 hover:text-red-300 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  title="Remove all evaluated team records from leaderboard"
                >
                  Clear Leaderboard
                </button>
              )}
              {onSyncWinners && evaluations.length > 0 && (
                <button
                  onClick={handleSyncWinnersToStage}
                  className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7c4def] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer shadow-sm"
                  title="Apply Top 3 ranked teams to the main stage winner announcement"
                >
                  Sync Top 3 to Winners Stage
                </button>
              )}
              {evaluations.length > 0 && (
                <button
                  onClick={handleExportExcel}
                  className="px-4 py-2 border border-[#352746] hover:bg-[#120D20] text-[#D4AF37] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Export Excel (.xlsx)
                </button>
              )}
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="overflow-x-auto border border-[#352746]">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-[#120D20] text-[#AAA2B8] border-b border-[#352746] uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 text-center w-12">Rank</th>
                  <th className="py-2.5 px-3">Team ID</th>
                  <th className="py-2.5 px-4">Team Name & Project</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Score (/100)</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#352746]/60">
                {sortedLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 px-4 text-center text-[#AAA2B8]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="text-xs font-mono uppercase tracking-widest text-[#AAA2B8] font-semibold">
                          No Teams Evaluated Yet
                        </span>
                        <p className="text-[11px] text-[#AAA2B8]/70 max-w-md font-sans">
                          Fill in the official department rubric above and click &quot;SAVE THIS EVALUATION&quot; to score teams. Evaluated teams and rankings will appear here with zero mock data.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedLeaderboard.map((item, index) => {
                    const isTop1 = index === 0;
                    const isTop2 = index === 1;
                    const isTop3 = index === 2;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-[#120D20]/50 transition-colors ${
                          activeEvalId === item.id ? 'bg-[#120D20]/80' : ''
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3 px-3 text-center font-bold">
                          <span
                            className={`inline-block w-6 h-6 leading-6 text-center text-xs font-mono rounded-none ${
                              isTop1
                                ? 'bg-[#D4AF37] text-[#120D20]'
                                : isTop2
                                ? 'bg-[#C7CBD1] text-[#120D20]'
                                : isTop3
                                ? 'bg-[#8B5CF6] text-white'
                                : 'text-[#AAA2B8]'
                            }`}
                          >
                            {index + 1}
                          </span>
                        </td>

                        {/* Team ID */}
                        <td className="py-3 px-3 font-semibold text-[#C4B5FD]">
                          {item.teamId}
                        </td>

                        {/* Team Name & Project */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#F7F4FC]">
                            {item.teamName}
                          </div>
                          <div className="text-[11px] text-[#AAA2B8] truncate max-w-xs">
                            {item.problemStatementTitle}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3">
                          <span className="text-[10px] px-2 py-0.5 border border-[#352746] bg-[#120D20] text-[#AAA2B8] uppercase">
                            {item.psCategory}
                          </span>
                        </td>

                        {/* Score */}
                        <td className="py-3 px-3 text-center font-bold text-sm">
                          <span
                            className={
                              isTop1
                                ? 'text-[#F2D675]'
                                : isTop2
                                ? 'text-[#C7CBD1]'
                                : 'text-[#F7F4FC]'
                            }
                          >
                            {item.totalMarks}
                          </span>
                          <span className="text-[10px] text-[#AAA2B8]"> / 100</span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleLoadEvaluation(item)}
                              className="px-2.5 py-1 text-[11px] border border-[#352746] hover:border-[#8B5CF6] text-[#C4B5FD] hover:text-white cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteEvaluation(item.id, item.teamName)}
                              className="px-2.5 py-1 text-[11px] border border-[#352746] hover:border-red-500 text-[#AAA2B8] hover:text-red-400 cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clear Leaderboard Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Clear Leaderboard Records?"
        message="This will remove all evaluated team entries from the leaderboard. This action cannot be undone."
        confirmLabel="Clear All Records"
        cancelLabel="Cancel"
        onConfirm={handleConfirmClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};
