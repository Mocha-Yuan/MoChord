import type { AIChordProgressionResult, AIProgressionChord, SupportedMode } from "../types/progression";
import { normalizeNoteName, transposeNote } from "./musicTheory";

const MODE_INTERVALS: Record<SupportedMode, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  "Natural Minor": [0, 2, 3, 5, 7, 8, 10],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

const TRIAD_QUALITIES: Record<SupportedMode, Array<"major" | "minor" | "dim">> = {
  Major: ["major", "minor", "minor", "major", "major", "minor", "dim"],
  "Natural Minor": ["minor", "dim", "major", "minor", "minor", "major", "major"],
  Dorian: ["minor", "minor", "major", "major", "minor", "dim", "major"],
  Mixolydian: ["major", "minor", "dim", "major", "minor", "minor", "major"],
};

const PROFESSIONAL_SUFFIXES: Record<SupportedMode, string[]> = {
  Major: ["maj7", "m7", "m7", "maj7", "7sus4", "m7", "m7b5"],
  "Natural Minor": ["m7", "m7b5", "maj7", "m7", "m7", "maj7", "7"],
  Dorian: ["m7", "m7", "maj7", "7", "m7", "m7b5", "maj7"],
  Mixolydian: ["7", "m7", "m7b5", "maj7", "m7", "m7", "maj7"],
};

const ROMAN_BY_MODE: Record<SupportedMode, string[]> = {
  Major: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
  "Natural Minor": ["i", "ii°", "III", "iv", "v", "VI", "VII"],
  Dorian: ["i", "ii", "III", "IV", "v", "vi°", "VII"],
  Mixolydian: ["I", "ii", "iii°", "IV", "v", "vi", "VII"],
};

const FUNCTION_BY_DEGREE = [
  "Tonic",
  "Supertonic color",
  "Mediant color",
  "Subdominant",
  "Dominant",
  "Relative color",
  "Leading-tone color",
];

export function generateDiatonicTriads(
  key: string,
  mode: SupportedMode,
  degrees: number[],
): AIProgressionChord[] {
  return degrees.map((degree, index) => {
    const chord = formatChordName(getScaleNote(key, mode, degree), triadSuffix(mode, degree));
    const roman = romanFor(mode, degree);
    return {
      degree,
      roman,
      chord,
      function: FUNCTION_BY_DEGREE[degree - 1],
      explanation:
        index > 0 && degrees[index - 1] === degree
          ? `Repeat of the ${roman} chord.`
          : `The ${roman} chord in ${normalizeNoteName(key)} ${mode}.`,
    };
  });
}

export function generateProfessionalChords(
  key: string,
  mode: SupportedMode,
  degrees: number[],
): AIProgressionChord[] {
  return degrees.map((degree, index) => {
    const root = getScaleNote(key, mode, degree);
    let suffix = PROFESSIONAL_SUFFIXES[mode][degree - 1];

    if (mode === "Major" && degree === 6 && degrees[index - 1] === degree) {
      suffix = "m7add11";
    }

    const roman = professionalRoman(mode, degree, suffix);
    return {
      degree,
      roman,
      chord: formatChordName(root, suffix),
      function: `${FUNCTION_BY_DEGREE[degree - 1]} with color`,
      explanation:
        index > 0 && degrees[index - 1] === degree
          ? `A more colorful repeat of the ${romanFor(mode, degree)} chord.`
          : `Adds a guitar-friendly ${suffix} color to the ${romanFor(mode, degree)} chord.`,
    };
  });
}

export function createLocalChordProgressionResult(
  input: string,
  key: string,
  mode: SupportedMode,
  degrees: number[],
  warning?: string,
): AIChordProgressionResult {
  const beginnerChords = generateDiatonicTriads(key, mode, degrees);
  const professionalChords = generateProfessionalChords(key, mode, degrees);

  return {
    normalizedInput: `${normalizeNoteName(key)} ${mode} ${degrees.join("-")}`,
    key: normalizeNoteName(key),
    mode,
    degrees,
    romanNumerals: degrees.map((degree) => romanFor(mode, degree)),
    beginner: {
      label: "Beginner",
      description: "Simple diatonic triads for beginner guitar players.",
      chords: beginnerChords,
    },
    professional: {
      label: "Professional",
      description: "A more colorful version with seventh and suspended sonorities.",
      chords: professionalChords,
    },
    notes: [`Generated locally from "${input}".`],
    warnings: warning ? [warning] : [],
  };
}

function getScaleNote(key: string, mode: SupportedMode, degree: number): string {
  return transposeNote(normalizeNoteName(key), MODE_INTERVALS[mode][degree - 1]);
}

function triadSuffix(mode: SupportedMode, degree: number): string {
  const quality = TRIAD_QUALITIES[mode][degree - 1];
  if (quality === "minor") return "m";
  if (quality === "dim") return "dim";
  return "";
}

function romanFor(mode: SupportedMode, degree: number): string {
  return ROMAN_BY_MODE[mode][degree - 1];
}

function professionalRoman(mode: SupportedMode, degree: number, suffix: string): string {
  const base = romanFor(mode, degree).replace("°", "");
  if (suffix === "m7") return `${base}7`;
  if (suffix === "m7b5") return `${base}m7b5`;
  return `${base}${suffix}`;
}

function formatChordName(root: string, suffix: string): string {
  return `${root}${suffix}`;
}
