export type NoteName = string;

export type ParsedChord = {
  original: string;
  root: string;
  quality: string;
  intervals: number[];
  notes: string[];
  bassNote?: string;
};

export type GuitarVoicing = {
  frets: number[];
  fingers?: number[];
  muted: boolean[];
  baseFret: number;
};

export type ChordShape = {
  name: string;
  frets: number[];
  fingers?: number[];
  baseFret: number;
};

export type ScaleMode = "Major" | "Natural Minor" | "Dorian" | "Mixolydian";

export type SynthPreset = "warm" | "bright" | "soft" | "fm";

export type AudioStatus = "locked" | "ready" | "playing" | "error";
