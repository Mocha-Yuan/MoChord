import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-tests-"));
const bundlePath = resolve(tempDir, "tunerEngine.bundle.mjs");

await build({
  entryPoints: [resolve(rootDir, "src", "utils", "tunerEngine.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
  logLevel: "silent",
});

const {
  TUNING_PRESETS,
  buildStoredTuningPresets,
  buildTuningTargets,
  classifyTunerStartError,
  deleteStoredTuningPreset,
  getMicrophoneSupport,
  loadStoredTuningPresets,
  saveStoredTuningPreset,
} = await import(pathToFileURL(bundlePath).href);

try {
  const lowC = TUNING_PRESETS.find((preset) => preset.id === "low-c");
  assert.equal(lowC?.label, "Low C");
  assert.deepEqual(lowC?.pitches, ["C2", "G2", "D3", "G3", "A3", "D4"]);

  const lowCTargets = buildTuningTargets("low-c", 440);
  assert.deepEqual(
    lowCTargets.map((target) => `${target.stringNumber}:${target.label}`),
    ["6:C2", "5:G2", "4:D3", "3:G3", "2:A3", "1:D4"],
  );

  const targets = buildTuningTargets("custom", 440, ["C2", "G2", "C3", "G3", "C4", "E4"]);

  assert.deepEqual(
    targets.map((target) => `${target.stringNumber}:${target.label}`),
    ["6:C2", "5:G2", "4:C3", "3:G3", "2:C4", "1:E4"],
  );
  assert.equal(targets[0].id.startsWith("preset:6:"), true);
  assert.equal(targets[5].id.startsWith("preset:1:"), true);

  const storage = createMemoryStorage();
  const legacyStorage = createMemoryStorage();
  legacyStorage.setItem(
    "chordflow:tuning-presets",
    JSON.stringify([{ id: "stored:legacy-open-c", name: "Legacy Open C", pitches: ["C2", "G2", "C3", "G3", "C4", "E4"] }]),
  );
  assert.equal(loadStoredTuningPresets(legacyStorage)[0].name, "Legacy Open C");
  assert.match(legacyStorage.getItem("mochord:tuning-presets") ?? "", /Legacy Open C/);

  const saved = saveStoredTuningPreset(storage, {
    name: "Open C",
    pitches: ["C2", "G2", "C3", "G3", "C4", "E4"],
  });

  assert.equal(saved.name, "Open C");
  assert.deepEqual(saved.pitches, ["C2", "G2", "C3", "G3", "C4", "E4"]);

  const presets = buildStoredTuningPresets(storage);
  assert.equal(presets.length, 1);
  assert.equal(presets[0].id, saved.id);
  assert.equal(presets[0].label, "Open C");

  const storedTargets = buildTuningTargets(saved.id, 440, saved.pitches, presets);
  assert.deepEqual(
    storedTargets.map((target) => `${target.stringNumber}:${target.label}`),
    ["6:C2", "5:G2", "4:C3", "3:G3", "2:C4", "1:E4"],
  );

  deleteStoredTuningPreset(storage, saved.id);
  assert.deepEqual(buildStoredTuningPresets(storage), []);

  assert.deepEqual(getMicrophoneSupport({}), { supported: false, reason: "unsupported" });
  assert.deepEqual(getMicrophoneSupport({ mediaDevices: {} }), { supported: false, reason: "unsupported" });
  assert.deepEqual(getMicrophoneSupport({ mediaDevices: { getUserMedia: async () => ({}) } }), {
    supported: true,
    reason: null,
  });
  assert.deepEqual(getMicrophoneSupport(), { supported: false, reason: "unsupported" });

  const denied = new DOMException("Permission denied", "NotAllowedError");
  assert.equal(classifyTunerStartError(denied), "permission-denied");
  assert.equal(classifyTunerStartError(new DOMException("Missing device", "NotFoundError")), "microphone-unavailable");
  assert.equal(classifyTunerStartError({ name: "NotAllowedError" }), "permission-denied");
  assert.equal(classifyTunerStartError({ name: "NotFoundError" }), "microphone-unavailable");
  assert.equal(classifyTunerStartError(new Error("Other failure")), "start-failed");
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
