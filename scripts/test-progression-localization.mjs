import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-tests-"));
const bundlePath = resolve(tempDir, "progression.bundle.mjs");

await build({
  entryPoints: [resolve(rootDir, "src", "utils", "diatonicChords.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
  logLevel: "silent",
});

const { createLocalChordProgressionResult, localizeProgressionResult } = await import(pathToFileURL(bundlePath).href);

try {
  const result = createLocalChordProgressionResult("D调4566", "D", "Major", [4, 5, 6, 6]);
  const localized = localizeProgressionResult(result, "zh");

  assert.equal(localized.beginner.label, "入门版");
  assert.equal(localized.professional.label, "专业版");
  assert.equal(localized.modeLabel, "大调");
  assert.equal(localized.beginner.description, "适合入门吉他练习的顺阶三和弦。");
  assert.equal(localized.beginner.chords[0].function, "下属功能");
  assert.equal(localized.beginner.chords[0].explanation, "D 大调中的 IV 级和弦。");
  assert.equal(localized.professional.chords[3].explanation, "重复 vi 级，并加入更丰富的色彩。");
  assert.equal(localized.notes[0], "已根据“D调4566”在本地生成。");
  assert.ok(localized.coach, "localized result should include an AI practice coach plan");
  assert.match(localized.coach.style, /D 调/);
  assert.match(localized.coach.demoNarrative, /AI 教练/);
  assert.match(localized.coach.goals[0], /^第 1 轮/);
  assert.doesNotMatch(
    [
      localized.coach.style,
      localized.coach.rhythmPattern,
      localized.coach.demoNarrative,
      ...localized.coach.goals,
    ].join("\n"),
    /Round|coach turns|warm pop|eighth-note|guitar practice/i,
  );

  const english = localizeProgressionResult(result, "en");
  assert.equal(english.beginner.label, "Beginner");
  assert.equal(english.modeLabel, "Major");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
