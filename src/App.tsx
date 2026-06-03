import { useEffect, useMemo, useRef, useState } from "react";
import { AudioControls } from "./components/AudioControls";
import { AIProgressionGenerator } from "./components/AIProgressionGenerator";
import { ChordInput } from "./components/ChordInput";
import { ChordSummary } from "./components/ChordSummary";
import { ChordVoicingGallery } from "./components/ChordVoicingGallery";
import { EditableChordDiagram } from "./components/EditableChordDiagram";
import { FretboardDiagram } from "./components/FretboardDiagram";
import { LanguageToggle } from "./components/LanguageToggle";
import { MetronomeControls } from "./components/MetronomeControls";
import { ScaleModeGenerator } from "./components/ScaleModeGenerator";
import { StaffViewer } from "./components/StaffViewer";
import { TabViewer } from "./components/TabViewer";
import type { TimeSignature } from "./types/metronome";
import type { GuitarVoicing, ParsedChord, ScaleMode } from "./types/music";
import { useI18n } from "./i18n";
import { clearSavedVoicing, generateGuitarVoicing, generateGuitarVoicings, saveVoicing } from "./utils/guitar";
import { normalizeTimeSignature, startMetronome, stopMetronome } from "./utils/metronomeEngine";
import { getDisplayChordName, parseChordName } from "./utils/musicTheory";
import { stopChordProgressionPlayback } from "./utils/progressionPlayback";

function App() {
  const { t } = useI18n();
  const [chordName, setChordName] = useState("C");
  const [parsedChord, setParsedChord] = useState<ParsedChord | null>(() => parseChordName("C"));
  const [voicing, setVoicing] = useState<GuitarVoicing | null>(() => generateGuitarVoicing(parseChordName("C")));
  const [voicings, setVoicings] = useState<GuitarVoicing[]>(() => generateGuitarVoicings(parseChordName("C")));
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState("C");
  const [selectedMode, setSelectedMode] = useState<ScaleMode>("Major");
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [bpm, setBpm] = useState(90);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>({ numerator: 4, denominator: 4 });
  const [isMetronomeRunning, setIsMetronomeRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(1);
  const [currentBar, setCurrentBar] = useState(1);
  const [accentFirstBeat, setAccentFirstBeat] = useState(true);
  const [countInBars, setCountInBars] = useState(0);
  const [metronomeDuringPlayback, setMetronomeDuringPlayback] = useState(true);
  const [metronomeError, setMetronomeError] = useState<string | null>(null);
  const metronomeSettingsKey = useMemo(
    () => `${bpm}:${timeSignature.numerator}/${timeSignature.denominator}:${accentFirstBeat}`,
    [accentFirstBeat, bpm, timeSignature.denominator, timeSignature.numerator],
  );
  const activeMetronomeSettings = useRef("");

  const displayChordName = useMemo(
    () => (parsedChord ? getDisplayChordName(parsedChord) : chordName),
    [chordName, parsedChord],
  );

  function generateChord(nextName: string) {
    try {
      const parsed = parseChordName(nextName);
      const nextVoicings = generateGuitarVoicings(parsed);
      const nextVoicing = nextVoicings[0] ?? generateGuitarVoicing(parsed);
      setChordName(getDisplayChordName(parsed));
      setParsedChord(parsed);
      setVoicing(nextVoicing);
      setVoicings(nextVoicings);
      setError(null);
      setSaveNotice(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sorry, this chord is not supported yet.");
    }
  }

  function handleVoicingChange(nextVoicing: GuitarVoicing) {
    setVoicing(nextVoicing);
    setSaveNotice(null);
  }

  function handleSaveShape() {
    if (!voicing || !parsedChord) return;
    saveVoicing(displayChordName, voicing);
    setVoicings(generateGuitarVoicings(parsedChord));
    setSaveNotice(`${displayChordName} ${t("savedShape")}`);
  }

  function handleResetShape() {
    if (!parsedChord) return;
    clearSavedVoicing(displayChordName);
    const nextVoicings = generateGuitarVoicings(parsedChord);
    setVoicings(nextVoicings);
    setVoicing(nextVoicings[0] ?? generateGuitarVoicing(parsedChord));
    setSaveNotice(`${displayChordName} ${t("resetShape")}`);
  }

  async function handleStartMetronome() {
    try {
      setMetronomeError(null);
      stopChordProgressionPlayback();
      activeMetronomeSettings.current = metronomeSettingsKey;
      await startMetronome({
        bpm,
        timeSignature,
        accentFirstBeat,
        onTick: ({ beat, bar }) => {
          setCurrentBeat(beat);
          setCurrentBar(bar);
        },
      });
      setIsMetronomeRunning(true);
    } catch {
      setIsMetronomeRunning(false);
      setMetronomeError(t("metronomeStartFailed"));
    }
  }

  function handleStopMetronome() {
    stopMetronome();
    stopChordProgressionPlayback();
    setIsMetronomeRunning(false);
    setCurrentBeat(1);
    setCurrentBar(1);
    activeMetronomeSettings.current = "";
  }

  function handleTimeSignatureChange(nextTimeSignature: TimeSignature) {
    setTimeSignature(normalizeTimeSignature(nextTimeSignature));
    setCurrentBeat(1);
    setCurrentBar(1);
  }

  useEffect(() => {
    generateChord(chordName);
  }, []);

  useEffect(() => {
    if (!isMetronomeRunning || activeMetronomeSettings.current === metronomeSettingsKey) return;

    void handleStartMetronome();
  }, [isMetronomeRunning, metronomeSettingsKey]);

  useEffect(() => {
    return () => {
      stopMetronome();
      stopChordProgressionPlayback();
    };
  }, []);

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <LanguageToggle />
      <header className="hero">
        <div>
          <p className="eyebrow">{t("heroEyebrow")}</p>
          <h1>{t("heroTitle")}</h1>
          <p>{t("heroSubtitle")}</p>
        </div>
        <div className="waveform" aria-hidden="true">
          {Array.from({ length: 26 }).map((_, index) => (
            <span key={index} style={{ animationDelay: `${index * 42}ms` }} />
          ))}
        </div>
      </header>

      <ChordInput value={chordName} error={error} onGenerate={generateChord} />

      <AIProgressionGenerator
        bpm={bpm}
        timeSignature={timeSignature}
        countInBars={countInBars}
        metronomeDuringPlayback={metronomeDuringPlayback}
        accentFirstBeat={accentFirstBeat}
        onBeat={({ beat, bar }) => {
          setCurrentBeat(beat);
          setCurrentBar(bar);
        }}
        onSelectChord={generateChord}
      />

      {parsedChord && voicing ? (
        <>
          <div className="dashboard-grid">
            <div className="left-rail">
              <ChordSummary parsedChord={parsedChord} />
              <AudioControls parsedChord={parsedChord} voicing={voicing} bpm={bpm} timeSignature={timeSignature} />
              <MetronomeControls
                bpm={bpm}
                timeSignature={timeSignature}
                isRunning={isMetronomeRunning}
                currentBeat={currentBeat}
                currentBar={currentBar}
                accentFirstBeat={accentFirstBeat}
                countInBars={countInBars}
                metronomeDuringPlayback={metronomeDuringPlayback}
                onBpmChange={setBpm}
                onTimeSignatureChange={handleTimeSignatureChange}
                onStart={handleStartMetronome}
                onStop={handleStopMetronome}
                onAccentFirstBeatChange={setAccentFirstBeat}
                onCountInBarsChange={setCountInBars}
                onMetronomeDuringPlaybackChange={setMetronomeDuringPlayback}
              />
              {metronomeError ? <p className="audio-error">{metronomeError}</p> : null}
              <ScaleModeGenerator
                selectedKey={selectedKey}
                selectedMode={selectedMode}
                onKeyChange={setSelectedKey}
                onModeChange={setSelectedMode}
                onSelectChord={generateChord}
              />
            </div>
            <div className="right-rail">
              <StaffViewer parsedChord={parsedChord} />
              <div className="visual-grid">
                <TabViewer voicing={voicing} />
                <FretboardDiagram chordName={displayChordName} voicing={voicing} />
              </div>
              <ChordVoicingGallery
                chordName={displayChordName}
                voicings={voicings}
                selectedVoicing={voicing}
                onSelect={setVoicing}
              />
            </div>
          </div>
          <EditableChordDiagram
            chordName={displayChordName}
            voicing={voicing}
            onChange={handleVoicingChange}
            onSave={handleSaveShape}
            onReset={handleResetShape}
          />
          {saveNotice ? <p className="save-notice">{saveNotice}</p> : null}
        </>
      ) : (
        <section className="panel empty-state">
          <h2>{t("noPlayableShapeTitle")}</h2>
          <p>{t("noPlayableShapeHint")}</p>
        </section>
      )}
    </main>
  );
}

export default App;
