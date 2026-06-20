export type SupportedMode = "Major" | "Natural Minor" | "Dorian" | "Mixolydian";

export type ProgressionLevel = "beginner" | "professional";

export type PracticeCoachSkillLevel = "beginner" | "intermediate" | "advanced";

export type PracticeCoachPlan = {
  style: string;
  skillLevel: PracticeCoachSkillLevel;
  rhythmPattern: string;
  startingBpm: number;
  barsPerChord: number;
  loopCount: number;
  bpmIncreasePerLoop: number;
  goals: string[];
  demoNarrative: string;
};

export type AIProgressionChord = {
  degree: number;
  roman: string;
  chord: string;
  function: string;
  explanation: string;
};

export type AIProgressionVersion = {
  label: string;
  description: string;
  chords: AIProgressionChord[];
};

export type AIChordProgressionResult = {
  normalizedInput: string;
  key: string;
  mode: SupportedMode;
  modeLabel?: string;
  degrees: number[];
  romanNumerals: string[];
  beginner: AIProgressionVersion;
  professional: AIProgressionVersion;
  coach?: PracticeCoachPlan;
  notes: string[];
  warnings: string[];
};
