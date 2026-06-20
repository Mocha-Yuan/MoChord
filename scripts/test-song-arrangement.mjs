import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(resolve(tmpdir(), "mochord-song-arrangement-"));
const bundlePath = resolve(tempDir, "song-arrangement.bundle.mjs");

await build({
  entryPoints: [resolve(rootDir, "src", "utils", "songArrangement.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
  logLevel: "silent",
});

const {
  BAR_OPTIONS,
  REPEAT_OPTIONS,
  clampArrangementBpm,
  cloneArrangement,
  createBlankArrangement,
  createBlankLyricLine,
  createBlankSection,
  duplicateSection,
  evaluateSectionChordInput,
  expandArrangementToPracticeChords,
  expandSectionLyricsToPracticeRows,
  expandSectionToPracticeChords,
  getSectionPracticeChords,
  getMostCommonBarsPerChord,
  getSectionSummaryChords,
  normalizeLyricLine,
  normalizeSection,
  parseSectionChordInput,
  sectionHasLyrics,
  validateArrangement,
  validateSection,
} = await import(pathToFileURL(bundlePath).href);

try {
  assert.deepEqual(BAR_OPTIONS, [1, 2, 4]);
  assert.deepEqual(REPEAT_OPTIONS, [1, 2, 3, 4, 5, 6, 7, 8]);

  assert.equal(clampArrangementBpm(12), 40);
  assert.equal(clampArrangementBpm(96.4), 96);
  assert.equal(clampArrangementBpm(999), 240);

  const blank = createBlankArrangement();
  assert.equal(blank.title, "Untitled Arrangement");
  assert.equal(blank.key, "G");
  assert.equal(blank.bpm, 88);
  assert.equal(blank.timeSignature, "4/4");
  assert.equal(blank.sections.length, 2);
  assert.notEqual(blank.sections[0].id, blank.sections[1].id);

  const parsed = parseSectionChordInput(" G - D, Em | C  ");
  assert.deepEqual(parsed.chords, ["G", "D", "Em", "C"]);
  assert.deepEqual(parsed.invalidChords, []);

  const slashChords = parseSectionChordInput("G/B - C/E");
  assert.deepEqual(slashChords.chords, ["G/B", "C/E"]);
  assert.deepEqual(slashChords.invalidChords, []);

  const invalid = parseSectionChordInput("G - NopeChord - C");
  assert.deepEqual(invalid.chords, ["G", "C"]);
  assert.deepEqual(invalid.invalidChords, ["NopeChord"]);

  const majorSevenIntermediate = evaluateSectionChordInput("Cma");
  assert.equal(majorSevenIntermediate.rawValue, "Cma");
  assert.equal(majorSevenIntermediate.nextChords, null);
  assert.deepEqual(majorSevenIntermediate.invalidChords, ["Cma"]);

  const majorSevenComplete = evaluateSectionChordInput("Cmaj7");
  assert.equal(majorSevenComplete.rawValue, "Cmaj7");
  assert.deepEqual(majorSevenComplete.nextChords, ["Cmaj7"]);
  assert.deepEqual(majorSevenComplete.invalidChords, []);

  const slashIntermediate = evaluateSectionChordInput("G/");
  assert.equal(slashIntermediate.rawValue, "G/");
  assert.equal(slashIntermediate.nextChords, null);
  assert.deepEqual(slashIntermediate.invalidChords, ["G/"]);

  const slashComplete = evaluateSectionChordInput("G/B");
  assert.equal(slashComplete.rawValue, "G/B");
  assert.deepEqual(slashComplete.nextChords, ["G/B"]);
  assert.deepEqual(slashComplete.invalidChords, []);

  const section = createBlankSection("Chorus");
  const duplicated = duplicateSection(section);
  assert.equal(duplicated.name, "Chorus Copy");
  assert.deepEqual(duplicated.chords, section.chords);
  assert.notEqual(duplicated.id, section.id);

  const validSection = {
    ...section,
    chords: ["G", "D", "Em", "C"],
    barsPerChord: 1,
    repeatCount: 2,
  };
  assert.deepEqual(expandSectionToPracticeChords(validSection), ["G", "D", "Em", "C", "G", "D", "Em", "C"]);
  assert.deepEqual(validateSection(validSection).errors, []);

  const lyricLine = createBlankLyricLine();
  assert.equal(typeof lyricLine.id, "string");
  assert.equal(lyricLine.text, "");
  assert.deepEqual(lyricLine.chords, []);

  const vocalSection = {
    ...validSection,
    id: "verse-with-lyrics",
    name: "Verse With Lyrics",
    chords: ["G"],
    lyricLines: [
      { id: "line:1", text: "First line", chords: ["G", "D"] },
      { id: "line:2", text: "Second line", chords: ["Em", "C"] },
      { id: "line:3", text: "", chords: [] },
    ],
  };
  assert.equal(sectionHasLyrics(vocalSection), true);
  assert.deepEqual(getSectionPracticeChords(vocalSection), ["G", "D", "Em", "C"]);
  assert.deepEqual(getSectionSummaryChords(vocalSection), ["G", "D", "Em", "C"]);
  assert.deepEqual(expandSectionToPracticeChords(vocalSection), ["G", "D", "Em", "C", "G", "D", "Em", "C"]);
  assert.deepEqual(expandSectionLyricsToPracticeRows(vocalSection), [
    { sectionId: "verse-with-lyrics", sectionName: "Verse With Lyrics", lineId: "line:1", text: "First line", chords: ["G", "D"] },
    { sectionId: "verse-with-lyrics", sectionName: "Verse With Lyrics", lineId: "line:2", text: "Second line", chords: ["Em", "C"] },
  ]);
  assert.deepEqual(normalizeSection(vocalSection).chords, ["G", "D", "Em", "C"]);

  const duplicatedVocalSection = duplicateSection(vocalSection);
  assert.notEqual(duplicatedVocalSection.id, vocalSection.id);
  assert.notEqual(duplicatedVocalSection.lyricLines[0].id, vocalSection.lyricLines[0].id);
  assert.deepEqual(duplicatedVocalSection.lyricLines[0].chords, vocalSection.lyricLines[0].chords);

  const chordOnlySection = {
    ...validSection,
    lyricLines: [{ id: "line:empty", text: "", chords: [] }],
  };
  assert.equal(sectionHasLyrics(chordOnlySection), false);
  assert.deepEqual(getSectionPracticeChords(chordOnlySection), ["G", "D", "Em", "C"]);
  assert.deepEqual(getSectionSummaryChords(chordOnlySection), ["G", "D", "Em", "C"]);

  const wordsOnlyLyricSection = {
    ...validSection,
    chords: ["G", "C"],
    lyricLines: [{ id: "line:words", text: "Words only", chords: [] }],
  };
  assert.equal(sectionHasLyrics(wordsOnlyLyricSection), true);
  assert.deepEqual(getSectionSummaryChords(wordsOnlyLyricSection), []);
  assert.deepEqual(getSectionPracticeChords(wordsOnlyLyricSection), []);
  assert.deepEqual(validateSection(wordsOnlyLyricSection).errors, ["Section needs at least one valid chord."]);

  const invalidOnlyLyricSection = {
    ...validSection,
    chords: ["G", "C"],
    lyricLines: [{ id: "line:bad-only", text: "", chords: ["NopeChord"] }],
  };
  assert.equal(sectionHasLyrics(invalidOnlyLyricSection), true);
  assert.deepEqual(getSectionPracticeChords(invalidOnlyLyricSection), []);
  assert.deepEqual(getSectionSummaryChords(invalidOnlyLyricSection), []);
  assert.deepEqual(normalizeSection(invalidOnlyLyricSection).chords, []);
  assert.deepEqual(expandSectionToPracticeChords(invalidOnlyLyricSection), []);
  assert.deepEqual(validateSection(invalidOnlyLyricSection).errors, [
    "Section needs at least one valid chord.",
    "Lyric line 1 has no valid chords.",
  ]);

  const instrumentalLyricLine = normalizeLyricLine({ id: "line:solo", text: "", chords: ["A7", "D"] });
  assert.deepEqual(instrumentalLyricLine, { id: "line:solo", text: "", chords: ["A7", "D"] });

  const incompleteSlashLyricLine = normalizeLyricLine({ id: "line:slash", text: "", chords: ["G/"] });
  assert.deepEqual(incompleteSlashLyricLine, { id: "line:slash", text: "", chords: [] });

  const incompleteSlashLyricSection = {
    ...validSection,
    chords: ["G", "C"],
    lyricLines: [{ id: "line:slash", text: "", chords: ["G/"] }],
  };
  assert.deepEqual(getSectionPracticeChords(incompleteSlashLyricSection), []);
  assert.deepEqual(getSectionSummaryChords(incompleteSlashLyricSection), []);
  assert.deepEqual(validateSection(incompleteSlashLyricSection).errors, [
    "Section needs at least one valid chord.",
    "Lyric line 1 has no valid chords.",
  ]);

  const badSection = {
    ...section,
    name: "",
    chords: [],
    barsPerChord: 9,
    repeatCount: 0,
  };
  assert.deepEqual(validateSection(badSection).errors, [
    "Section name is empty.",
    "Section needs at least one valid chord.",
    "Bars per chord must be 1, 2, or 4.",
    "Repeat count must be between 1 and 8.",
  ]);
  assert.deepEqual(validateSection(vocalSection).errors, []);
  assert.deepEqual(validateSection({ ...vocalSection, lyricLines: [{ id: "line:blank-text", text: "Words only", chords: [] }] }).errors, [
    "Section needs at least one valid chord.",
  ]);
  assert.deepEqual(validateSection({ ...vocalSection, lyricLines: [{ id: "line:bad", text: "Bad chord", chords: ["NopeChord"] }] }).errors, [
    "Section needs at least one valid chord.",
    "Lyric line 1 has no valid chords.",
  ]);
  assert.deepEqual(validateSection({ ...validSection, repeatCount: 1.5 }).errors, [
    "Repeat count must be between 1 and 8.",
  ]);
  assert.deepEqual(validateSection({ ...validSection, repeatCount: Number.NaN }).errors, [
    "Repeat count must be between 1 and 8.",
  ]);

  const arrangement = {
    ...blank,
    sections: [
      { ...validSection, id: "verse", name: "Verse", barsPerChord: 1, repeatCount: 1 },
      { ...validSection, id: "chorus", name: "Chorus", chords: ["C", "G"], barsPerChord: 2, repeatCount: 2 },
      { ...validSection, id: "bridge", name: "Bridge", chords: ["Am"], barsPerChord: 2, repeatCount: 1 },
    ],
  };

  assert.deepEqual(expandArrangementToPracticeChords(arrangement), [
    "G",
    "D",
    "Em",
    "C",
    "C",
    "G",
    "C",
    "G",
    "Am",
  ]);
  assert.equal(getMostCommonBarsPerChord(arrangement), 2);
  assert.deepEqual(validateArrangement(arrangement).errors, []);

  const cloned = cloneArrangement(arrangement, "Copied Form");
  assert.equal(cloned.title, "Copied Form");
  assert.notEqual(cloned.id, arrangement.id);
  assert.notEqual(cloned.sections[0].id, arrangement.sections[0].id);

  const lyricArrangement = { ...arrangement, sections: [vocalSection] };
  const clonedLyricArrangement = cloneArrangement(lyricArrangement, "Copied Lyrics");
  assert.notEqual(clonedLyricArrangement.sections[0].lyricLines[0].id, vocalSection.lyricLines[0].id);
  assert.deepEqual(clonedLyricArrangement.sections[0].lyricLines[0].chords, vocalSection.lyricLines[0].chords);

  const shortArrangement = {
    ...arrangement,
    sections: [{ ...validSection, chords: ["G"], repeatCount: 1 }],
  };
  assert.deepEqual(validateArrangement(shortArrangement).errors, [
    "Full-song practice needs at least two valid chords.",
  ]);

  const templateBundlePath = resolve(tempDir, "song-arrangement-templates.bundle.mjs");
  await build({
    entryPoints: [resolve(rootDir, "src", "data", "songArrangementTemplates.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: templateBundlePath,
    logLevel: "silent",
  });

  const { DEFAULT_SONG_ARRANGEMENT_TEMPLATES } = await import(pathToFileURL(templateBundlePath).href);

  const localizationBundlePath = resolve(tempDir, "song-arrangement-localization.bundle.mjs");
  await build({
    entryPoints: [resolve(rootDir, "src", "utils", "songArrangementLocalization.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: localizationBundlePath,
    logLevel: "silent",
  });

  const {
    getLocalizedArrangementText,
    getSongArrangementDifficultyLabel,
    getSongArrangementStyleLabel,
    localizeSongArrangementForLanguage,
  } = await import(pathToFileURL(localizationBundlePath).href);

  assert.equal(DEFAULT_SONG_ARRANGEMENT_TEMPLATES.length, 8);
  assert.equal(DEFAULT_SONG_ARRANGEMENT_TEMPLATES[0].id, "template:pop-1564");
  assert.equal(DEFAULT_SONG_ARRANGEMENT_TEMPLATES[0].title, "Pop 1-5-6-4 Form");
  const validTimeSignatures = new Set(["4/4", "3/4", "6/8"]);
  const validDifficulties = new Set(["beginner", "intermediate", "advanced"]);
  for (const template of DEFAULT_SONG_ARRANGEMENT_TEMPLATES) {
    assert.equal(typeof template.id, "string");
    assert.equal(template.id.length > 0, true);
    assert.equal(typeof template.title, "string");
    assert.equal(template.title.length > 0, true);
    assert.equal(typeof template.key, "string");
    assert.equal(template.key.length > 0, true);
    assert.equal(typeof template.bpm, "number");
    assert.equal(template.bpm >= 40, true);
    assert.equal(template.bpm <= 240, true);
    assert.equal(validTimeSignatures.has(template.timeSignature), true);
    assert.equal(typeof template.style, "string");
    assert.equal(template.style.length > 0, true);
    assert.equal(validDifficulties.has(template.difficulty), true);
    assert.equal(template.sections.length >= 4, true);
    assert.equal("lyrics" in template, false);
    assert.equal("lyricLines" in template, false);
    for (const section of template.sections) {
      assert.equal("lyricCue" in section, false);
      assert.equal("lyricLines" in section, false);
      assert.equal(section.chords.length >= 2, true);
      assert.equal(typeof section.rhythmPattern, "string");
      assert.equal(section.rhythmPattern.length > 0, true);
      if ("notes" in section) assert.equal(typeof section.notes, "string");
      assert.equal(normalizeSection(section).chords.length, section.chords.length);
      assert.deepEqual(validateSection(section).errors, []);
    }
    assert.deepEqual(validateArrangement(template).errors, []);
  }

  assert.equal(getLocalizedArrangementText("Pop 1-5-6-4 Form", "zh"), "流行 1-5-6-4 结构");
  assert.equal(getLocalizedArrangementText("Custom Title", "zh"), "Custom Title");
  assert.equal(getSongArrangementStyleLabel("city-pop", "zh"), "City Pop");
  assert.equal(getSongArrangementStyleLabel("folk", "zh"), "民谣");
  assert.equal(getSongArrangementDifficultyLabel("beginner", "zh"), "入门");
  assert.equal(getSongArrangementDifficultyLabel("intermediate", "zh"), "进阶");

  const localizedTemplate = localizeSongArrangementForLanguage(DEFAULT_SONG_ARRANGEMENT_TEMPLATES[0], "zh");
  assert.equal(localizedTemplate.title, "流行 1-5-6-4 结构");
  assert.equal(localizedTemplate.sections[0].name, "前奏");
  assert.equal(localizedTemplate.sections[0].rhythmPattern, "轻下扫");
  assert.equal(localizedTemplate.sections[0].notes, "第一遍保持简单。");
  assert.deepEqual(localizedTemplate.sections[0].chords, DEFAULT_SONG_ARRANGEMENT_TEMPLATES[0].sections[0].chords);

  const englishTemplate = localizeSongArrangementForLanguage(DEFAULT_SONG_ARRANGEMENT_TEMPLATES[0], "en");
  assert.equal(englishTemplate.title, DEFAULT_SONG_ARRANGEMENT_TEMPLATES[0].title);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
