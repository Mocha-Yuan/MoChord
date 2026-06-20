export type TunerStatus = "idle" | "listening" | "no-signal" | "in-tune" | "off-pitch" | "locked" | "error";

export type BuiltInTuningPresetId = "standard" | "drop-d" | "low-c" | "dadgad" | "half-step-down" | "custom";

export type TuningPresetId = BuiltInTuningPresetId | `stored:${string}`;

export type TuningTarget = {
  id: string;
  label: string;
  note: string;
  octave: number;
  midi: number;
  frequency: number;
  stringNumber: number;
  fret?: number;
};

export type TuningPreset = {
  id: TuningPresetId;
  label: string;
  pitches: string[];
};

export type StoredTuningPreset = {
  id: `stored:${string}`;
  name: string;
  pitches: string[];
};

export type DetectedPitch = {
  frequency: number;
  note: string;
  octave: number;
  midi: number;
  targetFrequency: number;
  cents: number;
  clarity: number;
  inputLevel: number;
};

export type TunerFrame = {
  pitch: DetectedPitch | null;
  inputLevel: number;
};
