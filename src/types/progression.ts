export type SupportedMode = "Major" | "Natural Minor" | "Dorian" | "Mixolydian";

export type ProgressionLevel = "beginner" | "professional";

export type AIProgressionChord = {
  degree: number;
  roman: string;
  chord: string;
  function: string;
  explanation: string;
};

export type AIProgressionVersion = {
  label: "Beginner" | "Professional";
  description: string;
  chords: AIProgressionChord[];
};

export type AIChordProgressionResult = {
  normalizedInput: string;
  key: string;
  mode: SupportedMode;
  degrees: number[];
  romanNumerals: string[];
  beginner: AIProgressionVersion;
  professional: AIProgressionVersion;
  notes: string[];
  warnings: string[];
};
