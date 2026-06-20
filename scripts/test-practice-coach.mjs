import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-tests-"));
const coachBundlePath = resolve(tempDir, "practiceCoach.bundle.mjs");
const practiceModeBundlePath = resolve(tempDir, "practiceMode.bundle.mjs");

await build({
  entryPoints: [resolve(rootDir, "src", "utils", "practiceCoach.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: coachBundlePath,
  logLevel: "silent",
});

await build({
  entryPoints: [resolve(rootDir, "src", "utils", "practiceMode.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: practiceModeBundlePath,
  logLevel: "silent",
});

const { coercePracticeCoachPlan, createDefaultPracticeCoachPlan } = await import(pathToFileURL(coachBundlePath).href);
const { createPracticePlanFromChords } = await import(pathToFileURL(practiceModeBundlePath).href);

try {
  const fallback = createDefaultPracticeCoachPlan({
    input: "I want a warm beginner chorus in C",
    key: "C",
    level: "beginner",
  });

  assert.equal(fallback.skillLevel, "beginner");
  assert.equal(fallback.startingBpm, 72);
  assert.equal(fallback.barsPerChord, 1);
  assert.equal(fallback.loopCount, 3);
  assert.equal(fallback.bpmIncreasePerLoop, 4);
  assert.equal(fallback.goals.length, 3);
  assert.match(fallback.demoNarrative, /coach/i);

  const zhFallback = createDefaultPracticeCoachPlan({
    input: "我想写一段适合新手的 C 调温暖副歌",
    key: "C",
    level: "beginner",
    language: "zh",
  });

  const zhFallbackText = [
    zhFallback.style,
    zhFallback.rhythmPattern,
    zhFallback.demoNarrative,
    ...zhFallback.goals,
  ].join("\n");

  assert.equal(zhFallback.skillLevel, "beginner");
  assert.match(zhFallback.style, /C 调/);
  assert.match(zhFallback.demoNarrative, /AI 教练/);
  assert.match(zhFallback.goals[0], /^第 1 轮/);
  assert.doesNotMatch(zhFallbackText, /Round|coach turns|warm pop|eighth-note|guitar practice/i);

  const coerced = coercePracticeCoachPlan(
    {
      style: "City pop sparkle",
      skillLevel: "expert",
      rhythmPattern: "syncopated sixteenth-note groove",
      startingBpm: 999,
      barsPerChord: 3,
      loopCount: 99,
      bpmIncreasePerLoop: -10,
      goals: ["Learn the order", "", 42, "Keep the pulse"],
      demoNarrative: "A one-minute judge-friendly flow.",
    },
    fallback,
  );

  assert.equal(coerced.style, "City pop sparkle");
  assert.equal(coerced.skillLevel, "beginner");
  assert.equal(coerced.rhythmPattern, "syncopated sixteenth-note groove");
  assert.equal(coerced.startingBpm, 180);
  assert.equal(coerced.barsPerChord, 1);
  assert.equal(coerced.loopCount, 6);
  assert.equal(coerced.bpmIncreasePerLoop, 0);
  assert.deepEqual(coerced.goals, ["Learn the order", "Keep the pulse"]);
  assert.equal(coerced.demoNarrative, "A one-minute judge-friendly flow.");

  const plan = createPracticePlanFromChords("\u6559\u7ec3\u7ec3\u4e60", ["C", "G", "Am", "F"], "ai", "beginner", coerced);
  assert.equal(plan.coach?.style, "City pop sparkle");
  assert.equal(plan.coach?.loopCount, 6);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
