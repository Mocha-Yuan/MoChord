import * as Tone from "tone";
import type { MetronomeSoundPreset, TimeSignature } from "../types/metronome";
import { ensureAudioStarted } from "./audioEngine";

export type StartMetronomeOptions = {
  bpm: number;
  timeSignature: TimeSignature;
  accentFirstBeat?: boolean;
  preset?: MetronomeSoundPreset;
  onTick?: (data: {
    beat: number;
    bar: number;
    isAccent: boolean;
  }) => void;
};

const DEFAULT_TIME_SIGNATURE: TimeSignature = { numerator: 4, denominator: 4 };
const MIN_BPM = 40;
const MAX_BPM = 240;

let timerId: number | null = null;
let beat = 1;
let bar = 1;
let clickSynths: Partial<Record<MetronomeSoundPreset, Tone.Synth>> = {};

export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return 90;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

export function normalizeTimeSignature(timeSignature: TimeSignature): TimeSignature {
  const allowedDenominators = new Set([4, 8]);
  const numerator = Math.round(timeSignature.numerator);
  const denominator = Math.round(timeSignature.denominator);

  if (numerator < 1 || numerator > 16 || !allowedDenominators.has(denominator)) {
    return DEFAULT_TIME_SIGNATURE;
  }

  return { numerator, denominator };
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
  const beatUnit = normalized.denominator === 8 ? "8n" : "4n";
  return `${normalized.numerator * Math.max(1, bars)} * ${beatUnit}`;
}

export function playMetronomeClick(
  isAccent: boolean,
  preset: MetronomeSoundPreset = "click",
  time?: number,
): void {
  const synth = getClickSynth(preset);
  synth.volume.value = isAccent ? -8 : -15;
  synth.triggerAttackRelease(isAccent ? "C6" : "C5", isAccent ? "32n" : "64n", time);
}

export async function startMetronome(options: StartMetronomeOptions): Promise<void> {
  await ensureAudioStarted();
  stopMetronome();

  const bpm = clampBpm(options.bpm);
  const timeSignature = normalizeTimeSignature(options.timeSignature);
  const accentFirstBeat = options.accentFirstBeat ?? true;
  const preset = options.preset ?? "click";
  const beatDuration = getBeatDurationMs(bpm);

  beat = 1;
  bar = 1;

  const tick = () => {
    const isAccent = accentFirstBeat && beat === 1;
    playMetronomeClick(isAccent, preset);
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

function getClickSynth(preset: MetronomeSoundPreset): Tone.Synth {
  const existing = clickSynths[preset];
  if (existing) return existing;

  const synth = new Tone.Synth(getSynthOptions(preset)).toDestination();
  clickSynths = { ...clickSynths, [preset]: synth };
  return synth;
}

function getSynthOptions(preset: MetronomeSoundPreset): Tone.SynthOptions {
  switch (preset) {
    case "wood":
      return {
        oscillator: { type: "square" },
        envelope: { attack: 0.001, decay: 0.035, sustain: 0.02, release: 0.02 },
        volume: -13,
      } as unknown as Tone.SynthOptions;
    case "electronic":
      return {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.001, decay: 0.045, sustain: 0.01, release: 0.03 },
        volume: -14,
      } as unknown as Tone.SynthOptions;
    case "soft":
      return {
        oscillator: { type: "sine" },
        envelope: { attack: 0.003, decay: 0.06, sustain: 0.02, release: 0.045 },
        volume: -18,
      } as unknown as Tone.SynthOptions;
    case "click":
    default:
      return {
        oscillator: { type: "square" },
        envelope: { attack: 0.001, decay: 0.025, sustain: 0.01, release: 0.02 },
        volume: -14,
      } as unknown as Tone.SynthOptions;
  }
}
