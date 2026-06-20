import type { BuiltInTuningPresetId, DetectedPitch, StoredTuningPreset, TunerFrame, TuningPreset, TuningPresetId, TuningTarget } from "../types/tuner";
import { getMigratedStorageItem } from "./storageMigration";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MIN_FREQUENCY = 50;
const MAX_FREQUENCY = 900;
const MIN_INPUT_LEVEL = 0.009;
const MIN_CLARITY = 0.82;
const ANALYSIS_INTERVAL_MS = 90;
const YIN_THRESHOLD = 0.14;
const SMOOTHING_WINDOW = 5;
const MAX_SMOOTHING_JUMP_CENTS = 380;
const MAX_DROPOUT_HOLD_FRAMES = 3;
const OCTAVE_JUMP_CENTS = 650;
const OCTAVE_CORRECTION_CENTS = 360;

export const REFERENCE_A_RANGE = {
  min: 432,
  max: 445,
  default: 440,
};

type TuningStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export type MicrophoneSupport =
  | { supported: true; reason: null }
  | { supported: false; reason: "unsupported" };

export type TunerStartErrorKind = "permission-denied" | "microphone-unavailable" | "start-failed";

type MediaDeviceLike = {
  mediaDevices?: {
    getUserMedia?: unknown;
  };
};

const SAVED_TUNING_PRESETS_STORAGE_KEY = "mochord:tuning-presets";
const LEGACY_SAVED_TUNING_PRESETS_STORAGE_KEYS = ["chordflow:tuning-presets"];

export const TUNING_PRESETS: Array<TuningPreset & { id: BuiltInTuningPresetId }> = [
  { id: "standard", label: "Standard", pitches: ["E2", "A2", "D3", "G3", "B3", "E4"] },
  { id: "drop-d", label: "Drop D", pitches: ["D2", "A2", "D3", "G3", "B3", "E4"] },
  { id: "low-c", label: "Low C", pitches: ["C2", "G2", "D3", "G3", "A3", "D4"] },
  { id: "dadgad", label: "DADGAD", pitches: ["D2", "A2", "D3", "G3", "A3", "D4"] },
  { id: "half-step-down", label: "Half Step Down", pitches: ["D#2", "G#2", "C#3", "F#3", "A#3", "D#4"] },
  { id: "custom", label: "Custom", pitches: ["E2", "A2", "D3", "G3", "B3", "E4"] },
];

export const DEFAULT_CUSTOM_TUNING = TUNING_PRESETS[0].pitches;

export const CUSTOM_TUNING_PITCH_OPTIONS = [
  "C2",
  "C#2",
  "D2",
  "D#2",
  "E2",
  "F2",
  "F#2",
  "G2",
  "G#2",
  "A2",
  "A#2",
  "B2",
  "C3",
  "C#3",
  "D3",
  "D#3",
  "E3",
  "F3",
  "F#3",
  "G3",
  "G#3",
  "A3",
  "A#3",
  "B3",
  "C4",
  "C#4",
  "D4",
  "D#4",
  "E4",
] as const;

function getNavigatorLike(): MediaDeviceLike {
  return typeof navigator === "undefined" ? {} : navigator;
}

export function getMicrophoneSupport(target: MediaDeviceLike = getNavigatorLike()): MicrophoneSupport {
  return typeof target.mediaDevices?.getUserMedia === "function"
    ? { supported: true, reason: null }
    : { supported: false, reason: "unsupported" };
}

export function classifyTunerStartError(error: unknown): TunerStartErrorKind {
  const name = typeof error === "object" && error !== null && "name" in error ? error.name : undefined;
  if (name === "NotAllowedError" || name === "SecurityError") return "permission-denied";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "microphone-unavailable";

  return "start-failed";
}

export function frequencyToPitch(frequency: number, referenceA = 440): DetectedPitch {
  const midi = Math.round(69 + 12 * Math.log2(frequency / referenceA));
  const targetFrequency = referenceA * 2 ** ((midi - 69) / 12);
  const cents = getCents(frequency, targetFrequency);
  const note = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;

  return {
    frequency,
    note,
    octave,
    midi,
    targetFrequency,
    cents,
    clarity: 0,
    inputLevel: 0,
  };
}

export function clampReferenceA(referenceA: number): number {
  if (!Number.isFinite(referenceA)) return REFERENCE_A_RANGE.default;
  return Math.min(REFERENCE_A_RANGE.max, Math.max(REFERENCE_A_RANGE.min, Math.round(referenceA)));
}

export function getCents(frequency: number, targetFrequency: number): number {
  return 1200 * Math.log2(frequency / targetFrequency);
}

export function buildTuningTargets(
  presetId: TuningPresetId,
  referenceA = REFERENCE_A_RANGE.default,
  customPitches: string[] = DEFAULT_CUSTOM_TUNING,
  storedPresets: TuningPreset[] = [],
): TuningTarget[] {
  const storedPreset = storedPresets.find((item) => item.id === presetId);
  const preset = storedPreset ?? TUNING_PRESETS.find((item) => item.id === presetId) ?? TUNING_PRESETS[0];
  const pitches = presetId === "custom" ? normalizeCustomPitches(customPitches) : preset.pitches;
  return pitches.map((pitch, index) => createTuningTarget(pitch, index, referenceA));
}

export function buildStoredTuningPresets(storage: TuningStorage): TuningPreset[] {
  return loadStoredTuningPresets(storage).map((preset) => ({
    id: preset.id,
    label: preset.name,
    pitches: preset.pitches,
  }));
}

export function loadStoredTuningPresets(storage: TuningStorage): StoredTuningPreset[] {
  try {
    const raw = getMigratedStorageItem(storage, SAVED_TUNING_PRESETS_STORAGE_KEY, LEGACY_SAVED_TUNING_PRESETS_STORAGE_KEYS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredTuningPreset);
  } catch {
    return [];
  }
}

export function saveStoredTuningPreset(
  storage: TuningStorage,
  input: { id?: `stored:${string}`; name: string; pitches: string[] },
): StoredTuningPreset {
  const presets = loadStoredTuningPresets(storage);
  const id = input.id ?? createStoredTuningPresetId(input.name);
  const preset: StoredTuningPreset = {
    id,
    name: normalizeStoredPresetName(input.name),
    pitches: normalizeCustomPitches(input.pitches),
  };
  const nextPresets = [preset, ...presets.filter((item) => item.id !== id)];
  storage.setItem(SAVED_TUNING_PRESETS_STORAGE_KEY, JSON.stringify(nextPresets));
  return preset;
}

export function deleteStoredTuningPreset(storage: TuningStorage, id: TuningPresetId): void {
  const nextPresets = loadStoredTuningPresets(storage).filter((preset) => preset.id !== id);
  storage.setItem(SAVED_TUNING_PRESETS_STORAGE_KEY, JSON.stringify(nextPresets));
}

export function createVoicingTarget(
  openTarget: TuningTarget,
  fret: number,
  referenceA = REFERENCE_A_RANGE.default,
): TuningTarget {
  const midi = openTarget.midi + fret;
  const { note, octave, label } = midiToPitch(midi);
  const stringNumber = openTarget.stringNumber;

  return {
    id: `shape:${stringNumber}:${fret}:${midi}`,
    label: `S${stringNumber} ${label}`,
    note,
    octave,
    midi,
    frequency: midiToFrequency(midi, referenceA),
    stringNumber,
    fret,
  };
}

export function findClosestTuningTarget(frequency: number, targets: TuningTarget[]): TuningTarget {
  return targets.reduce((closest, target) => {
    const closestDistance = Math.abs(getCents(frequency, closest.frequency));
    const targetDistance = Math.abs(getCents(frequency, target.frequency));
    return targetDistance < closestDistance ? target : closest;
  });
}

export function findClosestGuitarTuningTarget(frequency: number, targets: TuningTarget[]): TuningTarget {
  return targets.reduce((closest, target) => {
    const closestDistance = getTargetSelectionScore(frequency, closest.frequency);
    const targetDistance = getTargetSelectionScore(frequency, target.frequency);
    return targetDistance < closestDistance ? target : closest;
  });
}

export function getTargetAwareCents(frequency: number, targetFrequency: number): number {
  return getCents(getTargetAwareFrequency(frequency, targetFrequency), targetFrequency);
}

export function getTargetAwareFrequency(frequency: number, targetFrequency: number): number {
  return getTargetAwareMatch(frequency, targetFrequency).frequency;
}

function getTargetAwareMatch(frequency: number, targetFrequency: number): { frequency: number; cents: number; octaveShift: number } {
  return [-3, -2, -1, 0, 1, 2, 3]
    .map((octaveShift) => {
      const candidateFrequency = frequency * 2 ** octaveShift;
      return {
        frequency: candidateFrequency,
        cents: getCents(candidateFrequency, targetFrequency),
        octaveShift,
      };
    })
    .reduce((closest, candidate) => (Math.abs(candidate.cents) < Math.abs(closest.cents) ? candidate : closest));
}

export function getTargetSelectionScore(frequency: number, targetFrequency: number): number {
  const match = getTargetAwareMatch(frequency, targetFrequency);
  return Math.abs(match.cents) + Math.abs(match.octaveShift) * 260;
}

export function midiToFrequency(midi: number, referenceA = REFERENCE_A_RANGE.default): number {
  return referenceA * 2 ** ((midi - 69) / 12);
}

function createTuningTarget(pitch: string, index: number, referenceA: number): TuningTarget {
  const midi = pitchToMidi(pitch);
  const { note, octave, label } = midiToPitch(midi);
  const stringNumber = 6 - index;

  return {
    id: `preset:${stringNumber}:${midi}`,
    label,
    note,
    octave,
    midi,
    frequency: midiToFrequency(midi, referenceA),
    stringNumber,
  };
}

function pitchToMidi(pitch: string): number {
  const match = pitch.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return 69;

  return NOTE_NAMES.indexOf(match[1]) + (Number(match[2]) + 1) * 12;
}

function normalizeCustomPitches(pitches: string[]): string[] {
  return DEFAULT_CUSTOM_TUNING.map((fallback, index) => {
    const pitch = pitches[index];
    return pitch && isValidPitch(pitch) ? pitch : fallback;
  });
}

function isStoredTuningPreset(value: unknown): value is StoredTuningPreset {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredTuningPreset>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.startsWith("stored:") &&
    typeof candidate.name === "string" &&
    Array.isArray(candidate.pitches) &&
    candidate.pitches.length === DEFAULT_CUSTOM_TUNING.length &&
    candidate.pitches.every(isValidPitch)
  );
}

function normalizeStoredPresetName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 32) : "Custom tuning";
}

function createStoredTuningPresetId(name: string): `stored:${string}` {
  const slug = normalizeStoredPresetName(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "custom";
  return `stored:${slug}-${Date.now().toString(36)}`;
}

function isValidPitch(pitch: string): boolean {
  const match = pitch.match(/^([A-G]#?)(-?\d+)$/);
  return Boolean(match && NOTE_NAMES.includes(match[1]));
}

function midiToPitch(midi: number): { note: string; octave: number; label: string } {
  const note = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { note, octave, label: `${note}${octave}` };
}

export class TunerEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private inputBuffer: Float32Array<ArrayBuffer> | null = null;
  private lastAnalysisTime = 0;
  private lastPitch: DetectedPitch | null = null;
  private missedFrames = 0;
  private mediaStream: MediaStream | null = null;
  private recentFrequencies: number[] = [];

  async start(onFrame: (frame: TunerFrame) => void): Promise<void> {
    this.stop();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const highpass = audioContext.createBiquadFilter();
    const lowpass = audioContext.createBiquadFilter();
    const analyser = audioContext.createAnalyser();

    highpass.type = "highpass";
    highpass.frequency.value = 38;
    highpass.Q.value = 0.7;
    lowpass.type = "lowpass";
    lowpass.frequency.value = 1250;
    lowpass.Q.value = 0.7;
    analyser.fftSize = 8192;
    analyser.smoothingTimeConstant = 0;
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(analyser);

    this.audioContext = audioContext;
    this.analyser = analyser;
    this.inputBuffer = new Float32Array(analyser.fftSize);
    this.mediaStream = stream;
    this.lastAnalysisTime = 0;
    this.lastPitch = null;
    this.missedFrames = 0;
    this.recentFrequencies = [];
    this.runAnalysis(onFrame);
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;

    void this.audioContext?.close().catch(() => undefined);
    this.audioContext = null;
    this.analyser = null;
    this.inputBuffer = null;
    this.lastAnalysisTime = 0;
    this.lastPitch = null;
    this.missedFrames = 0;
    this.recentFrequencies = [];
  }

  private runAnalysis(onFrame: (frame: TunerFrame) => void): void {
    const tick = (now: number) => {
      if (!this.analyser || !this.audioContext || !this.inputBuffer) return;

      if (now - this.lastAnalysisTime >= ANALYSIS_INTERVAL_MS) {
        this.lastAnalysisTime = now;
        this.analyser.getFloatTimeDomainData(this.inputBuffer);
        const detection = detectPitch(this.inputBuffer, this.audioContext.sampleRate);

        if (!detection) {
          this.missedFrames += 1;
          if (this.lastPitch && this.missedFrames <= MAX_DROPOUT_HOLD_FRAMES) {
            onFrame({
              pitch: {
                ...this.lastPitch,
                inputLevel: calculateRms(this.inputBuffer),
              },
              inputLevel: calculateRms(this.inputBuffer),
            });
          } else {
            this.lastPitch = null;
            this.recentFrequencies = [];
            onFrame({ pitch: null, inputLevel: calculateRms(this.inputBuffer) });
          }
        } else {
          this.missedFrames = 0;
          const correctedFrequency = this.correctOctaveJump(detection.frequency);
          const frequency = this.smoothFrequency(correctedFrequency);
          const pitch = frequencyToPitch(frequency);
          this.lastPitch = {
            ...pitch,
            clarity: detection.clarity,
            inputLevel: detection.inputLevel,
          };
          onFrame({ pitch: this.lastPitch, inputLevel: detection.inputLevel });
        }
      }

      this.animationFrameId = window.requestAnimationFrame(tick);
    };

    this.animationFrameId = window.requestAnimationFrame(tick);
  }

  private correctOctaveJump(frequency: number): number {
    if (this.recentFrequencies.length === 0) return frequency;

    const reference = getMedian(this.recentFrequencies);
    const rawJump = Math.abs(getCents(frequency, reference));
    if (rawJump < OCTAVE_JUMP_CENTS) return frequency;

    const candidates = [frequency, frequency / 2, frequency * 2].filter(
      (candidate) => candidate >= MIN_FREQUENCY && candidate <= MAX_FREQUENCY,
    );
    const best = candidates.reduce((closest, candidate) => {
      const closestDistance = Math.abs(getCents(closest, reference));
      const candidateDistance = Math.abs(getCents(candidate, reference));
      return candidateDistance < closestDistance ? candidate : closest;
    }, frequency);

    return Math.abs(getCents(best, reference)) < OCTAVE_CORRECTION_CENTS ? best : frequency;
  }

  private smoothFrequency(frequency: number): number {
    if (this.recentFrequencies.length > 0) {
      const median = getMedian(this.recentFrequencies);
      const jump = Math.abs(getCents(frequency, median));

      if (jump > MAX_SMOOTHING_JUMP_CENTS) {
        this.recentFrequencies = [frequency];
        return frequency;
      }
    }

    this.recentFrequencies = [...this.recentFrequencies, frequency].slice(-SMOOTHING_WINDOW);
    return getMedian(this.recentFrequencies);
  }
}

function detectPitch(
  buffer: Float32Array<ArrayBufferLike>,
  sampleRate: number,
): { frequency: number; clarity: number; inputLevel: number } | null {
  const inputLevel = calculateRms(buffer);
  if (inputLevel < MIN_INPUT_LEVEL) return null;

  const minLag = Math.floor(sampleRate / MAX_FREQUENCY);
  const maxLag = Math.min(Math.floor(sampleRate / MIN_FREQUENCY), Math.floor(buffer.length / 2));
  const analysisLength = buffer.length - maxLag;
  const yinBuffer = new Float32Array(maxLag + 1);

  removeDcOffset(buffer);

  for (let tau = 1; tau <= maxLag; tau += 1) {
    let difference = 0;

    for (let index = 0; index < analysisLength; index += 1) {
      const delta = buffer[index] - buffer[index + tau];
      difference += delta * delta;
    }

    yinBuffer[tau] = difference;
  }

  let runningSum = 0;
  yinBuffer[0] = 1;

  for (let tau = 1; tau <= maxLag; tau += 1) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] = runningSum === 0 ? 1 : (yinBuffer[tau] * tau) / runningSum;
  }

  let bestTau = -1;

  for (let tau = minLag; tau <= maxLag; tau += 1) {
    if (yinBuffer[tau] >= YIN_THRESHOLD) continue;

    while (tau + 1 <= maxLag && yinBuffer[tau + 1] < yinBuffer[tau]) {
      tau += 1;
    }

    bestTau = tau;
    break;
  }

  if (bestTau < 0) {
    bestTau = findBestYinTau(yinBuffer, minLag, maxLag);
  }

  if (bestTau < 0) return null;

  bestTau = preferLowerGuitarFundamental(bestTau, yinBuffer, maxLag, sampleRate);
  const refinedTau = refineLag(bestTau, yinBuffer);
  const clarity = 1 - yinBuffer[bestTau];
  if (clarity < MIN_CLARITY) return null;

  return {
    frequency: sampleRate / refinedTau,
    clarity,
    inputLevel,
  };
}

function calculateRms(buffer: Float32Array<ArrayBufferLike>): number {
  let sum = 0;

  for (let index = 0; index < buffer.length; index += 1) {
    const sample = buffer[index];
    sum += sample * sample;
  }

  return Math.sqrt(sum / buffer.length);
}

function refineLag(lag: number, correlations: Float32Array<ArrayBufferLike>): number {
  const previous = correlations[lag - 1] ?? 0;
  const current = correlations[lag] ?? 0;
  const next = correlations[lag + 1] ?? 0;
  const divisor = 2 * (2 * current - previous - next);

  if (divisor === 0) return lag;

  return lag + (next - previous) / divisor;
}

function findBestYinTau(yinBuffer: Float32Array<ArrayBufferLike>, minLag: number, maxLag: number): number {
  let bestTau = -1;
  let bestValue = Number.POSITIVE_INFINITY;

  for (let tau = minLag; tau <= maxLag; tau += 1) {
    const value = yinBuffer[tau];
    if (value < bestValue) {
      bestValue = value;
      bestTau = tau;
    }
  }

  return 1 - bestValue >= MIN_CLARITY ? bestTau : -1;
}

function preferLowerGuitarFundamental(
  tau: number,
  yinBuffer: Float32Array<ArrayBufferLike>,
  maxLag: number,
  sampleRate: number,
): number {
  let selectedTau = tau;
  let selectedValue = yinBuffer[tau];
  const selectedFrequency = sampleRate / tau;

  if (selectedFrequency < 180) return selectedTau;

  const candidateTau = tau * 2;
  if (candidateTau > maxLag) return selectedTau;

  const candidateValue = yinBuffer[candidateTau];
  const isClearlyBetterOctave = candidateValue + 0.018 < selectedValue;
  if (isClearlyBetterOctave) {
    selectedTau = candidateTau;
    selectedValue = candidateValue;
  }

  return selectedTau;
}

function getMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function removeDcOffset(buffer: Float32Array<ArrayBufferLike>): void {
  let sum = 0;

  for (let index = 0; index < buffer.length; index += 1) {
    sum += buffer[index];
  }

  const average = sum / buffer.length;
  if (Math.abs(average) < 0.0001) return;

  for (let index = 0; index < buffer.length; index += 1) {
    buffer[index] -= average;
  }
}
