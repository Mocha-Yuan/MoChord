import { BUILT_IN_CHORD_SHAPES } from "../data/chordShapes";
import type { GuitarVoicing, ParsedChord } from "../types/music";
import { getDisplayChordName, getNoteIndex, normalizeNoteName, transposeNote } from "./musicTheory";

export const STANDARD_TUNING = ["E", "A", "D", "G", "B", "E"];
export const STANDARD_TUNING_PITCHES = ["E2", "A2", "D3", "G3", "B3", "E4"];
const COMPACT_DIAGRAM_FRETS = 4;

export function voicingFromFrets(frets: number[], baseFret = 1, fingers?: number[]): GuitarVoicing {
  return {
    frets,
    fingers,
    muted: frets.map((fret) => fret < 0),
    baseFret,
  };
}

export function getNoteAtFret(stringIndex: number, fret: number): string {
  return transposeNote(STANDARD_TUNING[stringIndex], fret);
}

export function getVoicingNotes(voicing: GuitarVoicing): string[] {
  return voicing.frets.map((fret, index) => (fret < 0 ? "x" : getNoteAtFret(index, fret)));
}

export function voicingToPlayableNotes(voicing: GuitarVoicing): string[] {
  return voicing.frets
    .map((fret, index) => {
      if (fret < 0 || voicing.muted[index]) return null;
      return transposePitch(STANDARD_TUNING_PITCHES[index], fret);
    })
    .filter((note): note is string => Boolean(note));
}

export function generateGuitarVoicing(parsedChord: ParsedChord): GuitarVoicing {
  const shapeName = getDisplayChordName(parsedChord);
  const saved = loadSavedVoicing(shapeName);
  if (saved) return saved;

  const builtIn = BUILT_IN_CHORD_SHAPES[shapeName];
  if (builtIn) {
    return voicingFromFrets(builtIn.frets, builtIn.baseFret, builtIn.fingers);
  }

  return generateApproximateVoicing(parsedChord.notes);
}

export function generateGuitarVoicings(parsedChord: ParsedChord, limit = 12): GuitarVoicing[] {
  const shapeName = getDisplayChordName(parsedChord);
  const voicings: GuitarVoicing[] = [];
  const saved = loadSavedVoicing(shapeName);
  const builtIn = BUILT_IN_CHORD_SHAPES[shapeName];

  if (saved) voicings.push(saved);
  if (builtIn) voicings.push(voicingFromFrets(builtIn.frets, builtIn.baseFret, builtIn.fingers));

  const generated = generatePositionVoicings(parsedChord.notes, limit + 8);
  voicings.push(...generated);

  const unique = new Map<string, GuitarVoicing>();
  voicings.forEach((voicing) => {
    unique.set(getVoicingKey(voicing), voicing);
  });

  const result = Array.from(unique.values()).slice(0, limit);
  return result.length > 0 ? result : [generateApproximateVoicing(parsedChord.notes)];
}

export function generateApproximateVoicing(notes: string[]): GuitarVoicing {
  const chordToneIndexes = new Set(notes.map(getNoteIndex));
  const frets = STANDARD_TUNING.map((openNote) => {
    const openIndex = getNoteIndex(openNote);
    let best = -1;
    for (let fret = 0; fret <= 4; fret += 1) {
      if (chordToneIndexes.has((openIndex + fret) % 12)) {
        best = fret;
        break;
      }
    }
    return best;
  });

  const soundingNotes = frets
    .map((fret, index) => (fret >= 0 ? getNoteAtFret(index, fret) : null))
    .filter((note): note is string => Boolean(note));
  const missingRoot = soundingNotes.every((note) => normalizeNoteName(note) !== normalizeNoteName(notes[0]));

  if (missingRoot) {
    const root = normalizeNoteName(notes[0]);
    const rootIndex = getNoteIndex(root);
    let bestString = -1;
    let bestFret = 99;
    STANDARD_TUNING.forEach((openNote, index) => {
      const openIndex = getNoteIndex(openNote);
      for (let fret = 0; fret <= 5; fret += 1) {
        if ((openIndex + fret) % 12 === rootIndex && fret < bestFret) {
          bestString = index;
          bestFret = fret;
        }
      }
    });
    if (bestString >= 0) frets[bestString] = bestFret;
  }

  return voicingFromFrets(frets, 1, frets.map((fret) => (fret <= 0 ? 0 : Math.min(fret, 4))));
}

function generatePositionVoicings(notes: string[], limit: number): GuitarVoicing[] {
  const chordToneIndexes = new Set(notes.map(getNoteIndex));
  const root = normalizeNoteName(notes[0]);
  const candidates: Array<{ voicing: GuitarVoicing; score: number }> = [];

  for (let baseFret = 1; baseFret <= 12; baseFret += 1) {
    const choices = STANDARD_TUNING.map((openNote) => {
      const openIndex = getNoteIndex(openNote);
      const stringChoices = [-1];

      if (baseFret === 1 && chordToneIndexes.has(openIndex)) {
        stringChoices.push(0);
      }

      for (let fret = baseFret; fret < baseFret + COMPACT_DIAGRAM_FRETS; fret += 1) {
        if (chordToneIndexes.has((openIndex + fret) % 12)) {
          stringChoices.push(fret);
        }
      }

      return Array.from(new Set(stringChoices));
    });

    combineChoices(choices, (frets) => {
      const score = scoreVoicing(frets, notes, root);
      if (score === null) return;
      candidates.push({
        voicing: voicingFromFrets(frets, baseFret, estimateFingers(frets, baseFret)),
        score,
      });
    });
  }

  const byKey = new Map<string, { voicing: GuitarVoicing; score: number }>();
  candidates.forEach((candidate) => {
    const key = getVoicingKey(candidate.voicing);
    const current = byKey.get(key);
    if (!current || candidate.score > current.score) {
      byKey.set(key, candidate);
    }
  });

  return Array.from(byKey.values())
    .sort((a, b) => b.score - a.score || a.voicing.baseFret - b.voicing.baseFret)
    .filter((candidate, index, all) => {
      const sameBaseBefore = all.slice(0, index).filter((item) => item.voicing.baseFret === candidate.voicing.baseFret);
      return sameBaseBefore.length < 2;
    })
    .slice(0, limit)
    .sort((a, b) => a.voicing.baseFret - b.voicing.baseFret)
    .map((candidate) => candidate.voicing);
}

function combineChoices(choices: number[][], onResult: (frets: number[]) => void, index = 0, acc: number[] = []) {
  if (index === choices.length) {
    onResult([...acc]);
    return;
  }

  choices[index].forEach((choice) => {
    acc[index] = choice;
    combineChoices(choices, onResult, index + 1, acc);
  });
}

function scoreVoicing(frets: number[], notes: string[], root: string): number | null {
  const sounded = frets
    .map((fret, stringIndex) => ({ fret, note: fret >= 0 ? getNoteAtFret(stringIndex, fret) : null, stringIndex }))
    .filter((item): item is { fret: number; note: string; stringIndex: number } => item.note !== null);

  if (sounded.length < 3) return null;

  const firstSounded = sounded[0].stringIndex;
  const lastSounded = sounded[sounded.length - 1].stringIndex;
  const hasInternalMute = frets
    .slice(firstSounded, lastSounded + 1)
    .some((fret, offset) => fret < 0 && firstSounded + offset !== firstSounded);
  if (hasInternalMute) return null;

  const positiveFrets = sounded.map((item) => item.fret).filter((fret) => fret > 0);
  const fretSpan = positiveFrets.length > 1 ? Math.max(...positiveFrets) - Math.min(...positiveFrets) : 0;
  if (fretSpan > 4) return null;

  const uniqueNotes = new Set(sounded.map((item) => normalizeNoteName(item.note)));
  const requiredCoverage = Math.min(notes.length, 3);
  if (uniqueNotes.size < requiredCoverage) return null;

  const hasRoot = sounded.some((item) => normalizeNoteName(item.note) === root);
  if (!hasRoot) return null;

  const mutedCount = frets.filter((fret) => fret < 0).length;
  const openCount = frets.filter((fret) => fret === 0).length;
  const bassIsRoot = normalizeNoteName(sounded[0].note) === root;
  const noteCoverageScore = uniqueNotes.size * 32;
  const bassScore = bassIsRoot ? 18 : 0;
  const openScore = openCount * 2;
  const compactnessPenalty = fretSpan * 4 + mutedCount * 5;
  const highPositionPenalty = Math.max(0, Math.min(...positiveFrets, 1) - 8);

  return noteCoverageScore + bassScore + openScore - compactnessPenalty - highPositionPenalty;
}

function estimateFingers(frets: number[], baseFret: number): number[] {
  return frets.map((fret) => {
    if (fret <= 0) return 0;
    return Math.max(1, Math.min(4, fret - baseFret + 1));
  });
}

export function getVoicingKey(voicing: GuitarVoicing): string {
  return `${voicing.baseFret}:${voicing.frets.join(",")}`;
}

export function getVoicingShapeCode(voicing: GuitarVoicing): string {
  return voicing.frets.map((fret) => (fret < 0 ? "x" : String(fret))).join("");
}

export function fretsToTabLines(voicing: GuitarVoicing): string[] {
  const stringLabels = ["e", "B", "G", "D", "A", "E"];
  const highToLowFrets = [...voicing.frets].reverse();

  return stringLabels.map((label, index) => {
    const fret = highToLowFrets[index];
    const marker = fret < 0 ? "x" : String(fret);
    return `${label}|--${marker}--`;
  });
}

export function saveVoicing(chordName: string, voicing: GuitarVoicing): void {
  localStorage.setItem(`chordflow:${chordName}`, JSON.stringify(voicing));
}

export function loadSavedVoicing(chordName: string): GuitarVoicing | null {
  try {
    const raw = localStorage.getItem(`chordflow:${chordName}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuitarVoicing;
    if (!Array.isArray(parsed.frets) || parsed.frets.length !== 6) return null;
    return {
      frets: parsed.frets,
      fingers: parsed.fingers,
      muted: parsed.frets.map((fret) => fret < 0),
      baseFret: parsed.baseFret || 1,
    };
  } catch {
    return null;
  }
}

export function clearSavedVoicing(chordName: string): void {
  localStorage.removeItem(`chordflow:${chordName}`);
}

function transposePitch(pitch: string, semitones: number): string {
  const match = pitch.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return pitch;

  const noteIndex = getNoteIndex(match[1]);
  const octave = Number(match[2]);
  const midi = noteIndex + (octave + 1) * 12 + semitones;
  const normalizedMidi = ((midi % 12) + 12) % 12;
  const outputOctave = Math.floor(midi / 12) - 1;
  return `${transposeNote("C", normalizedMidi)}${outputOctave}`;
}
