import { Headphones, Music, Radio, Volume2, Waves } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { TimeSignature } from "../types/metronome";
import type { AudioStatus, GuitarVoicing, ParsedChord, SynthPreset } from "../types/music";
import { createOrUpdateSynth, ensureAudioStarted, playChord, playStrum } from "../utils/audioEngine";
import { voicingToPlayableNotes } from "../utils/guitar";
import { getChordDurationMs } from "../utils/metronomeEngine";
import { toPlayableChordNotes } from "../utils/musicTheory";

type AudioControlsProps = {
  parsedChord: ParsedChord | null;
  voicing: GuitarVoicing | null;
  bpm: number;
  timeSignature: TimeSignature;
  tuningPitches?: string[];
};

export function AudioControls({ parsedChord, voicing, bpm, timeSignature, tuningPitches }: AudioControlsProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<AudioStatus>("locked");
  const [preset, setPreset] = useState<SynthPreset>("warm");
  const [volumeDb, setVolumeDb] = useState(-10);
  const [error, setError] = useState<string | null>(null);
  const readyTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (readyTimer.current) window.clearTimeout(readyTimer.current);
    };
  }, []);

  async function handleEnableAudio() {
    try {
      setError(null);
      await ensureAudioStarted();
      createOrUpdateSynth(preset, volumeDb);
      setStatus("ready");
    } catch {
      setStatus("error");
      setError(t("audioStartFailed"));
    }
  }

  async function handlePlayChord() {
    const notes = getChordNotes();
    if (!notes) return;

    await runPlayback(() => playChord(notes, { duration: getChordDurationMs(bpm, timeSignature) / 1000, preset, volumeDb }));
  }

  async function handleStrum(direction: "down" | "up") {
    const notes = getStrumNotes();
    if (!notes) return;

    await runPlayback(() => playStrum(notes, { direction, preset, volumeDb }));
  }

  function getChordNotes(): string[] | null {
    if (!parsedChord) {
      setError(t("noChordSelected"));
      return null;
    }

    const notes = toPlayableChordNotes(parsedChord.notes, parsedChord.root);
    if (notes.length === 0) {
      setError(t("noPlayableNotes"));
      return null;
    }

    return notes;
  }

  function getStrumNotes(): string[] | null {
    if (!parsedChord) {
      setError(t("noChordSelected"));
      return null;
    }

    const voicingNotes = voicing ? voicingToPlayableNotes(voicing, tuningPitches) : [];
    const notes =
      voicingNotes.length > 0 ? voicingNotes : toPlayableChordNotes(parsedChord.notes, parsedChord.root);

    if (notes.length === 0) {
      setError(t("noPlayableNotes"));
      return null;
    }

    return notes;
  }

  async function runPlayback(play: () => Promise<void>) {
    const wasLocked = status === "locked";
    try {
      setError(null);
      if (wasLocked) {
        await ensureAudioStarted();
        createOrUpdateSynth(preset, volumeDb);
        setStatus("ready");
      }
      setStatus("playing");
      await play();
      if (readyTimer.current) window.clearTimeout(readyTimer.current);
      readyTimer.current = window.setTimeout(() => setStatus("ready"), 1050);
    } catch {
      setStatus("error");
      setError(wasLocked ? t("audioStartFailed") : t("playbackFailedTryAgain"));
    }
  }

  const disabled = !parsedChord || status === "playing";
  const statusLabels: Record<AudioStatus, string> = {
    locked: t("audioLocked"),
    ready: t("audioReady"),
    playing: t("playing"),
    error: t("audioError"),
  };

  return (
    <section className="panel audio-card">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{t("audioAudition")}</p>
          <h2>{t("hearChord")}</h2>
        </div>
        <span className={`audio-status audio-status-${status}`}>
          <Radio size={15} aria-hidden="true" />
          {statusLabels[status]}
        </span>
      </div>

      {!parsedChord ? <p className="audio-empty">{t("noChordSelected")}</p> : null}
      <p className="audio-empty audio-follow-meta">
        {t("audioFollows")} {bpm} BPM · {timeSignature.numerator}/{timeSignature.denominator}
      </p>

      <div className="audio-controls">
        <button type="button" className="audio-button" onClick={handleEnableAudio}>
          <Headphones size={17} aria-hidden="true" />
          {t("enableAudio")}
        </button>
        <button
          type="button"
          className="audio-button audio-button-primary"
          disabled={disabled}
          onClick={handlePlayChord}
        >
          <Music size={17} aria-hidden="true" />
          {status === "playing" ? t("playing") : t("playChord")}
        </button>
        <button type="button" className="audio-button" disabled={disabled} onClick={() => handleStrum("down")}>
          <Waves size={17} aria-hidden="true" />
          {t("strumDown")}
        </button>
        <button type="button" className="audio-button" disabled={disabled} onClick={() => handleStrum("up")}>
          <Waves size={17} aria-hidden="true" />
          {t("strumUp")}
        </button>
      </div>

      <div className="audio-settings">
        <label>
          {t("tone")}
          <select className="audio-select" value={preset} onChange={(event) => setPreset(event.target.value as SynthPreset)}>
            <option value="warm">{t("warmSynth")}</option>
            <option value="bright">{t("brightSynth")}</option>
            <option value="soft">{t("softPad")}</option>
            <option value="fm">{t("fmKeys")}</option>
          </select>
        </label>
        <label>
          <span>
            <Volume2 size={15} aria-hidden="true" />
            {t("volume")} {volumeDb} dB
          </span>
          <input
            className="audio-slider"
            type="range"
            min="-30"
            max="0"
            step="1"
            value={volumeDb}
            onChange={(event) => setVolumeDb(Number(event.target.value))}
          />
        </label>
      </div>

      {error ? <p className="audio-error">{error}</p> : null}
    </section>
  );
}
