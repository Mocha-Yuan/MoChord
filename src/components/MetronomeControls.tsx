import { Activity, Gauge, Play, Square, TimerReset, Volume2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { TimeSignature } from "../types/metronome";
import { clampBpm, normalizeTimeSignature } from "../utils/metronomeEngine";

type MetronomeControlsProps = {
  bpm: number;
  timeSignature: TimeSignature;
  isRunning: boolean;
  currentBeat: number;
  currentBar: number;
  accentFirstBeat: boolean;
  countInBars: number;
  metronomeDuringPlayback: boolean;
  onBpmChange: (bpm: number) => void;
  onTimeSignatureChange: (timeSignature: TimeSignature) => void;
  onStart: () => void;
  onStop: () => void;
  onAccentFirstBeatChange: (value: boolean) => void;
  onCountInBarsChange: (bars: number) => void;
  onMetronomeDuringPlaybackChange: (value: boolean) => void;
};

const TIME_SIGNATURES: TimeSignature[] = [
  { numerator: 2, denominator: 4 },
  { numerator: 3, denominator: 4 },
  { numerator: 4, denominator: 4 },
  { numerator: 5, denominator: 4 },
  { numerator: 6, denominator: 8 },
  { numerator: 7, denominator: 8 },
  { numerator: 12, denominator: 8 },
];

export function MetronomeControls({
  bpm,
  timeSignature,
  isRunning,
  currentBeat,
  currentBar,
  accentFirstBeat,
  countInBars,
  metronomeDuringPlayback,
  onBpmChange,
  onTimeSignatureChange,
  onStart,
  onStop,
  onAccentFirstBeatChange,
  onCountInBarsChange,
  onMetronomeDuringPlaybackChange,
}: MetronomeControlsProps) {
  const { t } = useI18n();
  const [warning, setWarning] = useState<string | null>(null);
  const tapTimes = useRef<number[]>([]);
  const normalizedTimeSignature = useMemo(() => normalizeTimeSignature(timeSignature), [timeSignature]);

  function commitBpm(nextBpm: number) {
    const clamped = clampBpm(nextBpm);
    setWarning(clamped !== Math.round(nextBpm) ? t("bpmRangeWarning") : null);
    onBpmChange(clamped);
  }

  function handleTimeSignatureChange(value: string) {
    const [numerator, denominator] = value.split("/").map(Number);
    const normalized = normalizeTimeSignature({ numerator, denominator });

    if (normalized.numerator !== numerator || normalized.denominator !== denominator) {
      setWarning(t("invalidTimeSignature"));
    } else {
      setWarning(null);
    }

    onTimeSignatureChange(normalized);
  }

  function handleTapTempo() {
    const now = window.performance.now();
    const previous = tapTimes.current[tapTimes.current.length - 1];

    if (!previous || now - previous > 3000) {
      tapTimes.current = [now];
      setWarning(null);
      return;
    }

    tapTimes.current = [...tapTimes.current, now].slice(-5);
    const intervals = tapTimes.current.slice(1).map((time, index) => time - tapTimes.current[index]);
    const average = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    commitBpm(60_000 / average);
  }

  return (
    <section className="panel metronome-card">
      <div className="metronome-header">
        <div>
          <p className="eyebrow">{t("metronome")}</p>
          <h2>{t("tempoAndPulse")}</h2>
        </div>
        <span className={`audio-status audio-status-${isRunning ? "playing" : "ready"}`}>
          <Activity size={15} aria-hidden="true" />
          {isRunning ? t("metronomeRunning") : t("metronomeReady")}
        </span>
      </div>

      <div className="metronome-readout">
        <div>
          <span>{t("beat")} {currentBeat} / {normalizedTimeSignature.numerator}</span>
          <strong>{t("bar")} {currentBar}</strong>
        </div>
        <div className="metronome-beat-row" aria-label={t("beat")}>
          {Array.from({ length: normalizedTimeSignature.numerator }).map((_, index) => {
            const beat = index + 1;
            const isAccent = accentFirstBeat && beat === 1;
            const isActive = beat === currentBeat;

            return (
              <span
                key={beat}
                className={[
                  "metronome-beat-dot",
                  isAccent ? "metronome-beat-dot-accent" : "",
                  isActive ? "metronome-beat-dot-active" : "",
                ].join(" ")}
              />
            );
          })}
        </div>
      </div>

      <div className="metronome-grid">
        <label>
          <span>
            <Gauge size={15} aria-hidden="true" />
            BPM
          </span>
          <input
            className="audio-select"
            type="number"
            min="40"
            max="240"
            value={bpm}
            onChange={(event) => commitBpm(Number(event.target.value))}
          />
        </label>
        <label>
          {t("timeSignature")}
          <select
            className="metronome-select"
            value={`${normalizedTimeSignature.numerator}/${normalizedTimeSignature.denominator}`}
            onChange={(event) => handleTimeSignatureChange(event.target.value)}
          >
            {TIME_SIGNATURES.map((signature) => (
              <option key={`${signature.numerator}/${signature.denominator}`} value={`${signature.numerator}/${signature.denominator}`}>
                {signature.numerator}/{signature.denominator}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("countIn")}
          <select
            className="metronome-select"
            value={countInBars}
            onChange={(event) => onCountInBarsChange(Number(event.target.value))}
          >
            <option value={0}>{t("bars0")}</option>
            <option value={1}>{t("bars1")}</option>
            <option value={2}>{t("bars2")}</option>
          </select>
        </label>
      </div>

      <label className="metronome-slider-label">
        <span>BPM {bpm}</span>
        <input
          className="metronome-slider"
          type="range"
          min="40"
          max="240"
          step="1"
          value={bpm}
          onChange={(event) => commitBpm(Number(event.target.value))}
        />
      </label>

      <div className="metronome-toggles">
        <label>
          <input
            type="checkbox"
            checked={accentFirstBeat}
            onChange={(event) => onAccentFirstBeatChange(event.target.checked)}
          />
          <span>{t("accentFirstBeat")}</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={metronomeDuringPlayback}
            onChange={(event) => onMetronomeDuringPlaybackChange(event.target.checked)}
          />
          <span>{t("metronomeDuringPlayback")}</span>
        </label>
      </div>

      <div className="metronome-actions">
        <button type="button" className="metronome-button metronome-button-primary" onClick={onStart}>
          <Play size={16} aria-hidden="true" />
          {t("startMetronome")}
        </button>
        <button type="button" className="metronome-button" onClick={onStop}>
          <Square size={16} aria-hidden="true" />
          {t("stop")}
        </button>
        <button type="button" className="metronome-button" onClick={handleTapTempo}>
          <TimerReset size={16} aria-hidden="true" />
          {t("tapTempo")}
        </button>
      </div>

      <p className="audio-empty">
        <Volume2 size={15} aria-hidden="true" />
        {t("audioLockedStart")}
      </p>
      {warning ? <p className="audio-error">{warning}</p> : null}
    </section>
  );
}
