import type { ParsedChord, ScaleMode } from "../types/music";

export const CHROMATIC_NOTES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

export const CHORD_INTERVALS: Record<string, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  "9": [0, 4, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  m9: [0, 3, 7, 10, 14],
  "11": [0, 4, 7, 10, 14, 17],
  maj11: [0, 4, 7, 11, 14, 17],
  m11: [0, 3, 7, 10, 14, 17],
  "13": [0, 4, 7, 10, 14, 17, 21],
  maj13: [0, 4, 7, 11, 14, 17, 21],
  m13: [0, 3, 7, 10, 14, 17, 21],
  add9: [0, 4, 7, 14],
  madd9: [0, 3, 7, 14],
  add11: [0, 4, 7, 17],
  m7add11: [0, 3, 7, 10, 17],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  "7sus4": [0, 5, 7, 10],
};

const QUALITY_ALIASES: Record<string, string> = {
  "": "major",
  M: "major",
  maj: "major",
  m: "minor",
  min: "minor",
  minor: "minor",
  dim: "dim",
  aug: "aug",
  "+": "aug",
  "7": "7",
  maj7: "maj7",
  M7: "maj7",
  maj9: "maj9",
  M9: "maj9",
  m7: "m7",
  min7: "m7",
  m7b5: "m7b5",
  halfdim: "m7b5",
  "ø": "m7b5",
  "9": "9",
  m9: "m9",
  min9: "m9",
  "11": "11",
  maj11: "maj11",
  M11: "maj11",
  m11: "m11",
  min11: "m11",
  "13": "13",
  maj13: "maj13",
  M13: "maj13",
  m13: "m13",
  min13: "m13",
  add9: "add9",
  madd9: "madd9",
  mAdd9: "madd9",
  add11: "add11",
  m7add11: "m7add11",
  sus2: "sus2",
  sus4: "sus4",
  "7sus4": "7sus4",
};

export const QUALITY_LABELS: Record<string, string> = {
  major: "Major",
  minor: "Minor",
  dim: "Diminished",
  aug: "Augmented",
  "7": "Dominant 7th",
  maj7: "Major 7th",
  m7: "Minor 7th",
  m7b5: "Minor 7 Flat 5",
  "9": "Dominant 9th",
  maj9: "Major 9th",
  m9: "Minor 9th",
  "11": "Dominant 11th",
  maj11: "Major 11th",
  m11: "Minor 11th",
  "13": "Dominant 13th",
  maj13: "Major 13th",
  m13: "Minor 13th",
  add9: "Add 9",
  madd9: "Minor Add 9",
  add11: "Add 11",
  m7add11: "Minor 7 Add 11",
  sus2: "Suspended 2nd",
  sus4: "Suspended 4th",
  "7sus4": "Dominant 7 Suspended 4th",
};

const QUALITY_SUFFIXES: Record<string, string> = {
  major: "",
  minor: "m",
  dim: "dim",
  aug: "aug",
  "7": "7",
  maj7: "maj7",
  m7: "m7",
  m7b5: "m7b5",
  "9": "9",
  maj9: "maj9",
  m9: "m9",
  "11": "11",
  maj11: "maj11",
  m11: "m11",
  "13": "13",
  maj13: "maj13",
  m13: "m13",
  add9: "add9",
  madd9: "madd9",
  add11: "add11",
  m7add11: "m7add11",
  sus2: "sus2",
  sus4: "sus4",
  "7sus4": "7sus4",
};

const OMITTED_INTERVALS: Record<string, number[]> = {
  no3: [3, 4],
  no5: [6, 7, 8],
  no7: [10, 11],
  no9: [14],
  no11: [17],
};

const SUFFIX_MODIFIER_INTERVALS: Record<string, number> = {
  add9: 14,
  add11: 17,
  add13: 21,
  b9: 13,
  "#9": 15,
  "#11": 18,
  b13: 20,
  "#13": 22,
};

const ALTERED_DEGREE_INTERVALS: Record<string, { from: number[]; to: number }> = {
  b5: { from: [7, 8], to: 6 },
  "#5": { from: [6, 7], to: 8 },
};

const SUFFIX_MODIFIER_TOKENS = [
  "add13",
  "add11",
  "add9",
  "omit13",
  "omit11",
  "omit9",
  "omit7",
  "omit5",
  "omit3",
  "no13",
  "no11",
  "no9",
  "no7",
  "no5",
  "no3",
  "#13",
  "b13",
  "#11",
  "#9",
  "b9",
  "#5",
  "b5",
  "sus4",
  "sus2",
] as const;

const BASE_QUALITY_ALIASES = Object.keys(QUALITY_ALIASES).sort((a, b) => b.length - a.length);

const INTERVAL_LABELS: Record<number, string> = {
  0: "1",
  2: "2",
  3: "b3",
  4: "3",
  5: "4",
  6: "b5",
  7: "5",
  8: "#5",
  10: "b7",
  11: "7",
  13: "b9",
  14: "9",
  15: "#9",
  17: "11",
  18: "#11",
  20: "b13",
  21: "13",
};

const MODE_INTERVALS: Record<ScaleMode, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  "Natural Minor": [0, 2, 3, 5, 7, 8, 10],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

export function normalizeNoteName(note: string): string {
  const trimmed = note.trim().replace("♭", "b").replace("♯", "#");
  const canonical = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return FLAT_TO_SHARP[canonical] ?? canonical;
}

export function getNoteIndex(note: string): number {
  return CHROMATIC_NOTES.indexOf(normalizeNoteName(note) as (typeof CHROMATIC_NOTES)[number]);
}

export function transposeNote(root: string, semitones: number): string {
  const rootIndex = getNoteIndex(root);
  if (rootIndex < 0) {
    throw new Error(`Unknown root note: ${root}`);
  }
  return CHROMATIC_NOTES[(rootIndex + semitones + 120) % 12];
}

export function parseChordName(chordName: string): ParsedChord {
  const original = chordName.trim();
  const [mainChord, rawBassNote] = original.split("/");
  const match = mainChord.trim().match(/^([A-Ga-g](?:#|b|♭|♯)?)(.*)$/);

  if (!match) {
    throw new Error("Sorry, this chord is not supported yet. Try C, Am, G7, Fmaj7 or Dm7.");
  }

  const root = normalizeNoteName(match[1]);
  const suffix = match[2].trim();
  const chordDefinition = parseChordDefinition(suffix);
  const bassNote = rawBassNote ? normalizeNoteName(rawBassNote) : undefined;

  if (getNoteIndex(root) < 0 || !chordDefinition) {
    throw new Error("Sorry, this chord is not supported yet. Try C, Am, G7, Fmaj7 or Dm7.");
  }

  if (bassNote && getNoteIndex(bassNote) < 0) {
    throw new Error("Sorry, this chord is not supported yet. Try C, Am, G7, Fmaj7 or Dm7.");
  }

  const { intervals, quality } = chordDefinition;
  const notes = intervals.map((interval) => transposeNote(root, interval));

  return {
    original,
    root,
    quality,
    intervals,
    notes,
    bassNote,
  };
}

export function getDisplayChordName(parsed: ParsedChord): string {
  const bass = parsed.bassNote ? `/${parsed.bassNote}` : "";
  return `${parsed.root}${QUALITY_SUFFIXES[parsed.quality] ?? parsed.quality}${bass}`;
}

export function getIntervalLabels(intervals: number[]): string[] {
  return intervals.map((interval) => INTERVAL_LABELS[interval] ?? `${interval} semitones`);
}

export function getQualityLabel(quality: string): string {
  return QUALITY_LABELS[quality] ?? quality;
}

export function generateDiatonicChords(key: string, mode: ScaleMode): string[] {
  const scaleIntervals = MODE_INTERVALS[mode];
  const scaleNotes = scaleIntervals.map((interval) => transposeNote(key, interval));

  return scaleNotes.map((note, degree) => {
    const rootIndex = scaleIntervals[degree];
    const thirdIndex = scaleIntervals[(degree + 2) % 7] + (degree + 2 >= 7 ? 12 : 0);
    const fifthIndex = scaleIntervals[(degree + 4) % 7] + (degree + 4 >= 7 ? 12 : 0);
    const triad = [0, thirdIndex - rootIndex, fifthIndex - rootIndex];

    if (triad[1] === 4 && triad[2] === 7) return note;
    if (triad[1] === 3 && triad[2] === 7) return `${note}m`;
    if (triad[1] === 3 && triad[2] === 6) return `${note}dim`;
    if (triad[1] === 4 && triad[2] === 8) return `${note}aug`;
    return note;
  });
}

export function getScaleNotes(key: string, mode: ScaleMode): string[] {
  return MODE_INTERVALS[mode].map((interval) => transposeNote(key, interval));
}

export function toPlayableChordNotes(notes: string[], root: string): string[] {
  const normalizedNotes = notes.map(normalizeNoteName).filter((note) => getNoteIndex(note) >= 0);
  if (normalizedNotes.length === 0) return [];

  const normalizedRoot = normalizeNoteName(root);
  const rootIndex = getNoteIndex(normalizedRoot);
  const rootOctave = rootIndex >= 7 ? 3 : 4;
  let previousMidi = -Infinity;

  return normalizedNotes.map((note, index) => {
    let octave = index === 0 ? rootOctave : rootOctave;
    let midi = noteToMidi(note, octave);

    while (midi <= previousMidi) {
      octave += 1;
      midi = noteToMidi(note, octave);
    }

    previousMidi = midi;
    return `${note}${octave}`;
  });
}

function normalizeChordQuality(suffix: string): string | undefined {
  const compact = suffix.replace(/\s+/g, "");
  return QUALITY_ALIASES[compact] ?? QUALITY_ALIASES[compact.replace(/^minor/i, "m").replace(/^min/i, "m")];
}

function parseChordDefinition(suffix: string): { quality: string; intervals: number[] } | undefined {
  const compact = suffix.replace(/\s+/g, "");
  const parentheticalMatches = [...compact.matchAll(/\(([^()]+)\)/g)];
  const suffixWithoutParentheses = compact.replace(/\([^()]+\)/g, "");
  const base = parseBaseQuality(suffixWithoutParentheses);

  if (!base) return undefined;

  let intervals = [...CHORD_INTERVALS[base.quality]];
  const suffixModifiers = tokenizeSuffixModifiers(base.remaining);
  if (!suffixModifiers) return undefined;

  const parentheticalModifiers = parentheticalMatches.flatMap((match) =>
    match[1].split(",").map((modifier) => `(${normalizeOmissionModifier(modifier) ?? ""})`),
  );
  if (parentheticalModifiers.some((modifier) => modifier === "()")) return undefined;

  for (const modifier of [...suffixModifiers, ...parentheticalModifiers]) {
    intervals = applyChordModifier(intervals, modifier);
    if (intervals.length === 0) return undefined;
  }

  const quality = `${QUALITY_SUFFIXES[base.quality] ?? base.quality}${[...suffixModifiers, ...parentheticalModifiers].join("")}`;
  return { quality: quality || "major", intervals: normalizeIntervals(intervals) };
}

function parseBaseQuality(suffix: string): { quality: string; remaining: string } | undefined {
  const exact = normalizeChordQuality(suffix);
  if (exact) return { quality: exact, remaining: "" };

  for (const alias of BASE_QUALITY_ALIASES) {
    if (!alias || alias.length === 0) continue;
    if (!suffix.toLowerCase().startsWith(alias.toLowerCase())) continue;

    const quality = normalizeChordQuality(alias);
    if (quality && CHORD_INTERVALS[quality]) {
      return { quality, remaining: suffix.slice(alias.length) };
    }
  }

  return { quality: "major", remaining: suffix };
}

function tokenizeSuffixModifiers(suffix: string): string[] | undefined {
  const modifiers: string[] = [];
  let remaining = suffix;

  while (remaining.length > 0) {
    const token = SUFFIX_MODIFIER_TOKENS.find((candidate) => remaining.toLowerCase().startsWith(candidate.toLowerCase()));
    if (!token) return undefined;

    const normalized = normalizeOmissionModifier(token) ?? normalizeSuffixModifier(token);
    if (!normalized) return undefined;

    modifiers.push(normalized);
    remaining = remaining.slice(token.length);
  }

  return modifiers;
}

function applyChordModifier(intervals: number[], modifier: string): number[] {
  if (modifier.startsWith("(") && modifier.endsWith(")")) {
    const omitted = OMITTED_INTERVALS[modifier.slice(1, -1)];
    return omitted ? intervals.filter((interval) => !omitted.includes(interval)) : [];
  }

  const omission = OMITTED_INTERVALS[modifier];
  if (omission) return intervals.filter((interval) => !omission.includes(interval));

  const altered = ALTERED_DEGREE_INTERVALS[modifier];
  if (altered) {
    const next = intervals.filter((interval) => !altered.from.includes(interval));
    return [...next, altered.to];
  }

  if (modifier === "sus2" || modifier === "sus4") {
    return [...intervals.filter((interval) => interval !== 3 && interval !== 4), modifier === "sus2" ? 2 : 5];
  }

  const added = SUFFIX_MODIFIER_INTERVALS[modifier];
  return typeof added === "number" ? [...intervals, added] : [];
}

function normalizeSuffixModifier(modifier: string): string | undefined {
  const normalized = modifier.trim();
  return SUFFIX_MODIFIER_INTERVALS[normalized] ||
    ALTERED_DEGREE_INTERVALS[normalized] ||
    normalized === "sus2" ||
    normalized === "sus4"
    ? normalized
    : undefined;
}

function normalizeOmissionModifier(modifier: string): string | undefined {
  const normalized = modifier.trim().toLowerCase().replace(/^omit/, "no");
  return OMITTED_INTERVALS[normalized] ? normalized : undefined;
}

function normalizeIntervals(intervals: number[]): number[] {
  return Array.from(new Set(intervals)).sort((a, b) => a - b);
}

function noteToMidi(note: string, octave: number): number {
  return getNoteIndex(note) + (octave + 1) * 12;
}
