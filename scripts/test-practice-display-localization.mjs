import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-practice-display-"));
const bundlePath = resolve(tempDir, "practiceDisplay.bundle.mjs");

await build({
  entryPoints: [resolve(rootDir, "src", "utils", "practiceDisplay.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
  logLevel: "silent",
});

const {
  getArrangementPracticeCoachCopy,
  getLibraryItemTypeLabel,
  getPracticeLevelLabel,
  getPracticeSourceLabel,
  getTuningPresetDisplayLabel,
  localizePracticeCoachText,
} = await import(pathToFileURL(bundlePath).href);

try {
  assert.equal(getTuningPresetDisplayLabel({ id: "standard", label: "Standard" }, "zh"), "\u6807\u51c6\u8c03\u5f26");
  assert.equal(getTuningPresetDisplayLabel({ id: "stored:open-c", label: "Open C" }, "zh"), "Open C");

  assert.equal(getLibraryItemTypeLabel("arrangement", "zh"), "\u7f16\u6392");
  assert.equal(getPracticeLevelLabel("beginner", "zh"), "\u5165\u95e8");
  assert.equal(getPracticeSourceLabel("manual", "zh"), "\u624b\u52a8");

  const coachCopy = getArrangementPracticeCoachCopy("zh");
  assert.equal(coachCopy.rhythmPattern, "\u6b4c\u66f2\u7f16\u6392");
  assert.deepEqual(coachCopy.goals, [
    "\u8ddf\u7a33\u6574\u9996\u6b4c\u7684\u7ed3\u6784\u3002",
    "\u8ba9\u548c\u5f26\u5207\u6362\u5bf9\u9f50\u6bb5\u843d\u65f6\u503c\u3002",
  ]);
  assert.equal(localizePracticeCoachText("Song arrangement", "zh"), "\u6b4c\u66f2\u7f16\u6392");
  assert.equal(
    localizePracticeCoachText("Keep chord changes aligned with the section timing.", "zh"),
    "\u8ba9\u548c\u5f26\u5207\u6362\u5bf9\u9f50\u6bb5\u843d\u65f6\u503c\u3002",
  );
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
