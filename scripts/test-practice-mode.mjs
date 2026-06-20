import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-tests-"));
const bundlePath = resolve(tempDir, "practiceMode.bundle.mjs");

await build({
  entryPoints: [resolve(rootDir, "src", "utils", "practiceMode.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
  logLevel: "silent",
});

const {
  createPracticePlanFromChords,
  getLoopBpm,
  getPracticeCue,
  parsePracticeInput,
} = await import(pathToFileURL(bundlePath).href);

try {
  const chordLine = parsePracticeInput("G - D - Em - C");
  assert.equal(chordLine.title, "G - D - Em - C");
  assert.deepEqual(chordLine.chords, ["G", "D", "Em", "C"]);
  assert.equal(chordLine.source, "manual");

  const localProgression = parsePracticeInput("D\u8c034566");
  assert.deepEqual(localProgression.chords, ["G", "A", "Bm", "Bm"]);
  assert.equal(localProgression.source, "local");
  assert.equal(localProgression.level, "beginner");

  const aiProgression = createPracticePlanFromChords("\u4e13\u4e1a\u7248", ["Gmaj7", "A7sus4"], "ai", "professional");
  assert.equal(aiProgression.title, "\u4e13\u4e1a\u7248");
  assert.deepEqual(aiProgression.chords, ["Gmaj7", "A7sus4"]);
  assert.equal(aiProgression.source, "ai");
  assert.equal(aiProgression.level, "professional");

  const lyricRows = [
    { sectionId: "verse", sectionName: "Verse", lineId: "line:1", text: "First line", chords: ["G", "D"] },
    { sectionId: "verse", sectionName: "Verse", lineId: "line:2", text: "Second line", chords: ["Em", "C"] },
  ];
  const lyricProgression = createPracticePlanFromChords("Verse", ["G", "D", "Em", "C"], "manual", "beginner", undefined, lyricRows);
  assert.deepEqual(lyricProgression.lyricRows, lyricRows);

  const cue = getPracticeCue(["G", "D", "Em", "C"], {
    currentIndex: 1,
    beat: 3,
    numerator: 4,
    barsPerChord: 2,
    loop: 2,
  });
  assert.equal(cue.currentChord, "D");
  assert.equal(cue.nextChord, "Em");
  assert.equal(cue.remainingBeats, 5);
  assert.equal(cue.loop, 2);

  const wrapCue = getPracticeCue(["G", "D"], {
    currentIndex: 1,
    beat: 4,
    numerator: 4,
    barsPerChord: 1,
    loop: 3,
  });
  assert.equal(wrapCue.nextChord, "G");
  assert.equal(wrapCue.remainingBeats, 1);

  assert.equal(getLoopBpm(90, 0, 5), 90);
  assert.equal(getLoopBpm(90, 2, 5), 100);
  assert.equal(getLoopBpm(90, 2, 0), 90);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
