import type { AIChordProgressionResult, AIProgressionChord, SupportedMode } from "../types/progression";
import { normalizeNoteName, transposeNote } from "./musicTheory";
import type { Language } from "../i18n";
import { createDefaultPracticeCoachPlan, localizePracticeCoachPlan } from "./practiceCoach";

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

const ZH_MODE_LABELS: Record<SupportedMode, string> = {
  Major: "大调",
  "Natural Minor": "自然小调",
  Dorian: "多利亚调式",
  Mixolydian: "混合利底亚调式",
};

const ZH_FUNCTION_BY_DEGREE = [
  "主功能",
  "上主音色彩",
  "中音色彩",
  "下属功能",
  "属功能",
  "关系小调色彩",
  "导音色彩",
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
    modeLabel: mode,
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
    coach: createDefaultPracticeCoachPlan({
      input,
      key: normalizeNoteName(key),
      level: "beginner",
      language: "en",
    }),
    notes: [`Generated locally from "${input}".`],
    warnings: warning ? [warning] : [],
  };
}

export function localizeProgressionResult(
  result: AIChordProgressionResult,
  language: Language,
): AIChordProgressionResult {
  if (language !== "zh") {
    return {
      ...result,
      modeLabel: result.mode,
    };
  }

  return {
    ...result,
    modeLabel: ZH_MODE_LABELS[result.mode],
    normalizedInput: `${result.key} ${ZH_MODE_LABELS[result.mode]} ${result.degrees.join("-")}`,
    beginner: {
      ...result.beginner,
      label: "入门版",
      description: "适合入门吉他练习的顺阶三和弦。",
      chords: localizeChords(result.beginner.chords, result),
    },
    professional: {
      ...result.professional,
      label: "专业版",
      description: "加入七和弦、挂留与延伸音的进阶版本。",
      chords: localizeChords(result.professional.chords, result),
    },
    coach: result.coach
      ? localizePracticeCoachPlan(result.coach, {
          input: result.normalizedInput,
          key: result.key,
          level: "beginner",
          language: "zh",
        })
      : undefined,
    notes: localizeNotes(result.notes, result),
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

function localizeChords(chords: AIProgressionChord[], result: AIChordProgressionResult): AIProgressionChord[] {
  return chords.map((chord, index) => ({
    ...chord,
    function: localizeFunction(chord),
    explanation: localizeExplanation(chord, index, result),
  }));
}

function localizeFunction(chord: AIProgressionChord): string {
  return ZH_FUNCTION_BY_DEGREE[chord.degree - 1] ?? chord.function;
}

function localizeExplanation(chord: AIProgressionChord, index: number, result: AIChordProgressionResult): string {
  const previousDegree = result.degrees[index - 1];
  const roman = chord.roman || romanFor(result.mode, chord.degree);
  if (previousDegree === chord.degree) {
    return `重复 ${romanFor(result.mode, chord.degree)} 级，并加入更丰富的色彩。`;
  }

  if (chord.chord.includes("7") || chord.chord.includes("add") || chord.chord.includes("sus") || chord.chord.includes("9")) {
    return `在 ${romanFor(result.mode, chord.degree)} 级上加入 ${describeChordColor(chord.chord)}，让和声更有层次。`;
  }

  return `${result.key} ${ZH_MODE_LABELS[result.mode]}中的 ${roman} 级和弦。`;
}

function describeChordColor(chordName: string): string {
  if (chordName.includes("sus")) return "挂留色彩";
  if (chordName.includes("add11")) return "十一度延伸音";
  if (chordName.includes("add9") || chordName.includes("9")) return "九度色彩";
  if (chordName.includes("maj7")) return "大七色彩";
  if (chordName.includes("7")) return "七和弦色彩";
  return "色彩音";
}

function localizeNotes(notes: string[], result: AIChordProgressionResult): string[] {
  const generatedLocally = notes.find((note) => note.startsWith("Generated locally from "));
  const localized = generatedLocally ? [`已根据“${extractQuotedInput(generatedLocally)}”在本地生成。`] : [];
  const remaining = notes.filter((note) => note !== generatedLocally);
  return [...localized, ...remaining];
}

function extractQuotedInput(note: string): string {
  const match = note.match(/"(.+)"/);
  return match?.[1] ?? `${resultFallbackInput}`;
}

const resultFallbackInput = "输入内容";
