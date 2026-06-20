import type { PracticePlan, PracticePlanSource } from "../types/practice";
import type { PracticeCoachPlan, ProgressionLevel } from "../types/progression";
import type { SongPracticeLyricRow } from "../types/songArrangement";
import { createLocalChordProgressionResult } from "./diatonicChords";
import { getDisplayChordName, parseChordName } from "./musicTheory";
import { parseProgressionInputLocally } from "./progressionParser";

const CHORD_SEPARATOR = /\s*(?:-|,|，|、|>|→)\s*|\s+/;

export function createPracticePlanFromChords(
  title: string,
  chordNames: string[],
  source: PracticePlanSource = "manual",
  level: ProgressionLevel = "beginner",
  coach?: PracticeCoachPlan,
  lyricRows?: SongPracticeLyricRow[],
): PracticePlan {
  const chords = chordNames.map(normalizePracticeChord).filter(Boolean);
  const normalizedLyricRows = lyricRows
    ?.map((row) => ({
      ...row,
      text: row.text.trim(),
      chords: row.chords.map(normalizePracticeChord).filter(Boolean),
    }))
    .filter((row) => row.text.length > 0 || row.chords.length > 0);

  if (chords.length === 0) {
    throw new Error("Please enter at least one playable chord.");
  }

  return {
    id: `practice-${Date.now()}-${chords.join("-")}`,
    title: title.trim() || chords.join(" - "),
    chords,
    lyricRows: normalizedLyricRows && normalizedLyricRows.length > 0 ? normalizedLyricRows : undefined,
    source,
    level,
    coach,
  };
}

export function parsePracticeInput(input: string): PracticePlan {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Please enter a chord line or a key progression.");
  }

  const chordTokens = splitChordTokens(trimmed);
  if (chordTokens.length >= 2) {
    try {
      return createPracticePlanFromChords(chordTokens.join(" - "), chordTokens);
    } catch {
      // Fall through to degree-progression parsing.
    }
  }

  const parsedProgression = parseProgressionInputLocally(trimmed);
  const localResult = createLocalChordProgressionResult(
    trimmed,
    parsedProgression.key,
    parsedProgression.mode,
    parsedProgression.degrees,
  );

  return createPracticePlanFromChords(
    localResult.normalizedInput,
    localResult.beginner.chords.map((chord) => chord.chord),
    "local",
    "beginner",
  );
}

export function getLoopBpm(baseBpm: number, loopIndex: number, bpmIncreasePerLoop: number): number {
  return clampBpm(baseBpm + Math.max(0, loopIndex) * Math.max(0, bpmIncreasePerLoop));
}

export function getPracticeCue(
  chordNames: string[],
  options: {
    currentIndex: number;
    beat: number;
    numerator: number;
    barsPerChord: number;
    loop?: number;
    barInChord?: number;
  },
): {
  currentChord: string;
  nextChord: string;
  remainingBeats: number;
  loop: number;
} {
  const safeChords = chordNames.length > 0 ? chordNames : ["--"];
  const currentIndex = wrapIndex(options.currentIndex, safeChords.length);
  const totalBeats = Math.max(1, options.numerator) * Math.max(1, options.barsPerChord);
  const barInChord = Math.max(1, Math.min(Math.max(1, options.barsPerChord), options.barInChord ?? 1));
  const beat = Math.max(1, Math.min(Math.max(1, options.numerator), options.beat));
  const elapsedBeatsIncludingCurrent = (barInChord - 1) * Math.max(1, options.numerator) + beat;

  return {
    currentChord: safeChords[currentIndex],
    nextChord: safeChords[wrapIndex(currentIndex + 1, safeChords.length)],
    remainingBeats: Math.max(1, totalBeats - elapsedBeatsIncludingCurrent),
    loop: Math.max(1, options.loop ?? 1),
  };
}

function splitChordTokens(input: string): string[] {
  return input
    .split(CHORD_SEPARATOR)
    .map((token) => token.trim())
    .filter(Boolean);
}

function normalizePracticeChord(chordName: string): string {
  return getDisplayChordName(parseChordName(chordName));
}

function clampBpm(bpm: number): number {
  return Math.max(40, Math.min(240, Math.round(bpm)));
}

function wrapIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}
