import { Activity, Gauge, Mic, MicOff, SlidersHorizontal, Target } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TunerDial } from "./TunerDial";
import { useI18n } from "../i18n";
import type { GuitarVoicing } from "../types/music";
import type { TunerFrame, TunerStatus, TuningPreset, TuningPresetId, TuningTarget } from "../types/tuner";
import { stopAudioPlayback } from "../utils/audioEngine";
import { getTuningPresetDisplayLabel } from "../utils/practiceDisplay";
import {
  buildStoredTuningPresets,
  buildTuningTargets,
  classifyTunerStartError,
  clampReferenceA,
  createVoicingTarget,
  CUSTOM_TUNING_PITCH_OPTIONS,
  DEFAULT_CUSTOM_TUNING,
  findClosestGuitarTuningTarget,
  frequencyToPitch,
  getCents,
  getTargetAwareFrequency,
  getTargetSelectionScore,
  getMicrophoneSupport,
  REFERENCE_A_RANGE,
  saveStoredTuningPreset,
  deleteStoredTuningPreset,
  TUNING_PRESETS,
  TunerEngine,
} from "../utils/tunerEngine";

type TunerControlsProps = {
  chordName?: string;
  voicing?: GuitarVoicing | null;
  presetId: TuningPresetId;
  customPitches: string[];
  referenceA: number;
  storedTuningPresets: TuningPreset[];
  onPresetIdChange: (presetId: TuningPresetId) => void;
  onCustomPitchesChange: (pitches: string[]) => void;
  onReferenceAChange: (referenceA: number) => void;
  onStoredTuningPresetsChange: (presets: TuningPreset[]) => void;
};

type TargetMode = "auto" | string;

const IN_TUNE_CENTS = 5;
const STABLE_REQUIRED_FRAMES = 4;
const AUTO_SWITCH_REQUIRED_FRAMES = 3;
const AUTO_SWITCH_MARGIN_CENTS = 18;

const COPY = {
  en: {
    eyebrow: "Tuner",
    title: "Guitar tuning",
    start: "Start Tuner",
    stop: "Stop",
    auto: "Auto",
    target: "Target",
    frequency: "Frequency",
    cents: "Cents",
    input: "Input",
    idle: "Idle",
    listening: "Listening",
    noSignal: "No signal",
    inTune: "In tune",
    offPitch: "Adjust",
    locked: "Hold",
    error: "Mic error",
    flat: "Flat",
    sharp: "Sharp",
    stable: "Centered",
    preset: "Preset",
    reference: "A4 calibration",
    standardStrings: "Open strings",
    customTuning: "Custom tuning",
    customPresetName: "Preset name",
    customPresetPlaceholder: "Name this tuning",
    saveCustomPreset: "Save Preset",
    deleteCustomPreset: "Delete Preset",
    savedPresetNotice: "Tuning preset saved.",
    deletedPresetNotice: "Tuning preset deleted.",
    shapeTargets: "Current shape",
    shapeInfo: "Info",
    shapeInfoClose: "Hide",
    shapeInfoText:
      "These targets come from the current chord shape. S means string, the note is the fretted pitch, and f means fret. Select one to check whether that fretted note is ringing in tune.",
    noShapeTargets: "No playable strings in this shape.",
    resetA4: "Reset",
    tunedProgress: "Stable lock",
    hintIdle: "Tap Start Tuner when your instrument is ready.",
    hintListening: "Listening. Play the target string near the phone mic.",
    hintNoSignal: "Input is too quiet or unstable. Move closer and play one string clearly.",
    hintInTune: "Centered. Hold the note steady for a clean lock.",
    hintAdjust: "Adjust slowly until the pointer centers.",
    hintError: "Check microphone access, then try Start Tuner again.",
    micUnavailable: "Microphone input is not available in this environment.",
    micPermissionDenied: "Microphone permission was denied. Allow microphone access in app or browser settings and try again.",
    micMissing: "No microphone input was found on this device.",
    micError: "Microphone could not be started. Check system privacy settings and try again.",
  },
  zh: {
    eyebrow: "调音器",
    title: "吉他调音",
    start: "开始调音",
    stop: "停止",
    auto: "自动",
    target: "目标音",
    frequency: "频率",
    cents: "音分",
    input: "输入",
    idle: "待机",
    listening: "监听中",
    noSignal: "无稳定信号",
    inTune: "已调准",
    offPitch: "调整中",
    locked: "保持",
    error: "麦克风错误",
    flat: "偏低",
    sharp: "偏高",
    stable: "居中",
    preset: "调弦预设",
    reference: "A4 校准",
    standardStrings: "空弦目标",
    customTuning: "自定义调弦",
    customPresetName: "预设名称",
    customPresetPlaceholder: "给这个调弦命名",
    saveCustomPreset: "保存预设",
    deleteCustomPreset: "删除预设",
    savedPresetNotice: "调弦预设已保存。",
    deletedPresetNotice: "调弦预设已删除。",
    shapeTargets: "当前按法",
    shapeInfo: "说明",
    shapeInfoClose: "收起",
    shapeInfoText:
      "这里的目标音来自当前和弦按法。S 表示第几弦，中间是按出来的音高，f 表示多少品，比如S5 C3 f3：5弦3品，目标音是C3。点选某一项后，可以检查这根按弦音是否准确。",
    noShapeTargets: "当前按法没有可播放的弦。",
    resetA4: "重置",
    tunedProgress: "稳定锁定",
    hintIdle: "准备好后点开始调音。",
    hintListening: "正在监听，请靠近手机麦克风弹响目标弦。",
    hintNoSignal: "输入偏弱或不稳定，请靠近麦克风并清晰拨一根弦。",
    hintInTune: "已经居中，保持音高稳定即可。",
    hintAdjust: "慢慢调整弦钮，让指针回到中心。",
    hintError: "请检查麦克风权限，然后重新开始调音。",
    micUnavailable: "当前环境不可用麦克风输入。",
    micPermissionDenied: "麦克风权限已被拒绝。请在应用或浏览器设置中允许麦克风访问后重试。",
    micMissing: "当前设备未检测到可用的麦克风输入。",
    micError: "麦克风无法启动，请检查系统隐私权限后重试。",
  },
} as const;

type TunerCopy = Record<keyof (typeof COPY)["en"], string>;

export function TunerControls({
  chordName,
  voicing,
  presetId,
  customPitches,
  referenceA,
  storedTuningPresets,
  onPresetIdChange,
  onCustomPitchesChange,
  onReferenceAChange,
  onStoredTuningPresetsChange,
}: TunerControlsProps) {
  const { language } = useI18n();
  const copy: TunerCopy = COPY[language];
  const [status, setStatus] = useState<TunerStatus>("idle");
  const [frame, setFrame] = useState<TunerFrame | null>(null);
  const [customPresetName, setCustomPresetName] = useState("");
  const [tuningPresetNotice, setTuningPresetNotice] = useState<string | null>(null);
  const [targetMode, setTargetMode] = useState<TargetMode>("auto");
  const [stableFrames, setStableFrames] = useState(0);
  const [autoTargetId, setAutoTargetId] = useState<string | null>(null);
  const [shapeInfoOpen, setShapeInfoOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const engineRef = useRef<TunerEngine | null>(null);
  const pendingAutoTargetRef = useRef<{ id: string; frames: number } | null>(null);

  if (!engineRef.current) {
    engineRef.current = new TunerEngine();
  }

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
    };
  }, []);

  const presetTargets = useMemo(
    () => buildTuningTargets(presetId, referenceA, customPitches, storedTuningPresets),
    [customPitches, presetId, referenceA, storedTuningPresets],
  );
  const tuningPresetOptions = useMemo(() => [...TUNING_PRESETS, ...storedTuningPresets], [storedTuningPresets]);
  const calibratedPitch = useMemo(() => {
    if (!frame?.pitch) return null;
    const pitch = frequencyToPitch(frame.pitch.frequency, referenceA);
    return {
      ...pitch,
      clarity: frame.pitch.clarity,
      inputLevel: frame.pitch.inputLevel,
    };
  }, [frame?.pitch, referenceA]);

  const voicingTargets = useMemo(() => {
    if (!voicing) return [];

    return voicing.frets.flatMap((fret, index) => {
      if (fret < 0 || voicing.muted[index]) return [];
      const openTarget = presetTargets[index];
      if (!openTarget) return [];
      return [createVoicingTarget(openTarget, fret, referenceA)];
    });
  }, [presetTargets, referenceA, voicing]);

  const allTargets = useMemo(() => [...presetTargets, ...voicingTargets], [presetTargets, voicingTargets]);
  const closestTarget = useMemo(() => {
    if (!frame?.pitch) return presetTargets[0];
    return findClosestGuitarTuningTarget(frame.pitch.frequency, presetTargets);
  }, [frame?.pitch, presetTargets]);
  const detectedTarget = useMemo(
    () => presetTargets.find((option) => option.id === autoTargetId) ?? closestTarget,
    [autoTargetId, closestTarget, presetTargets],
  );

  const target = useMemo(() => {
    if (targetMode === "auto") return detectedTarget;
    return allTargets.find((option) => option.id === targetMode) ?? closestTarget;
  }, [allTargets, closestTarget, detectedTarget, targetMode]);

  const targetAwareFrequency = frame?.pitch ? getTargetAwareFrequency(frame.pitch.frequency, target.frequency) : null;
  const targetCents = targetAwareFrequency ? getCents(targetAwareFrequency, target.frequency) : null;
  const displayStatus = getDisplayStatus(status, targetCents, stableFrames);
  const inputLevel = frame ? Math.min(100, Math.round(frame.inputLevel * 820)) : 0;
  const frequencyLabel = targetAwareFrequency ? `${targetAwareFrequency.toFixed(1)} Hz` : "--";
  const directionLabel = targetCents === null || Math.abs(targetCents) <= IN_TUNE_CENTS
    ? copy.stable
    : targetCents < 0
      ? copy.flat
      : copy.sharp;
  const isListening = status !== "idle" && status !== "error";
  const targetAwarePitch = useMemo(() => {
    if (!targetAwareFrequency) return null;
    const pitch = frequencyToPitch(targetAwareFrequency, referenceA);
    return {
      ...pitch,
      clarity: frame?.pitch?.clarity ?? 0,
      inputLevel: frame?.pitch?.inputLevel ?? 0,
    };
  }, [frame?.pitch?.clarity, frame?.pitch?.inputLevel, referenceA, targetAwareFrequency]);
  const detectedNoteLabel = targetAwarePitch ? `${targetAwarePitch.note}${targetAwarePitch.octave}` : calibratedPitch ? `${calibratedPitch.note}${calibratedPitch.octave}` : "--";
  const pointerCents = targetAwarePitch?.cents ?? calibratedPitch?.cents ?? null;
  const referenceLabel = `A4 ${referenceA} Hz`;
  const statusHint = getTunerStatusHint(displayStatus, inputLevel, copy);

  useEffect(() => {
    setTargetMode("auto");
    setStableFrames(0);
    setAutoTargetId(null);
    pendingAutoTargetRef.current = null;
  }, [presetId]);

  useEffect(() => {
    if (targetMode !== "auto" || !frame?.pitch) {
      pendingAutoTargetRef.current = null;
      return;
    }

    const frequency = frame.pitch.frequency;

    setAutoTargetId((currentId) => {
      const currentTarget = presetTargets.find((option) => option.id === currentId);
      if (!currentTarget) {
        pendingAutoTargetRef.current = null;
        return closestTarget.id;
      }

      if (closestTarget.id === currentTarget.id) {
        pendingAutoTargetRef.current = null;
        return currentId;
      }

      const currentDistance = getTargetSelectionScore(frequency, currentTarget.frequency);
      const closestDistance = getTargetSelectionScore(frequency, closestTarget.frequency);
      if (closestDistance + AUTO_SWITCH_MARGIN_CENTS >= currentDistance) {
        pendingAutoTargetRef.current = null;
        return currentId;
      }

      const pending = pendingAutoTargetRef.current;
      const frames = pending?.id === closestTarget.id ? pending.frames + 1 : 1;
      pendingAutoTargetRef.current = { id: closestTarget.id, frames };

      return frames >= AUTO_SWITCH_REQUIRED_FRAMES ? closestTarget.id : currentId;
    });
  }, [closestTarget, frame?.pitch, presetTargets, targetMode]);

  useEffect(() => {
    if (targetCents === null || status === "idle" || status === "error" || status === "no-signal") {
      setStableFrames(0);
      return;
    }

    setStableFrames((current) => {
      if (Math.abs(targetCents) > IN_TUNE_CENTS) return 0;
      return Math.min(STABLE_REQUIRED_FRAMES, current + 1);
    });
  }, [status, target.id, target.frequency, targetCents]);

  async function handleStart() {
    if (!getMicrophoneSupport(navigator).supported) {
      setStatus("error");
      setError(copy.micUnavailable);
      return;
    }

    try {
      setError(null);
      setFrame(null);
      setStableFrames(0);
      setStatus("listening");
      stopAudioPlayback();
      await engineRef.current?.start((nextFrame) => {
        setFrame(nextFrame);
        setStatus(nextFrame.pitch ? "listening" : "no-signal");
      });
    } catch (caught) {
      setFrame(null);
      setStableFrames(0);
      setStatus("error");
      const errorKind = classifyTunerStartError(caught);
      setError(
        errorKind === "permission-denied"
          ? copy.micPermissionDenied
          : errorKind === "microphone-unavailable"
            ? copy.micMissing
            : copy.micError,
      );
    }
  }

  function handleStop() {
    engineRef.current?.stop();
    setFrame(null);
    setStableFrames(0);
    setError(null);
    setStatus("idle");
  }

  const controlDock = (
    <div className="tuner-control-dock">
      <div className="tuner-input-meter">
        <span>
          <Gauge size={15} aria-hidden="true" />
          {copy.input}
        </span>
        <div>
          <i style={{ width: `${inputLevel}%` }} />
        </div>
      </div>

      <p className="tuner-status-hint">{statusHint}</p>

      <div className="tuner-actions">
        <button
          type="button"
          className="metronome-button metronome-button-primary"
          disabled={isListening}
          onClick={handleStart}
        >
          <Mic size={16} aria-hidden="true" />
          {copy.start}
        </button>
        <button type="button" className="metronome-button" disabled={!isListening} onClick={handleStop}>
          <MicOff size={16} aria-hidden="true" />
          {copy.stop}
        </button>
      </div>

      {error ? <p className="audio-error">{error}</p> : null}
    </div>
  );

  function handleReferenceAChange(value: number) {
    onReferenceAChange(clampReferenceA(value));
    setStableFrames(0);
  }

  function handlePresetChange(value: string) {
    onPresetIdChange(value as TuningPresetId);
  }

  function handleCustomPitchChange(index: number, pitch: string) {
    onCustomPitchesChange(customPitches.map((currentPitch, currentIndex) => (currentIndex === index ? pitch : currentPitch)));
    setTargetMode("auto");
    setStableFrames(0);
    setAutoTargetId(null);
    pendingAutoTargetRef.current = null;
  }

  function handleSaveCustomPreset() {
    const preset = saveStoredTuningPreset(localStorage, {
      name: customPresetName,
      pitches: customPitches,
    });
    onStoredTuningPresetsChange(buildStoredTuningPresets(localStorage));
    onPresetIdChange(preset.id);
    setCustomPresetName("");
    setTuningPresetNotice(copy.savedPresetNotice);
  }

  function handleDeleteStoredPreset() {
    deleteStoredTuningPreset(localStorage, presetId);
    onStoredTuningPresetsChange(buildStoredTuningPresets(localStorage));
    onPresetIdChange("custom");
    setTuningPresetNotice(copy.deletedPresetNotice);
  }

  return (
    <section className="panel tuner-card">
      <div className="tuner-header">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2>{copy.title}</h2>
        </div>
        <span className={`audio-status audio-status-${statusClass(displayStatus)}`}>
          {isListening ? <Mic size={15} aria-hidden="true" /> : <MicOff size={15} aria-hidden="true" />}
          {statusText(displayStatus, copy)}
        </span>
      </div>

      {controlDock}

      <TunerDial
        targetLabel={target.label}
        detectedNoteLabel={detectedNoteLabel}
        frequencyLabel={frequencyLabel}
        targetCents={targetCents}
        pointerCents={pointerCents}
        status={displayStatus}
        statusLabel={statusText(displayStatus, copy)}
        directionLabel={directionLabel}
        referenceLabel={referenceLabel}
      />

      <div className="tuner-settings">
        <label>
          {copy.preset}
          <select className="metronome-select" value={presetId} onChange={(event) => handlePresetChange(event.target.value)}>
            {tuningPresetOptions.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {getTuningPresetDisplayLabel(preset, language)}
              </option>
            ))}
          </select>
        </label>
        {presetId === "custom" ? (
          <>
            <div className="custom-tuning-editor" aria-label={copy.customTuning}>
              {customPitches.map((pitch, index) => {
                const stringNumber = 6 - index;
                return (
                  <label key={`custom-string-${stringNumber}`}>
                    <span>{getStringLabel(stringNumber, language)}</span>
                    <select value={pitch} onChange={(event) => handleCustomPitchChange(index, event.target.value)}>
                      {CUSTOM_TUNING_PITCH_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
            <div className="custom-preset-row">
              <label>
                <span>{copy.customPresetName}</span>
                <input
                  type="text"
                  value={customPresetName}
                  placeholder={copy.customPresetPlaceholder}
                  onChange={(event) => setCustomPresetName(event.target.value)}
                />
              </label>
              <button type="button" onClick={handleSaveCustomPreset}>
                {copy.saveCustomPreset}
              </button>
            </div>
          </>
        ) : null}
        {presetId.startsWith("stored:") ? (
          <div className="custom-preset-row custom-preset-row-single">
            <button type="button" onClick={handleDeleteStoredPreset}>
              {copy.deleteCustomPreset}
            </button>
          </div>
        ) : null}
        {tuningPresetNotice ? <p className="api-key-notice">{tuningPresetNotice}</p> : null}
        <label>
          <span>
            <SlidersHorizontal size={15} aria-hidden="true" />
            {copy.reference} {referenceA} Hz
          </span>
          <div className="tuner-reference-row">
            <input
              className="metronome-slider"
              type="range"
              min={REFERENCE_A_RANGE.min}
              max={REFERENCE_A_RANGE.max}
              step="1"
              value={referenceA}
              onChange={(event) => handleReferenceAChange(Number(event.target.value))}
            />
            <input
              className="tuner-reference-input"
              type="number"
              min={REFERENCE_A_RANGE.min}
              max={REFERENCE_A_RANGE.max}
              value={referenceA}
              onChange={(event) => handleReferenceAChange(Number(event.target.value))}
            />
            <button type="button" onClick={() => handleReferenceAChange(REFERENCE_A_RANGE.default)}>
              {copy.resetA4}
            </button>
          </div>
        </label>
      </div>

      <div className="tuner-target-group">
        <div className="tuner-target-heading">
          <span>{copy.standardStrings}</span>
          <button
            type="button"
            className={targetMode === "auto" ? "active" : ""}
            onClick={() => {
              setTargetMode("auto");
              setStableFrames(0);
              setAutoTargetId(null);
              pendingAutoTargetRef.current = null;
            }}
          >
            <Activity size={14} aria-hidden="true" />
            {copy.auto}
          </button>
        </div>
        <div className="tuner-targets" aria-label={copy.target}>
          {presetTargets.map((option) => (
            <TargetButton
              key={option.id}
              isActive={targetMode === option.id}
              target={option}
              stringLabel={getStringLabel(option.stringNumber, language)}
              onSelect={() => {
                setTargetMode(option.id);
                setStableFrames(0);
                pendingAutoTargetRef.current = null;
              }}
            />
          ))}
        </div>
      </div>

      <div className="tuner-target-group">
        <div className="tuner-target-heading">
          <span>{copy.shapeTargets}{chordName ? ` · ${chordName}` : ""}</span>
          <button
            type="button"
            className={shapeInfoOpen ? "active" : ""}
            aria-expanded={shapeInfoOpen}
            onClick={() => setShapeInfoOpen((isOpen) => !isOpen)}
          >
            {shapeInfoOpen ? copy.shapeInfoClose : copy.shapeInfo}
          </button>
        </div>
        {shapeInfoOpen ? <p className="tuner-shape-info">{copy.shapeInfoText}</p> : null}
        {voicingTargets.length > 0 ? (
          <div className="tuner-targets tuner-targets-shape" aria-label={copy.shapeTargets}>
            {voicingTargets.map((option) => (
              <TargetButton
                key={option.id}
                isActive={targetMode === option.id}
                target={option}
                onSelect={() => {
                  setTargetMode(option.id);
                  setStableFrames(0);
                  pendingAutoTargetRef.current = null;
                }}
              />
            ))}
          </div>
        ) : (
          <p className="audio-empty">{copy.noShapeTargets}</p>
        )}
      </div>

    </section>
  );
}

type TargetButtonProps = {
  isActive: boolean;
  target: TuningTarget;
  stringLabel?: string;
  onSelect: () => void;
};

function TargetButton({ isActive, target, stringLabel, onSelect }: TargetButtonProps) {
  return (
    <button type="button" className={isActive ? "active" : ""} onClick={onSelect}>
      <Target size={14} aria-hidden="true" />
      <span>{target.label}</span>
      {stringLabel ? <small>{stringLabel}</small> : null}
      {typeof target.fret === "number" ? <small>f{target.fret}</small> : null}
    </button>
  );
}

function getStringLabel(stringNumber: number, language: "en" | "zh"): string {
  return language === "zh" ? `${stringNumber}弦` : `String ${stringNumber}`;
}

function getDisplayStatus(status: TunerStatus, cents: number | null, stableFrames: number): TunerStatus {
  if (status === "idle" || status === "error") return status;
  if (status === "no-signal" || cents === null) return "no-signal";
  if (Math.abs(cents) <= IN_TUNE_CENTS) {
    return stableFrames >= STABLE_REQUIRED_FRAMES ? "in-tune" : "locked";
  }
  return "off-pitch";
}

function statusText(status: TunerStatus, copy: TunerCopy): string {
  switch (status) {
    case "idle":
      return copy.idle;
    case "listening":
      return copy.listening;
    case "no-signal":
      return copy.noSignal;
    case "in-tune":
      return copy.inTune;
    case "off-pitch":
      return copy.offPitch;
    case "locked":
      return copy.locked;
    case "error":
      return copy.error;
  }
}

function getTunerStatusHint(status: TunerStatus, inputLevel: number, copy: TunerCopy): string {
  if (status === "error") return copy.hintError;
  if (status === "idle") return copy.hintIdle;
  if (status === "in-tune" || status === "locked") return copy.hintInTune;
  if (status === "off-pitch") return copy.hintAdjust;
  if (status === "no-signal" || inputLevel < 6) return copy.hintNoSignal;
  return copy.hintListening;
}

function statusClass(status: TunerStatus): "ready" | "playing" | "error" {
  if (status === "error") return "error";
  if (status === "in-tune") return "ready";
  return status === "idle" ? "ready" : "playing";
}
