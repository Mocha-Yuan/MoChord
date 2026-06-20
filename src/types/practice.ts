import type { PracticeCoachPlan, ProgressionLevel } from "./progression";
import type { SongPracticeLyricRow } from "./songArrangement";

export type PracticePlanSource = "manual" | "local" | "ai";

export type PracticePlan = {
  id: string;
  title: string;
  chords: string[];
  lyricRows?: SongPracticeLyricRow[];
  source: PracticePlanSource;
  level: ProgressionLevel;
  coach?: PracticeCoachPlan;
};
