import type {
  SongArrangement,
  SongArrangementDifficulty,
  SongArrangementStyle,
  SongArrangementTimeSignature,
  SongLyricLine,
  SongSection,
} from "../types/songArrangement";
import type {
  AISongDraftResult,
  AISongDraftSection,
  SongDraftGenerationResult,
  SongDraftGenerationSource,
  SongDraftLength,
  SongDraftLyricLanguage,
  SongDraftRequest,
} from "../types/songDraft";
import {
  clampArrangementBpm,
  clampBarsPerChord,
  clampRepeatCount,
  createArrangementId,
  normalizeSection,
  validateArrangement,
} from "./songArrangement";

const TIME_SIGNATURES: SongArrangementTimeSignature[] = ["4/4", "3/4", "6/8"];
const STYLES: SongArrangementStyle[] = ["pop", "folk", "ballad", "rock", "worship", "city-pop", "campfire"];
const DIFFICULTIES: SongArrangementDifficulty[] = ["beginner", "intermediate", "advanced"];

type RawSongDraftSection = {
  name?: unknown;
  chords?: unknown;
  barsPerChord?: unknown;
  repeatCount?: unknown;
  rhythmPattern?: unknown;
  notes?: unknown;
  lyricLines?: unknown;
};

type RawSongDraftResult = Partial<Omit<AISongDraftResult, "sections">> & {
  title?: unknown;
  key?: unknown;
  bpm?: unknown;
  timeSignature?: unknown;
  style?: unknown;
  difficulty?: unknown;
  sections?: unknown;
  notes?: unknown;
  warnings?: unknown;
};

export function createDefaultSongDraftRequest(
  currentArrangement: SongArrangement,
  lyricLanguage: SongDraftLyricLanguage,
): SongDraftRequest {
  return {
    prompt: "",
    lyricLanguage,
    style: currentArrangement.style,
    key: currentArrangement.key,
    difficulty: currentArrangement.difficulty,
    bpm: currentArrangement.bpm,
    timeSignature: currentArrangement.timeSignature,
    generateLyrics: true,
    length: "standard",
  };
}

export function coerceSongDraftResult(
  rawDraft: unknown,
  request: SongDraftRequest,
  source: SongDraftGenerationSource,
): SongDraftGenerationResult {
  const raw = isRecord(rawDraft) ? (rawDraft as RawSongDraftResult) : {};
  const arrangement: SongArrangement = {
    id: createArrangementId("arrangement"),
    title: readString(raw.title, request.prompt.trim() || "Untitled Song Draft"),
    key: readString(raw.key, request.key),
    bpm: clampArrangementBpm(readNumber(raw.bpm, request.bpm)),
    timeSignature: readOption(raw.timeSignature, TIME_SIGNATURES, request.timeSignature),
    style: readOption(raw.style, STYLES, request.style),
    difficulty: readOption(raw.difficulty, DIFFICULTIES, request.difficulty),
    sections: coerceSections(raw.sections, request),
  };

  return {
    source,
    arrangement,
    notes: readStringArray(raw.notes),
    warnings: readStringArray(raw.warnings),
  };
}

export function createLocalFallbackSongDraft(request: SongDraftRequest, warning?: string): SongDraftGenerationResult {
  const title = request.prompt.trim() || `${request.style} song draft`;
  const sections = getFallbackSectionNames(request.length).map((name, index) =>
    normalizeSection({
      id: createArrangementId("section"),
      name,
      chords: getFallbackChords(request.key, index),
      barsPerChord: request.timeSignature === "6/8" ? 2 : 1,
      repeatCount: name === "Bridge" ? 1 : 2,
      rhythmPattern: request.timeSignature === "6/8" ? "Gentle 6/8 pulse" : "Steady strum",
      notes: "",
    }),
  );
  const warnings = [warning, request.generateLyrics ? "Lyrics require AI generation and were left empty in the local fallback." : ""]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return {
    source: "fallback",
    arrangement: {
      id: createArrangementId("arrangement"),
      title,
      key: request.key,
      bpm: clampArrangementBpm(request.bpm),
      timeSignature: request.timeSignature,
      style: request.style,
      difficulty: request.difficulty,
      sections,
    },
    notes: [],
    warnings,
  };
}

export function validateSongDraftArrangement(arrangement: SongArrangement): string[] {
  return validateArrangement(arrangement).errors;
}

function coerceSections(rawSections: unknown, request: SongDraftRequest): SongSection[] {
  const sections = Array.isArray(rawSections) ? rawSections.filter(isRecord) : [];
  const normalized = sections
    .map((section, index) => coerceSection(section as RawSongDraftSection, request, index))
    .filter((section) => section.chords.length > 0);
  if (normalized.length > 0 && validateArrangement(createArrangementForSections(request, normalized)).errors.length === 0) {
    return normalized;
  }

  return createLocalFallbackSongDraft({ ...request, generateLyrics: false }).arrangement.sections;
}

function createArrangementForSections(request: SongDraftRequest, sections: SongSection[]): SongArrangement {
  return {
    id: createArrangementId("arrangement"),
    title: "Draft",
    key: request.key,
    bpm: request.bpm,
    timeSignature: request.timeSignature,
    style: request.style,
    difficulty: request.difficulty,
    sections,
  };
}

function coerceSection(raw: RawSongDraftSection | AISongDraftSection, request: SongDraftRequest, index: number): SongSection {
  const lyricLines = request.generateLyrics ? coerceLyricLines(raw.lyricLines) : undefined;
  return normalizeSection({
    id: createArrangementId("section"),
    name: readString(raw.name, `Section ${index + 1}`),
    chords: readStringArray(raw.chords),
    lyricLines,
    barsPerChord: clampBarsPerChord(readNumber(raw.barsPerChord, 1)),
    repeatCount: clampRepeatCount(readNumber(raw.repeatCount, 1)),
    rhythmPattern: readString(raw.rhythmPattern, "Steady strum"),
    notes: readString(raw.notes, ""),
  });
}

function coerceLyricLines(rawLyricLines: unknown): SongLyricLine[] | undefined {
  if (!Array.isArray(rawLyricLines)) return undefined;
  const lines = rawLyricLines.filter(isRecord).flatMap((line) => {
    const text = readString(line.text, "");
    const chords = normalizeSection({
      id: createArrangementId("section"),
      name: "Lyric",
      chords: readStringArray(line.chords),
      barsPerChord: 1,
      repeatCount: 1,
      rhythmPattern: "Steady strum",
    }).chords;

    if (!text || chords.length === 0) return [];
    return [{ id: createArrangementId("lyric-line"), text, chords }];
  });

  return lines.length > 0 ? lines : undefined;
}

function getFallbackSectionNames(length: SongDraftLength): string[] {
  if (length === "short") return ["Verse", "Chorus"];
  if (length === "full") return ["Verse", "Pre-Chorus", "Chorus", "Bridge", "Final Chorus"];
  return ["Verse", "Chorus", "Bridge"];
}

function getFallbackChords(key: string, sectionIndex: number): string[] {
  const fallbackByKey: Record<string, string[]> = {
    C: ["C", "G", "Am", "F"],
    D: ["D", "A", "Bm", "G"],
    E: ["E", "B", "C#m", "A"],
    F: ["F", "C", "Dm", "Bb"],
    G: ["G", "D", "Em", "C"],
    A: ["A", "E", "F#m", "D"],
    B: ["B", "F#", "G#m", "E"],
  };
  const chords = fallbackByKey[key] ?? fallbackByKey.G;
  if (sectionIndex % 3 === 1) return [chords[3], chords[0], chords[1], chords[0]];
  if (sectionIndex % 3 === 2) return [chords[2], chords[3], chords[0], chords[1]];
  return chords;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function readOption<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && options.includes(value as T) ? (value as T) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
