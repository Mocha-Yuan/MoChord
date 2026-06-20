import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-tests-"));
const bundlePath = resolve(tempDir, "library.bundle.mjs");

await build({
  entryPoints: [resolve(rootDir, "src", "utils", "library.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
  logLevel: "silent",
});

const {
  deleteSavedLibraryItem,
  loadSavedLibraryItems,
  saveLibraryItem,
} = await import(pathToFileURL(bundlePath).href);

try {
  const storage = createMemoryStorage();
  const legacyStorage = createMemoryStorage();
  legacyStorage.setItem(
    "chordflow:library",
    JSON.stringify([
      {
        id: "library:legacy",
        type: "progression",
        title: "Legacy loop",
        chords: ["C", "G"],
        level: "beginner",
        source: "manual",
        createdAt: "2026-06-13T00:00:00.000Z",
        updatedAt: "2026-06-13T00:00:00.000Z",
      },
    ]),
  );
  assert.equal(loadSavedLibraryItems(legacyStorage)[0].title, "Legacy loop");
  assert.match(legacyStorage.getItem("mochord:library") ?? "", /Legacy loop/);

  const progression = saveLibraryItem(storage, {
    type: "progression",
    title: "Pop loop",
    chords: ["G", "D", "Em", "C"],
    level: "beginner",
    source: "ai",
  });

  const practice = saveLibraryItem(storage, {
    type: "practice",
    title: "Warmup",
    chords: ["Am", "F", "C", "G"],
    level: "professional",
    source: "manual",
  });

  const arrangement = saveLibraryItem(storage, {
    type: "arrangement",
    title: "Original form",
    chords: ["G", "D", "Em", "C"],
    level: "beginner",
    source: "manual",
    arrangement: {
      id: "arrangement:test",
      title: "Original form",
      key: "G",
      bpm: 88,
      timeSignature: "4/4",
      style: "folk",
      difficulty: "beginner",
      sections: [
        {
          id: "section:test",
          name: "Verse",
          chords: ["G", "D", "Em", "C"],
          lyricLines: [
            { id: "line:test:1", text: "First local line", chords: ["G", "D"] },
            { id: "line:test:2", text: "", chords: ["Em", "C"] },
          ],
          barsPerChord: 1,
          repeatCount: 2,
          rhythmPattern: "Down / Down-Up",
          notes: "",
        },
      ],
    },
  });

  assert.equal(progression.id.startsWith("library:"), true);
  assert.equal(practice.id.startsWith("library:"), true);
  assert.deepEqual(
    loadSavedLibraryItems(storage).map((item) => item.title),
    ["Original form", "Warmup", "Pop loop"],
  );
  assert.equal(loadSavedLibraryItems(storage)[0].type, "arrangement");
  assert.equal(loadSavedLibraryItems(storage)[0].arrangement.sections[0].name, "Verse");
  assert.deepEqual(loadSavedLibraryItems(storage)[0].arrangement.sections[0].lyricLines, [
    { id: "line:test:1", text: "First local line", chords: ["G", "D"] },
    { id: "line:test:2", text: "", chords: ["Em", "C"] },
  ]);

  const renamed = saveLibraryItem(storage, {
    ...progression,
    title: "Renamed loop",
  });
  assert.equal(renamed.id, progression.id);
  assert.deepEqual(
    loadSavedLibraryItems(storage).map((item) => item.title),
    ["Renamed loop", "Original form", "Warmup"],
  );

  deleteSavedLibraryItem(storage, renamed.id);
  assert.deepEqual(
    loadSavedLibraryItems(storage).map((item) => item.title),
    ["Original form", "Warmup"],
  );

  deleteSavedLibraryItem(storage, arrangement.id);
  assert.deepEqual(
    loadSavedLibraryItems(storage).map((item) => item.title),
    ["Warmup"],
  );

  storage.setItem("mochord:library", "{bad json");
  assert.deepEqual(loadSavedLibraryItems(storage), []);

  const validArrangementItem = {
    id: "library:test:bad-arrangement",
    type: "arrangement",
    title: "Bad arrangement",
    chords: ["G", "C"],
    level: "beginner",
    source: "manual",
    arrangement: {
      id: "arrangement:bad",
      title: "Bad arrangement",
      key: "G",
      bpm: 88,
      timeSignature: "4/4",
      style: "folk",
      difficulty: "beginner",
      sections: [
        {
          id: "section:bad",
          name: "Verse",
          chords: ["G", "C"],
          barsPerChord: 1,
          repeatCount: 1,
          rhythmPattern: "Down",
        },
      ],
    },
    createdAt: "2026-06-13T00:00:00.000Z",
    updatedAt: "2026-06-13T00:00:00.000Z",
  };

  storage.setItem(
    "mochord:library",
    JSON.stringify([{ ...validArrangementItem, arrangement: { ...validArrangementItem.arrangement, style: "unknown" } }]),
  );
  assert.deepEqual(loadSavedLibraryItems(storage), []);

  storage.setItem(
    "mochord:library",
    JSON.stringify([{ ...validArrangementItem, arrangement: { ...validArrangementItem.arrangement, style: undefined } }]),
  );
  assert.deepEqual(loadSavedLibraryItems(storage), []);

  storage.setItem(
    "mochord:library",
    JSON.stringify([
      { ...validArrangementItem, arrangement: { ...validArrangementItem.arrangement, difficulty: "professional" } },
    ]),
  );
  assert.deepEqual(loadSavedLibraryItems(storage), []);

  storage.setItem(
    "mochord:library",
    JSON.stringify([{ ...validArrangementItem, arrangement: { ...validArrangementItem.arrangement, difficulty: undefined } }]),
  );
  assert.deepEqual(loadSavedLibraryItems(storage), []);

  storage.setItem(
    "mochord:library",
    JSON.stringify([
      {
        ...validArrangementItem,
        arrangement: {
          ...validArrangementItem.arrangement,
          sections: [
            {
              ...validArrangementItem.arrangement.sections[0],
              lyricLines: [{ id: "line:bad", text: "Bad", chords: [42] }],
            },
          ],
        },
      },
    ]),
  );
  assert.deepEqual(loadSavedLibraryItems(storage), []);

  storage.setItem(
    "mochord:library",
    JSON.stringify([
      {
        ...validArrangementItem,
        arrangement: {
          ...validArrangementItem.arrangement,
          sections: [
            {
              ...validArrangementItem.arrangement.sections[0],
              lyricLines: [{ id: "line:good", text: "Good", chords: ["G"] }],
            },
          ],
        },
      },
    ]),
  );
  assert.equal(loadSavedLibraryItems(storage)[0].arrangement.sections[0].lyricLines[0].text, "Good");
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
