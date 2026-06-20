import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Settings2 } from "lucide-react";
import { LanguageToggle } from "./components/LanguageToggle";
import { UserMenu } from "./components/auth/UserMenu";
import { DEFAULT_SONG_ARRANGEMENT_TEMPLATES } from "./data/songArrangementTemplates";
import { useProgressSync } from "./hooks/useProgressSync";
import { ChordPage } from "./pages/ChordPage";
import { HomePage } from "./pages/HomePage";
import { LearningDataPage } from "./pages/LearningDataPage";
import { MetronomePage } from "./pages/MetronomePage";
import { PracticePage } from "./pages/PracticePage";
import { SongArrangerPage } from "./pages/SongArrangerPage";
import { TunerPage } from "./pages/TunerPage";
import type { AppPage } from "./pages/pageTypes";
import type { MetronomeSoundPreset, TimeSignature } from "./types/metronome";
import type { GuitarVoicing, ParsedChord, ScaleMode } from "./types/music";
import type { PracticePlan } from "./types/practice";
import type { PracticeCoachPlan, ProgressionLevel } from "./types/progression";
import type { SongArrangement, SongPracticeLyricRow } from "./types/songArrangement";
import type { TuningPreset, TuningPresetId } from "./types/tuner";
import type { MoChordProgress } from "./types/progress";
import { useI18n } from "./i18n";
import { clearSavedVoicing, generateGuitarVoicing, generateGuitarVoicings, saveVoicing } from "./utils/guitar";
import {
  deleteSavedLibraryItem,
  loadSavedLibraryItems,
  saveLibraryItem,
  type SavedLibraryItem,
} from "./utils/library";
import { normalizeTimeSignature, startMetronome, stopMetronome } from "./utils/metronomeEngine";
import { getDisplayChordName, parseChordName } from "./utils/musicTheory";
import { getArrangementPracticeCoachCopy } from "./utils/practiceDisplay";
import { stopChordProgressionPlayback } from "./utils/progressionPlayback";
import { createPracticePlanFromChords, parsePracticeInput } from "./utils/practiceMode";
import { expandArrangementToPracticeChords } from "./utils/songArrangement";
import { localizeSongArrangementForLanguage } from "./utils/songArrangementLocalization";
import {
  getHomePracticeSummary,
  getLearningDataSummary,
  type HomePracticeSummary,
  type LearningDataSessionSummary,
  type LearningDataSummary,
  type RecentPracticeSessionSummary,
} from "./utils/practiceStats";
import { buildLocalProgressSnapshot } from "./services/progressService";
import { buildStoredTuningPresets, buildTuningTargets } from "./utils/tunerEngine";
import {
  DEFAULT_WORKSPACE_STATE,
  loadWorkspaceState,
  saveWorkspaceState,
  updateRecentChord,
  updateRecentProgression,
} from "./utils/workspaceState";

type MetronomeStartOptions = {
  preset?: MetronomeSoundPreset;
  volumeDb?: number;
  accentVolumeDb?: number;
};

function App() {
  const { language, t } = useI18n();
  const initialWorkspace = useMemo(() => loadWorkspaceState(), []);
  const initialStoredTuningPresets = useMemo<TuningPreset[]>(() => readStoredTuningPresets(), []);
  const initialTuningPitches = useMemo(
    () =>
      getTuningPitches(
        initialWorkspace.tuningPresetId,
        initialWorkspace.referenceA,
        initialWorkspace.customPitches,
        initialStoredTuningPresets,
      ),
    [initialStoredTuningPresets, initialWorkspace.customPitches, initialWorkspace.referenceA, initialWorkspace.tuningPresetId],
  );
  const initialParsedChord = useMemo(() => parseChordName(initialWorkspace.chordName), [initialWorkspace.chordName]);
  const [activePage, setActivePage] = useState<AppPage>(initialWorkspace.activePage);
  const [storedTuningPresets, setStoredTuningPresets] = useState<TuningPreset[]>(initialStoredTuningPresets);
  const [tuningPresetId, setTuningPresetId] = useState<TuningPresetId>(initialWorkspace.tuningPresetId);
  const [customPitches, setCustomPitches] = useState<string[]>(initialWorkspace.customPitches);
  const [referenceA, setReferenceA] = useState(initialWorkspace.referenceA);
  const [libraryItems, setLibraryItems] = useState<SavedLibraryItem[]>(() => loadSavedLibraryItems());
  const [currentArrangement, setCurrentArrangement] = useState<SongArrangement>(() =>
    localizeSongArrangementForLanguage(DEFAULT_SONG_ARRANGEMENT_TEMPLATES[0], language),
  );
  const [homePracticeSummary, setHomePracticeSummary] = useState<HomePracticeSummary>(() =>
    getHomePracticeSummary(undefined, { savedItemCount: 0 }),
  );
  const [learningDataSummary, setLearningDataSummary] = useState<LearningDataSummary>(() => getLearningDataSummary());
  const [recentChords, setRecentChords] = useState<string[]>(initialWorkspace.recentChords);
  const [recentProgressions, setRecentProgressions] = useState<string[]>(initialWorkspace.recentProgressions);
  const [chordName, setChordName] = useState(initialWorkspace.chordName);
  const [parsedChord, setParsedChord] = useState<ParsedChord | null>(initialParsedChord);
  const [voicing, setVoicing] = useState<GuitarVoicing | null>(() => generateGuitarVoicing(initialParsedChord, initialTuningPitches));
  const [voicings, setVoicings] = useState<GuitarVoicing[]>(() => generateGuitarVoicings(initialParsedChord, 12, initialTuningPitches));
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState(initialWorkspace.selectedKey);
  const [selectedMode, setSelectedMode] = useState<ScaleMode>(initialWorkspace.selectedMode);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [bpm, setBpm] = useState(initialWorkspace.bpm);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(initialWorkspace.timeSignature);
  const [isMetronomeRunning, setIsMetronomeRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(1);
  const [currentBar, setCurrentBar] = useState(1);
  const [accentFirstBeat, setAccentFirstBeat] = useState(initialWorkspace.accentFirstBeat);
  const [countInBars, setCountInBars] = useState(initialWorkspace.countInBars);
  const [metronomeDuringPlayback, setMetronomeDuringPlayback] = useState(initialWorkspace.metronomeDuringPlayback);
  const [metronomeError, setMetronomeError] = useState<string | null>(null);
  const [practicePlan, setPracticePlan] = useState<PracticePlan>(() => parsePracticeInput(recentProgressions[0] ?? "D\u8c034566"));
  const metronomeSettingsKey = useMemo(
    () => `${bpm}:${timeSignature.numerator}/${timeSignature.denominator}:${accentFirstBeat}`,
    [accentFirstBeat, bpm, timeSignature.denominator, timeSignature.numerator],
  );
  const activeMetronomeSettings = useRef("");
  const metronomeStartOptions = useRef<MetronomeStartOptions>({});
  const currentTuningPitches = useMemo(
    () => getTuningPitches(tuningPresetId, referenceA, customPitches, storedTuningPresets),
    [customPitches, referenceA, storedTuningPresets, tuningPresetId],
  );

  const displayChordName = useMemo(
    () => (parsedChord ? getDisplayChordName(parsedChord) : chordName),
    [chordName, parsedChord],
  );
  const progressSnapshot = useMemo<MoChordProgress>(
    () => ({
      ...buildLocalProgressSnapshot(localStorage),
      updatedAt: new Date().toISOString(),
      workspace: {
        activePage,
        chordName,
        bpm,
        timeSignature,
        accentFirstBeat,
        countInBars,
        metronomeDuringPlayback,
        selectedKey,
        selectedMode,
        tuningPresetId,
        customPitches,
        referenceA,
        recentChords,
        recentProgressions,
      },
      libraryItems,
    }),
    [
      accentFirstBeat,
      activePage,
      bpm,
      chordName,
      countInBars,
      customPitches,
      libraryItems,
      metronomeDuringPlayback,
      recentChords,
      recentProgressions,
      referenceA,
      selectedKey,
      selectedMode,
      timeSignature,
      tuningPresetId,
    ],
  );
  const handleRemoteProgress = useCallback((progress: MoChordProgress) => {
    const nextWorkspace = loadWorkspaceState(localStorage);
    const nextStoredTuningPresets = buildStoredTuningPresets(localStorage);
    const nextTuningPitches = getTuningPitches(
      nextWorkspace.tuningPresetId,
      nextWorkspace.referenceA,
      nextWorkspace.customPitches,
      nextStoredTuningPresets,
    );
    const nextParsedChord = parseSafeChord(nextWorkspace.chordName);

    setActivePage(nextWorkspace.activePage);
    setChordName(nextWorkspace.chordName);
    setParsedChord(nextParsedChord);
    setVoicings(generateGuitarVoicings(nextParsedChord, 12, nextTuningPitches));
    setVoicing(generateGuitarVoicing(nextParsedChord, nextTuningPitches));
    setBpm(nextWorkspace.bpm);
    setTimeSignature(nextWorkspace.timeSignature);
    setAccentFirstBeat(nextWorkspace.accentFirstBeat);
    setCountInBars(nextWorkspace.countInBars);
    setMetronomeDuringPlayback(nextWorkspace.metronomeDuringPlayback);
    setSelectedKey(nextWorkspace.selectedKey);
    setSelectedMode(nextWorkspace.selectedMode);
    setTuningPresetId(nextWorkspace.tuningPresetId);
    setCustomPitches(nextWorkspace.customPitches);
    setReferenceA(nextWorkspace.referenceA);
    setRecentChords(nextWorkspace.recentChords);
    setRecentProgressions(nextWorkspace.recentProgressions);
    setStoredTuningPresets(nextStoredTuningPresets);
    setLibraryItems(loadSavedLibraryItems(localStorage));
    setHomePracticeSummary(getHomePracticeSummary(localStorage, { savedItemCount: progress.libraryItems?.length ?? 0 }));
    setLearningDataSummary(getLearningDataSummary(localStorage));
  }, []);
  const progressSync = useProgressSync({
    progress: progressSnapshot,
    onRemoteProgress: handleRemoteProgress,
    debounceMs: 1000,
  });

  function generateChord(nextName: string) {
    try {
      const parsed = parseChordName(nextName);
      const nextVoicings = generateGuitarVoicings(parsed, 12, currentTuningPitches);
      const nextVoicing = nextVoicings[0] ?? generateGuitarVoicing(parsed, currentTuningPitches);
      setChordName(getDisplayChordName(parsed));
      setParsedChord(parsed);
      setVoicing(nextVoicing);
      setVoicings(nextVoicings);
      setRecentChords((current) =>
        updateRecentChord({ ...DEFAULT_WORKSPACE_STATE, recentChords: current }, getDisplayChordName(parsed)).recentChords,
      );
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
    saveVoicing(displayChordName, voicing, currentTuningPitches);
    setVoicings(generateGuitarVoicings(parsedChord, 12, currentTuningPitches));
    setSaveNotice(`${displayChordName} ${t("savedShape")}`);
  }

  function handleResetShape() {
    if (!parsedChord) return;
    clearSavedVoicing(displayChordName, currentTuningPitches);
    const nextVoicings = generateGuitarVoicings(parsedChord, 12, currentTuningPitches);
    setVoicings(nextVoicings);
    setVoicing(nextVoicings[0] ?? generateGuitarVoicing(parsedChord, currentTuningPitches));
    setSaveNotice(`${displayChordName} ${t("resetShape")}`);
  }

  async function handleStartMetronome(options?: MetronomeStartOptions) {
    try {
      if (options) {
        metronomeStartOptions.current = options;
      }
      setMetronomeError(null);
      stopChordProgressionPlayback();
      activeMetronomeSettings.current = metronomeSettingsKey;
      await startMetronome({
        bpm,
        timeSignature,
        accentFirstBeat,
        ...metronomeStartOptions.current,
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

  function handleStartPractice(payload: { title: string; chords: string[]; level: ProgressionLevel; coach?: PracticeCoachPlan }) {
    const nextPlan = createPracticePlanFromChords(payload.title, payload.chords, "ai", payload.level, payload.coach);
    setPracticePlan(nextPlan);
    if (payload.coach) {
      setBpm(payload.coach.startingBpm);
    }
    setRecentProgressions((current) =>
      updateRecentProgression({ ...DEFAULT_WORKSPACE_STATE, recentProgressions: current }, payload.chords.join(" - ")).recentProgressions,
    );
    if (nextPlan.chords[0]) {
      generateChord(nextPlan.chords[0]);
    }
    setActivePage("practice");
  }

  function handlePracticePlanChange(plan: PracticePlan) {
    setPracticePlan(plan);
    setRecentProgressions((current) =>
      updateRecentProgression({ ...DEFAULT_WORKSPACE_STATE, recentProgressions: current }, plan.chords.join(" - ")).recentProgressions,
    );
  }

  function handleSaveProgression(payload: { title: string; chords: string[]; level: ProgressionLevel }) {
    const saved = saveLibraryItem(localStorage, {
      type: "progression",
      title: payload.title,
      chords: payload.chords,
      level: payload.level,
      source: "ai",
    });
    setLibraryItems((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    setRecentProgressions((current) =>
      updateRecentProgression({ ...DEFAULT_WORKSPACE_STATE, recentProgressions: current }, payload.chords.join(" - ")).recentProgressions,
    );
  }

  function handleSavePracticePlan(plan: PracticePlan) {
    const saved = saveLibraryItem(localStorage, {
      type: "practice",
      title: plan.title,
      chords: plan.chords,
      lyricRows: plan.lyricRows,
      level: plan.level,
      source: plan.source,
      coach: plan.coach,
    });
    setLibraryItems((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    setRecentProgressions((current) =>
      updateRecentProgression({ ...DEFAULT_WORKSPACE_STATE, recentProgressions: current }, plan.chords.join(" - ")).recentProgressions,
    );
  }

  function handlePracticeArrangement(payload: {
    title: string;
    chords: string[];
    lyricRows?: SongPracticeLyricRow[];
    bpm: number;
    timeSignature: string;
    barsPerChord: number;
    loopCount: number;
  }) {
    const arrangementCoachCopy = getArrangementPracticeCoachCopy(language);
    const coach: PracticeCoachPlan = {
      style: currentArrangement.title,
      skillLevel: currentArrangement.difficulty,
      rhythmPattern: arrangementCoachCopy.rhythmPattern,
      startingBpm: payload.bpm,
      barsPerChord: payload.barsPerChord,
      loopCount: 1,
      bpmIncreasePerLoop: 0,
      goals: arrangementCoachCopy.goals,
      demoNarrative: arrangementCoachCopy.demoNarrative,
    };
    const nextPlan = createPracticePlanFromChords(
      payload.title,
      payload.chords,
      "manual",
      getPracticeLevelFromArrangement(currentArrangement),
      coach,
      payload.lyricRows,
    );
    const [numerator, denominator] = payload.timeSignature.split("/").map(Number);
    setPracticePlan(nextPlan);
    setBpm(payload.bpm);
    handleTimeSignatureChange({ numerator, denominator });
    setRecentProgressions((current) =>
      updateRecentProgression({ ...DEFAULT_WORKSPACE_STATE, recentProgressions: current }, payload.chords.join(" - ")).recentProgressions,
    );
    if (payload.chords[0]) {
      generateChord(payload.chords[0]);
    }
    setActivePage("practice");
  }

  function handleSaveArrangement(arrangement: SongArrangement) {
    const saved = saveLibraryItem(localStorage, {
      id: arrangement.id,
      type: "arrangement",
      title: arrangement.title,
      chords: expandArrangementToPracticeChords(arrangement),
      level: getPracticeLevelFromArrangement(arrangement),
      source: "manual",
      arrangement,
    });
    setLibraryItems((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
  }

  function handleLoadLibraryItem(item: SavedLibraryItem) {
    if (item.type === "arrangement" && item.arrangement) {
      setCurrentArrangement(item.arrangement);
      setActivePage("arranger");
      return;
    }

    const nextPlan = createPracticePlanFromChords(item.title, item.chords, item.source, item.level, item.coach, item.lyricRows);
    setPracticePlan(nextPlan);
    if (item.chords[0]) generateChord(item.chords[0]);
    setRecentProgressions((current) =>
      updateRecentProgression({ ...DEFAULT_WORKSPACE_STATE, recentProgressions: current }, item.chords.join(" - ")).recentProgressions,
    );
    setActivePage("practice");
  }

  function handleResumeRecentPractice() {
    const recentSession = homePracticeSummary.recentSession;
    if (!recentSession) {
      setActivePage("practice");
      return;
    }

    restorePracticeSession(recentSession);
  }

  function handleResumeLearningSession(session: LearningDataSessionSummary) {
    restorePracticeSession(session);
  }

  function restorePracticeSession(session: RecentPracticeSessionSummary | LearningDataSessionSummary) {
    const nextPlan = createPracticePlanFromChords(session.title, session.chords, "manual", "beginner");
    setPracticePlan(nextPlan);
    setBpm(session.bpm);
    const [recentNumerator, recentDenominator] = session.timeSignatureLabel.split("/").map(Number);
    handleTimeSignatureChange({ numerator: recentNumerator, denominator: recentDenominator });
    if (session.chords[0]) generateChord(session.chords[0]);
    setRecentProgressions((current) =>
      updateRecentProgression({ ...DEFAULT_WORKSPACE_STATE, recentProgressions: current }, session.chords.join(" - ")).recentProgressions,
    );
    setActivePage("practice");
  }

  function handleDeleteLibraryItem(id: string) {
    deleteSavedLibraryItem(localStorage, id);
    setLibraryItems((current) => current.filter((item) => item.id !== id));
  }

  function refreshHomePracticeSummary() {
    setHomePracticeSummary(getHomePracticeSummary(localStorage, { savedItemCount: libraryItems.length }));
    setLearningDataSummary(getLearningDataSummary(localStorage));
  }

  function handleNavigate(nextPage: AppPage) {
    if ((activePage === "chords" || activePage === "practice") && nextPage !== activePage) {
      stopChordProgressionPlayback();
    }

    setActivePage(nextPage);
  }

  useEffect(() => {
    generateChord(chordName);
  }, []);

  useEffect(() => {
    if (!parsedChord) return;
    const nextVoicings = generateGuitarVoicings(parsedChord, 12, currentTuningPitches);
    setVoicings(nextVoicings);
    setVoicing(nextVoicings[0] ?? generateGuitarVoicing(parsedChord, currentTuningPitches));
    setSaveNotice(null);
  }, [currentTuningPitches, parsedChord]);

  useEffect(() => {
    saveWorkspaceState(localStorage, {
      activePage,
      chordName,
      bpm,
      timeSignature,
      accentFirstBeat,
      countInBars,
      metronomeDuringPlayback,
      selectedKey,
      selectedMode,
      tuningPresetId,
      customPitches,
      referenceA,
      recentChords,
      recentProgressions,
    });
  }, [
    accentFirstBeat,
    activePage,
    bpm,
    chordName,
    countInBars,
    customPitches,
    metronomeDuringPlayback,
    recentChords,
    recentProgressions,
    referenceA,
    selectedKey,
    selectedMode,
    timeSignature,
    tuningPresetId,
  ]);

  useEffect(() => {
    setHomePracticeSummary(getHomePracticeSummary(localStorage, { savedItemCount: libraryItems.length }));
    setLearningDataSummary(getLearningDataSummary(localStorage));
  }, [libraryItems.length]);

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
      <details className="app-utility-menu">
        <summary className="app-utility-summary" aria-label={language === "zh" ? "打开应用菜单" : "Open app menu"}>
          <Settings2 size={16} aria-hidden="true" />
          <span>{language === "zh" ? "菜单" : "Menu"}</span>
        </summary>
        <div className="app-utility-panel">
          <LanguageToggle />
          <UserMenu syncStatus={progressSync.status} syncError={progressSync.error} onRetrySync={progressSync.retry} />
        </div>
      </details>
      {activePage === "home" ? (
        <HomePage
          currentChordName={displayChordName}
          practicePlanTitle={practicePlan.title}
          bpm={bpm}
          referencePitchLabel={`A4 ${referenceA} Hz`}
          homeSummary={homePracticeSummary}
          recentProgression={recentProgressions[0] ?? practicePlan.chords.join(" - ")}
          recentArrangementTitle={libraryItems.find((item) => item.type === "arrangement")?.title ?? currentArrangement.title}
          onNavigate={handleNavigate}
          onResumeRecentPractice={handleResumeRecentPractice}
        />
      ) : null}

      {activePage === "chords" ? (
        <ChordPage
          chordName={chordName}
          parsedChord={parsedChord}
          voicing={voicing}
          voicings={voicings}
          displayChordName={displayChordName}
          error={error}
          selectedKey={selectedKey}
          selectedMode={selectedMode}
          saveNotice={saveNotice}
          bpm={bpm}
          timeSignature={timeSignature}
          countInBars={countInBars}
          metronomeDuringPlayback={metronomeDuringPlayback}
          accentFirstBeat={accentFirstBeat}
          tuningPitches={currentTuningPitches}
          tuningPresetId={tuningPresetId}
          storedTuningPresets={storedTuningPresets}
          recentChords={recentChords}
          onNavigate={handleNavigate}
          onTuningPresetIdChange={setTuningPresetId}
          onGenerateChord={generateChord}
          onVoicingChange={handleVoicingChange}
          onSelectVoicing={setVoicing}
          onSaveShape={handleSaveShape}
          onResetShape={handleResetShape}
          onSelectedKeyChange={setSelectedKey}
          onSelectedModeChange={setSelectedMode}
          onStartPractice={handleStartPractice}
          onSaveProgression={handleSaveProgression}
          onBeat={({ beat, bar }) => {
            setCurrentBeat(beat);
            setCurrentBar(bar);
          }}
        />
      ) : null}

      {activePage === "arranger" ? (
        <SongArrangerPage
          arrangement={currentArrangement}
          onArrangementChange={setCurrentArrangement}
          onNavigate={handleNavigate}
          onPracticeArrangement={handlePracticeArrangement}
          onSaveArrangement={handleSaveArrangement}
        />
      ) : null}

      {activePage === "practice" ? (
        <PracticePage
          plan={practicePlan}
          bpm={bpm}
          timeSignature={timeSignature}
          countInBars={countInBars}
          metronomeDuringPlayback={metronomeDuringPlayback}
          accentFirstBeat={accentFirstBeat}
          tuningPitches={currentTuningPitches}
          tuningPresetId={tuningPresetId}
          storedTuningPresets={storedTuningPresets}
          libraryItems={libraryItems}
          onNavigate={handleNavigate}
          onTuningPresetIdChange={setTuningPresetId}
          onPlanChange={handlePracticePlanChange}
          onSavePlan={handleSavePracticePlan}
          onLoadLibraryItem={handleLoadLibraryItem}
          onDeleteLibraryItem={handleDeleteLibraryItem}
          onBpmChange={setBpm}
          onTimeSignatureChange={handleTimeSignatureChange}
          onBeat={({ beat, bar }) => {
            setCurrentBeat(beat);
            setCurrentBar(bar);
          }}
          onSelectChord={generateChord}
          onPracticeStatsChange={refreshHomePracticeSummary}
        />
      ) : null}

      {activePage === "learning" ? (
        <LearningDataPage
          summary={learningDataSummary}
          homeSummary={homePracticeSummary}
          onNavigate={handleNavigate}
          onResumeSession={handleResumeLearningSession}
        />
      ) : null}

      {activePage === "metronome" ? (
        <MetronomePage
          bpm={bpm}
          timeSignature={timeSignature}
          isRunning={isMetronomeRunning}
          currentBeat={currentBeat}
          currentBar={currentBar}
          accentFirstBeat={accentFirstBeat}
          countInBars={countInBars}
          metronomeDuringPlayback={metronomeDuringPlayback}
          error={metronomeError}
          onNavigate={handleNavigate}
          onBpmChange={setBpm}
          onTimeSignatureChange={handleTimeSignatureChange}
          onStart={handleStartMetronome}
          onStop={handleStopMetronome}
          onAccentFirstBeatChange={setAccentFirstBeat}
          onCountInBarsChange={setCountInBars}
          onMetronomeDuringPlaybackChange={setMetronomeDuringPlayback}
        />
      ) : null}

      {activePage === "tuner" ? (
        <TunerPage
          chordName={displayChordName}
          voicing={voicing}
          presetId={tuningPresetId}
          customPitches={customPitches}
          referenceA={referenceA}
          storedTuningPresets={storedTuningPresets}
          onNavigate={handleNavigate}
          onPresetIdChange={setTuningPresetId}
          onCustomPitchesChange={setCustomPitches}
          onReferenceAChange={setReferenceA}
          onStoredTuningPresetsChange={setStoredTuningPresets}
        />
      ) : null}
    </main>
  );
}

function readStoredTuningPresets(): TuningPreset[] {
  if (typeof localStorage === "undefined") return [];
  return buildStoredTuningPresets(localStorage);
}

function getTuningPitches(
  presetId: TuningPresetId,
  referenceA: number,
  customPitches: string[],
  storedTuningPresets: TuningPreset[],
): string[] {
  return buildTuningTargets(presetId, referenceA, customPitches, storedTuningPresets).map(
    (target) => `${target.note}${target.octave}`,
  );
}

function parseSafeChord(chordName: string): ParsedChord {
  try {
    return parseChordName(chordName);
  } catch {
    return parseChordName(DEFAULT_WORKSPACE_STATE.chordName);
  }
}

function getPracticeLevelFromArrangement(arrangement: SongArrangement): ProgressionLevel {
  return arrangement.difficulty === "beginner" ? "beginner" : "professional";
}

export default App;
