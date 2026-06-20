import { supabase } from "../lib/supabase";
import type { MoChordProgress, ProgressMergeResult, UserProgressRecord } from "../types/progress";
import { getMigratedStorageItem, migrateStoragePrefix, toCurrentStorageKey } from "../utils/storageMigration";

type ProgressStorage = Pick<Storage, "getItem" | "setItem" | "removeItem"> & Partial<Pick<Storage, "key" | "length">>;

export const GLOBAL_PROGRESS_KEY = "global_progress";
export const GUEST_BACKUP_PROGRESS_KEY = "guest_backup_before_merge";
export const GUEST_PROGRESS_STORAGE_KEY = "mochord_guest_progress";
export const GUEST_PROGRESS_UPDATED_AT_KEY = "mochord_guest_progress_updated_at";
const LEGACY_GUEST_PROGRESS_STORAGE_KEYS = ["chordflow_guest_progress"];

const WORKSPACE_STATE_STORAGE_KEY = "mochord:workspace-state";
const LIBRARY_STORAGE_KEY = "mochord:library";
const PRACTICE_STATS_STORAGE_KEY = "mochord:practice-sessions";
const TUNING_PRESETS_STORAGE_KEY = "mochord:tuning-presets";
const SAVED_VOICING_PREFIX = "mochord:guitar-voicing:";
const LEGACY_WORKSPACE_STATE_STORAGE_KEYS = ["chordflow:workspace-state"];
const LEGACY_LIBRARY_STORAGE_KEYS = ["chordflow:library"];
const LEGACY_PRACTICE_STATS_STORAGE_KEYS = ["chordflow:practice-sessions"];
const LEGACY_TUNING_PRESETS_STORAGE_KEYS = ["chordflow:tuning-presets"];
const LEGACY_SAVED_VOICING_PREFIX = "chordflow:guitar-voicing:";
const LEGACY_DIRECT_SAVED_VOICING_PREFIX = "chordflow:";
const LEGACY_NON_VOICING_KEYS = new Set([
  "chordflow:language",
  "chordflow:library",
  "chordflow:practice-sessions",
  "chordflow:tuning-presets",
  "chordflow:workspace-state",
]);

export async function loadProgress(progressKey: string): Promise<UserProgressRecord | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("progress_key", progressKey)
    .maybeSingle();

  if (error) throw new Error(getFriendlyProgressError(error.message, "load"));
  return data as UserProgressRecord | null;
}

export async function saveProgress(progressKey: string, progressData: unknown): Promise<UserProgressRecord | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("user_progress")
    .upsert(
      {
        user_id: userId,
        progress_key: progressKey,
        progress_data: progressData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,progress_key" },
    )
    .select("*")
    .single();

  if (error) throw new Error(getFriendlyProgressError(error.message, "save"));
  return data as UserProgressRecord;
}

export async function deleteProgress(progressKey: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const { error } = await supabase.from("user_progress").delete().eq("user_id", userId).eq("progress_key", progressKey);
  if (error) throw new Error(getFriendlyProgressError(error.message, "delete"));
}

export async function loadAllProgress(): Promise<UserProgressRecord[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(getFriendlyProgressError(error.message, "load"));
  return (data ?? []) as UserProgressRecord[];
}

export function buildLocalProgressSnapshot(
  storage: ProgressStorage | undefined = getDefaultStorage(),
  updatedAt = new Date().toISOString(),
): MoChordProgress {
  const workspace = readJson(storage, WORKSPACE_STATE_STORAGE_KEY, LEGACY_WORKSPACE_STATE_STORAGE_KEYS);
  const libraryItems = readJson(storage, LIBRARY_STORAGE_KEY, LEGACY_LIBRARY_STORAGE_KEYS);
  const practiceSessions = readJson(storage, PRACTICE_STATS_STORAGE_KEY, LEGACY_PRACTICE_STATS_STORAGE_KEYS);
  const tuningPresets = readJson(storage, TUNING_PRESETS_STORAGE_KEY, LEGACY_TUNING_PRESETS_STORAGE_KEYS);

  return {
    version: 1,
    updatedAt,
    ...(isObject(workspace) ? { workspace } : {}),
    ...(Array.isArray(libraryItems) ? { libraryItems } : {}),
    ...(Array.isArray(practiceSessions) ? { practiceSessions } : {}),
    ...(Array.isArray(tuningPresets) ? { tuningPresets } : {}),
    ...buildDerivedProgressFields(workspace, libraryItems, practiceSessions),
    savedVoicings: readSavedVoicings(storage),
  };
}

export function writeLocalProgressSnapshot(
  storage: ProgressStorage | undefined = getDefaultStorage(),
  progress: MoChordProgress,
): void {
  if (!storage) return;

  const updatedAt = progress.updatedAt ?? new Date().toISOString();
  storage.setItem(GUEST_PROGRESS_STORAGE_KEY, JSON.stringify({ ...progress, updatedAt }));
  storage.setItem(GUEST_PROGRESS_UPDATED_AT_KEY, updatedAt);

  if (progress.workspace) storage.setItem(WORKSPACE_STATE_STORAGE_KEY, JSON.stringify(progress.workspace));
  if (progress.libraryItems) storage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(progress.libraryItems));
  if (progress.practiceSessions) storage.setItem(PRACTICE_STATS_STORAGE_KEY, JSON.stringify(progress.practiceSessions));
  if (progress.tuningPresets) storage.setItem(TUNING_PRESETS_STORAGE_KEY, JSON.stringify(progress.tuningPresets));

  Object.entries(progress.savedVoicings ?? {}).forEach(([key, value]) => {
    const storageKey = toCurrentStorageKey(key);
    if (storageKey.startsWith(SAVED_VOICING_PREFIX)) storage.setItem(storageKey, JSON.stringify(value));
  });
}

export function loadGuestProgress(
  storage: ProgressStorage | undefined = getDefaultStorage(),
): MoChordProgress | null {
  const stored = readJson(storage, GUEST_PROGRESS_STORAGE_KEY, LEGACY_GUEST_PROGRESS_STORAGE_KEYS);
  if (!isObject(stored)) return null;
  return normalizeProgressPayload(stored);
}

export function saveGuestProgress(
  progress: MoChordProgress,
  storage: ProgressStorage | undefined = getDefaultStorage(),
): void {
  writeLocalProgressSnapshot(storage, progress);
}

export function mergeProgressPayloads(
  localProgress: MoChordProgress | null,
  cloudProgress: MoChordProgress | null,
): ProgressMergeResult {
  if (!localProgress && !cloudProgress) return { strategy: "empty", progress: null };
  if (localProgress && !cloudProgress) return { strategy: "local-only", progress: localProgress };
  if (!localProgress && cloudProgress) return { strategy: "cloud-only", progress: cloudProgress };

  const localTime = getTimestamp(localProgress?.updatedAt);
  const cloudTime = getTimestamp(cloudProgress?.updatedAt);

  if (localTime !== null && cloudTime !== null) {
    return localTime > cloudTime
      ? { strategy: "local-newer", progress: localProgress }
      : { strategy: "cloud-newer", progress: cloudProgress };
  }

  return {
    strategy: "cloud-with-backup",
    progress: cloudProgress,
    backup: localProgress ?? undefined,
  };
}

function buildDerivedProgressFields(
  workspace: unknown,
  libraryItems: unknown,
  practiceSessions: unknown,
): Partial<MoChordProgress> {
  const sessions = Array.isArray(practiceSessions) ? practiceSessions : [];
  const totalPracticeMinutes = sessions.reduce((sum, session) => {
    if (!isObject(session) || typeof session.durationSeconds !== "number") return sum;
    return sum + Math.round(session.durationSeconds / 60);
  }, 0);
  const practiceUpdateTimes = sessions
    .map((session) => (isObject(session) && typeof session.updatedAt === "string" ? session.updatedAt : ""))
    .filter(Boolean)
    .sort();
  const lastPracticeAt = practiceUpdateTimes[practiceUpdateTimes.length - 1];
  const savedChordProgressions = Array.isArray(libraryItems)
    ? libraryItems
        .filter((item): item is Record<string, unknown> => isObject(item) && Array.isArray(item.chords))
        .map((item) => ({
          id: String(item.id ?? ""),
          title: String(item.title ?? ""),
          key: "",
          progression: (item.chords as string[]).join(" - "),
          chords: (item.chords as string[]).filter((chord) => typeof chord === "string"),
          createdAt: String(item.createdAt ?? ""),
          updatedAt: String(item.updatedAt ?? ""),
        }))
    : undefined;

  return {
    currentPracticeMode: isObject(workspace) && typeof workspace.activePage === "string" ? workspace.activePage : null,
    practiceStats: {
      totalPracticeCount: sessions.length,
      totalPracticeMinutes,
      ...(lastPracticeAt ? { lastPracticeAt } : {}),
    },
    ...(savedChordProgressions ? { savedChordProgressions } : {}),
    ...(isObject(workspace) && typeof workspace.bpm === "number" && isObject(workspace.timeSignature)
      ? {
          metronomeSettings: {
            bpm: workspace.bpm,
            timeSignature: `${workspace.timeSignature.numerator}/${workspace.timeSignature.denominator}`,
          },
        }
      : {}),
    ...(isObject(workspace) && typeof workspace.referenceA === "number" && typeof workspace.tuningPresetId === "string"
      ? {
          tunerSettings: {
            referencePitch: workspace.referenceA,
            tuning: workspace.tuningPresetId,
          },
        }
      : {}),
  };
}

function normalizeProgressPayload(value: Record<string, unknown>): MoChordProgress {
  return {
    ...value,
    version: 1,
  } as MoChordProgress;
}

function readSavedVoicings(storage: ProgressStorage | undefined): Record<string, unknown> {
  if (!storage?.key || typeof storage.length !== "number") return {};
  migrateStoragePrefix(storage, SAVED_VOICING_PREFIX, LEGACY_SAVED_VOICING_PREFIX);
  migrateLegacyDirectSavedVoicings(storage);

  const voicings: Record<string, unknown> = {};
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(SAVED_VOICING_PREFIX)) continue;
    const value = readJson(storage, key);
    if (value !== null) voicings[key] = value;
  }
  return voicings;
}

function migrateLegacyDirectSavedVoicings(storage: ProgressStorage): void {
  if (!storage.key || typeof storage.length !== "number") return;

  const legacyKeys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(LEGACY_DIRECT_SAVED_VOICING_PREFIX) && !LEGACY_NON_VOICING_KEYS.has(key)) {
      legacyKeys.push(key);
    }
  }

  legacyKeys.forEach((legacyKey) => {
    const raw = storage.getItem(legacyKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (!isSavedVoicingPayload(parsed)) return;

      const key = `${SAVED_VOICING_PREFIX}${legacyKey.slice(LEGACY_DIRECT_SAVED_VOICING_PREFIX.length)}`;
      if (storage.getItem(key) === null) storage.setItem(key, raw);
    } catch {
      // Ignore unrelated legacy chordflow:* entries.
    }
  });
}

function isSavedVoicingPayload(value: unknown): boolean {
  return isObject(value) && Array.isArray(value.frets) && value.frets.length === 6;
}

function readJson(storage: ProgressStorage | undefined, key: string, legacyKeys: string[] = []): unknown {
  if (!storage) return null;
  try {
    const raw = getMigratedStorageItem(storage, key, legacyKeys);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getTimestamp(value: string | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

function getFriendlyProgressError(message: string, action: "load" | "save" | "delete"): string {
  const lower = message.toLowerCase();
  if (lower.includes("row-level security") || lower.includes("permission")) {
    return "Sync failed because database permissions are not configured correctly.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Sync failed because the network is unavailable.";
  }
  if (action === "load") return "Unable to load cloud progress.";
  if (action === "delete") return "Unable to delete cloud progress.";
  return "Sync failed. Current progress has been kept locally.";
}

function getDefaultStorage(): ProgressStorage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}
