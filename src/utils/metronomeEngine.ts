import * as Tone from "tone";
import type { MetronomeSoundPreset, TimeSignature } from "../types/metronome";
import { ensureAudioStarted } from "./audioEngine";

export type StartMetronomeOptions = {
  bpm: number;
  timeSignature: TimeSignature;
  accentFirstBeat?: boolean;
  preset?: MetronomeSoundPreset;
  volumeDb?: number;
  accentVolumeDb?: number;
  onTick?: (data: {
    beat: number;
    bar: number;
    isAccent: boolean;
  }) => void;
};

const DEFAULT_TIME_SIGNATURE: TimeSignature = { numerator: 4, denominator: 4 };
const MIN_BPM = 40;
const MAX_BPM = 300;

export const COMMON_TIME_SIGNATURES: TimeSignature[] = [
  { numerator: 2, denominator: 2 },
  { numerator: 1, denominator: 4 },
  { numerator: 2, denominator: 4 },
  { numerator: 3, denominator: 4 },
  { numerator: 4, denominator: 4 },
  { numerator: 5, denominator: 4 },
  { numerator: 6, denominator: 4 },
  { numerator: 7, denominator: 4 },
  { numerator: 2, denominator: 8 },
  { numerator: 3, denominator: 8 },
  { numerator: 4, denominator: 8 },
  { numerator: 5, denominator: 8 },
  { numerator: 6, denominator: 8 },
  { numerator: 7, denominator: 8 },
  { numerator: 9, denominator: 8 },
  { numerator: 12, denominator: 8 },
  { numerator: 3, denominator: 16 },
  { numerator: 5, denominator: 16 },
  { numerator: 7, denominator: 16 },
];

let timerId: number | null = null;
let beat = 1;
let bar = 1;
let clickSynths: Partial<Record<MetronomeSoundPreset, Tone.Synth | Tone.MembraneSynth>> = {};

export type MetronomeSoundConfig =
  | {
      kind: "synth";
      note: string;
      accentNote: string;
      duration: string;
      accentDuration: string;
      options: Tone.SynthOptions;
    }
  | {
      kind: "membrane";
      note: string;
      accentNote: string;
      duration: string;
      accentDuration: string;
      options: Tone.MembraneSynthOptions;
    };

export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return 90;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

export function normalizeTimeSignature(timeSignature: TimeSignature): TimeSignature {
  const numerator = Math.round(timeSignature.numerator);
  const denominator = Math.round(timeSignature.denominator);

  if (!isSupportedTimeSignature({ numerator, denominator })) {
    return DEFAULT_TIME_SIGNATURE;
  }

  return { numerator, denominator };
}

export function isSupportedTimeSignature(timeSignature: TimeSignature): boolean {
  const numerator = Math.round(timeSignature.numerator);
  const denominator = Math.round(timeSignature.denominator);
  return numerator >= 1 && numerator <= 16 && [2, 4, 8, 16].includes(denominator);
}

export function getTimeSignatureLabel(timeSignature: TimeSignature): string {
  const normalized = normalizeTimeSignature(timeSignature);
  return `${normalized.numerator} / ${normalized.denominator}`;
}

export function getBeatDurationMs(bpm: number): number {
  return 60_000 / clampBpm(bpm);
}

export function getMeasureDurationMs(bpm: number, timeSignature: TimeSignature): number {
  const normalized = normalizeTimeSignature(timeSignature);
  return getBeatDurationMs(bpm) * normalized.numerator;
}

export function getChordDurationMs(
  bpm: number,
  timeSignature: TimeSignature,
  barsPerChord = 1,
): number {
  return getMeasureDurationMs(bpm, timeSignature) * Math.max(1, barsPerChord);
}

export function getToneDurationForMeasure(timeSignature: TimeSignature, bars = 1): string {
  const normalized = normalizeTimeSignature(timeSignature);
  const beatUnit = `${normalized.denominator}n`;
  return `${normalized.numerator * Math.max(1, bars)} * ${beatUnit}`;
}

export function playMetronomeClick(
  isAccent: boolean,
  preset: MetronomeSoundPreset = "click",
  time?: number,
  volumeDb?: number,
  accentVolumeDb?: number,
): void {
  const synth = getClickSynth(preset);
  const config = getMetronomeSoundConfig(preset);
  synth.volume.value = isAccent ? (accentVolumeDb ?? -8) : (volumeDb ?? -15);
  synth.triggerAttackRelease(isAccent ? config.accentNote : config.note, isAccent ? config.accentDuration : config.duration, time);
}

export async function startMetronome(options: StartMetronomeOptions): Promise<void> {
  await ensureAudioStarted();
  stopMetronome();

  const bpm = clampBpm(options.bpm);
  const timeSignature = normalizeTimeSignature(options.timeSignature);
  const accentFirstBeat = options.accentFirstBeat ?? true;
  const preset = options.preset ?? "click";
  const volumeDb = options.volumeDb;
  const accentVolumeDb = options.accentVolumeDb;
  const beatDuration = getBeatDurationMs(bpm);

  beat = 1;
  bar = 1;

  const tick = () => {
    const isAccent = accentFirstBeat && beat === 1;
    playMetronomeClick(isAccent, preset, undefined, volumeDb, accentVolumeDb);
    options.onTick?.({ beat, bar, isAccent });

    if (beat >= timeSignature.numerator) {
      beat = 1;
      bar += 1;
    } else {
      beat += 1;
    }
  };

  tick();
  timerId = window.setInterval(tick, beatDuration);
}

export function stopMetronome(): void {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
  beat = 1;
  bar = 1;
}

export function isMetronomeRunning(): boolean {
  return timerId !== null;
}

function getClickSynth(preset: MetronomeSoundPreset): Tone.Synth | Tone.MembraneSynth {
  const existing = clickSynths[preset];
  if (existing) return existing;

  const config = getMetronomeSoundConfig(preset);
  const synth =
    config.kind === "membrane"
      ? new Tone.MembraneSynth(config.options).toDestination()
      : new Tone.Synth(config.options).toDestination();
  clickSynths = { ...clickSynths, [preset]: synth };
  return synth;
}

export function getMetronomeSoundConfig(preset: MetronomeSoundPreset): MetronomeSoundConfig {
  switch (preset) {
    case "wood":
      return {
        kind: "membrane",
        note: "G4",
        accentNote: "C5",
        duration: "32n",
        accentDuration: "16n",
        options: {
          pitchDecay: 0.008,
          octaves: 1.4,
          oscillator: { type: "sine" },
          envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.018 },
          volume: -9,
        } as Tone.MembraneSynthOptions,
      };
    case "electronic":
      return {
        kind: "synth",
        note: "C5",
        accentNote: "C6",
        duration: "64n",
        accentDuration: "32n",
        options: {
          oscillator: { type: "triangle" },
          envelope: { attack: 0.001, decay: 0.045, sustain: 0.01, release: 0.03 },
          volume: -14,
        } as Tone.SynthOptions,
      };
    case "soft":
      return {
        kind: "synth",
        note: "C5",
        accentNote: "C6",
        duration: "64n",
        accentDuration: "32n",
        options: {
          oscillator: { type: "sine" },
          envelope: { attack: 0.003, decay: 0.06, sustain: 0.02, release: 0.045 },
          volume: -18,
        } as Tone.SynthOptions,
      };
    case "click":
    default:
      return {
        kind: "synth",
        note: "C5",
        accentNote: "C6",
        duration: "64n",
        accentDuration: "32n",
        options: {
          oscillator: { type: "square" },
          envelope: { attack: 0.001, decay: 0.025, sustain: 0.01, release: 0.02 },
          volume: -14,
        } as Tone.SynthOptions,
      };
  }
}
