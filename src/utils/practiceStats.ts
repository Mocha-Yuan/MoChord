import type { TimeSignature } from "../types/metronome";
import { getMigratedStorageItem } from "./storageMigration";

export type PracticeSession = {
  id: string;
  planId: string;
  title: string;
  chords: string[];
  bpm: number;
  timeSignature: TimeSignature;
  startedAt: string;
  updatedAt: string;
  endedAt?: string;
  durationSeconds: number;
  completedLoops: number;
  targetLoops: number;
  completed: boolean;
  lastChordIndex: number;
  progressPercent: number;
};

export type StartPracticeSessionInput = {
  planId: string;
  title: string;
  chords: string[];
  bpm: number;
  timeSignature: TimeSignature;
  targetLoops: number;
  startedAt?: string;
};

export type PracticeSessionProgressInput = {
  completedLoops?: number;
  lastChordIndex?: number;
  durationSeconds?: number;
  updatedAt?: string;
};

export type StopPracticeSessionInput = {
  endedAt?: string;
  durationSeconds?: number;
  completedLoops?: number;
  lastChordIndex?: number;
};

export type RecentPracticeSessionSummary = {
  id: string;
  planId: string;
  title: string;
  chords: string[];
  bpm: number;
  timeSignatureLabel: string;
  completed: boolean;
  progressPercent: number;
  lastChordIndex: number;
  updatedAt: string;
};

export type HomePracticeSummary = {
  streakDays: number;
  weekMinutes: number;
  todayMinutes: number;
  completionRate: number;
  savedItemCount: number;
  recentSession: RecentPracticeSessionSummary | null;
};

export type LearningDataDay = {
  dateKey: string;
  minutes: number;
  completionRate: number;
  sessionCount: number;
};

export type LearningDataChordCount = {
  name: string;
  count: number;
};

export type LearningDataSessionSummary = RecentPracticeSessionSummary & {
  startedAt: string;
  durationMinutes: number;
  completedLoops: number;
  targetLoops: number;
};

export type LearningDataSummary = {
  totalSessions: number;
  completedSessions: number;
  totalMinutes: number;
  averageCompletionRate: number;
  dailyTrend: LearningDataDay[];
  topChords: LearningDataChordCount[];
  recentSessions: LearningDataSessionSummary[];
};

type PracticeStatsStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const PRACTICE_STATS_STORAGE_KEY = "mochord:practice-sessions";
const LEGACY_PRACTICE_STATS_STORAGE_KEYS = ["chordflow:practice-sessions"];
const MAX_SESSIONS = 200;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function loadPracticeSessions(storage: PracticeStatsStorage | undefined = getDefaultStorage()): PracticeSession[] {
  if (!storage) return [];

  try {
    const raw = getMigratedStorageItem(storage, PRACTICE_STATS_STORAGE_KEY, LEGACY_PRACTICE_STATS_STORAGE_KEYS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPracticeSession).sort(compareSessionUpdatedDesc);
  } catch {
    return [];
  }
}

export function startPracticeSession(
  storage: PracticeStatsStorage | undefined = getDefaultStorage(),
  input: StartPracticeSessionInput,
): PracticeSession {
  const startedAt = input.startedAt ?? new Date().toISOString();
  const session: PracticeSession = normalizePracticeSession({
    id: `practice-session:${startedAt}:${input.planId}`,
    planId: input.planId,
    title: input.title,
    chords: input.chords,
    bpm: input.bpm,
    timeSignature: input.timeSignature,
    startedAt,
    updatedAt: startedAt,
    durationSeconds: 0,
    completedLoops: 0,
    targetLoops: input.targetLoops,
    completed: false,
    lastChordIndex: 0,
    progressPercent: 0,
  });

  savePracticeSessions(storage, [session, ...loadPracticeSessions(storage).filter((item) => item.id !== session.id)]);
  return session;
}

export function updatePracticeSessionProgress(
  storage: PracticeStatsStorage | undefined = getDefaultStorage(),
  sessionId: string,
  input: PracticeSessionProgressInput,
): PracticeSession | null {
  return updatePracticeSession(storage, sessionId, (session) =>
    normalizePracticeSession({
      ...session,
      updatedAt: input.updatedAt ?? new Date().toISOString(),
      durationSeconds: input.durationSeconds ?? session.durationSeconds,
      completedLoops: input.completedLoops ?? session.completedLoops,
      lastChordIndex: input.lastChordIndex ?? session.lastChordIndex,
    }),
  );
}

export function stopPracticeSession(
  storage: PracticeStatsStorage | undefined = getDefaultStorage(),
  sessionId: string,
  input: StopPracticeSessionInput = {},
): PracticeSession | null {
  const endedAt = input.endedAt ?? new Date().toISOString();
  return updatePracticeSession(storage, sessionId, (session) =>
    normalizePracticeSession({
      ...session,
      endedAt,
      updatedAt: endedAt,
      durationSeconds: input.durationSeconds ?? session.durationSeconds,
      completedLoops: input.completedLoops ?? session.completedLoops,
      lastChordIndex: input.lastChordIndex ?? session.lastChordIndex,
      completed: false,
    }),
  );
}

export function finishPracticeSession(
  storage: PracticeStatsStorage | undefined = getDefaultStorage(),
  sessionId: string,
  input: StopPracticeSessionInput = {},
): PracticeSession | null {
  const endedAt = input.endedAt ?? new Date().toISOString();
  return updatePracticeSession(storage, sessionId, (session) =>
    normalizePracticeSession({
      ...session,
      endedAt,
      updatedAt: endedAt,
      durationSeconds: input.durationSeconds ?? session.durationSeconds,
      completedLoops: input.completedLoops ?? session.targetLoops,
      lastChordIndex: input.lastChordIndex ?? session.lastChordIndex,
      completed: true,
    }),
  );
}

export function getHomePracticeSummary(
  storage: PracticeStatsStorage | undefined = getDefaultStorage(),
  options: { now?: string; savedItemCount?: number } = {},
): HomePracticeSummary {
  const sessions = loadPracticeSessions(storage);
  const now = options.now ? new Date(options.now) : new Date();
  const todayKey = getLocalDateKey(now);
  const weekStart = getLocalWeekStart(now);
  const practiceDayKeys = new Set(
    sessions.filter((session) => isEffectivePracticeSession(session)).map((session) => getLocalDateKey(new Date(session.startedAt))),
  );
  const todaySessions = sessions.filter((session) => getLocalDateKey(new Date(session.startedAt)) === todayKey);
  const weekSessions = sessions.filter((session) => new Date(session.startedAt).getTime() >= weekStart.getTime());

  return {
    streakDays: getStreakDays(practiceDayKeys, now),
    weekMinutes: secondsToRoundedMinutes(sumDurationSeconds(weekSessions)),
    todayMinutes: secondsToRoundedMinutes(sumDurationSeconds(todaySessions)),
    completionRate: getCompletionRate(todaySessions),
    savedItemCount: Math.max(0, options.savedItemCount ?? 0),
    recentSession: getRecentSessionSummary(sessions[0] ?? null),
  };
}

export function getLearningDataSummary(
  storage: PracticeStatsStorage | undefined = getDefaultStorage(),
  options: { now?: string; days?: number } = {},
): LearningDataSummary {
  const sessions = loadPracticeSessions(storage);
  const now = options.now ? new Date(options.now) : new Date();
  const days = clampNumber(options.days, 1, 30, 7);
  const recentSessions = sessions.slice(0, 12).map(getLearningSessionSummary);
  const completedSessions = sessions.filter((session) => session.completed).length;
  const totalLoops = sessions.reduce((sum, session) => sum + session.targetLoops, 0);
  const completedLoops = sessions.reduce((sum, session) => sum + session.completedLoops, 0);

  return {
    totalSessions: sessions.length,
    completedSessions,
    totalMinutes: secondsToRoundedMinutes(sumDurationSeconds(sessions)),
    averageCompletionRate: totalLoops > 0 ? Math.round((completedLoops / totalLoops) * 100) : 0,
    dailyTrend: getDailyTrend(sessions, now, days),
    topChords: getTopChords(sessions),
    recentSessions,
  };
}

function updatePracticeSession(
  storage: PracticeStatsStorage | undefined,
  sessionId: string,
  updater: (session: PracticeSession) => PracticeSession,
): PracticeSession | null {
  const sessions = loadPracticeSessions(storage);
  const index = sessions.findIndex((session) => session.id === sessionId);
  if (index < 0) return null;
  const nextSession = updater(sessions[index]);
  const nextSessions = [nextSession, ...sessions.filter((session) => session.id !== sessionId)];
  savePracticeSessions(storage, nextSessions);
  return nextSession;
}

function savePracticeSessions(storage: PracticeStatsStorage | undefined, sessions: PracticeSession[]): void {
  if (!storage) return;
  const normalized = sessions.map(normalizePracticeSession).sort(compareSessionUpdatedDesc).slice(0, MAX_SESSIONS);
  if (normalized.length === 0) {
    storage.removeItem(PRACTICE_STATS_STORAGE_KEY);
    return;
  }
  storage.setItem(PRACTICE_STATS_STORAGE_KEY, JSON.stringify(normalized));
}

function normalizePracticeSession(value: PracticeSession): PracticeSession {
  const targetLoops = clampNumber(value.targetLoops, 1, 128, 1);
  const completedLoops = clampNumber(value.completedLoops, 0, targetLoops, 0);
  const progressPercent = value.completed ? 100 : Math.round((completedLoops / targetLoops) * 100);

  return {
    id: nonEmptyString(value.id, `practice-session:${value.startedAt}:unknown`),
    planId: nonEmptyString(value.planId, "unknown"),
    title: nonEmptyString(value.title, value.chords.join(" - ") || "Practice"),
    chords: normalizeChords(value.chords),
    bpm: clampNumber(value.bpm, 40, 300, 90),
    timeSignature: normalizeTimeSignature(value.timeSignature),
    startedAt: normalizeIsoDate(value.startedAt),
    updatedAt: normalizeIsoDate(value.updatedAt || value.startedAt),
    endedAt: value.endedAt ? normalizeIsoDate(value.endedAt) : undefined,
    durationSeconds: clampNumber(value.durationSeconds, 0, 24 * 60 * 60, 0),
    completedLoops,
    targetLoops,
    completed: Boolean(value.completed),
    lastChordIndex: clampNumber(value.lastChordIndex, 0, Math.max(0, value.chords.length - 1), 0),
    progressPercent,
  };
}

function isPracticeSession(value: unknown): value is PracticeSession {
  if (!value || typeof value !== "object") return false;
  const session = value as PracticeSession;
  return (
    typeof session.id === "string" &&
    typeof session.planId === "string" &&
    typeof session.title === "string" &&
    Array.isArray(session.chords) &&
    session.chords.every((chord) => typeof chord === "string") &&
    typeof session.bpm === "number" &&
    typeof session.timeSignature === "object" &&
    typeof session.startedAt === "string" &&
    typeof session.updatedAt === "string" &&
    typeof session.durationSeconds === "number" &&
    typeof session.completedLoops === "number" &&
    typeof session.targetLoops === "number" &&
    typeof session.completed === "boolean" &&
    typeof session.lastChordIndex === "number" &&
    typeof session.progressPercent === "number"
  );
}

function getRecentSessionSummary(session: PracticeSession | null): RecentPracticeSessionSummary | null {
  if (!session) return null;
  return {
    id: session.id,
    planId: session.planId,
    title: session.title,
    chords: session.chords,
    bpm: session.bpm,
    timeSignatureLabel: `${session.timeSignature.numerator}/${session.timeSignature.denominator}`,
    completed: session.completed,
    progressPercent: session.progressPercent,
    lastChordIndex: session.lastChordIndex,
    updatedAt: session.updatedAt,
  };
}

function getLearningSessionSummary(session: PracticeSession): LearningDataSessionSummary {
  return {
    ...getRecentSessionSummary(session)!,
    startedAt: session.startedAt,
    durationMinutes: secondsToRoundedMinutes(session.durationSeconds),
    completedLoops: session.completedLoops,
    targetLoops: session.targetLoops,
  };
}

function getDailyTrend(sessions: PracticeSession[], now: Date, days: number): LearningDataDay[] {
  const today = startOfLocalDay(now);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today.getTime() - (days - index - 1) * MS_PER_DAY);
    const dateKey = getLocalDateKey(date);
    const daySessions = sessions.filter((session) => getLocalDateKey(new Date(session.startedAt)) === dateKey);

    return {
      dateKey,
      minutes: secondsToRoundedMinutes(sumDurationSeconds(daySessions)),
      completionRate: getCompletionRate(daySessions),
      sessionCount: daySessions.length,
    };
  });
}

function getTopChords(sessions: PracticeSession[]): LearningDataChordCount[] {
  const counts = new Map<string, number>();
  sessions.forEach((session) => {
    session.chords.forEach((chord) => {
      counts.set(chord, (counts.get(chord) ?? 0) + 1);
    });
  });

  return Array.from(counts, ([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 8);
}

function getCompletionRate(sessions: PracticeSession[]): number {
  const effectiveSessions = sessions.filter((session) => isEffectivePracticeSession(session));
  if (effectiveSessions.length === 0) return 0;
  const totalLoops = effectiveSessions.reduce((sum, session) => sum + session.targetLoops, 0);
  if (totalLoops <= 0) return 0;
  const completedLoops = effectiveSessions.reduce((sum, session) => sum + session.completedLoops, 0);
  return Math.round((completedLoops / totalLoops) * 100);
}

function getStreakDays(dayKeys: Set<string>, now: Date): number {
  let streak = 0;
  let cursor = startOfLocalDay(now);

  while (dayKeys.has(getLocalDateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - MS_PER_DAY);
  }

  return streak;
}

function isEffectivePracticeSession(session: PracticeSession): boolean {
  return session.durationSeconds >= 30 || session.completedLoops > 0 || session.completed;
}

function sumDurationSeconds(sessions: PracticeSession[]): number {
  return sessions.reduce((sum, session) => sum + session.durationSeconds, 0);
}

function secondsToRoundedMinutes(seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.round(seconds / 60);
}

function getLocalWeekStart(date: Date): Date {
  const start = startOfLocalDay(date);
  const day = start.getDay();
  const distanceFromMonday = day === 0 ? 6 : day - 1;
  return new Date(start.getTime() - distanceFromMonday * MS_PER_DAY);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeTimeSignature(value: TimeSignature): TimeSignature {
  return {
    numerator: clampNumber(value?.numerator, 1, 12, 4),
    denominator: [2, 4, 8, 16].includes(value?.denominator) ? value.denominator : 4,
  };
}

function normalizeChords(value: string[]): string[] {
  const chords = value.map((chord) => chord.trim()).filter(Boolean);
  return chords.length > 0 ? chords : ["C"];
}

function normalizeIsoDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function compareSessionUpdatedDesc(a: PracticeSession, b: PracticeSession): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function nonEmptyString(value: string | undefined, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getDefaultStorage(): PracticeStatsStorage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}
