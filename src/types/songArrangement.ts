import type { ProgressionLevel } from "./progression";

export type SongArrangementTimeSignature = "4/4" | "3/4" | "6/8";

export type SongArrangementStyle =
  | "pop"
  | "folk"
  | "ballad"
  | "rock"
  | "worship"
  | "city-pop"
  | "campfire";

export type SongArrangementDifficulty = Extract<ProgressionLevel, "beginner"> | "intermediate" | "advanced";

export type SongLyricLine = {
  id: string;
  text: string;
  chords: string[];
};

export type SongSection = {
  id: string;
  name: string;
  chords: string[];
  lyricLines?: SongLyricLine[];
  barsPerChord: number;
  repeatCount: number;
  rhythmPattern: string;
  notes?: string;
};

export type SongArrangement = {
  id: string;
  title: string;
  key: string;
  bpm: number;
  timeSignature: SongArrangementTimeSignature;
  style: SongArrangementStyle;
  difficulty: SongArrangementDifficulty;
  sections: SongSection[];
};

export type SongArrangementValidationResult = {
  errors: string[];
};

export type SectionChordParseResult = {
  chords: string[];
  invalidChords: string[];
};

export type SongPracticeTarget =
  | { type: "section"; sectionId: string }
  | { type: "full" };

export type SongPracticeLyricRow = {
  sectionId: string;
  sectionName: string;
  lineId: string;
  text: string;
  chords: string[];
};
