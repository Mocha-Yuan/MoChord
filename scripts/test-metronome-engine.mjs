import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-metronome-"));
const bundlePath = resolve(tempDir, "metronomeEngine.bundle.mjs");

await build({
  entryPoints: [resolve(rootDir, "src", "utils", "metronomeEngine.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
  logLevel: "silent",
});

const {
  COMMON_TIME_SIGNATURES,
  getMetronomeSoundConfig,
  getToneDurationForMeasure,
  getTimeSignatureLabel,
  isSupportedTimeSignature,
  normalizeTimeSignature,
} = await import(pathToFileURL(bundlePath).href);

try {
  assert.equal(COMMON_TIME_SIGNATURES.some((signature) => signature.numerator === 3 && signature.denominator === 8), true);
  assert.equal(COMMON_TIME_SIGNATURES.some((signature) => signature.numerator === 9 && signature.denominator === 8), true);
  assert.equal(COMMON_TIME_SIGNATURES.some((signature) => signature.numerator === 2 && signature.denominator === 2), true);

  assert.equal(isSupportedTimeSignature({ numerator: 3, denominator: 8 }), true);
  assert.equal(isSupportedTimeSignature({ numerator: 7, denominator: 16 }), true);
  assert.equal(isSupportedTimeSignature({ numerator: 17, denominator: 8 }), false);
  assert.equal(isSupportedTimeSignature({ numerator: 3, denominator: 3 }), false);

  assert.deepEqual(normalizeTimeSignature({ numerator: 3, denominator: 8 }), { numerator: 3, denominator: 8 });
  assert.deepEqual(normalizeTimeSignature({ numerator: 7, denominator: 16 }), { numerator: 7, denominator: 16 });
  assert.deepEqual(normalizeTimeSignature({ numerator: 17, denominator: 8 }), { numerator: 4, denominator: 4 });
  assert.equal(getTimeSignatureLabel({ numerator: 3, denominator: 8 }), "3 / 8");
  assert.equal(getToneDurationForMeasure({ numerator: 7, denominator: 16 }), "7 * 16n");

  const classicSound = getMetronomeSoundConfig("click");
  const woodSound = getMetronomeSoundConfig("wood");
  assert.equal(classicSound.kind, "synth");
  assert.equal(woodSound.kind, "membrane");
  assert.notDeepEqual(woodSound.options, classicSound.options);
  assert.equal(woodSound.note, "G4");
  assert.equal(woodSound.accentNote, "C5");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
