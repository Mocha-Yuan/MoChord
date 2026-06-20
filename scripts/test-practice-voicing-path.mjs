import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-tests-"));
const bundlePath = resolve(tempDir, "practiceVoicingPath.bundle.mjs");

await build({
  entryPoints: [resolve(rootDir, "src", "utils", "practiceVoicingPath.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
  logLevel: "silent",
});

const { chooseSmoothVoicingPath, getVoicingPathSelection } = await import(pathToFileURL(bundlePath).href);

function voicing(frets, baseFret = 1) {
  return {
    frets,
    baseFret,
    muted: frets.map((fret) => fret < 0),
  };
}

try {
  const candidates = [
    {
      chordName: "G",
      voicings: [voicing([3, 2, 0, 0, 0, 3]), voicing([10, 10, 12, 12, 12, 10], 10)],
    },
    {
      chordName: "D",
      voicings: [voicing([-1, -1, 0, 2, 3, 2]), voicing([10, 12, 12, 11, 10, 10], 10)],
    },
    {
      chordName: "Em",
      voicings: [voicing([0, 2, 2, 0, 0, 0]), voicing([12, 14, 14, 12, 12, 12], 12)],
    },
  ];

  const path = chooseSmoothVoicingPath(candidates);
  assert.deepEqual(path.map((item) => item.index), [0, 0, 0]);
  assert.deepEqual(path.map((item) => item.key), ["1:3,2,0,0,0,3", "1:-1,-1,0,2,3,2", "1:0,2,2,0,0,0"]);

  const lockedPath = chooseSmoothVoicingPath(candidates, {
    lockedVoicingKeys: {
      D: "10:10,12,12,11,10,10",
    },
  });
  assert.deepEqual(lockedPath.map((item) => item.index), [1, 1, 1]);

  const selection = getVoicingPathSelection(candidates);
  assert.deepEqual(selection, {
    G: "1:3,2,0,0,0,3",
    D: "1:-1,-1,0,2,3,2",
    Em: "1:0,2,2,0,0,0",
  });
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
