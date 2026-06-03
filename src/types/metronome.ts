export type TimeSignature = {
  numerator: number;
  denominator: number;
};

export type MetronomeState = {
  bpm: number;
  timeSignature: TimeSignature;
  isRunning: boolean;
  currentBeat: number;
  currentBar: number;
  accentFirstBeat: boolean;
  countInBars: number;
  metronomeDuringPlayback: boolean;
};

export type MetronomeSoundPreset = "click" | "wood" | "electronic" | "soft";

export type PlaybackSyncMode = "free" | "beat" | "bar";
