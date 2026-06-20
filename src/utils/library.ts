import type { PracticePlanSource } from "../types/practice";
import type { PracticeCoachPlan, ProgressionLevel } from "../types/progression";
import type { SongArrangement, SongPracticeLyricRow } from "../types/songArrangement";
import { getMigratedStorageItem } from "./storageMigration";

export type SavedLibraryItemType = "progression" | "practice" | "arrangement";

export type SavedLibraryItem = {
  id: string;
  type: SavedLibraryItemType;
  title: string;
  chords: string[];
  lyricRows?: SongPracticeLyricRow[];
  level: ProgressionLevel;
  source: PracticePlanSource;
  coach?: PracticeCoachPlan;
  arrangement?: SongArrangement;
  createdAt: string;
  updatedAt: string;
};

type LibraryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const LIBRARY_STORAGE_KEY = "mochord:library";
const LEGACY_LIBRARY_STORAGE_KEYS = ["chordflow:library"];

export function loadSavedLibraryItems(storage: LibraryStorage | undefined = getDefaultStorage()): SavedLibraryItem[] {
  if (!storage) return [];

  try {
    const raw = getMigratedStorageItem(storage, LIBRARY_STORAGE_KEY, LEGACY_LIBRARY_STORAGE_KEYS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isLibraryItem).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export function saveLibraryItem(
  storage: LibraryStorage | undefined = getDefaultStorage(),
  item: Omit<SavedLibraryItem, "id" | "createdAt" | "updatedAt"> & Partial<Pick<SavedLibraryItem, "id" | "createdAt">>,
): SavedLibraryItem {
  const now = new Date().toISOString();
  const saved: SavedLibraryItem = {
    id: item.id ?? `library:${now}:${item.title}`,
    type: item.type,
    title: item.title.trim() || item.chords.join(" - "),
    chords: item.chords.map((chord) => chord.trim()).filter(Boolean),
    lyricRows: item.lyricRows,
    level: item.level,
    source: item.source,
    coach: item.coach,
    arrangement: item.arrangement,
    createdAt: item.createdAt ?? now,
    updatedAt: now,
  };

  if (!storage) return saved;

  const items = loadSavedLibraryItems(storage);
  const nextItems = [saved, ...items.filter((candidate) => candidate.id !== saved.id)];
  storage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(nextItems));
  return saved;
}

export function deleteSavedLibraryItem(storage: LibraryStorage | undefined = getDefaultStorage(), id: string): void {
  if (!storage) return;
  const nextItems = loadSavedLibraryItems(storage).filter((item) => item.id !== id);
  if (nextItems.length === 0) {
    storage.removeItem(LIBRARY_STORAGE_KEY);
    return;
  }
  storage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(nextItems));
}

function isLibraryItem(value: unknown): value is SavedLibraryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as SavedLibraryItem;
  return (
    typeof item.id === "string" &&
    (item.type === "progression" || item.type === "practice" || item.type === "arrangement") &&
    typeof item.title === "string" &&
    Array.isArray(item.chords) &&
    item.chords.every((chord) => typeof chord === "string") &&
    (item.lyricRows === undefined ||
      (Array.isArray(item.lyricRows) && item.lyricRows.every(isSongPracticeLyricRow))) &&
    (item.level === "beginner" || item.level === "professional") &&
    (item.source === "manual" || item.source === "local" || item.source === "ai") &&
    (item.coach === undefined || typeof item.coach === "object") &&
    (item.type !== "arrangement" || isSongArrangement(item.arrangement)) &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string"
  );
}

function isSongPracticeLyricRow(value: unknown): value is SongPracticeLyricRow {
  if (!value || typeof value !== "object") return false;
  const row = value as SongPracticeLyricRow;

  return (
    typeof row.sectionId === "string" &&
    typeof row.sectionName === "string" &&
    typeof row.lineId === "string" &&
    typeof row.text === "string" &&
    Array.isArray(row.chords) &&
    row.chords.every((chord) => typeof chord === "string")
  );
}

function isSongArrangement(value: unknown): value is SongArrangement {
  if (!value || typeof value !== "object") return false;
  const arrangement = value as SongArrangement;
  return (
    typeof arrangement.id === "string" &&
    typeof arrangement.title === "string" &&
    typeof arrangement.key === "string" &&
    typeof arrangement.bpm === "number" &&
    (arrangement.timeSignature === "4/4" ||
      arrangement.timeSignature === "3/4" ||
      arrangement.timeSignature === "6/8") &&
    isSongArrangementStyle(arrangement.style) &&
    isSongArrangementDifficulty(arrangement.difficulty) &&
    Array.isArray(arrangement.sections) &&
    arrangement.sections.every(isSongSection)
  );
}

function isSongSection(section: unknown): section is SongArrangement["sections"][number] {
  if (!section || typeof section !== "object") return false;
  const candidate = section as SongArrangement["sections"][number];

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    Array.isArray(candidate.chords) &&
    candidate.chords.every((chord) => typeof chord === "string") &&
    (candidate.lyricLines === undefined ||
      (Array.isArray(candidate.lyricLines) && candidate.lyricLines.every(isSongLyricLine))) &&
    typeof candidate.barsPerChord === "number" &&
    typeof candidate.repeatCount === "number" &&
    typeof candidate.rhythmPattern === "string"
  );
}

function isSongLyricLine(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const line = value as { id?: unknown; text?: unknown; chords?: unknown };

  return (
    typeof line.id === "string" &&
    typeof line.text === "string" &&
    Array.isArray(line.chords) &&
    line.chords.every((chord) => typeof chord === "string")
  );
}

function isSongArrangementStyle(value: unknown): value is SongArrangement["style"] {
  return (
    value === "pop" ||
    value === "folk" ||
    value === "ballad" ||
    value === "rock" ||
    value === "worship" ||
    value === "city-pop" ||
    value === "campfire"
  );
}

function isSongArrangementDifficulty(value: unknown): value is SongArrangement["difficulty"] {
  return value === "beginner" || value === "intermediate" || value === "advanced";
}

function getDefaultStorage(): LibraryStorage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}
