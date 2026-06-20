import { ChevronDown, CircleHelp, Minus, MoreVertical, Play, Plus, RotateCcw, Square, Volume2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { type Language, useI18n } from "../i18n";
import type { MetronomeSoundPreset, TimeSignature } from "../types/metronome";
import { COMMON_TIME_SIGNATURES, clampBpm, getTimeSignatureLabel, normalizeTimeSignature } from "../utils/metronomeEngine";

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
  onStart: (options?: { preset?: MetronomeSoundPreset; volumeDb?: number; accentVolumeDb?: number }) => void;
  onStop: () => void;
  onAccentFirstBeatChange: (value: boolean) => void;
  onCountInBarsChange: (bars: number) => void;
  onMetronomeDuringPlaybackChange: (value: boolean) => void;
};

const COUNT_IN_OPTIONS = [0, 1, 2, 4];
const BEAT_MARKERS = 12;

const COPY: Record<
  Language,
  {
    ready: string;
    running: string;
    bpmRange: string;
    title: string;
    sound: string;
    classic: string;
    wood: string;
    volume: string;
    beatVolume: string;
    visualization: string;
    countIn: string;
    off: string;
    oneBar: string;
    bars: string;
    accent: string;
    accentOff: string;
    accentOn: string;
    playHint: string;
    tempoFine: string;
    start: string;
    stop: string;
    tap: string;
    audioHint: string;
  }
> = {
  en: {
    ready: "Ready",
    running: "Running",
    bpmRange: "BPM must be between 40 and 300.",
    title: "Metronome",
    sound: "Click tone",
    classic: "Classic",
    wood: "Wood",
    volume: "Volume",
    beatVolume: "Beat volume",
    visualization: "Beat visualization",
    countIn: "Count-in",
    off: "Off",
    oneBar: "1 bar",
    bars: "bars",
    accent: "First beat accent",
    accentOff: "Off",
    accentOn: "On",
    playHint: "Beat indicator",
    tempoFine: "Tempo fine tune",
    start: "Start",
    stop: "Stop",
    tap: "Tap",
    audioHint: "Audio locked. Click Start to enable.",
  },
  zh: {
    ready: "就绪",
    running: "运行中",
    bpmRange: "BPM 必须在 40 到 300 之间。",
    title: "节拍器",
    sound: "节拍音色",
    classic: "经典",
    wood: "木鱼",
    volume: "音量",
    beatVolume: "节拍音量",
    visualization: "节拍可视化",
    countIn: "预先计数",
    off: "无",
    oneBar: "1小节",
    bars: "小节",
    accent: "第一拍强调",
    accentOff: "未开启",
    accentOn: "开启",
    playHint: "播放指示",
    tempoFine: "速度微调",
    start: "开始",
    stop: "停止",
    tap: "TAP",
    audioHint: "音频未解锁。点击开始即可启用。",
  },
};

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
  const { language } = useI18n();
  const copy = COPY[language];
  const [warning, setWarning] = useState<string | null>(null);
  const [soundPreset, setSoundPreset] = useState<MetronomeSoundPreset>("click");
  const [volumePercent, setVolumePercent] = useState(60);
  const [beatVolumeDb, setBeatVolumeDb] = useState(-10);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tapHelpOpen, setTapHelpOpen] = useState(false);
  const tapTimes = useRef<number[]>([]);
  const normalizedTimeSignature = useMemo(() => normalizeTimeSignature(timeSignature), [timeSignature]);
  const helperCopy = language === "zh"
    ? {
        reset: "重置节拍器默认值",
        more: "显示节拍器说明",
        detailsTitle: "功能说明",
        detailsText:
          "回转箭头会恢复到 120 BPM、4/4、1 小节预备拍、第一拍强调、经典音色、60% 音量和节拍可视化。三点按钮用于展开或收起这段说明。",
        tapHelp: "TAP 说明",
        tapHelpText: "跟着歌曲速度连续点击几次 TAP，MoChord 会取最近几次点击间隔的平均值，并自动换算成 BPM。",
        timeSignature: "时间签名",
        bar: "小节",
      }
    : {
        reset: "Reset metronome defaults",
        more: "Show metronome guide",
        detailsTitle: "Control guide",
        detailsText:
          "The reset button restores 120 BPM, 4/4, one-bar count-in, first-beat accent, classic tone, 60% volume, and visible beat feedback. The menu button opens or closes this guide.",
        tapHelp: "Tap guide",
        tapHelpText: "Tap several times with the song pulse. MoChord averages the recent intervals and converts them into BPM.",
        timeSignature: "Time signature",
        bar: "Bar",
      };

  const timeSignatureIndex = COMMON_TIME_SIGNATURES.findIndex(
    (signature) =>
      signature.numerator === normalizedTimeSignature.numerator &&
      signature.denominator === normalizedTimeSignature.denominator,
  );

  function commitBpm(nextBpm: number) {
    const clamped = clampBpm(nextBpm);
    setWarning(clamped !== Math.round(nextBpm) ? copy.bpmRange : null);
    onBpmChange(clamped);
  }

  function stepBpm(delta: number) {
    commitBpm(bpm + delta);
  }

  function stepTimeSignature(delta: number) {
    const currentIndex = timeSignatureIndex >= 0 ? timeSignatureIndex : 4;
    const nextIndex = Math.max(0, Math.min(COMMON_TIME_SIGNATURES.length - 1, currentIndex + delta));
    onTimeSignatureChange(COMMON_TIME_SIGNATURES[nextIndex]);
    setWarning(null);
  }

  function selectTimeSignature(value: string) {
    const [numerator, denominator] = value.split("/").map(Number);
    onTimeSignatureChange({ numerator, denominator });
    setWarning(null);
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

  function handleStart() {
    onStart({
      preset: soundPreset,
      volumeDb: volumePercentToDb(volumePercent),
      accentVolumeDb: beatVolumeDb,
    });
  }

  function handleReset() {
    onStop();
    onBpmChange(120);
    onTimeSignatureChange({ numerator: 4, denominator: 4 });
    onCountInBarsChange(1);
    onAccentFirstBeatChange(true);
    onMetronomeDuringPlaybackChange(true);
    setSoundPreset("click");
    setVolumePercent(60);
    setBeatVolumeDb(-10);
    setWarning(null);
    tapTimes.current = [];
  }

  const beatMarkers = Array.from({ length: normalizedTimeSignature.numerator }, (_, index) => index + 1);
  const decorativeTicks = Array.from({ length: BEAT_MARKERS }, (_, index) => index);

  return (
    <section className="panel metronome-card metronome-console">
      <div className="metronome-console-header">
        <div>
          <p className="eyebrow">
            <span>01</span> {copy.title} <small>METRONOME</small>
          </p>
        </div>
        <div className="metronome-header-actions">
          <button type="button" onClick={handleReset} aria-label={helperCopy.reset} title={helperCopy.reset}>
            <RotateCcw size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setDetailsOpen((current) => !current)}
            aria-label={helperCopy.more}
            aria-expanded={detailsOpen}
            title={helperCopy.more}
          >
            <MoreVertical size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {detailsOpen ? (
        <div className="metronome-guide-panel">
          <strong>{helperCopy.detailsTitle}</strong>
          <p>{helperCopy.detailsText}</p>
        </div>
      ) : null}

      <div className="metronome-console-grid">
        <div className="metronome-control-stack">
          <section className="metronome-control-tile">
            <label htmlFor="metronome-bpm">BPM</label>
            <div className="metronome-number-field">
              <input
                id="metronome-bpm"
                type="number"
                min="40"
                max="300"
                value={bpm}
                onChange={(event) => commitBpm(Number(event.target.value))}
              />
              <span>BPM</span>
            </div>
            <small>40 - 300</small>
          </section>

          <section className="metronome-control-tile">
            <span>{helperCopy.timeSignature}</span>
            <div className="metronome-stepper">
              <select
                value={`${normalizedTimeSignature.numerator}/${normalizedTimeSignature.denominator}`}
                onChange={(event) => selectTimeSignature(event.target.value)}
                aria-label={helperCopy.timeSignature}
              >
                {COMMON_TIME_SIGNATURES.map((signature) => (
                  <option key={`${signature.numerator}/${signature.denominator}`} value={`${signature.numerator}/${signature.denominator}`}>
                    {getTimeSignatureLabel(signature)}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => stepTimeSignature(-1)} aria-label="Previous time signature">
                <Minus size={16} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => stepTimeSignature(1)} aria-label="Next time signature">
                <Plus size={16} aria-hidden="true" />
              </button>
            </div>
          </section>

          <section className="metronome-control-tile">
            <span>{copy.countIn} <small>(Count-in)</small></span>
            <div className="metronome-segment-row">
              {COUNT_IN_OPTIONS.map((bars) => (
                <button
                  key={bars}
                  type="button"
                  className={countInBars === bars ? "active" : ""}
                  onClick={() => onCountInBarsChange(bars)}
                >
                  {bars === 0 ? copy.off : bars === 1 ? copy.oneBar : `${bars}${language === "zh" ? "" : " "}${copy.bars}`}
                </button>
              ))}
            </div>
          </section>

          <section className="metronome-control-tile">
            <span>{copy.accent}</span>
            <div className="metronome-segment-row metronome-two-segments">
              <button
                type="button"
                className={!accentFirstBeat ? "active" : ""}
                onClick={() => onAccentFirstBeatChange(false)}
              >
                {copy.accentOff}
              </button>
              <button
                type="button"
                className={accentFirstBeat ? "active" : ""}
                onClick={() => onAccentFirstBeatChange(true)}
              >
                {copy.accentOn}
              </button>
            </div>
          </section>
        </div>

        <section className={`metronome-dial-panel ${metronomeDuringPlayback ? "" : "metronome-visual-muted"}`}>
          <span className="metronome-dial-label">{copy.title}</span>
          <div className="metronome-dial" aria-label={`${copy.title} ${currentBeat}/${normalizedTimeSignature.numerator}`}>
            <div className="metronome-dial-aura" aria-hidden="true" />
            {decorativeTicks.map((tick) => {
              const angle = (360 / BEAT_MARKERS) * tick;
              return <i key={tick} className="metronome-dial-tick" style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-112px)` }} />;
            })}
            {beatMarkers.map((beat) => {
              const angle = (360 / normalizedTimeSignature.numerator) * (beat - 1);
              const isAccent = accentFirstBeat && beat === 1;
              const isActive = beat === currentBeat;
              return (
                <span
                  key={beat}
                  className={[
                    "metronome-dial-beat",
                    isAccent ? "accent" : "",
                    isActive ? "active" : "",
                  ].join(" ")}
                  style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-82px)` }}
                />
              );
            })}
            <strong>
              {normalizedTimeSignature.numerator} / {normalizedTimeSignature.denominator}
            </strong>
            <small>
              {isRunning ? copy.running : copy.ready} · {helperCopy.bar} {currentBar}
            </small>
          </div>
        </section>

        <div className="metronome-sound-stack">
          <section className="metronome-control-tile metronome-sound-card">
            <span>{copy.sound}</span>
            <div className="metronome-segment-row metronome-two-segments">
              <button
                type="button"
                className={soundPreset === "click" ? "active" : ""}
                onClick={() => setSoundPreset("click")}
              >
                {copy.classic}
              </button>
              <button
                type="button"
                className={soundPreset === "wood" ? "active" : ""}
                onClick={() => setSoundPreset("wood")}
              >
                {copy.wood}
              </button>
            </div>

            <label className="metronome-mix-slider">
              <span>
                {copy.volume}
                <small>{volumePercent}%</small>
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={volumePercent}
                onChange={(event) => setVolumePercent(Number(event.target.value))}
              />
            </label>

            <label className="metronome-mix-slider">
              <span>
                {copy.beatVolume}
                <small>{beatVolumeDb} dB</small>
              </span>
              <input
                type="range"
                min="-24"
                max="0"
                value={beatVolumeDb}
                onChange={(event) => setBeatVolumeDb(Number(event.target.value))}
              />
            </label>
          </section>

          <section className="metronome-control-tile metronome-toggle-card">
            <span>{copy.visualization}</span>
            <button
              type="button"
              className={`metronome-switch ${metronomeDuringPlayback ? "active" : ""}`}
              onClick={() => onMetronomeDuringPlaybackChange(!metronomeDuringPlayback)}
              aria-pressed={metronomeDuringPlayback}
            >
              <span />
            </button>
          </section>
        </div>
      </div>

      <div className="metronome-console-footer">
        <section className="metronome-mini-panel">
          <span>{copy.playHint}</span>
          <div className="metronome-mini-beats">
            {beatMarkers.slice(0, 8).map((beat) => (
              <i key={beat} className={beat === currentBeat ? "active" : ""} />
            ))}
          </div>
          <div className="metronome-mini-labels">
            {beatMarkers.slice(0, 8).map((beat) => (
              <small key={beat}>{beat}</small>
            ))}
          </div>
        </section>

        <section className="metronome-tempo-panel">
          <span className="metronome-tempo-heading">
            {copy.tempoFine}
            <button
              type="button"
              className="metronome-tap-help-toggle"
              onClick={() => setTapHelpOpen((current) => !current)}
              aria-expanded={tapHelpOpen}
            >
              <CircleHelp size={14} aria-hidden="true" />
              {helperCopy.tapHelp}
              <ChevronDown size={14} aria-hidden="true" />
            </button>
          </span>
          <div className="metronome-tempo-actions">
            <button type="button" onClick={() => stepBpm(-1)} aria-label="Decrease BPM">
              <Minus size={16} aria-hidden="true" />
            </button>
            <strong>{bpm}</strong>
            <button type="button" onClick={() => stepBpm(1)} aria-label="Increase BPM">
              <Plus size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={handleTapTempo}>
              {copy.tap}
            </button>
          </div>
          {tapHelpOpen ? <p className="metronome-tap-help">{helperCopy.tapHelpText}</p> : null}
        </section>

        <section className="metronome-play-panel">
          <button type="button" className="metronome-button metronome-button-primary" onClick={handleStart} disabled={isRunning}>
            <Play size={18} aria-hidden="true" />
            {copy.start}
          </button>
          <button type="button" className="metronome-button" onClick={onStop} disabled={!isRunning}>
            <Square size={16} aria-hidden="true" />
            {copy.stop}
          </button>
        </section>
      </div>

      <p className="audio-empty metronome-audio-hint">
        <Volume2 size={15} aria-hidden="true" />
        {copy.audioHint}
      </p>
      {warning ? <p className="audio-error">{warning}</p> : null}
    </section>
  );
}

function volumePercentToDb(volumePercent: number): number {
  return Math.round(-36 + (Math.max(0, Math.min(100, volumePercent)) / 100) * 32);
}
