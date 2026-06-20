import type { GuitarVoicing } from "../types/music";
import { getVoicingKey } from "./guitar";

export type PracticeVoicingCandidateGroup = {
  chordName: string;
  voicings: GuitarVoicing[];
};

export type PracticeVoicingPathItem = {
  chordName: string;
  voicing: GuitarVoicing;
  key: string;
  index: number;
};

type PathCell = {
  cost: number;
  previousIndex: number | null;
};

export function chooseSmoothVoicingPath(
  groups: PracticeVoicingCandidateGroup[],
  options: {
    lockedVoicingKeys?: Record<string, string>;
    overrideLocked?: boolean;
  } = {},
): PracticeVoicingPathItem[] {
  const normalizedGroups = groups
    .map((group) => ({
      chordName: group.chordName,
      voicings: filterLockedVoicings(group, options),
    }))
    .filter((group) => group.voicings.length > 0);

  if (normalizedGroups.length === 0) return [];

  const table: PathCell[][] = [];

  normalizedGroups.forEach((group, groupIndex) => {
    table[groupIndex] = group.voicings.map((voicing, voicingIndex) => {
      const baseCost = scoreSingleVoicing(voicing);

      if (groupIndex === 0) {
        return {
          cost: baseCost,
          previousIndex: null,
        };
      }

      const previousGroup = normalizedGroups[groupIndex - 1];
      const previousRow = table[groupIndex - 1];
      let bestCost = Infinity;
      let bestPreviousIndex = 0;

      previousGroup.voicings.forEach((previousVoicing, previousIndex) => {
        const cost = previousRow[previousIndex].cost + transitionCost(previousVoicing, voicing) + baseCost;
        if (cost < bestCost) {
          bestCost = cost;
          bestPreviousIndex = previousIndex;
        }
      });

      return {
        cost: bestCost,
        previousIndex: bestPreviousIndex,
      };
    });
  });

  const lastRow = table[table.length - 1];
  let selectedIndex = lastRow.reduce((bestIndex, cell, index) => (cell.cost < lastRow[bestIndex].cost ? index : bestIndex), 0);
  const path: PracticeVoicingPathItem[] = [];

  for (let groupIndex = normalizedGroups.length - 1; groupIndex >= 0; groupIndex -= 1) {
    const group = normalizedGroups[groupIndex];
    const voicing = group.voicings[selectedIndex];
    const key = getVoicingKey(voicing);
    path.unshift({
      chordName: group.chordName,
      voicing,
      key,
      index: groups[groupIndex].voicings.findIndex((candidate) => getVoicingKey(candidate) === key),
    });

    selectedIndex = table[groupIndex][selectedIndex].previousIndex ?? 0;
  }

  return path;
}

export function getVoicingPathSelection(
  groups: PracticeVoicingCandidateGroup[],
  options: {
    lockedVoicingKeys?: Record<string, string>;
    overrideLocked?: boolean;
  } = {},
): Record<string, string> {
  return chooseSmoothVoicingPath(groups, options).reduce<Record<string, string>>((selection, item) => {
    selection[item.chordName] = item.key;
    return selection;
  }, {});
}

function filterLockedVoicings(
  group: PracticeVoicingCandidateGroup,
  options: {
    lockedVoicingKeys?: Record<string, string>;
    overrideLocked?: boolean;
  },
): GuitarVoicing[] {
  const lockedKey = options.overrideLocked ? undefined : options.lockedVoicingKeys?.[group.chordName];
  if (!lockedKey) return group.voicings;

  const lockedVoicing = group.voicings.find((voicing) => getVoicingKey(voicing) === lockedKey);
  return lockedVoicing ? [lockedVoicing] : group.voicings;
}

function scoreSingleVoicing(voicing: GuitarVoicing): number {
  const sounded = soundingFrets(voicing);
  const positiveFrets = sounded.filter((fret) => fret > 0);
  const openStrings = sounded.filter((fret) => fret === 0).length;
  const mutedStrings = voicing.frets.filter((fret) => fret < 0).length;
  const center = fretCenter(voicing);
  const span = positiveFrets.length > 1 ? Math.max(...positiveFrets) - Math.min(...positiveFrets) : 0;

  return center * 2 + span * 6 + mutedStrings * 3 - openStrings * 4;
}

function transitionCost(previous: GuitarVoicing, next: GuitarVoicing): number {
  const movement = Math.abs(fretCenter(previous) - fretCenter(next)) * 16;
  const baseMovement = Math.abs(previous.baseFret - next.baseFret) * 10;
  const sharedStringFrets = previous.frets.reduce((count, fret, index) => {
    if (fret < 0 || next.frets[index] < 0) return count;
    return fret === next.frets[index] ? count + 1 : count;
  }, 0);
  const sharedSoundingStrings = previous.frets.reduce((count, fret, index) => {
    if (fret < 0 || next.frets[index] < 0) return count;
    return count + 1;
  }, 0);

  return movement + baseMovement - sharedStringFrets * 10 - sharedSoundingStrings * 2;
}

function soundingFrets(voicing: GuitarVoicing): number[] {
  return voicing.frets.filter((fret) => fret >= 0);
}

function fretCenter(voicing: GuitarVoicing): number {
  const sounded = soundingFrets(voicing);
  if (sounded.length === 0) return voicing.baseFret;

  const fretted = sounded.filter((fret) => fret > 0);
  if (fretted.length === 0) return 0;

  return fretted.reduce((sum, fret) => sum + fret, 0) / fretted.length;
}
