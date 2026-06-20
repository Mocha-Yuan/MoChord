import type {
  SongArrangement,
  SongArrangementDifficulty,
  SongArrangementStyle,
  SongArrangementTimeSignature,
} from "./songArrangement";

export type SongDraftLength = "short" | "standard" | "full";

export type SongDraftLyricLanguage = "en" | "zh";

export type SongDraftRequest = {
  prompt: string;
  lyricLanguage: SongDraftLyricLanguage;
  style: SongArrangementStyle;
  key: string;
  difficulty: SongArrangementDifficulty;
  bpm: number;
  timeSignature: SongArrangementTimeSignature;
  generateLyrics: boolean;
  length: SongDraftLength;
};

export type AISongDraftSection = {
  name: string;
  chords: string[];
  barsPerChord: 1 | 2 | 4;
  repeatCount: number;
  rhythmPattern: string;
  notes?: string;
  lyricLines?: {
    text: string;
    chords: string[];
  }[];
};

export type AISongDraftResult = {
  title: string;
  key: string;
  bpm: number;
  timeSignature: SongArrangementTimeSignature;
  style: SongArrangementStyle;
  difficulty: SongArrangementDifficulty;
  sections: AISongDraftSection[];
  notes: string[];
  warnings: string[];
};

export type SongDraftGenerationSource = "deepseek" | "fallback";

export type SongDraftGenerationResult = {
  source: SongDraftGenerationSource;
  arrangement: SongArrangement;
  notes: string[];
  warnings: string[];
};
