import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-practice-stats-"));
const bundlePath = resolve(tempDir, "practiceStats.bundle.mjs");

await build({
  entryPoints: [resolve(rootDir, "src", "utils", "practiceStats.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
  logLevel: "silent",
});

const {
  finishPracticeSession,
  getHomePracticeSummary,
  getLearningDataSummary,
  loadPracticeSessions,
  startPracticeSession,
  stopPracticeSession,
  updatePracticeSessionProgress,
} = await import(pathToFileURL(bundlePath).href);

try {
  const storage = createMemoryStorage();

  assert.deepEqual(loadPracticeSessions(storage), []);

  const legacyStorage = createMemoryStorage();
  legacyStorage.setItem(
    "chordflow:practice-sessions",
    JSON.stringify([
      {
        id: "practice-session:legacy",
        planId: "legacy",
        title: "Legacy session",
        chords: ["C", "G"],
        bpm: 80,
        timeSignature: { numerator: 4, denominator: 4 },
        startedAt: "2026-06-08T09:00:00.000Z",
        updatedAt: "2026-06-08T09:03:00.000Z",
        durationSeconds: 180,
        completedLoops: 1,
        targetLoops: 2,
        completed: false,
        lastChordIndex: 1,
        progressPercent: 50,
      },
    ]),
  );
  assert.equal(loadPracticeSessions(legacyStorage)[0].title, "Legacy session");
  assert.match(legacyStorage.getItem("mochord:practice-sessions") ?? "", /Legacy session/);

  const monday = "2026-06-08T09:00:00.000Z";
  const session = startPracticeSession(storage, {
    planId: "practice-1",
    title: "G - D - Em - C",
    chords: ["G", "D", "Em", "C"],
    bpm: 90,
    timeSignature: { numerator: 4, denominator: 4 },
    targetLoops: 3,
    startedAt: monday,
  });

  assert.equal(session.completed, false);
  assert.equal(session.completedLoops, 0);
  assert.equal(session.targetLoops, 3);
  assert.equal(loadPracticeSessions(storage).length, 1);

  updatePracticeSessionProgress(storage, session.id, {
    completedLoops: 1,
    lastChordIndex: 2,
    durationSeconds: 180,
    updatedAt: "2026-06-08T09:03:00.000Z",
  });

  const stopped = stopPracticeSession(storage, session.id, {
    endedAt: "2026-06-08T09:05:00.000Z",
    durationSeconds: 300,
    lastChordIndex: 3,
  });

  assert.equal(stopped?.completed, false);
  assert.equal(stopped?.progressPercent, 33);
  assert.equal(stopped?.lastChordIndex, 3);

  const completed = finishPracticeSession(storage, session.id, {
    endedAt: "2026-06-08T09:09:00.000Z",
    durationSeconds: 540,
    completedLoops: 3,
  });

  assert.equal(completed?.completed, true);
  assert.equal(completed?.progressPercent, 100);

  startPracticeSession(storage, {
    planId: "practice-2",
    title: "Am - F - C - G",
    chords: ["Am", "F", "C", "G"],
    bpm: 82,
    timeSignature: { numerator: 3, denominator: 4 },
    targetLoops: 2,
    startedAt: "2026-06-09T10:00:00.000Z",
  });
  finishPracticeSession(storage, "practice-session:2026-06-09T10:00:00.000Z:practice-2", {
    endedAt: "2026-06-09T10:04:00.000Z",
    durationSeconds: 240,
    completedLoops: 2,
  });

  const today = startPracticeSession(storage, {
    planId: "practice-3",
    title: "C - G - Am - F",
    chords: ["C", "G", "Am", "F"],
    bpm: 74,
    timeSignature: { numerator: 4, denominator: 4 },
    targetLoops: 4,
    startedAt: "2026-06-12T11:00:00.000Z",
  });
  updatePracticeSessionProgress(storage, today.id, {
    completedLoops: 2,
    lastChordIndex: 1,
    durationSeconds: 360,
    updatedAt: "2026-06-12T11:06:00.000Z",
  });

  const summary = getHomePracticeSummary(storage, {
    now: "2026-06-12T12:00:00.000Z",
    savedItemCount: 5,
  });

  assert.equal(summary.streakDays, 1);
  assert.equal(summary.weekMinutes, 19);
  assert.equal(summary.todayMinutes, 6);
  assert.equal(summary.completionRate, 50);
  assert.equal(summary.savedItemCount, 5);
  assert.equal(summary.recentSession?.title, "C - G - Am - F");
  assert.equal(summary.recentSession?.progressPercent, 50);
  assert.equal(summary.recentSession?.timeSignatureLabel, "4/4");

  finishPracticeSession(storage, today.id, {
    endedAt: "2026-06-12T11:08:00.000Z",
    durationSeconds: 480,
    completedLoops: 4,
  });

  const completedToday = getHomePracticeSummary(storage, {
    now: "2026-06-12T12:00:00.000Z",
    savedItemCount: 5,
  });

  assert.equal(completedToday.todayMinutes, 8);
  assert.equal(completedToday.completionRate, 100);
  assert.equal(completedToday.recentSession?.completed, true);

  const learning = getLearningDataSummary(storage, {
    now: "2026-06-12T12:00:00.000Z",
    days: 7,
  });

  assert.equal(learning.totalSessions, 3);
  assert.equal(learning.completedSessions, 3);
  assert.equal(learning.totalMinutes, 21);
  assert.equal(learning.dailyTrend.length, 7);
  assert.equal(learning.dailyTrend.at(-1)?.dateKey, "2026-06-12");
  assert.equal(learning.dailyTrend.at(-1)?.minutes, 8);
  assert.equal(learning.dailyTrend.at(-1)?.completionRate, 100);
  assert.deepEqual(learning.topChords[0], { name: "C", count: 3 });
  assert.equal(learning.recentSessions[0].title, "C - G - Am - F");
  assert.equal(learning.recentSessions[0].progressPercent, 100);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}
