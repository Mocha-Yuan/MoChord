import { Copy, Dumbbell, KeyRound, Loader2, Music2, Play, Save, Settings2, Sparkles, Square, Trash2, WandSparkles } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { STYLE_TEMPLATES } from "../data/styleTemplates";
import { type Language, useI18n } from "../i18n";
import {
  clearDeepSeekApiKey,
  type DeepSeekApiKeyStatus,
  generateChordProgressionWithDeepSeek,
  generateLocalFallbackProgression,
  getDeepSeekApiKeyStatus,
  hasDeepSeekRuntime,
  saveDeepSeekApiKey,
  testDeepSeekApiKey,
} from "../services/deepseekClient";
import type { TimeSignature } from "../types/metronome";
import type {
  AIChordProgressionResult,
  AIProgressionChord,
  AIProgressionVersion,
  PracticeCoachPlan,
  ProgressionLevel,
} from "../types/progression";
import { generateGuitarVoicing } from "../utils/guitar";
import { localizeProgressionResult } from "../utils/diatonicChords";
import { getHarmonicFunction } from "../utils/harmonicFunction";
import { parseChordName } from "../utils/musicTheory";
import {
  playChordByName,
  playChordProgression,
  stopChordProgressionPlayback,
  type ProgressionPlaybackBeat,
} from "../utils/progressionPlayback";
import { FretboardDiagram } from "./FretboardDiagram";

type AIProgressionGeneratorProps = {
  bpm: number;
  timeSignature: TimeSignature;
  countInBars: number;
  metronomeDuringPlayback: boolean;
  accentFirstBeat: boolean;
  tuningPitches: string[];
  onBeat: (data: ProgressionPlaybackBeat) => void;
  onSelectChord: (chordName: string) => void;
  onStartPractice?: (payload: { title: string; chords: string[]; level: ProgressionLevel; coach?: PracticeCoachPlan }) => void;
  onSaveProgression?: (payload: { title: string; chords: string[]; level: ProgressionLevel }) => void;
};

type Source = "deepseek" | "fallback";

type PlayingState = {
  level: ProgressionLevel;
  chordName: string | null;
  beat: number;
  bar: number;
};

const EXAMPLES_BY_LANGUAGE: Record<Language, string[]> = {
  en: [
    "D Major 4-5-6-6",
    "C Major 1-5-6-4",
    "G Major I-V-vi-IV",
    "A minor 6-4-1-5",
    "D / IV-V-VI-VI",
    "E Dorian 1-4-5-1",
  ],
  zh: [
    "D调 4-5-6-6",
    "C大调 1-5-6-4",
    "G大调 I-V-vi-IV",
    "A小调 6-4-1-5",
    "D调 / IV-V-VI-VI",
    "C调 1-4-5-1",
  ],
};

export function AIProgressionGenerator({
  bpm,
  timeSignature,
  countInBars,
  metronomeDuringPlayback,
  accentFirstBeat,
  tuningPitches,
  onBeat,
  onSelectChord,
  onStartPractice,
  onSaveProgression,
}: AIProgressionGeneratorProps) {
  const { language, t } = useI18n();
  const [input, setInput] = useState("D调4566");
  const [result, setResult] = useState<AIChordProgressionResult | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<PlayingState | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeyStatus, setApiKeyStatus] = useState<DeepSeekApiKeyStatus>({
    configured: false,
    source: "none",
  });
  const [apiKeyNotice, setApiKeyNotice] = useState<string | null>(null);
  const [isApiKeyBusy, setIsApiKeyBusy] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);

  const isDesktopRuntime = hasDeepSeekRuntime();
  const keyMissing = !isDesktopRuntime || !apiKeyStatus.configured;
  const examples = EXAMPLES_BY_LANGUAGE[language];
  const localizedResult = useMemo(
    () => (result ? localizeProgressionResult(result, language) : null),
    [language, result],
  );
  const summary = useMemo(() => {
    if (!localizedResult) return null;
    return `${t("key")}: ${localizedResult.key} · ${t("mode")}: ${localizedResult.modeLabel ?? localizedResult.mode} · ${t("degree")}: ${localizedResult.degrees.join("-")}`;
  }, [localizedResult, t]);

  useEffect(() => {
    let ignore = false;

    async function loadApiKeyStatus() {
      if (!isDesktopRuntime) return;

      try {
        const status = await getDeepSeekApiKeyStatus();
        if (ignore) return;
        setApiKeyStatus(status);
        setError(null);
      } catch {
        if (!ignore) setError(null);
      }
    }

    void loadApiKeyStatus();

    return () => {
      ignore = true;
    };
  }, [isDesktopRuntime, t]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (keyMissing) {
      handleLocalFallback(input);
      return;
    }
    await handleGenerateWithDeepSeek();
  }

  async function handleGenerateWithDeepSeek() {
    if (!input.trim()) {
      setError(t("inputProgressionHint"));
      return;
    }

    if (keyMissing) {
      handleLocalFallback(input);
      return;
    }

    setIsLoading(true);
    setError(null);
    setPlaybackError(null);
    stopPlayback();

    try {
      const nextResult = await generateChordProgressionWithDeepSeek(input, language);
      setResult(nextResult);
      setSource("deepseek");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : t("deepseekRequestFailed");
      try {
        const fallback = generateLocalFallbackProgression(input, message);
        setResult(fallback);
        setSource("fallback");
        setError(message);
      } catch (fallbackError) {
        setError(fallbackError instanceof Error ? fallbackError.message : t("unableGenerate"));
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveApiKey() {
    if (!apiKeyInput.trim()) {
      setApiKeyNotice(t("deepseekKeyEnterFirst"));
      return;
    }

    setIsApiKeyBusy(true);
    setApiKeyNotice(null);
    try {
      const status = await saveDeepSeekApiKey(apiKeyInput);
      setApiKeyStatus(status);
      setApiKeyInput("");
      setError(null);
      setApiKeyNotice(t("deepseekKeySaved"));
    } catch {
      setApiKeyNotice(t("deepseekKeySaveFailed"));
    } finally {
      setIsApiKeyBusy(false);
    }
  }

  async function handleTestApiKey() {
    setIsApiKeyBusy(true);
    setApiKeyNotice(null);
    try {
      const status = await testDeepSeekApiKey(apiKeyInput.trim() || undefined);
      setApiKeyStatus(status);
      setApiKeyNotice(t("deepseekKeyTestSucceeded"));
    } catch {
      setApiKeyNotice(t("deepseekKeyTestFailed"));
    } finally {
      setIsApiKeyBusy(false);
    }
  }

  async function handleClearApiKey() {
    setIsApiKeyBusy(true);
    setApiKeyNotice(null);
    try {
      const status = await clearDeepSeekApiKey();
      setApiKeyStatus(status);
      setApiKeyInput("");
      setError(null);
      setApiKeyNotice(t("deepseekKeyCleared"));
    } catch {
      setApiKeyNotice(t("deepseekKeyClearFailed"));
    } finally {
      setIsApiKeyBusy(false);
    }
  }

  function handleLocalFallback(nextInput = input) {
    try {
      stopPlayback();
      const fallback = generateLocalFallbackProgression(nextInput);
      setInput(nextInput);
      setResult(fallback);
      setSource("fallback");
      setError(null);
      setPlaybackError(null);
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : t("unableGenerate"));
    }
  }

  function stopPlayback() {
    stopChordProgressionPlayback();
    setPlaying(null);
  }

  async function handlePlayVersion(level: ProgressionLevel, chords: AIProgressionChord[]) {
    try {
      setPlaybackError(null);
      const chordNames = chords.map((chord) => chord.chord);
      setPlaying({ level, chordName: chordNames[0] ?? null, beat: 1, bar: 1 });
      await playChordProgression(chordNames, {
        bpm,
        timeSignature,
        barsPerChord: 1,
        countInBars,
        metronomeDuringPlayback,
        accentFirstBeat,
        tuningPitches,
        level,
        onBeat: (data) => {
          onBeat(data);
          setPlaying((current) => (current ? { ...current, beat: data.beat, bar: data.bar } : current));
        },
        onChordChange: (data) => {
          setPlaying(data ? { level, chordName: data.chordName, beat: data.beat, bar: data.bar } : null);
        },
        onComplete: () => setPlaying(null),
        onStop: () => setPlaying(null),
      });
    } catch {
      setPlaying(null);
      setPlaybackError(t("playbackFailedEnableAudio"));
    }
  }

  async function handlePlayChord(chordName: string) {
    try {
      setPlaybackError(null);
      stopPlayback();
      await playChordByName(chordName, { bpm, timeSignature, bars: 1, tuningPitches });
    } catch {
      setPlaybackError(t("playbackFailedEnableAudio"));
    }
  }

  async function handleCopy(chords: AIProgressionChord[]) {
    const text = chords.map((chord) => chord.chord).join(" - ");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError(text);
    }
  }

  function statusLabel() {
    if (isLoading) return t("generating");
    if (source === "deepseek") return t("generatedByDeepSeek");
    if (source === "fallback") return t("generatedFallback");
    return keyMissing ? t("demoModeReady") : t("ready");
  }

  return (
    <section className="panel ai-progression-panel">
      <div className="ai-progression-header">
        <div>
          <p className="eyebrow">{t("aiComposer")}</p>
          <h2>{t("aiTitle")}</h2>
          <p>{t("aiSubtitle")}</p>
        </div>
        <span className={`ai-status ai-status-${source ?? (keyMissing ? "missing" : "idle")}`}>
          {isLoading ? <Loader2 size={15} aria-hidden="true" className="spin" /> : <WandSparkles size={15} aria-hidden="true" />}
          {statusLabel()}
        </span>
      </div>

      <section className="style-template-panel" aria-label={t("styleTemplates")}>
        <div className="style-template-heading">
          <div>
            <p className="eyebrow">{t("styleTemplates")}</p>
            <h3>{t("styleTemplatesTitle")}</h3>
          </div>
          <span>{t("styleTemplatesHint")}</span>
        </div>
        <div className="style-template-grid">
          {STYLE_TEMPLATES.map((template) => (
            <button key={template.id} type="button" onClick={() => setInput(template.prompt)}>
              <strong>{template.title}</strong>
              <span>{template.subtitle}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="api-key-card api-key-card-compact">
        <div className="api-key-copy">
          <span className={`api-key-badge ${apiKeyStatus.configured ? "configured" : "missing"}`}>
            <KeyRound size={15} aria-hidden="true" />
            {apiKeyStatus.configured
              ? `${t("deepseekKeyConfigured")}: ${apiKeyStatus.maskedKey ?? ""}`
              : t("demoModeReady")}
          </span>
          <p>{apiKeyStatus.configured ? t("deepseekKeyHelp") : t("demoModeHelp")}</p>
          <button type="button" className="audio-button api-settings-toggle" onClick={() => setShowApiSettings((value) => !value)}>
            <Settings2 size={16} aria-hidden="true" />
            {t("aiSettings")}
          </button>
        </div>
        {showApiSettings ? (
          <>
            <div className="api-key-actions">
              <input
                value={apiKeyInput}
                onChange={(event) => setApiKeyInput(event.target.value)}
                placeholder={t("deepseekKeyPlaceholder")}
                type="password"
                autoComplete="off"
                disabled={!isDesktopRuntime || isApiKeyBusy}
              />
              <button type="button" className="secondary-button" onClick={handleSaveApiKey} disabled={!isDesktopRuntime || isApiKeyBusy}>
                <Save size={16} aria-hidden="true" />
                {t("deepseekKeySave")}
              </button>
              <button
                type="button"
                className="audio-button"
                onClick={handleTestApiKey}
                disabled={!isDesktopRuntime || isApiKeyBusy || (!apiKeyInput.trim() && !apiKeyStatus.configured)}
              >
                {isApiKeyBusy ? <Loader2 size={16} aria-hidden="true" className="spin" /> : <WandSparkles size={16} aria-hidden="true" />}
                {t("deepseekKeyTest")}
              </button>
              <button type="button" className="audio-button" onClick={handleClearApiKey} disabled={!isDesktopRuntime || isApiKeyBusy || apiKeyStatus.source !== "saved"}>
                <Trash2 size={16} aria-hidden="true" />
                {t("deepseekKeyClear")}
              </button>
            </div>
            {apiKeyNotice ? <p className="api-key-notice">{apiKeyNotice}</p> : null}
          </>
        ) : null}
      </div>

      <form className="ai-progression-form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="ai-progression-input">
          {t("progressionInput")}
        </label>
        <div className="input-shell">
          <Music2 size={22} aria-hidden="true" />
          <input
            id="ai-progression-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t("progressionPlaceholder")}
            autoComplete="off"
          />
        </div>
        <button className="primary-button" type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 size={18} aria-hidden="true" className="spin" /> : <Sparkles size={18} aria-hidden="true" />}
          {t("generateStyleProgression")}
        </button>
        <button className="secondary-button" type="button" onClick={() => handleLocalFallback()} disabled={isLoading}>
          {t("useLocalFallback")}
        </button>
      </form>

      <div className="example-row ai-example-row" aria-label={t("progressionExamples")}>
        {examples.map((example) => (
          <button key={example} type="button" onClick={() => handleLocalFallback(example)}>
            {example}
          </button>
        ))}
      </div>

      {error ? <p className="error-message">{error}</p> : null}
      {playbackError ? <p className="error-message">{playbackError}</p> : null}

      {localizedResult ? (
        <div className="ai-result">
          <div className="ai-summary">
            <strong>{summary}</strong>
            <span>{localizedResult.normalizedInput}</span>
          </div>

          {localizedResult.coach ? (
            <section className="coach-plan-card">
              <div className="coach-plan-heading">
                <div>
                  <p className="eyebrow">{t("aiPracticeCoach")}</p>
                  <h3>{localizedResult.coach.style}</h3>
                  <p>{localizedResult.coach.demoNarrative}</p>
                </div>
                <span className="playing-pill">
                  BPM {localizedResult.coach.startingBpm} / {localizedResult.coach.loopCount} {t("practiceLoop")}
                </span>
              </div>

              <div className="coach-plan-grid">
                <div>
                  <span>{t("coachRhythm")}</span>
                  <strong>{localizedResult.coach.rhythmPattern}</strong>
                </div>
                <div>
                  <span>{t("coachTempoRamp")}</span>
                  <strong>
                    {localizedResult.coach.startingBpm} BPM +{localizedResult.coach.bpmIncreasePerLoop} BPM
                  </strong>
                </div>
                <div>
                  <span>{t("barsPerChord")}</span>
                  <strong>{localizedResult.coach.barsPerChord}</strong>
                </div>
              </div>

              <ol className="coach-goals">
                {localizedResult.coach.goals.map((goal) => (
                  <li key={goal}>{goal}</li>
                ))}
              </ol>

              {onStartPractice ? (
                <button
                  type="button"
                  className="primary-button coach-start-button"
                  onClick={() =>
                    onStartPractice({
                      title: `${t("aiPracticeCoach")}: ${localizedResult.beginner.chords.map((chord) => chord.chord).join(" - ")}`,
                      chords: localizedResult.beginner.chords.map((chord) => chord.chord),
                      level: "beginner",
                      coach: localizedResult.coach,
                    })
                  }
                >
                  <Dumbbell size={18} aria-hidden="true" />
                  {t("startCoachPractice")}
                </button>
              ) : null}
            </section>
          ) : null}

          <div className="progression-version-grid">
            <ProgressionVersionCard
              level="beginner"
              version={localizedResult.beginner}
              coach={localizedResult.coach}
              playing={playing}
              bpm={bpm}
              timeSignature={timeSignature}
              onPlayVersion={handlePlayVersion}
              onStop={stopPlayback}
              onCopy={handleCopy}
              onPlayChord={handlePlayChord}
              onSelectChord={onSelectChord}
              onStartPractice={onStartPractice}
              onSaveProgression={onSaveProgression}
              tuningPitches={tuningPitches}
              labels={{ play: t("playBeginner"), stop: t("stop"), copy: t("copyChords"), practice: t("practiceThisProgression"), save: t("saveToLibrary"), functionLabel: t("functionLabel"), harmonicColor: t("harmonicColor"), useThisChord: t("useThisChord"), playSingle: t("play"), diagramUnavailable: t("diagramUnavailable") }}
            />
            <ProgressionVersionCard
              level="professional"
              version={localizedResult.professional}
              coach={localizedResult.coach}
              playing={playing}
              bpm={bpm}
              timeSignature={timeSignature}
              onPlayVersion={handlePlayVersion}
              onStop={stopPlayback}
              onCopy={handleCopy}
              onPlayChord={handlePlayChord}
              onSelectChord={onSelectChord}
              onStartPractice={onStartPractice}
              onSaveProgression={onSaveProgression}
              tuningPitches={tuningPitches}
              labels={{ play: t("playProfessional"), stop: t("stop"), copy: t("copyChords"), practice: t("practiceThisProgression"), save: t("saveToLibrary"), functionLabel: t("functionLabel"), harmonicColor: t("harmonicColor"), useThisChord: t("useThisChord"), playSingle: t("play"), diagramUnavailable: t("diagramUnavailable") }}
            />
          </div>

          {[...localizedResult.notes, ...localizedResult.warnings].length > 0 ? (
            <div className="ai-notes">
              {[...localizedResult.notes, ...localizedResult.warnings].map((note) => (
                <span key={note}>{note}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

type VersionCardProps = {
  level: ProgressionLevel;
  version: AIProgressionVersion;
  coach?: PracticeCoachPlan;
  playing: PlayingState | null;
  bpm: number;
  timeSignature: TimeSignature;
  onPlayVersion: (level: ProgressionLevel, chords: AIProgressionChord[]) => void;
  onStop: () => void;
  onCopy: (chords: AIProgressionChord[]) => void;
  onPlayChord: (chordName: string) => void;
  onSelectChord: (chordName: string) => void;
  onStartPractice?: (payload: { title: string; chords: string[]; level: ProgressionLevel; coach?: PracticeCoachPlan }) => void;
  onSaveProgression?: (payload: { title: string; chords: string[]; level: ProgressionLevel }) => void;
  tuningPitches: string[];
  labels: {
    play: string;
    stop: string;
    copy: string;
    practice: string;
    save: string;
    functionLabel: string;
    harmonicColor: string;
    useThisChord: string;
    playSingle: string;
    diagramUnavailable: string;
  };
};

function ProgressionVersionCard({
  level,
  version,
  coach,
  playing,
  bpm,
  timeSignature,
  onPlayVersion,
  onStop,
  onCopy,
  onPlayChord,
  onSelectChord,
  onStartPractice,
  onSaveProgression,
  tuningPitches,
  labels,
}: VersionCardProps) {
  const { t } = useI18n();
  const isPlaying = playing?.level === level;
  const chordLine = version.chords.map((chord) => chord.chord).join(" - ");

  return (
    <section className="progression-version-card">
      <div className="progression-version-heading">
        <div>
          <p className="eyebrow">{version.label}</p>
          <h3>{chordLine}</h3>
          <p>{version.description}</p>
        </div>
        {isPlaying ? (
          <span className="playing-pill">
            {t("playing")} {playing.chordName} · {t("beat")} {playing.beat} / {timeSignature.numerator} · {t("bar")} {playing.bar} · BPM {bpm} ·{" "}
            {timeSignature.numerator}/{timeSignature.denominator}
          </span>
        ) : null}
      </div>

      <div className="progression-toolbar">
        <button type="button" className="audio-button audio-button-primary" onClick={() => onPlayVersion(level, version.chords)}>
          <Play size={16} aria-hidden="true" />
          {labels.play}
        </button>
        <button type="button" className="audio-button" onClick={onStop}>
          <Square size={16} aria-hidden="true" />
          {labels.stop}
        </button>
        <button type="button" className="audio-button" onClick={() => onCopy(version.chords)}>
          <Copy size={16} aria-hidden="true" />
          {labels.copy}
        </button>
        {onStartPractice ? (
          <button
            type="button"
            className="audio-button"
            onClick={() =>
              onStartPractice({
                title: `${version.label}: ${chordLine}`,
                chords: version.chords.map((chord) => chord.chord),
                level,
                coach,
              })
            }
          >
            <Dumbbell size={16} aria-hidden="true" />
            {labels.practice}
          </button>
        ) : null}
        {onSaveProgression ? (
          <button
            type="button"
            className="audio-button"
            onClick={() =>
              onSaveProgression({
                title: `${version.label}: ${chordLine}`,
                chords: version.chords.map((chord) => chord.chord),
                level,
              })
            }
          >
            <Save size={16} aria-hidden="true" />
            {labels.save}
          </button>
        ) : null}
      </div>

      <div className="progression-chord-grid">
        {version.chords.map((chord, index) => (
          <ProgressionChordCard
            key={`${level}-${chord.chord}-${index}`}
            chord={chord}
            isActive={isPlaying && playing?.chordName === chord.chord}
            onPlayChord={onPlayChord}
            onSelectChord={onSelectChord}
            tuningPitches={tuningPitches}
            labels={labels}
          />
        ))}
      </div>
    </section>
  );
}

type ChordCardProps = {
  chord: AIProgressionChord;
  isActive: boolean;
  onPlayChord: (chordName: string) => void;
  onSelectChord: (chordName: string) => void;
  tuningPitches: string[];
  labels: VersionCardProps["labels"];
};

function ProgressionChordCard({ chord, isActive, onPlayChord, onSelectChord, tuningPitches, labels }: ChordCardProps) {
  const { language } = useI18n();
  const harmonicFunction = getHarmonicFunction(chord.degree, language);
  const diagram = useMemo(() => {
    try {
      const parsed = parseChordName(chord.chord);
      return {
        chordName: chord.chord,
        voicing: generateGuitarVoicing(parsed, tuningPitches),
        error: null,
      };
    } catch {
      return {
        chordName: chord.chord,
        voicing: null,
        error: labels.diagramUnavailable,
      };
    }
  }, [chord.chord, labels.diagramUnavailable, tuningPitches]);

  return (
    <article className={`progression-chord-card${isActive ? " active" : ""}`}>
      <div className="progression-chord-copy">
        <span className="degree-pill">{chord.roman || chord.degree}</span>
        <h4>{chord.chord}</h4>
        <p>
          <strong>{labels.functionLabel}</strong> {chord.function || labels.harmonicColor}
        </p>
        <p className="harmonic-explainer">
          <span>{harmonicFunction.label}</span>
          {harmonicFunction.detail}
        </p>
        <p>{chord.explanation}</p>
      </div>

      {diagram.voicing ? (
        <div className="progression-diagram">
          <FretboardDiagram chordName={diagram.chordName} voicing={diagram.voicing} tuningPitches={tuningPitches} />
        </div>
      ) : (
        <p className="diagram-error">{diagram.error}</p>
      )}

      <div className="progression-chord-actions">
        <button type="button" className="audio-button" onClick={() => onPlayChord(chord.chord)}>
          <Play size={16} aria-hidden="true" />
          {labels.playSingle}
        </button>
        <button type="button" className="secondary-button" onClick={() => onSelectChord(chord.chord)}>
          {labels.useThisChord}
        </button>
      </div>
    </article>
  );
}
