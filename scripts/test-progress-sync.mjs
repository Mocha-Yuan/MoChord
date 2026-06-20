import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-progress-sync-"));
const bundlePath = resolve(tempDir, "progressService.bundle.mjs");

await build({
  entryPoints: [resolve(rootDir, "src", "services", "progressService.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
  logLevel: "silent",
});

const {
  GUEST_PROGRESS_STORAGE_KEY,
  GUEST_PROGRESS_UPDATED_AT_KEY,
  buildLocalProgressSnapshot,
  loadGuestProgress,
  mergeProgressPayloads,
  writeLocalProgressSnapshot,
} = await import(pathToFileURL(bundlePath).href);

try {
  const storage = createMemoryStorage();
  storage.setItem("chordflow:workspace-state", JSON.stringify({ activePage: "practice", chordName: "G", bpm: 96 }));
  storage.setItem("chordflow:library", JSON.stringify([{ id: "lib-1", title: "G - D", updatedAt: "2026-06-15T08:00:00.000Z" }]));
  storage.setItem("chordflow:practice-sessions", JSON.stringify([{ id: "session-1", updatedAt: "2026-06-15T08:01:00.000Z" }]));
  storage.setItem("chordflow:C", JSON.stringify({ frets: [-1, 3, 2, 0, 1, 0], baseFret: 1 }));
  storage.setItem("chordflow_guest_progress", JSON.stringify({ version: 1, updatedAt: "2026-06-15T07:00:00.000Z" }));

  const snapshot = buildLocalProgressSnapshot(storage, "2026-06-15T08:02:00.000Z");

  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.updatedAt, "2026-06-15T08:02:00.000Z");
  assert.equal(snapshot.workspace?.bpm, 96);
  assert.equal(snapshot.libraryItems?.length, 1);
  assert.equal(snapshot.practiceSessions?.length, 1);
  assert.equal(snapshot.savedVoicings?.["mochord:guitar-voicing:C"]?.baseFret, 1);
  assert.match(storage.getItem("mochord:workspace-state") ?? "", /"chordName":"G"/);
  assert.match(storage.getItem("mochord:guitar-voicing:C") ?? "", /"baseFret":1/);
  assert.equal(loadGuestProgress(storage)?.updatedAt, "2026-06-15T07:00:00.000Z");
  assert.match(storage.getItem(GUEST_PROGRESS_STORAGE_KEY) ?? "", /2026-06-15T07:00:00.000Z/);

  const localNewer = mergeProgressPayloads(
    { version: 1, updatedAt: "2026-06-15T09:00:00.000Z", workspace: { chordName: "Am" } },
    { version: 1, updatedAt: "2026-06-15T08:00:00.000Z", workspace: { chordName: "C" } },
  );
  assert.equal(localNewer.strategy, "local-newer");
  assert.equal(localNewer.progress.workspace?.chordName, "Am");

  const cloudNewer = mergeProgressPayloads(
    { version: 1, updatedAt: "2026-06-15T08:00:00.000Z", workspace: { chordName: "Am" } },
    { version: 1, updatedAt: "2026-06-15T09:00:00.000Z", workspace: { chordName: "C" } },
  );
  assert.equal(cloudNewer.strategy, "cloud-newer");
  assert.equal(cloudNewer.progress.workspace?.chordName, "C");

  const ambiguous = mergeProgressPayloads(
    { version: 1, workspace: { chordName: "Am" } },
    { version: 1, workspace: { chordName: "C" } },
  );
  assert.equal(ambiguous.strategy, "cloud-with-backup");
  assert.equal(ambiguous.progress.workspace?.chordName, "C");
  assert.equal(ambiguous.backup?.workspace?.chordName, "Am");

  writeLocalProgressSnapshot(storage, {
    version: 1,
    updatedAt: "2026-06-15T10:00:00.000Z",
    workspace: { activePage: "learning", chordName: "F", bpm: 72 },
    libraryItems: [],
    practiceSessions: [],
  });

  assert.match(storage.getItem(GUEST_PROGRESS_STORAGE_KEY) ?? "", /"chordName":"F"/);
  assert.equal(storage.getItem(GUEST_PROGRESS_UPDATED_AT_KEY), "2026-06-15T10:00:00.000Z");
  assert.match(storage.getItem("mochord:workspace-state") ?? "", /"activePage":"learning"/);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
  };
}
