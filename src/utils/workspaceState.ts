import type { TimeSignature } from "../types/metronome";
import type { ScaleMode } from "../types/music";
import type { AppPage } from "../pages/pageTypes";
import type { TuningPresetId } from "../types/tuner";
import { getMigratedStorageItem } from "./storageMigration";
import { DEFAULT_CUSTOM_TUNING, REFERENCE_A_RANGE } from "./tunerEngine";

export type WorkspaceState = {
  activePage: AppPage;
  chordName: string;
  bpm: number;
  timeSignature: TimeSignature;
  accentFirstBeat: boolean;
  countInBars: number;
  metronomeDuringPlayback: boolean;
  selectedKey: string;
  selectedMode: ScaleMode;
  tuningPresetId: TuningPresetId;
  customPitches: string[];
  referenceA: number;
  recentChords: string[];
  recentProgressions: string[];
};

type StateStorage = Pick<Storage, "getItem" | "setItem">;

const WORKSPACE_STATE_STORAGE_KEY = "mochord:workspace-state";
const LEGACY_WORKSPACE_STATE_STORAGE_KEYS = ["chordflow:workspace-state"];
const MAX_RECENT_ITEMS = 8;
const PAGES: AppPage[] = ["home", "chords", "practice", "arranger", "metronome", "tuner", "learning"];
const MODES: ScaleMode[] = ["Major", "Natural Minor", "Dorian", "Mixolydian"];

export const DEFAULT_WORKSPACE_STATE: WorkspaceState = {
  activePage: "home",
  chordName: "C",
  bpm: 90,
  timeSignature: { numerator: 4, denominator: 4 },
  accentFirstBeat: true,
  countInBars: 0,
  metronomeDuringPlayback: true,
  selectedKey: "C",
  selectedMode: "Major",
  tuningPresetId: "standard",
  customPitches: [...DEFAULT_CUSTOM_TUNING],
  referenceA: REFERENCE_A_RANGE.default,
  recentChords: [],
  recentProgressions: [],
};

export function loadWorkspaceState(storage: StateStorage | undefined = getDefaultStorage()): WorkspaceState {
  if (!storage) return DEFAULT_WORKSPACE_STATE;

  try {
    const raw = getMigratedStorageItem(storage, WORKSPACE_STATE_STORAGE_KEY, LEGACY_WORKSPACE_STATE_STORAGE_KEYS);
    if (!raw) return DEFAULT_WORKSPACE_STATE;
    return normalizeWorkspaceState(JSON.parse(raw));
  } catch {
    return DEFAULT_WORKSPACE_STATE;
  }
}

export function saveWorkspaceState(
  storage: StateStorage | undefined = getDefaultStorage(),
  state: WorkspaceState,
): void {
  if (!storage) return;
  storage.setItem(WORKSPACE_STATE_STORAGE_KEY, JSON.stringify(normalizeWorkspaceState(state)));
}

export function updateRecentChord(state: WorkspaceState, chordName: string): WorkspaceState {
  return {
    ...state,
    recentChords: updateRecentList(state.recentChords, chordName),
  };
}

export function updateRecentProgression(state: WorkspaceState, progression: string): WorkspaceState {
  return {
    ...state,
    recentProgressions: updateRecentList(state.recentProgressions, progression),
  };
}

function normalizeWorkspaceState(value: Partial<WorkspaceState>): WorkspaceState {
  return {
    activePage: PAGES.includes(value.activePage as AppPage) ? (value.activePage as AppPage) : DEFAULT_WORKSPACE_STATE.activePage,
    chordName: nonEmptyString(value.chordName, DEFAULT_WORKSPACE_STATE.chordName),
    bpm: clampNumber(value.bpm, 40, 300, DEFAULT_WORKSPACE_STATE.bpm),
    timeSignature: normalizeTimeSignature(value.timeSignature),
    accentFirstBeat: typeof value.accentFirstBeat === "boolean" ? value.accentFirstBeat : DEFAULT_WORKSPACE_STATE.accentFirstBeat,
    countInBars: clampNumber(value.countInBars, 0, 4, DEFAULT_WORKSPACE_STATE.countInBars),
    metronomeDuringPlayback:
      typeof value.metronomeDuringPlayback === "boolean"
        ? value.metronomeDuringPlayback
        : DEFAULT_WORKSPACE_STATE.metronomeDuringPlayback,
    selectedKey: nonEmptyString(value.selectedKey, DEFAULT_WORKSPACE_STATE.selectedKey),
    selectedMode: MODES.includes(value.selectedMode as ScaleMode) ? (value.selectedMode as ScaleMode) : DEFAULT_WORKSPACE_STATE.selectedMode,
    tuningPresetId: nonEmptyString(value.tuningPresetId, DEFAULT_WORKSPACE_STATE.tuningPresetId) as TuningPresetId,
    customPitches: normalizePitches(value.customPitches),
    referenceA: clampNumber(value.referenceA, REFERENCE_A_RANGE.min, REFERENCE_A_RANGE.max, DEFAULT_WORKSPACE_STATE.referenceA),
    recentChords: normalizeRecentList(value.recentChords),
    recentProgressions: normalizeRecentList(value.recentProgressions),
  };
}

function normalizeTimeSignature(value: TimeSignature | undefined): TimeSignature {
  if (!value) return DEFAULT_WORKSPACE_STATE.timeSignature;
  return {
    numerator: clampNumber(value.numerator, 1, 16, DEFAULT_WORKSPACE_STATE.timeSignature.numerator),
    denominator: [2, 4, 8, 16].includes(value.denominator) ? value.denominator : DEFAULT_WORKSPACE_STATE.timeSignature.denominator,
  };
}

function normalizePitches(value: string[] | undefined): string[] {
  if (!Array.isArray(value) || value.length !== 6 || value.some((pitch) => typeof pitch !== "string" || !pitch.trim())) {
    return [...DEFAULT_WORKSPACE_STATE.customPitches];
  }
  return value.map((pitch) => pitch.trim());
}

function normalizeRecentList(value: string[] | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, MAX_RECENT_ITEMS);
}

function updateRecentList(items: string[], item: string): string[] {
  const trimmed = item.trim();
  if (!trimmed) return items;
  return [trimmed, ...items.filter((candidate) => candidate !== trimmed)].slice(0, MAX_RECENT_ITEMS);
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function nonEmptyString(value: string | undefined, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getDefaultStorage(): StateStorage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}
