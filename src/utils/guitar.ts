import { BUILT_IN_CHORD_SHAPES } from "../data/chordShapes";
import type { GuitarVoicing, ParsedChord } from "../types/music";
import { getDisplayChordName, getNoteIndex, normalizeNoteName, transposeNote } from "./musicTheory";
import { getMigratedStorageItem } from "./storageMigration";

export const STANDARD_TUNING = ["E", "A", "D", "G", "B", "E"];
export const STANDARD_TUNING_PITCHES = ["E2", "A2", "D3", "G3", "B3", "E4"];
const COMPACT_DIAGRAM_FRETS = 4;

export type VoicingBarre = {
  fret: number;
  finger: number;
  fromString: number;
  toString: number;
};

export function voicingFromFrets(frets: number[], baseFret = 1, fingers?: number[]): GuitarVoicing {
  return {
    frets,
    fingers,
    muted: frets.map((fret) => fret < 0),
    baseFret,
  };
}

export function normalizeVoicingFingering(voicing: GuitarVoicing): GuitarVoicing {
  const fretted = voicing.frets
    .map((fret, stringIndex) => ({ fret, stringIndex }))
    .filter((item) => item.fret > 0);

  if (fretted.length === 0) {
    return { ...voicing, fingers: voicing.frets.map(() => 0) };
  }

  const minFret = Math.min(...fretted.map((item) => item.fret));
  const likelyBarreFret = findLikelyBarreFret(voicing.frets);
  const barreFret = likelyBarreFret === minFret ? likelyBarreFret : null;
  const fingers = voicing.frets.map(() => 0);

  if (barreFret !== null) {
    voicing.frets.forEach((fret, stringIndex) => {
      if (fret === barreFret) fingers[stringIndex] = 1;
    });
  }

  let nextFinger = barreFret === null ? 1 : 2;
  fretted
    .filter((item) => item.fret !== barreFret)
    .sort((a, b) => a.fret - b.fret || a.stringIndex - b.stringIndex)
    .forEach(({ stringIndex }) => {
      fingers[stringIndex] = Math.min(4, nextFinger);
      nextFinger += 1;
    });

  return {
    ...voicing,
    fingers,
  };
}

export function getVoicingBarres(voicing: GuitarVoicing): VoicingBarre[] {
  const frettedByFinger = new Map<number, Array<{ fret: number; stringIndex: number }>>();
  voicing.frets.forEach((fret, stringIndex) => {
    const finger = voicing.fingers?.[stringIndex] ?? 0;
    if (fret <= 0 || finger <= 0) return;
    const current = frettedByFinger.get(finger) ?? [];
    current.push({ fret, stringIndex });
    frettedByFinger.set(finger, current);
  });

  return Array.from(frettedByFinger.entries()).flatMap(([finger, items]) => {
    const byFret = new Map<number, number[]>();
    items.forEach(({ fret, stringIndex }) => {
      const current = byFret.get(fret) ?? [];
      current.push(stringIndex);
      byFret.set(fret, current);
    });

    return Array.from(byFret.entries())
      .filter(([, stringIndexes]) => stringIndexes.length >= 2 && hasAdjacentStrings(stringIndexes))
      .map(([fret, stringIndexes]) => ({
        fret,
        finger,
        fromString: Math.min(...stringIndexes),
        toString: Math.max(...stringIndexes),
      }));
  });
}

export function isErgonomicVoicing(voicing: GuitarVoicing): boolean {
  const fretted = voicing.frets
    .map((fret, stringIndex) => ({ fret, stringIndex }))
    .filter((item) => item.fret > 0);

  if (fretted.length === 0) return true;

  const positiveFrets = fretted.map((item) => item.fret);
  const minFret = Math.min(...positiveFrets);
  const maxFret = Math.max(...positiveFrets);
  if (maxFret - minFret > 4) return false;

  const barreFret = findLikelyBarreFret(voicing.frets);
  const usableBarreFret = barreFret === minFret ? barreFret : null;
  const barreFingerCount = usableBarreFret === null ? 0 : 1;
  const nonBarreFingerCount = fretted.filter((item) => item.fret !== usableBarreFret).length;

  if (barreFingerCount + nonBarreFingerCount > 4) return false;

  const nonBarreGroups = new Map<number, number[]>();
  fretted
    .filter((item) => item.fret !== usableBarreFret)
    .forEach((item) => {
      const current = nonBarreGroups.get(item.fret) ?? [];
      current.push(item.stringIndex);
      nonBarreGroups.set(item.fret, current);
    });

  return Array.from(nonBarreGroups.values()).every((stringIndexes) => {
    if (stringIndexes.length <= 1) return true;
    return hasAdjacentStrings(stringIndexes) && barreFingerCount + nonBarreFingerCount - stringIndexes.length + 1 <= 4;
  });
}

export function parseTuningPitch(pitch: string): { note: string; octave: number } {
  const match = pitch.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return { note: pitch, octave: 3 };
  return { note: match[1], octave: Number(match[2]) };
}

export function getTuningNoteNames(tuningPitches = STANDARD_TUNING_PITCHES): string[] {
  return tuningPitches.map((pitch) => parseTuningPitch(pitch).note);
}

export function getNoteAtFret(stringIndex: number, fret: number, tuningPitches = STANDARD_TUNING_PITCHES): string {
  const openPitch = tuningPitches[stringIndex] ?? STANDARD_TUNING_PITCHES[stringIndex];
  return transposeNote(parseTuningPitch(openPitch).note, fret);
}

export function getVoicingNotes(voicing: GuitarVoicing, tuningPitches = STANDARD_TUNING_PITCHES): string[] {
  return voicing.frets.map((fret, index) => (fret < 0 ? "x" : getNoteAtFret(index, fret, tuningPitches)));
}

export function voicingToPlayableNotes(voicing: GuitarVoicing, tuningPitches = STANDARD_TUNING_PITCHES): string[] {
  return voicing.frets
    .map((fret, index) => {
      if (fret < 0 || voicing.muted[index]) return null;
      return transposePitch(tuningPitches[index] ?? STANDARD_TUNING_PITCHES[index], fret);
    })
    .filter((note): note is string => Boolean(note));
}

export function generateGuitarVoicing(parsedChord: ParsedChord, tuningPitches = STANDARD_TUNING_PITCHES): GuitarVoicing {
  const shapeName = getDisplayChordName(parsedChord);
  const standardTuning = isStandardTuning(tuningPitches);
  const saved = loadSavedVoicing(shapeName, tuningPitches);
  if (saved) return saved;

  const builtIn = BUILT_IN_CHORD_SHAPES[shapeName];
  if (builtIn && standardTuning) {
    return voicingFromFrets(builtIn.frets, builtIn.baseFret, builtIn.fingers);
  }

  return generateApproximateVoicing(parsedChord.notes, tuningPitches);
}

export function generateGuitarVoicings(parsedChord: ParsedChord, limit = 12, tuningPitches = STANDARD_TUNING_PITCHES): GuitarVoicing[] {
  const shapeName = getDisplayChordName(parsedChord);
  const voicings: GuitarVoicing[] = [];
  const standardTuning = isStandardTuning(tuningPitches);
  const saved = loadSavedVoicing(shapeName, tuningPitches);
  const builtIn = BUILT_IN_CHORD_SHAPES[shapeName];

  if (saved) voicings.push(saved);
  if (builtIn && standardTuning) voicings.push(voicingFromFrets(builtIn.frets, builtIn.baseFret, builtIn.fingers));

  const generated = generatePositionVoicings(parsedChord.notes, limit + 8, tuningPitches);
  voicings.push(...generated);

  const unique = new Map<string, GuitarVoicing>();
  voicings.forEach((voicing) => {
    unique.set(getVoicingKey(voicing), voicing);
  });

  const result = Array.from(unique.values()).slice(0, limit);
  return result.length > 0 ? result : [generateApproximateVoicing(parsedChord.notes, tuningPitches)];
}

export function generateApproximateVoicing(notes: string[], tuningPitches = STANDARD_TUNING_PITCHES): GuitarVoicing {
  const chordToneIndexes = new Set(notes.map(getNoteIndex));
  const tuningNotes = getTuningNoteNames(tuningPitches);
  const frets = tuningNotes.map((openNote) => {
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
    .map((fret, index) => (fret >= 0 ? getNoteAtFret(index, fret, tuningPitches) : null))
    .filter((note): note is string => Boolean(note));
  const missingRoot = soundingNotes.every((note) => normalizeNoteName(note) !== normalizeNoteName(notes[0]));

  if (missingRoot) {
    const root = normalizeNoteName(notes[0]);
    const rootIndex = getNoteIndex(root);
    let bestString = -1;
    let bestFret = 99;
    tuningNotes.forEach((openNote, index) => {
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

function generatePositionVoicings(notes: string[], limit: number, tuningPitches = STANDARD_TUNING_PITCHES): GuitarVoicing[] {
  const chordToneIndexes = new Set(notes.map(getNoteIndex));
  const root = normalizeNoteName(notes[0]);
  const candidates: Array<{ voicing: GuitarVoicing; score: number }> = [];
  const tuningNotes = getTuningNoteNames(tuningPitches);

  for (let baseFret = 1; baseFret <= 12; baseFret += 1) {
    const choices = tuningNotes.map((openNote) => {
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
      const score = scoreVoicing(frets, notes, root, tuningPitches);
      if (score === null) return;
      const canonicalBaseFret = getCanonicalBaseFret(frets, baseFret);
      const voicing = normalizeVoicingFingering(voicingFromFrets(frets, canonicalBaseFret, estimateFingers(frets, canonicalBaseFret)));
      if (!isErgonomicVoicing(voicing)) return;
      candidates.push({
        voicing,
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

function scoreVoicing(frets: number[], notes: string[], root: string, tuningPitches = STANDARD_TUNING_PITCHES): number | null {
  const sounded = frets
    .map((fret, stringIndex) => ({ fret, note: fret >= 0 ? getNoteAtFret(stringIndex, fret, tuningPitches) : null, stringIndex }))
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

function getCanonicalBaseFret(frets: number[], fallbackBaseFret: number): number {
  if (frets.some((fret) => fret === 0)) return 1;
  const positiveFrets = frets.filter((fret) => fret > 0);
  if (positiveFrets.length === 0) return fallbackBaseFret;
  return Math.min(...positiveFrets);
}

function findLikelyBarreFret(frets: number[]): number | null {
  const frettedGroups = new Map<number, number[]>();
  frets.forEach((fret, stringIndex) => {
    if (fret <= 0) return;
    const current = frettedGroups.get(fret) ?? [];
    current.push(stringIndex);
    frettedGroups.set(fret, current);
  });

  const candidates = Array.from(frettedGroups.entries())
    .filter(([, stringIndexes]) => stringIndexes.length >= 2 && hasAdjacentStrings(stringIndexes))
    .sort(([a], [b]) => a - b);

  return candidates[0]?.[0] ?? null;
}

function hasAdjacentStrings(stringIndexes: number[]): boolean {
  const sorted = [...stringIndexes].sort((a, b) => a - b);
  return sorted.some((stringIndex, index) => index > 0 && stringIndex - sorted[index - 1] === 1);
}

export function getVoicingKey(voicing: GuitarVoicing): string {
  return `${voicing.baseFret}:${voicing.frets.join(",")}`;
}

export function getVoicingShapeCode(voicing: GuitarVoicing): string {
  return voicing.frets.map((fret) => (fret < 0 ? "x" : String(fret))).join("");
}

export function fretsToTabLines(voicing: GuitarVoicing, tuningPitches = STANDARD_TUNING_PITCHES): string[] {
  const stringLabels = getTuningNoteNames(tuningPitches).reverse();
  const highToLowFrets = [...voicing.frets].reverse();

  return stringLabels.map((label, index) => {
    const fret = highToLowFrets[index];
    const marker = fret < 0 ? "x" : String(fret);
    return `${label}|--${marker}--`;
  });
}

export function saveVoicing(chordName: string, voicing: GuitarVoicing, tuningPitches = STANDARD_TUNING_PITCHES): void {
  localStorage.setItem(getSavedVoicingStorageKey(chordName, tuningPitches), JSON.stringify(voicing));
}

export function loadSavedVoicing(chordName: string, tuningPitches = STANDARD_TUNING_PITCHES): GuitarVoicing | null {
  try {
    const raw = getMigratedStorageItem(localStorage, getSavedVoicingStorageKey(chordName, tuningPitches), [
      getLegacySavedVoicingStorageKey(chordName, tuningPitches),
    ]);
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

export function clearSavedVoicing(chordName: string, tuningPitches = STANDARD_TUNING_PITCHES): void {
  localStorage.removeItem(getSavedVoicingStorageKey(chordName, tuningPitches));
  localStorage.removeItem(getLegacySavedVoicingStorageKey(chordName, tuningPitches));
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

function isStandardTuning(tuningPitches: string[]): boolean {
  return tuningPitches.join("|") === STANDARD_TUNING_PITCHES.join("|");
}

function getSavedVoicingStorageKey(chordName: string, tuningPitches: string[]): string {
  if (isStandardTuning(tuningPitches)) return `mochord:guitar-voicing:${chordName}`;
  return `mochord:guitar-voicing:${chordName}:${tuningPitches.join("-")}`;
}

function getLegacySavedVoicingStorageKey(chordName: string, tuningPitches: string[]): string {
  if (isStandardTuning(tuningPitches)) return `chordflow:${chordName}`;
  return `chordflow:${chordName}:${tuningPitches.join("-")}`;
}
