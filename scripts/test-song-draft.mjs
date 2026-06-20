import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import ts from "typescript";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-song-draft-"));
const draftBundlePath = resolve(tempDir, "song-draft.bundle.mjs");
const promptBundlePath = resolve(tempDir, "song-draft-prompt.bundle.mjs");
const typeContractPath = resolve(tempDir, "song-draft-contract.ts");
const typeSourcePath = resolve(rootDir, "src", "types", "songDraft.ts");

await build({
  entryPoints: [resolve(rootDir, "src", "utils", "songDraft.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: draftBundlePath,
  logLevel: "silent",
});

await build({
  entryPoints: [resolve(rootDir, "src", "services", "songDraftPrompt.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: promptBundlePath,
  logLevel: "silent",
});

await writeFile(
  typeContractPath,
  `
import type {
  AISongDraftResult,
  AISongDraftSection,
  SongDraftGenerationResult,
  SongDraftGenerationSource,
  SongDraftLyricLanguage,
  SongDraftRequest,
} from "${typeSourcePath.replaceAll("\\", "/")}";

const source: SongDraftGenerationSource = "deepseek";
const language: SongDraftLyricLanguage = "zh";
const request: SongDraftRequest = {
  prompt: "",
  lyricLanguage: language,
  style: "folk",
  key: "G",
  difficulty: "beginner",
  bpm: 92,
  timeSignature: "4/4",
  generateLyrics: true,
  length: "standard",
};
const section: AISongDraftSection = {
  name: "Verse",
  chords: ["G", "D", "Em", "C"],
  barsPerChord: 1,
  repeatCount: 2,
  rhythmPattern: "Steady strum",
  lyricLines: [{ text: "Line", chords: ["G"] }],
};
// @ts-expect-error barsPerChord must be restricted to supported values.
const invalidBarsSection: AISongDraftSection = { ...section, barsPerChord: 3 };
const aiResult: AISongDraftResult = {
  title: "Song",
  key: "G",
  bpm: 92,
  timeSignature: "4/4",
  style: "folk",
  difficulty: "beginner",
  sections: [section],
  notes: ["note"],
  warnings: ["warning"],
};
// @ts-expect-error raw result time signatures must use the arrangement contract.
const invalidTimeSignature: AISongDraftResult = { ...aiResult, timeSignature: "7/8" };
// @ts-expect-error raw result styles must use the arrangement contract.
const invalidStyle: AISongDraftResult = { ...aiResult, style: "unknown-style" };
// @ts-expect-error raw result difficulties must use the arrangement contract.
const invalidDifficulty: AISongDraftResult = { ...aiResult, difficulty: "expert" };
// @ts-expect-error notes are required by the draft result contract.
const missingNotes: AISongDraftResult = { ...aiResult, notes: undefined };
// @ts-expect-error warnings are required by the draft result contract.
const missingWarnings: AISongDraftResult = { ...aiResult, warnings: undefined };
const generation: SongDraftGenerationResult = {
  source,
  arrangement: {
    id: "arrangement:test",
    title: aiResult.title,
    key: request.key,
    bpm: request.bpm,
    timeSignature: request.timeSignature,
    style: request.style,
    difficulty: request.difficulty,
    sections: [],
  },
  notes: [],
  warnings: [],
};
void generation;
void invalidBarsSection;
void invalidTimeSignature;
void invalidStyle;
void invalidDifficulty;
void missingNotes;
void missingWarnings;
`,
);

const program = ts.createProgram([typeContractPath], {
  noEmit: true,
  skipLibCheck: true,
  strict: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  allowImportingTsExtensions: true,
});
const diagnostics = ts.getPreEmitDiagnostics(program);
assert.deepEqual(
  diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")),
  [],
);

const typeSource = await readFile(typeSourcePath, "utf8");
const exportedTypes = [...typeSource.matchAll(/export type (\w+)/g)].map((match) => match[1]);
assert.deepEqual(exportedTypes, [
  "SongDraftLength",
  "SongDraftLyricLanguage",
  "SongDraftRequest",
  "AISongDraftSection",
  "AISongDraftResult",
  "SongDraftGenerationSource",
  "SongDraftGenerationResult",
]);

const {
  coerceSongDraftResult,
  createDefaultSongDraftRequest,
  createLocalFallbackSongDraft,
  validateSongDraftArrangement,
} = await import(pathToFileURL(draftBundlePath).href);

try {
  const currentArrangement = {
    id: "arrangement:current",
    title: "Current Song",
    key: "G",
    bpm: 92,
    timeSignature: "4/4",
    style: "folk",
    difficulty: "beginner",
    sections: [
      {
        id: "section:current",
        name: "Verse",
        chords: ["G", "D", "Em", "C"],
        barsPerChord: 1,
        repeatCount: 2,
        rhythmPattern: "Down / Down-Up",
      },
    ],
  };

  const defaultRequest = createDefaultSongDraftRequest(currentArrangement, "zh");
  assert.deepEqual(defaultRequest, {
    prompt: "",
    lyricLanguage: "zh",
    style: "folk",
    key: "G",
    difficulty: "beginner",
    bpm: 92,
    timeSignature: "4/4",
    generateLyrics: true,
    length: "standard",
  });

  const raw = {
    title: "City Rain",
    key: "C",
    bpm: 301,
    timeSignature: "7/8",
    style: "unknown-style",
    difficulty: "expert",
    sections: [
      {
        name: "Verse",
        chords: ["C", "BadChord", "Am", "F"],
        barsPerChord: 3,
        repeatCount: 99,
        rhythmPattern: "",
        notes: "Keep it intimate.",
        lyricLines: [
          { text: "Lights are waking on the glass", chords: ["C", "G"] },
          { text: "I keep walking through the rain", chords: ["Am", "F"] },
          { text: "", chords: [] },
          { text: "Bad harmony line", chords: ["NotAChord"] },
        ],
      },
      {
        name: "Solo",
        chords: ["Fmaj7", "G", "Em", "Am"],
        barsPerChord: 2,
        repeatCount: 1,
        rhythmPattern: "Let notes ring",
        lyricLines: [],
      },
    ],
    notes: ["Original lyric draft."],
    warnings: ["Removed one invalid chord."],
  };

  const result = coerceSongDraftResult(raw, defaultRequest, "deepseek");
  assert.equal(result.source, "deepseek");
  assert.equal(result.arrangement.title, "City Rain");
  assert.equal(result.arrangement.key, "C");
  assert.equal(result.arrangement.bpm, 240);
  assert.equal(result.arrangement.timeSignature, "4/4");
  assert.equal(result.arrangement.style, "folk");
  assert.equal(result.arrangement.difficulty, "beginner");
  assert.equal(result.arrangement.sections.length, 2);
  assert.match(result.arrangement.id, /^arrangement:/);
  assert.match(result.arrangement.sections[0].id, /^section:/);
  assert.equal(result.arrangement.sections[0].barsPerChord, 1);
  assert.equal(result.arrangement.sections[0].repeatCount, 8);
  assert.equal(result.arrangement.sections[0].rhythmPattern, "Steady strum");
  assert.deepEqual(result.arrangement.sections[0].chords, ["C", "G", "Am", "F"]);
  assert.deepEqual(result.arrangement.sections[0].lyricLines.map((line) => line.chords), [
    ["C", "G"],
    ["Am", "F"],
  ]);
  assert.equal(result.arrangement.sections[0].lyricLines[0].text, "Lights are waking on the glass");
  assert.equal(result.arrangement.sections[1].lyricLines, undefined);
  assert.deepEqual(result.notes, ["Original lyric draft."]);
  assert.equal(result.warnings.includes("Removed one invalid chord."), true);

  const noLyricsRequest = { ...defaultRequest, generateLyrics: false, length: "short" };
  const noLyricsResult = coerceSongDraftResult(raw, noLyricsRequest, "deepseek");
  assert.equal(noLyricsResult.arrangement.sections[0].lyricLines, undefined);
  assert.deepEqual(noLyricsResult.arrangement.sections[0].chords, ["C", "Am", "F"]);

  const invalidSectionsResult = coerceSongDraftResult(
    {
      title: "Broken Draft",
      sections: [{ chords: ["NotAChord"] }, {}],
      notes: [],
      warnings: [],
    },
    noLyricsRequest,
    "deepseek",
  );
  assert.equal(validateSongDraftArrangement(invalidSectionsResult.arrangement).length, 0);
  assert.equal(
    invalidSectionsResult.arrangement.sections.flatMap((section) => section.chords).length >= 2,
    true,
  );

  const fallback = createLocalFallbackSongDraft(
    {
      ...defaultRequest,
      prompt: "Warm campfire chorus",
      key: "D",
      bpm: 78,
      style: "campfire",
      difficulty: "intermediate",
      timeSignature: "6/8",
      generateLyrics: true,
      length: "full",
    },
    "DeepSeek unavailable.",
  );
  assert.equal(fallback.source, "fallback");
  assert.equal(fallback.arrangement.title, "Warm campfire chorus");
  assert.equal(fallback.arrangement.key, "D");
  assert.equal(fallback.arrangement.bpm, 78);
  assert.equal(fallback.arrangement.style, "campfire");
  assert.equal(fallback.arrangement.timeSignature, "6/8");
  assert.equal(fallback.arrangement.sections.length, 5);
  assert.equal(fallback.arrangement.sections.some((section) => section.lyricLines), false);
  assert.equal(fallback.warnings.includes("DeepSeek unavailable."), true);
  assert.equal(fallback.warnings.includes("Lyrics require AI generation and were left empty in the local fallback."), true);

  assert.deepEqual(validateSongDraftArrangement(fallback.arrangement), []);
  assert.deepEqual(
    validateSongDraftArrangement({
      ...fallback.arrangement,
      sections: [{ ...fallback.arrangement.sections[0], chords: [] }],
    }),
    ["Verse: Section needs at least one valid chord."],
  );

  const { buildSongDraftSystemPrompt, buildSongDraftUserInput } = await import(pathToFileURL(promptBundlePath).href);
  const zhPrompt = buildSongDraftSystemPrompt("zh");
  assert.equal(zhPrompt.includes("Return ONLY valid JSON."), true);
  assert.equal(zhPrompt.includes("Write original lyrics only."), true);
  assert.equal(zhPrompt.includes("Do not copy copyrighted lyrics"), true);
  assert.equal(zhPrompt.includes("Do not imitate a living artist"), true);
  assert.equal(zhPrompt.includes("Simplified Chinese"), true);
  assert.equal(zhPrompt.includes("lyricLanguage"), true);
  assert.equal(zhPrompt.includes("source of truth for generated lyric text"), true);

  const userInput = buildSongDraftUserInput(noLyricsRequest);
  const parsedInput = JSON.parse(userInput);
  assert.deepEqual(parsedInput, {
    prompt: "",
    lyricLanguage: "zh",
    style: "folk",
    key: "G",
    difficulty: "beginner",
    bpm: 92,
    timeSignature: "4/4",
    generateLyrics: false,
    length: "short",
  });
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
