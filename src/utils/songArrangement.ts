import type {
  SectionChordParseResult,
  SongArrangement,
  SongArrangementValidationResult,
  SongLyricLine,
  SongPracticeLyricRow,
  SongSection,
} from "../types/songArrangement";
import { getDisplayChordName, parseChordName } from "./musicTheory";

export const BAR_OPTIONS = [1, 2, 4] as const;
export const REPEAT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const CHORD_SPLIT_PATTERN = /\s*(?:->|→|,|\||>|-)\s*|\s+\/\s+/;

export type SectionChordInputEditResult = {
  rawValue: string;
  nextChords: string[] | null;
  invalidChords: string[];
};

export function createBlankSection(name = "Verse"): SongSection {
  return {
    id: createArrangementId("section"),
    name,
    chords: ["G", "D", "Em", "C"],
    barsPerChord: 1,
    repeatCount: 1,
    rhythmPattern: "Down / Down-Up",
    notes: "",
  };
}

export function createBlankLyricLine(): SongLyricLine {
  return {
    id: createArrangementId("lyric-line"),
    text: "",
    chords: [],
  };
}

export function createBlankArrangement(): SongArrangement {
  return {
    id: createArrangementId("arrangement"),
    title: "Untitled Arrangement",
    key: "G",
    bpm: 88,
    timeSignature: "4/4",
    style: "pop",
    difficulty: "beginner",
    sections: [createBlankSection("Verse"), createBlankSection("Chorus")],
  };
}

export function cloneArrangement(arrangement: SongArrangement, title = `${arrangement.title} Copy`): SongArrangement {
  return {
    ...arrangement,
    id: createArrangementId("arrangement"),
    title,
    sections: arrangement.sections.map((section) => ({
      ...section,
      id: createArrangementId("section"),
      lyricLines: section.lyricLines?.map((line) => ({
        ...line,
        id: createArrangementId("lyric-line"),
      })),
    })),
  };
}

export function duplicateSection(section: SongSection): SongSection {
  return {
    ...section,
    id: createArrangementId("section"),
    name: `${section.name.trim() || "Section"} Copy`,
    lyricLines: section.lyricLines?.map((line) => ({
      ...line,
      id: createArrangementId("lyric-line"),
    })),
  };
}

export function parseSectionChordInput(input: string): SectionChordParseResult {
  const invalidChords: string[] = [];
  const chords = input
    .split(CHORD_SPLIT_PATTERN)
    .map((token) => token.trim())
    .filter(Boolean)
    .flatMap((token) => {
      try {
        if (hasIncompleteSlashChord(token)) throw new Error("Incomplete slash chord");
        return [getDisplayChordName(parseChordName(token))];
      } catch {
        invalidChords.push(token);
        return [];
      }
    });

  return { chords, invalidChords };
}

function hasIncompleteSlashChord(token: string): boolean {
  const parts = token.split("/");
  return parts.length > 2 || (parts.length === 2 && parts[1].trim().length === 0);
}

function normalizeChordList(chords: string[]): string[] {
  return chords
    .map((chord) => chord.trim())
    .filter(Boolean)
    .flatMap((chord) => {
      try {
        if (hasIncompleteSlashChord(chord)) throw new Error("Incomplete slash chord");
        return [getDisplayChordName(parseChordName(chord))];
      } catch {
        return [];
      }
    });
}

export function evaluateSectionChordInput(input: string): SectionChordInputEditResult {
  const parsed = parseSectionChordInput(input);
  return {
    rawValue: input,
    nextChords: parsed.invalidChords.length > 0 ? null : parsed.chords,
    invalidChords: parsed.invalidChords,
  };
}

export function normalizeLyricLine(line: SongLyricLine): SongLyricLine {
  return {
    ...line,
    text: line.text.trim(),
    chords: normalizeChordList(line.chords),
  };
}

export function sectionHasLyrics(section: SongSection): boolean {
  return (section.lyricLines ?? []).some((line) => line.text.trim().length > 0 || line.chords.length > 0);
}

export function normalizeSectionLyrics(section: SongSection): SongLyricLine[] {
  return (section.lyricLines ?? [])
    .map(normalizeLyricLine)
    .filter((line) => line.text.length > 0 || line.chords.length > 0);
}

export function getSectionPracticeChords(section: SongSection): string[] {
  const lyricLines = normalizeSectionLyrics(section);
  if (sectionHasLyrics(section)) return lyricLines.flatMap((line) => line.chords);
  return normalizeChordList(section.chords);
}

export function getSectionSummaryChords(section: SongSection): string[] {
  return getSectionPracticeChords(section);
}

export function expandSectionLyricsToPracticeRows(section: SongSection): SongPracticeLyricRow[] {
  return normalizeSectionLyrics(section)
    .filter((line) => line.chords.length > 0)
    .map((line) => ({
      sectionId: section.id,
      sectionName: section.name.trim() || "Section",
      lineId: line.id,
      text: line.text,
      chords: line.chords,
    }));
}

export function normalizeSection(section: SongSection): SongSection {
  const hasLyrics = sectionHasLyrics(section);
  const lyricLines = normalizeSectionLyrics(section);
  const chords = hasLyrics ? lyricLines.flatMap((line) => line.chords) : normalizeChordList(section.chords);

  return {
    ...section,
    name: section.name.trim() || "Section",
    chords,
    lyricLines: lyricLines.length > 0 ? lyricLines : undefined,
    barsPerChord: clampBarsPerChord(section.barsPerChord),
    repeatCount: clampRepeatCount(section.repeatCount),
    rhythmPattern: section.rhythmPattern.trim() || "Steady strum",
    notes: section.notes?.trim() ?? "",
  };
}

export function expandSectionToPracticeChords(section: SongSection): string[] {
  const normalized = normalizeSection(section);
  return Array.from({ length: normalized.repeatCount }, () => getSectionPracticeChords(normalized)).flat();
}

export function expandArrangementToPracticeChords(arrangement: SongArrangement): string[] {
  return arrangement.sections.flatMap(expandSectionToPracticeChords);
}

export function getMostCommonBarsPerChord(arrangement: SongArrangement): number {
  const counts = new Map<number, number>();
  for (const section of arrangement.sections) {
    const bars = clampBarsPerChord(section.barsPerChord);
    counts.set(bars, (counts.get(bars) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 1;
}

export function validateSection(section: SongSection): SongArrangementValidationResult {
  const errors: string[] = [];
  const lyricLineErrors =
    section.lyricLines?.flatMap((line, index) => {
      const normalized = normalizeLyricLine(line);
      const hasContent = line.text.trim().length > 0 || line.chords.length > 0;
      if (hasContent && normalized.chords.length === 0 && line.chords.length > 0) {
        return [`Lyric line ${index + 1} has no valid chords.`];
      }
      return [];
    }) ?? [];

  if (!section.name.trim()) errors.push("Section name is empty.");
  if (getSectionPracticeChords(section).length === 0) errors.push("Section needs at least one valid chord.");
  errors.push(...lyricLineErrors);

  if (!BAR_OPTIONS.includes(section.barsPerChord as (typeof BAR_OPTIONS)[number])) {
    errors.push("Bars per chord must be 1, 2, or 4.");
  }
  if (!REPEAT_OPTIONS.includes(section.repeatCount as (typeof REPEAT_OPTIONS)[number])) {
    errors.push("Repeat count must be between 1 and 8.");
  }
  return { errors };
}

export function validateArrangement(arrangement: SongArrangement): SongArrangementValidationResult {
  const errors: string[] = [];
  if (arrangement.sections.length === 0) errors.push("Arrangement needs at least one section.");
  const chordCount = expandArrangementToPracticeChords(arrangement).length;
  if (chordCount > 0 && chordCount < 2) errors.push("Full-song practice needs at least two valid chords.");
  arrangement.sections.forEach((section) => {
    validateSection(section).errors.forEach((error) => errors.push(`${section.name || "Section"}: ${error}`));
  });
  return { errors };
}

export function clampArrangementBpm(bpm: number): number {
  return Math.max(40, Math.min(240, Math.round(Number.isFinite(bpm) ? bpm : 88)));
}

export function clampBarsPerChord(value: number): number {
  return BAR_OPTIONS.includes(value as (typeof BAR_OPTIONS)[number]) ? value : 1;
}

export function clampRepeatCount(value: number): number {
  return Math.max(1, Math.min(8, Math.round(Number.isFinite(value) ? value : 1)));
}

export function createArrangementId(prefix: string): string {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}
