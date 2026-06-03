import * as Tone from "tone";
import type { SynthPreset } from "../types/music";

export type { SynthPreset };

let synth: Tone.PolySynth | null = null;
let currentPreset: SynthPreset | null = null;

export async function ensureAudioStarted(): Promise<void> {
  await Tone.start();
}

export function createOrUpdateSynth(preset: SynthPreset, volumeDb = -10): Tone.PolySynth {
  if (!synth || currentPreset !== preset) {
    synth?.dispose();
    synth = createSynth(preset);
    synth.toDestination();
    currentPreset = preset;
  }

  synth.volume.value = volumeDb;
  return synth;
}

export async function playChord(
  notes: string[],
  options: {
    duration?: string | number;
    preset?: SynthPreset;
    volumeDb?: number;
  } = {},
): Promise<void> {
  await ensureAudioStarted();
  const activeSynth = createOrUpdateSynth(options.preset ?? "warm", options.volumeDb ?? -10);
  activeSynth.triggerAttackRelease(notes, options.duration ?? "2n");
}

export async function playStrum(
  notes: string[],
  options: {
    direction?: "down" | "up";
    interval?: number;
    duration?: string | number;
    preset?: SynthPreset;
    volumeDb?: number;
  } = {},
): Promise<void> {
  await ensureAudioStarted();
  const activeSynth = createOrUpdateSynth(options.preset ?? "warm", options.volumeDb ?? -10);
  const direction = options.direction ?? "down";
  const orderedNotes = direction === "down" ? notes : [...notes].reverse();
  const now = Tone.now();
  const interval = options.interval ?? 0.055;
  const duration = options.duration ?? "8n";

  orderedNotes.forEach((note, index) => {
    activeSynth.triggerAttackRelease(note, duration, now + index * interval);
  });
}

export function stopAudioPlayback(): void {
  try {
    synth?.releaseAll();
  } catch {
    // Tone can throw if the audio context is already closed during teardown.
  }
}

function createSynth(preset: SynthPreset): Tone.PolySynth {
  switch (preset) {
    case "bright":
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.01, decay: 0.14, sustain: 0.24, release: 0.75 },
      }) as Tone.PolySynth;
    case "soft":
      return new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 1.35,
        envelope: { attack: 0.08, decay: 0.35, sustain: 0.62, release: 1.8 },
        modulationEnvelope: { attack: 0.16, decay: 0.3, sustain: 0.45, release: 1.4 },
      }) as Tone.PolySynth;
    case "fm":
      return new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2.5,
        modulationIndex: 8,
        envelope: { attack: 0.02, decay: 0.18, sustain: 0.34, release: 0.9 },
        modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.55 },
      }) as Tone.PolySynth;
    case "warm":
    default:
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.025, decay: 0.22, sustain: 0.38, release: 1.15 },
      }) as Tone.PolySynth;
  }
}
