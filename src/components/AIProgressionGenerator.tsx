import { Copy, KeyRound, Loader2, Music2, Play, Save, Sparkles, Square, Trash2, WandSparkles } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
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
  ProgressionLevel,
} from "../types/progression";
import { generateGuitarVoicing } from "../utils/guitar";
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
  onBeat: (data: ProgressionPlaybackBeat) => void;
  onSelectChord: (chordName: string) => void;
};

type Source = "deepseek" | "fallback";

type PlayingState = {
  level: ProgressionLevel;
  chordName: string | null;
  beat: number;
  bar: number;
};

const EXAMPLES = [
  "D调4566",
  "C大调 1564",
  "G Major I-V-vi-IV",
  "A小调 6415",
  "D / IV-V-VI-VI",
  "E Dorian 1-4-5-1",
];

export function AIProgressionGenerator({
  bpm,
  timeSignature,
  countInBars,
  metronomeDuringPlayback,
  accentFirstBeat,
  onBeat,
  onSelectChord,
}: AIProgressionGeneratorProps) {
  const { t } = useI18n();
  const [input, setInput] = useState("D调4566");
  const [result, setResult] = useState<AIChordProgressionResult | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(hasDeepSeekRuntime() ? null : t("missingKey"));
  const [playing, setPlaying] = useState<PlayingState | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeyStatus, setApiKeyStatus] = useState<DeepSeekApiKeyStatus>({
    configured: false,
    source: "none",
  });
  const [apiKeyNotice, setApiKeyNotice] = useState<string | null>(null);
  const [isApiKeyBusy, setIsApiKeyBusy] = useState(false);

  const isDesktopRuntime = hasDeepSeekRuntime();
  const keyMissing = !isDesktopRuntime || !apiKeyStatus.configured;
  const summary = useMemo(() => {
    if (!result) return null;
    return `Key: ${result.key} · Mode: ${result.mode} · Degrees: ${result.degrees.join("-")}`;
  }, [result]);

  useEffect(() => {
    let ignore = false;

    async function loadApiKeyStatus() {
      if (!isDesktopRuntime) return;

      try {
        const status = await getDeepSeekApiKeyStatus();
        if (ignore) return;
        setApiKeyStatus(status);
        setError(status.configured ? null : t("missingKey"));
      } catch {
        if (!ignore) setError(t("missingKey"));
      }
    }

    void loadApiKeyStatus();

    return () => {
      ignore = true;
    };
  }, [isDesktopRuntime, t]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleGenerateWithDeepSeek();
  }

  async function handleGenerateWithDeepSeek() {
    if (!input.trim()) {
      setError(t("inputProgressionHint"));
      return;
    }

    if (keyMissing) {
      setError(t("missingKey"));
      return;
    }

    setIsLoading(true);
    setError(null);
    setPlaybackError(null);
    stopPlayback();

    try {
      const nextResult = await generateChordProgressionWithDeepSeek(input);
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
      setApiKeyNotice("Please enter a DeepSeek API key first.");
      return;
    }

    setIsApiKeyBusy(true);
    setApiKeyNotice(null);
    try {
      const status = await saveDeepSeekApiKey(apiKeyInput);
      setApiKeyStatus(status);
      setApiKeyInput("");
      setError(null);
      setApiKeyNotice("DeepSeek API key saved on this computer.");
    } catch {
      setApiKeyNotice("Could not save the API key.");
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
      setApiKeyNotice("DeepSeek API key test succeeded.");
    } catch {
      setApiKeyNotice("DeepSeek API key test failed. Please check the key and network.");
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
      setError(status.configured ? null : t("missingKey"));
      setApiKeyNotice("Saved DeepSeek API key cleared.");
    } catch {
      setApiKeyNotice("Could not clear the API key.");
    } finally {
      setIsApiKeyBusy(false);
    }
  }

  function handleLocalFallback(nextInput = input) {
    try {
      stopPlayback();
      const fallback = generateLocalFallbackProgression(nextInput, keyMissing ? t("missingKey") : undefined);
      setInput(nextInput);
      setResult(fallback);
      setSource("fallback");
      setError(keyMissing ? t("missingKey") : null);
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
      await playChordByName(chordName, { bpm, timeSignature, bars: 1 });
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
    return keyMissing ? t("deepseekMissingShort") : t("ready");
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

      <div className="api-key-card">
        <div className="api-key-copy">
          <span className={`api-key-badge ${apiKeyStatus.configured ? "configured" : "missing"}`}>
            <KeyRound size={15} aria-hidden="true" />
            {apiKeyStatus.configured
              ? `API key configured: ${apiKeyStatus.maskedKey ?? ""}`
              : "API key not configured"}
          </span>
          <p>Use your own DeepSeek API key. It is saved on this computer and sent by the desktop app, not bundled into the frontend.</p>
        </div>
        <div className="api-key-actions">
          <input
            value={apiKeyInput}
            onChange={(event) => setApiKeyInput(event.target.value)}
            placeholder="Paste your DeepSeek API key"
            type="password"
            autoComplete="off"
            disabled={!isDesktopRuntime || isApiKeyBusy}
          />
          <button type="button" className="secondary-button" onClick={handleSaveApiKey} disabled={!isDesktopRuntime || isApiKeyBusy}>
            <Save size={16} aria-hidden="true" />
            Save Key
          </button>
          <button
            type="button"
            className="audio-button"
            onClick={handleTestApiKey}
            disabled={!isDesktopRuntime || isApiKeyBusy || (!apiKeyInput.trim() && !apiKeyStatus.configured)}
          >
            {isApiKeyBusy ? <Loader2 size={16} aria-hidden="true" className="spin" /> : <WandSparkles size={16} aria-hidden="true" />}
            Test Key
          </button>
          <button type="button" className="audio-button" onClick={handleClearApiKey} disabled={!isDesktopRuntime || isApiKeyBusy || apiKeyStatus.source !== "saved"}>
            <Trash2 size={16} aria-hidden="true" />
            Clear Key
          </button>
        </div>
        {apiKeyNotice ? <p className="api-key-notice">{apiKeyNotice}</p> : null}
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
        <button className="primary-button" type="submit" disabled={isLoading || keyMissing}>
          {isLoading ? <Loader2 size={18} aria-hidden="true" className="spin" /> : <Sparkles size={18} aria-hidden="true" />}
          {t("generateWithDeepSeek")}
        </button>
        <button className="secondary-button" type="button" onClick={() => handleLocalFallback()} disabled={isLoading}>
          {t("useLocalFallback")}
        </button>
      </form>

      <div className="example-row ai-example-row" aria-label={t("progressionExamples")}>
        {EXAMPLES.map((example) => (
          <button key={example} type="button" onClick={() => handleLocalFallback(example)}>
            {example}
          </button>
        ))}
      </div>

      {error ? <p className="error-message">{error}</p> : null}
      {playbackError ? <p className="error-message">{playbackError}</p> : null}

      {result ? (
        <div className="ai-result">
          <div className="ai-summary">
            <strong>{summary}</strong>
            <span>{result.normalizedInput}</span>
          </div>

          <div className="progression-version-grid">
            <ProgressionVersionCard
              level="beginner"
              version={result.beginner}
              playing={playing}
              bpm={bpm}
              timeSignature={timeSignature}
              onPlayVersion={handlePlayVersion}
              onStop={stopPlayback}
              onCopy={handleCopy}
              onPlayChord={handlePlayChord}
              onSelectChord={onSelectChord}
              labels={{ play: t("playBeginner"), stop: t("stop"), copy: t("copyChords"), functionLabel: t("functionLabel"), harmonicColor: t("harmonicColor"), useThisChord: t("useThisChord"), playSingle: t("play"), diagramUnavailable: t("diagramUnavailable") }}
            />
            <ProgressionVersionCard
              level="professional"
              version={result.professional}
              playing={playing}
              bpm={bpm}
              timeSignature={timeSignature}
              onPlayVersion={handlePlayVersion}
              onStop={stopPlayback}
              onCopy={handleCopy}
              onPlayChord={handlePlayChord}
              onSelectChord={onSelectChord}
              labels={{ play: t("playProfessional"), stop: t("stop"), copy: t("copyChords"), functionLabel: t("functionLabel"), harmonicColor: t("harmonicColor"), useThisChord: t("useThisChord"), playSingle: t("play"), diagramUnavailable: t("diagramUnavailable") }}
            />
          </div>

          {[...result.notes, ...result.warnings].length > 0 ? (
            <div className="ai-notes">
              {[...result.notes, ...result.warnings].map((note) => (
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
  playing: PlayingState | null;
  bpm: number;
  timeSignature: TimeSignature;
  onPlayVersion: (level: ProgressionLevel, chords: AIProgressionChord[]) => void;
  onStop: () => void;
  onCopy: (chords: AIProgressionChord[]) => void;
  onPlayChord: (chordName: string) => void;
  onSelectChord: (chordName: string) => void;
  labels: {
    play: string;
    stop: string;
    copy: string;
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
  playing,
  bpm,
  timeSignature,
  onPlayVersion,
  onStop,
  onCopy,
  onPlayChord,
  onSelectChord,
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
      </div>

      <div className="progression-chord-grid">
        {version.chords.map((chord, index) => (
          <ProgressionChordCard
            key={`${level}-${chord.chord}-${index}`}
            chord={chord}
            isActive={isPlaying && playing?.chordName === chord.chord}
            onPlayChord={onPlayChord}
            onSelectChord={onSelectChord}
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
  labels: VersionCardProps["labels"];
};

function ProgressionChordCard({ chord, isActive, onPlayChord, onSelectChord, labels }: ChordCardProps) {
  const diagram = useMemo(() => {
    try {
      const parsed = parseChordName(chord.chord);
      return {
        chordName: chord.chord,
        voicing: generateGuitarVoicing(parsed),
        error: null,
      };
    } catch {
      return {
        chordName: chord.chord,
        voicing: null,
        error: labels.diagramUnavailable,
      };
    }
  }, [chord.chord, labels.diagramUnavailable]);

  return (
    <article className={`progression-chord-card${isActive ? " active" : ""}`}>
      <div className="progression-chord-copy">
        <span className="degree-pill">{chord.roman || chord.degree}</span>
        <h4>{chord.chord}</h4>
        <p>
          <strong>{labels.functionLabel}</strong> {chord.function || labels.harmonicColor}
        </p>
        <p>{chord.explanation}</p>
      </div>

      {diagram.voicing ? (
        <div className="progression-diagram">
          <FretboardDiagram chordName={diagram.chordName} voicing={diagram.voicing} />
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
