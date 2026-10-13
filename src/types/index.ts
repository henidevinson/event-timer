export type EventStatus = 'NOT STARTED' | 'LIVE' | 'PAUSED' | 'COMPLETED';

export interface EventTimerState {
  status: EventStatus;
  startEpochMs: number | null; // Timestamp when started
  durationSeconds: number; // 8 * 3600 = 28800
  endEpochMs: number | null; // startEpochMs + durationSeconds * 1000
  pausedRemainingSeconds?: number | null;
}

export interface WinnersData {
  firstPlace: string;
  firstPlaceProject?: string;
  secondPlace: string;
  secondPlaceProject?: string;
  thirdPlace: string;
  thirdPlaceProject?: string;
}

export interface EvaluationFileRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: 'pdf' | 'xlsx' | 'xls' | 'csv' | 'unknown';
  uploadedAt: number;
  blob: Blob;
}

export interface SheetRow {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ParsedSheetData {
  sheets: {
    name: string;
    headers: string[];
    rows: SheetRow[];
  }[];
  activeSheetIndex: number;
}

export interface RubricParamDefinition {
  slNo: number;
  parameter: string;
  maxMarks: number;
  multiplicationFactor: number;
}

export interface TeamScoreEntry {
  rating: number; // 0 - 5
  marksSecured: number;
}

export interface TeamEvaluation {
  id: string;
  department: string;
  problemStatementId: string;
  problemStatementTitle: string;
  theme: string;
  psCategory: 'Software' | 'Hardware' | 'Software/Hardware';
  teamId: string;
  teamName: string;
  teamMembersName: string;
  judgeName?: string;
  scores: Record<number, TeamScoreEntry>;
  totalMarks: number;
  evaluatedAt: number;
  remarks?: string;
}
