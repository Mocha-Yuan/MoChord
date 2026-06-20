import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-tests-"));
const bundlePath = resolve(tempDir, "workspaceState.bundle.mjs");

await build({
  entryPoints: [resolve(rootDir, "src", "utils", "workspaceState.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
  logLevel: "silent",
});

const {
  DEFAULT_WORKSPACE_STATE,
  loadWorkspaceState,
  saveWorkspaceState,
  updateRecentChord,
  updateRecentProgression,
} = await import(pathToFileURL(bundlePath).href);

try {
  const storage = createMemoryStorage();

  assert.deepEqual(loadWorkspaceState(storage), DEFAULT_WORKSPACE_STATE);

  const legacyStorage = createMemoryStorage();
  legacyStorage.setItem("chordflow:workspace-state", JSON.stringify({ activePage: "practice", chordName: "Dm", bpm: 84 }));
  assert.equal(loadWorkspaceState(legacyStorage).chordName, "Dm");
  assert.match(legacyStorage.getItem("mochord:workspace-state") ?? "", /"chordName":"Dm"/);

  saveWorkspaceState(storage, {
    activePage: "practice",
    chordName: "Gmaj7",
    bpm: 104,
    timeSignature: { numerator: 3, denominator: 4 },
    accentFirstBeat: false,
    countInBars: 1,
    metronomeDuringPlayback: false,
    selectedKey: "G",
    selectedMode: "Mixolydian",
    tuningPresetId: "drop-d",
    customPitches: ["D2", "A2", "D3", "G3", "B3", "E4"],
    referenceA: 442,
    recentChords: ["Gmaj7"],
    recentProgressions: ["G - D - Em - C"],
  });

  assert.deepEqual(loadWorkspaceState(storage), {
    activePage: "practice",
    chordName: "Gmaj7",
    bpm: 104,
    timeSignature: { numerator: 3, denominator: 4 },
    accentFirstBeat: false,
    countInBars: 1,
    metronomeDuringPlayback: false,
    selectedKey: "G",
    selectedMode: "Mixolydian",
    tuningPresetId: "drop-d",
    customPitches: ["D2", "A2", "D3", "G3", "B3", "E4"],
    referenceA: 442,
    recentChords: ["Gmaj7"],
    recentProgressions: ["G - D - Em - C"],
  });

  saveWorkspaceState(storage, {
    ...loadWorkspaceState(storage),
    activePage: "arranger",
  });
  assert.equal(loadWorkspaceState(storage).activePage, "arranger");

  saveWorkspaceState(storage, {
    ...loadWorkspaceState(storage),
    timeSignature: { numerator: 16, denominator: 16 },
  });
  assert.deepEqual(loadWorkspaceState(storage).timeSignature, { numerator: 16, denominator: 16 });

  const withRecentChords = updateRecentChord(loadWorkspaceState(storage), "Cadd9");
  assert.deepEqual(withRecentChords.recentChords, ["Cadd9", "Gmaj7"]);

  const withoutDuplicate = updateRecentChord(withRecentChords, "Gmaj7");
  assert.deepEqual(withoutDuplicate.recentChords, ["Gmaj7", "Cadd9"]);

  const withRecentProgressions = updateRecentProgression(withoutDuplicate, "D调4566");
  assert.deepEqual(withRecentProgressions.recentProgressions, ["D调4566", "G - D - Em - C"]);

  storage.setItem("mochord:workspace-state", "{bad json");
  assert.deepEqual(loadWorkspaceState(storage), DEFAULT_WORKSPACE_STATE);
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
