import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-tests-"));
const bundlePath = resolve(tempDir, "guitar.bundle.mjs");

await build({
  entryPoints: [resolve(rootDir, "src", "utils", "guitar.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
  logLevel: "silent",
});

const {
  generateGuitarVoicings,
  getVoicingBarres,
  getVoicingShapeCode,
  getNoteAtFret,
  getVoicingNotes,
  isErgonomicVoicing,
  loadSavedVoicing,
  normalizeVoicingFingering,
  parseTuningPitch,
  saveVoicing,
  voicingFromFrets,
  voicingToPlayableNotes,
} = await import(pathToFileURL(bundlePath).href);

try {
  globalThis.localStorage = createMemoryStorage();
  const dropD = ["D2", "A2", "D3", "G3", "B3", "E4"];

  assert.equal(getNoteAtFret(0, 0, dropD), "D");
  assert.equal(getNoteAtFret(0, 2, dropD), "E");
  assert.deepEqual(parseTuningPitch("C#3"), { note: "C#", octave: 3 });

  const openShape = voicingFromFrets([0, 0, 0, 0, 0, 0]);
  assert.deepEqual(getVoicingNotes(openShape, dropD), ["D", "A", "D", "G", "B", "E"]);
  assert.deepEqual(voicingToPlayableNotes(openShape, dropD), ["D2", "A2", "D3", "G3", "B3", "E4"]);

  const standardC = generateGuitarVoicings({ root: "C", quality: "major", notes: ["C", "E", "G"], intervals: [0, 4, 7] });
  const openC = generateGuitarVoicings(
    { root: "C", quality: "major", notes: ["C", "E", "G"], intervals: [0, 4, 7] },
    12,
    ["C2", "G2", "C3", "G3", "C4", "E4"],
  );

  assert.notDeepEqual(
    openC.map((voicing) => voicing.frets.join(",")),
    standardC.map((voicing) => voicing.frets.join(",")),
  );
  assert.equal(openC.some((voicing) => voicing.frets.every((fret) => fret === 0)), true);

  const normalizedF = normalizeVoicingFingering(voicingFromFrets([1, 3, 3, 2, 1, 1], 1, [1, 3, 3, 2, 1, 1]));
  assert.deepEqual(normalizedF.fingers, [1, 3, 4, 2, 1, 1]);
  assert.deepEqual(getVoicingBarres(normalizedF), [{ fret: 1, finger: 1, fromString: 0, toString: 5 }]);

  const nonLowestRepeat = normalizeVoicingFingering(voicingFromFrets([8, 8, 7, -1, -1, -1], 6));
  assert.deepEqual(nonLowestRepeat.fingers, [2, 3, 1, 0, 0, 0]);
  assert.deepEqual(getVoicingBarres(nonLowestRepeat), []);

  const generatedF = generateGuitarVoicings({ root: "F", quality: "major", notes: ["F", "A", "C"], intervals: [0, 4, 7] })[0];
  assert.deepEqual(generatedF.frets, [1, 3, 3, 2, 1, 1]);
  assert.deepEqual(generatedF.fingers, [1, 3, 4, 2, 1, 1]);

  const impossibleShapes = [
    voicingFromFrets([5, 3, 3, 5, 6, 5], 3),
    voicingFromFrets([-1, 8, 7, 5, 6, 8], 5),
    voicingFromFrets([-1, 8, 7, 10, 10, 8], 7),
  ];

  assert.equal(impossibleShapes.every((voicing) => !isErgonomicVoicing(voicing)), true);

  const generatedFShapeCodes = generateGuitarVoicings(
    { root: "F", quality: "major", notes: ["F", "A", "C"], intervals: [0, 4, 7] },
    12,
  ).map(getVoicingShapeCode);

  assert.equal(new Set(generatedFShapeCodes).size, generatedFShapeCodes.length);
  assert.equal(generatedFShapeCodes.includes("533565"), false);
  assert.equal(generatedFShapeCodes.includes("x87568"), false);
  assert.equal(generatedFShapeCodes.includes("x8710108"), false);

  globalThis.localStorage.setItem("chordflow:C", JSON.stringify({ frets: [-1, 3, 2, 0, 1, 0], baseFret: 1 }));
  assert.deepEqual(loadSavedVoicing("C")?.frets, [-1, 3, 2, 0, 1, 0]);
  assert.match(globalThis.localStorage.getItem("mochord:guitar-voicing:C") ?? "", /"baseFret":1/);

  saveVoicing("G", voicingFromFrets([3, 2, 0, 0, 0, 3]));
  assert.match(globalThis.localStorage.getItem("mochord:guitar-voicing:G") ?? "", /"baseFret":1/);
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
