import type { TimeSignature } from "../types/metronome";
import type { ProgressionLevel } from "../types/progression";
import { playChord, stopAudioPlayback } from "./audioEngine";
import {
  getBeatDurationMs,
  getChordDurationMs,
  normalizeTimeSignature,
  playMetronomeClick,
} from "./metronomeEngine";
import { generateGuitarVoicing, voicingToPlayableNotes } from "./guitar";
import { parseChordName, toPlayableChordNotes } from "./musicTheory";

let playbackToken = 0;

export type ProgressionPlaybackBeat = {
  beat: number;
  bar: number;
  isAccent: boolean;
};

export type ProgressionPlaybackChord = {
  chordName: string;
  index: number;
  beat: number;
  bar: number;
};

export async function playChordProgression(
  chordNames: string[],
  options: {
    bpm?: number;
    timeSignature?: TimeSignature;
    barsPerChord?: number;
    countInBars?: number;
    metronomeDuringPlayback?: boolean;
    accentFirstBeat?: boolean;
    level?: ProgressionLevel;
    tuningPitches?: string[];
    onChordChange?: (data: ProgressionPlaybackChord | null) => void;
    onBeat?: (data: ProgressionPlaybackBeat) => void;
    onComplete?: () => void;
    onStop?: () => void;
  } = {},
): Promise<void> {
  stopChordProgressionPlayback();
  const token = ++playbackToken;
  const bpm = options.bpm ?? 90;
  const timeSignature = normalizeTimeSignature(options.timeSignature ?? { numerator: 4, denominator: 4 });
  const beatDurationMs = getBeatDurationMs(bpm);
  const barsPerChord = Math.max(1, options.barsPerChord ?? 1);
  const countInBars = Math.max(0, options.countInBars ?? 0);
  const accentFirstBeat = options.accentFirstBeat ?? true;
  const metronomeDuringPlayback = options.metronomeDuringPlayback ?? true;
  const chordDurationSeconds = getChordDurationMs(bpm, timeSignature, barsPerChord) / 1000;
  let bar = 1;

  try {
    if (countInBars > 0) {
      const countInTicks = countInBars * timeSignature.numerator;
      for (let tick = 0; tick < countInTicks; tick += 1) {
        if (token !== playbackToken) return handleStopped(options);

        const beat = (tick % timeSignature.numerator) + 1;
        const isAccent = accentFirstBeat && beat === 1;
        playMetronomeClick(isAccent);
        options.onBeat?.({ beat, bar: Math.floor(tick / timeSignature.numerator) + 1, isAccent });
        await sleep(beatDurationMs, token);
      }
    }

    bar = 1;
    for (let index = 0; index < chordNames.length; index += 1) {
      if (token !== playbackToken) return handleStopped(options);

      const chordName = chordNames[index];
      options.onChordChange?.({ chordName, index, beat: 1, bar });
      await playChordByName(chordName, {
        durationSeconds: chordDurationSeconds * 0.92,
        tuningPitches: options.tuningPitches,
      });

      const chordTicks = barsPerChord * timeSignature.numerator;
      for (let tick = 0; tick < chordTicks; tick += 1) {
        if (token !== playbackToken) return handleStopped(options);

        const beat = (tick % timeSignature.numerator) + 1;
        const currentBar = bar + Math.floor(tick / timeSignature.numerator);
        const isAccent = accentFirstBeat && beat === 1;

        if (metronomeDuringPlayback) {
          playMetronomeClick(isAccent);
        }

        options.onBeat?.({ beat, bar: currentBar, isAccent });
        options.onChordChange?.({ chordName, index, beat, bar: currentBar });
        await sleep(beatDurationMs, token);
      }

      bar += barsPerChord;
    }

    if (token === playbackToken) {
      options.onChordChange?.(null);
      options.onComplete?.();
    }
  } catch (error) {
    if (token === playbackToken) {
      options.onChordChange?.(null);
    }
    throw error;
  }
}

export function stopChordProgressionPlayback(): void {
  playbackToken += 1;
  stopAudioPlayback();
}

export function stopChordProgression(): void {
  stopChordProgressionPlayback();
}

export async function playChordByName(
  chordName: string,
  options: {
    durationSeconds?: number;
    bpm?: number;
    timeSignature?: TimeSignature;
    bars?: number;
    tuningPitches?: string[];
  } = {},
): Promise<void> {
  const parsed = parseChordName(chordName);
  const voicing = generateGuitarVoicing(parsed, options.tuningPitches);
  const voicingNotes = voicingToPlayableNotes(voicing, options.tuningPitches);
  const notes = voicingNotes.length > 0 ? voicingNotes : toPlayableChordNotes(parsed.notes, parsed.root);

  if (parsed.bassNote && !notes.some((note) => note.startsWith(parsed.bassNote ?? ""))) {
    notes.unshift(`${parsed.bassNote}3`);
  }

  if (notes.length === 0) {
    throw new Error("No playable notes found for this chord.");
  }

  const duration =
    options.durationSeconds ??
    getChordDurationMs(
      options.bpm ?? 90,
      normalizeTimeSignature(options.timeSignature ?? { numerator: 4, denominator: 4 }),
      options.bars ?? 1,
    ) / 1000;

  await playChord(notes, { duration, preset: "warm", volumeDb: -10 });
}

function handleStopped(options: { onChordChange?: (data: ProgressionPlaybackChord | null) => void; onStop?: () => void }) {
  options.onChordChange?.(null);
  options.onStop?.();
}

function sleep(ms: number, token: number): Promise<void> {
  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(resolve, ms);

    function tick() {
      if (token !== playbackToken) {
        window.clearTimeout(timeoutId);
        resolve();
        return;
      }
      window.requestAnimationFrame(tick);
    }

    window.requestAnimationFrame(tick);
  });
}
