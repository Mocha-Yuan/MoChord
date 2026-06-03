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
  add9: "Add 9",
  madd9: "Minor Add 9",
  add11: "Add 11",
  m7add11: "Minor 7 Add 11",
  sus2: "Suspended 2nd",
  sus4: "Suspended 4th",
  "7sus4": "Dominant 7 Suspended 4th",
};

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
  14: "9",
  17: "11",
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
  const quality = normalizeChordQuality(suffix);
  const bassNote = rawBassNote ? normalizeNoteName(rawBassNote) : undefined;

  if (getNoteIndex(root) < 0 || !quality || !CHORD_INTERVALS[quality]) {
    throw new Error("Sorry, this chord is not supported yet. Try C, Am, G7, Fmaj7 or Dm7.");
  }

  if (bassNote && getNoteIndex(bassNote) < 0) {
    throw new Error("Sorry, this chord is not supported yet. Try C, Am, G7, Fmaj7 or Dm7.");
  }

  const intervals = CHORD_INTERVALS[quality];
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
  const suffixByQuality: Record<string, string> = {
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
    add9: "add9",
    madd9: "madd9",
    add11: "add11",
    m7add11: "m7add11",
    sus2: "sus2",
    sus4: "sus4",
    "7sus4": "7sus4",
  };
  const bass = parsed.bassNote ? `/${parsed.bassNote}` : "";
  return `${parsed.root}${suffixByQuality[parsed.quality] ?? ""}${bass}`;
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

function noteToMidi(note: string, octave: number): number {
  return getNoteIndex(note) + (octave + 1) * 12;
}
