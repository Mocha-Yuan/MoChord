import type { SavedLibraryItem } from "../utils/library";
import type { PracticeSession } from "../utils/practiceStats";
import type { WorkspaceState } from "../utils/workspaceState";

export type JsonObject = Record<string, unknown>;

export type UserProgressRecord = {
  id: string;
  user_id: string;
  progress_key: string;
  progress_data: unknown;
  created_at: string;
  updated_at: string;
};

export type MoChordProgress = {
  version: 1;
  updatedAt?: string;
  workspace?: Partial<WorkspaceState>;
  libraryItems?: SavedLibraryItem[];
  practiceSessions?: PracticeSession[];
  tuningPresets?: unknown[];
  savedVoicings?: Record<string, unknown>;
  completedLessons?: string[];
  unlockedLessons?: string[];
  currentLessonId?: string | null;
  currentPracticeMode?: string | null;
  practiceStats?: {
    totalPracticeCount: number;
    totalPracticeMinutes: number;
    lastPracticeAt?: string;
  };
  chordQuizResults?: Array<{
    quizId: string;
    score: number;
    total: number;
    completedAt: string;
  }>;
  savedChordProgressions?: Array<{
    id: string;
    title: string;
    key: string;
    progression: string;
    chords: string[];
    createdAt: string;
    updatedAt: string;
  }>;
  metronomeSettings?: {
    bpm: number;
    timeSignature: string;
  };
  tunerSettings?: {
    referencePitch: number;
    tuning: string;
  };
};

export type ProgressMergeStrategy =
  | "local-newer"
  | "cloud-newer"
  | "local-only"
  | "cloud-only"
  | "cloud-with-backup"
  | "empty";

export type ProgressMergeResult = {
  strategy: ProgressMergeStrategy;
  progress: MoChordProgress | null;
  backup?: MoChordProgress;
};

export type SyncStatus = "guest" | "idle" | "loading" | "syncing" | "synced" | "error";
