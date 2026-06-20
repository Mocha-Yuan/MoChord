import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-tests-"));
const bundlePath = resolve(tempDir, "musicTheory.bundle.mjs");

await build({
  entryPoints: [resolve(rootDir, "src", "utils", "musicTheory.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
  logLevel: "silent",
});

const { getDisplayChordName, parseChordName } = await import(pathToFileURL(bundlePath).href);

try {
  const chord = parseChordName("Dm9(no5)");

  assert.equal(chord.root, "D");
  assert.equal(chord.quality, "m9(no5)");
  assert.deepEqual(chord.intervals, [0, 3, 10, 14]);
  assert.deepEqual(chord.notes, ["D", "F", "C", "E"]);
  assert.equal(getDisplayChordName(chord), "Dm9(no5)");

  const lydianColor = parseChordName("Cmaj7#11");
  assert.equal(lydianColor.quality, "maj7#11");
  assert.deepEqual(lydianColor.intervals, [0, 4, 7, 11, 18]);
  assert.deepEqual(lydianColor.notes, ["C", "E", "G", "B", "F#"]);
  assert.equal(getDisplayChordName(lydianColor), "Cmaj7#11");

  const alteredDominant = parseChordName("A7b9");
  assert.equal(alteredDominant.quality, "7b9");
  assert.deepEqual(alteredDominant.intervals, [0, 4, 7, 10, 13]);
  assert.deepEqual(alteredDominant.notes, ["A", "C#", "E", "G", "A#"]);
  assert.equal(getDisplayChordName(alteredDominant), "A7b9");

  const extendedMinor = parseChordName("F#m11");
  assert.equal(extendedMinor.quality, "m11");
  assert.deepEqual(extendedMinor.intervals, [0, 3, 7, 10, 14, 17]);
  assert.deepEqual(extendedMinor.notes, ["F#", "A", "C#", "E", "G#", "B"]);
  assert.equal(getDisplayChordName(extendedMinor), "F#m11");

  const slashAdd = parseChordName("Bbadd9/D");
  assert.equal(slashAdd.root, "A#");
  assert.equal(slashAdd.bassNote, "D");
  assert.deepEqual(slashAdd.intervals, [0, 4, 7, 14]);
  assert.equal(getDisplayChordName(slashAdd), "A#add9/D");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
