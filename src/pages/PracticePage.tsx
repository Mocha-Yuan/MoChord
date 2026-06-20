import {
  Dumbbell,
  GitBranch,
  Music2,
  PanelRightClose,
  PanelRightOpen,
  Play,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Square,
  Target,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChordVoicingGallery } from "../components/ChordVoicingGallery";
import { FretboardDiagram } from "../components/FretboardDiagram";
import { TuningSelector } from "../components/TuningSelector";
import { type Language, useI18n } from "../i18n";
import type { TimeSignature } from "../types/metronome";
import type { PracticePlan } from "../types/practice";
import type { TuningPreset, TuningPresetId } from "../types/tuner";
import type { SavedLibraryItem } from "../utils/library";
import { generateGuitarVoicings, getVoicingKey, getVoicingNotes, STANDARD_TUNING } from "../utils/guitar";
import { COMMON_TIME_SIGNATURES, getTimeSignatureLabel } from "../utils/metronomeEngine";
import { parseChordName } from "../utils/musicTheory";
import {
  getLibraryItemTypeLabel,
  getPracticeLevelLabel,
  getPracticeSourceLabel,
  localizePracticeCoachText,
} from "../utils/practiceDisplay";
import {
  playChordProgression,
  stopChordProgressionPlayback,
  type ProgressionPlaybackBeat,
} from "../utils/progressionPlayback";
import { getLoopBpm, getPracticeCue, parsePracticeInput } from "../utils/practiceMode";
import { getVoicingPathSelection, type PracticeVoicingCandidateGroup } from "../utils/practiceVoicingPath";
import {
  finishPracticeSession,
  startPracticeSession,
  stopPracticeSession,
  updatePracticeSessionProgress,
} from "../utils/practiceStats";
import { PageHeader } from "./PageHeader";
import type { NavigateToPage } from "./pageTypes";

type PracticePageProps = {
  plan: PracticePlan | null;
  bpm: number;
  timeSignature: TimeSignature;
  countInBars: number;
  metronomeDuringPlayback: boolean;
  accentFirstBeat: boolean;
  tuningPitches: string[];
  tuningPresetId: TuningPresetId;
  storedTuningPresets: TuningPreset[];
  libraryItems: SavedLibraryItem[];
  onNavigate: NavigateToPage;
  onTuningPresetIdChange: (presetId: TuningPresetId) => void;
  onPlanChange: (plan: PracticePlan) => void;
  onSavePlan: (plan: PracticePlan) => void;
  onLoadLibraryItem: (item: SavedLibraryItem) => void;
  onDeleteLibraryItem: (id: string) => void;
  onBpmChange: (bpm: number) => void;
  onTimeSignatureChange: (timeSignature: TimeSignature) => void;
  onBeat: (beat: ProgressionPlaybackBeat) => void;
  onSelectChord: (chordName: string) => void;
  onPracticeStatsChange: () => void;
};

type PracticePlayingState = {
  chordName: string;
  index: number;
  beat: number;
  bar: number;
  loop: number;
  bpm: number;
};

const PRACTICE_EXAMPLES_BY_LANGUAGE: Record<Language, string[]> = {
  en: ["G - D - Em - C", "D调4566", "C Major 1-5-6-4", "Am - F - C - G"],
  zh: ["G - D - Em - C", "D调4566", "C大调 1-5-6-4", "Am - F - C - G"],
};
export function PracticePage({
  plan,
  bpm,
  timeSignature,
  countInBars,
  metronomeDuringPlayback,
  accentFirstBeat,
  tuningPitches,
  tuningPresetId,
  storedTuningPresets,
  libraryItems,
  onNavigate,
  onTuningPresetIdChange,
  onPlanChange,
  onSavePlan,
  onLoadLibraryItem,
  onDeleteLibraryItem,
  onBpmChange,
  onTimeSignatureChange,
  onBeat,
  onSelectChord,
  onPracticeStatsChange,
}: PracticePageProps) {
  const { language, t } = useI18n();
  const [input, setInput] = useState(() => plan?.title ?? "G - D - Em - C");
  const [barsPerChord, setBarsPerChord] = useState(1);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopCount, setLoopCount] = useState(3);
  const [bpmIncreasePerLoop, setBpmIncreasePerLoop] = useState(0);
  const [sideToolsCollapsed, setSideToolsCollapsed] = useState(false);
  const [selectedChordIndex, setSelectedChordIndex] = useState(0);
  const [selectedVoicingKeys, setSelectedVoicingKeys] = useState<Record<string, string>>({});
  const [lockedVoicingKeys, setLockedVoicingKeys] = useState<Record<string, string>>({});
  const [playing, setPlaying] = useState<PracticePlayingState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopRequested = useRef(false);
  const activePracticeSessionId = useRef<string | null>(null);
  const practiceSessionStartedAtMs = useRef<number | null>(null);
  const completedPracticeLoops = useRef(0);
  const lastPracticeChordIndex = useRef(0);

  const currentIndex = playing?.index ?? selectedChordIndex;
  const currentChordName = playing?.chordName ?? plan?.chords[currentIndex] ?? plan?.chords[0] ?? "";
  const examples = PRACTICE_EXAMPLES_BY_LANGUAGE[language];
  const sideToolsToggleLabel =
    language === "zh"
      ? sideToolsCollapsed
        ? "展开练习工具"
        : "折叠练习工具"
      : sideToolsCollapsed
        ? "Expand practice tools"
        : "Collapse practice tools";
  const lyricRows = plan?.lyricRows ?? [];
  const activeLyricRowIndex = useMemo(() => {
    let chordOffset = 0;

    for (const [index, row] of lyricRows.entries()) {
      const nextOffset = chordOffset + row.chords.length;
      if (currentIndex >= chordOffset && currentIndex < nextOffset) return index;
      chordOffset = nextOffset;
    }

    return lyricRows.length > 0 ? 0 : -1;
  }, [currentIndex, lyricRows]);

  const practiceVoicingGroups = useMemo<PracticeVoicingCandidateGroup[]>(() => {
    const seen = new Set<string>();
    return (plan?.chords ?? []).flatMap((chordName) => {
      if (seen.has(chordName)) return [];
      seen.add(chordName);

      try {
        return [
          {
            chordName,
            voicings: generateGuitarVoicings(parseChordName(chordName), 12, tuningPitches),
          },
        ];
      } catch {
        return [];
      }
    });
  }, [plan?.chords]);

  useEffect(() => {
    if (!plan?.coach) return;

    setBarsPerChord(plan.coach.barsPerChord);
    setLoopEnabled(true);
    setLoopCount(plan.coach.loopCount);
    setBpmIncreasePerLoop(plan.coach.bpmIncreasePerLoop);
    onBpmChange(plan.coach.startingBpm);
    handleRecommendVoicings(true);
  }, [plan?.id]);

  const currentChordData = useMemo(() => {
    if (!currentChordName) return null;

    try {
      const parsed = parseChordName(currentChordName);
      const voicings = generateGuitarVoicings(parsed, 12, tuningPitches);
      const selectedKey = selectedVoicingKeys[currentChordName];
      const voicing = voicings.find((candidate) => getVoicingKey(candidate) === selectedKey) ?? voicings[0];

      return {
        chordName: currentChordName,
        voicing,
        voicings,
        notes: parsed.notes,
        error: null,
      };
    } catch (caught) {
      return {
        chordName: currentChordName,
        voicing: null,
        voicings: [],
        notes: [],
        error: caught instanceof Error ? caught.message : t("diagramUnavailable"),
      };
    }
  }, [currentChordName, selectedVoicingKeys, t, tuningPitches]);

  const currentBarInChord = playing ? ((playing.bar - 1) % barsPerChord) + 1 : 1;
  const cue = useMemo(
    () =>
      getPracticeCue(plan?.chords ?? [], {
        currentIndex,
        beat: playing?.beat ?? 1,
        numerator: timeSignature.numerator,
        barsPerChord,
        barInChord: currentBarInChord,
        loop: playing?.loop ?? 1,
      }),
    [barsPerChord, currentBarInChord, currentIndex, plan?.chords, playing?.beat, playing?.loop, timeSignature.numerator],
  );

  const tuningTargets = useMemo(() => {
    if (!currentChordData?.voicing) return [];
    const notes = getVoicingNotes(currentChordData.voicing, tuningPitches);

    return notes.map((note, index) => ({
      stringNumber: 6 - index,
      openString: STANDARD_TUNING[index],
      note,
      fret: currentChordData.voicing.frets[index],
    }));
  }, [currentChordData, tuningPitches]);
  const continueItem = libraryItems[0] ?? null;
  const arrangementItems = libraryItems.filter((item) => item.type === "arrangement").slice(0, 4);
  const practiceItems = libraryItems.filter((item) => item.type === "practice").slice(0, 4);
  const progressionItems = libraryItems.filter((item) => item.type === "progression").slice(0, 4);
  const fallbackNonArrangementItems = libraryItems.filter((item) => item.type !== "arrangement").slice(0, 2);
  const practiceDashboardItems = practiceItems.length > 0 ? practiceItems : fallbackNonArrangementItems;
  const progressionDashboardItems = progressionItems.length > 0 ? progressionItems : fallbackNonArrangementItems;

  useEffect(() => {
    if (plan?.title) {
      setInput(plan.title);
      setSelectedChordIndex(0);
      setSelectedVoicingKeys({});
      setLockedVoicingKeys({});
    }
  }, [plan?.id, plan?.title]);

  useEffect(() => {
    return () => {
      stopRequested.current = true;
      stopChordProgressionPlayback();
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      stopPlayback();
      const nextPlan = parsePracticeInput(input);
      onPlanChange(nextPlan);
      setError(null);
      setSelectedChordIndex(0);
      if (nextPlan.chords[0]) onSelectChord(nextPlan.chords[0]);
    } catch {
      setError(t("unableGenerate"));
    }
  }

  function handleExample(nextInput: string) {
    setInput(nextInput);
    try {
      stopPlayback();
      const nextPlan = parsePracticeInput(nextInput);
      onPlanChange(nextPlan);
      setError(null);
      setSelectedChordIndex(0);
      if (nextPlan.chords[0]) onSelectChord(nextPlan.chords[0]);
    } catch {
      setError(t("unableGenerate"));
    }
  }

  function handleRecommendVoicings(overrideLocked = false) {
    if (practiceVoicingGroups.length === 0) return;

    const selection = getVoicingPathSelection(practiceVoicingGroups, {
      lockedVoicingKeys,
      overrideLocked,
    });
    setSelectedVoicingKeys(overrideLocked ? selection : { ...selection, ...lockedVoicingKeys });
    if (overrideLocked) setLockedVoicingKeys({});
  }

  async function handleStartPractice() {
    if (!plan || plan.chords.length === 0) return;

    try {
      stopPlayback();
      setError(null);
      stopRequested.current = false;
      setSelectedChordIndex(0);
      onSelectChord(plan.chords[0]);

      const rounds = loopEnabled ? Math.max(1, loopCount) : 1;
      const startedAtMs = Date.now();
      const session = startPracticeSession(localStorage, {
        planId: plan.id,
        title: plan.title,
        chords: plan.chords,
        bpm,
        timeSignature,
        targetLoops: rounds,
        startedAt: new Date(startedAtMs).toISOString(),
      });
      activePracticeSessionId.current = session.id;
      practiceSessionStartedAtMs.current = startedAtMs;
      completedPracticeLoops.current = 0;
      lastPracticeChordIndex.current = 0;
      onPracticeStatsChange();

      for (let loopIndex = 0; loopIndex < rounds; loopIndex += 1) {
        if (stopRequested.current) break;

        const loop = loopIndex + 1;
        const loopBpm = getLoopBpm(bpm, loopIndex, bpmIncreasePerLoop);
        setPlaying({ chordName: plan.chords[0], index: 0, beat: 1, bar: 1, loop, bpm: loopBpm });

        await playChordProgression(plan.chords, {
          bpm: loopBpm,
          timeSignature,
          barsPerChord,
          countInBars,
          metronomeDuringPlayback,
          accentFirstBeat,
          tuningPitches,
          level: plan.level,
          onBeat: (data) => {
            onBeat(data);
            setPlaying((current) => (current ? { ...current, beat: data.beat, bar: data.bar } : current));
          },
          onChordChange: (data) => {
            if (!data) {
              setPlaying(null);
              return;
            }

            lastPracticeChordIndex.current = data.index;
            if (activePracticeSessionId.current) {
              updatePracticeSessionProgress(localStorage, activePracticeSessionId.current, {
                lastChordIndex: data.index,
                durationSeconds: getPracticeSessionDurationSeconds(),
              });
            }
            setPlaying({
              chordName: data.chordName,
              index: data.index,
              beat: data.beat,
              bar: data.bar,
              loop,
              bpm: loopBpm,
            });
            setSelectedChordIndex(data.index);
            onSelectChord(data.chordName);
          },
          onComplete: () => setPlaying(null),
          onStop: () => {
            stopRequested.current = true;
            setPlaying(null);
            recordStoppedPracticeSession();
          },
        });

        if (!stopRequested.current && activePracticeSessionId.current) {
          completedPracticeLoops.current = loop;
          updatePracticeSessionProgress(localStorage, activePracticeSessionId.current, {
            completedLoops: loop,
            lastChordIndex: Math.max(0, plan.chords.length - 1),
            durationSeconds: getPracticeSessionDurationSeconds(),
          });
        }
      }

      if (!stopRequested.current) {
        if (activePracticeSessionId.current) {
          finishPracticeSession(localStorage, activePracticeSessionId.current, {
            completedLoops: rounds,
            lastChordIndex: Math.max(0, plan.chords.length - 1),
            durationSeconds: getPracticeSessionDurationSeconds(),
          });
          clearActivePracticeSession();
          onPracticeStatsChange();
        }
        setPlaying(null);
      }
    } catch {
      setPlaying(null);
      recordStoppedPracticeSession();
      setError(t("playbackFailedEnableAudio"));
    }
  }

  function stopPlayback() {
    stopRequested.current = true;
    stopChordProgressionPlayback();
    setPlaying(null);
    recordStoppedPracticeSession();
  }

  function recordStoppedPracticeSession() {
    if (!activePracticeSessionId.current) return;
    stopPracticeSession(localStorage, activePracticeSessionId.current, {
      completedLoops: completedPracticeLoops.current,
      lastChordIndex: lastPracticeChordIndex.current,
      durationSeconds: getPracticeSessionDurationSeconds(),
    });
    clearActivePracticeSession();
    onPracticeStatsChange();
  }

  function clearActivePracticeSession() {
    activePracticeSessionId.current = null;
    practiceSessionStartedAtMs.current = null;
    completedPracticeLoops.current = 0;
    lastPracticeChordIndex.current = 0;
  }

  function getPracticeSessionDurationSeconds() {
    if (!practiceSessionStartedAtMs.current) return 0;
    return Math.max(0, Math.round((Date.now() - practiceSessionStartedAtMs.current) / 1000));
  }

  function handleTimeSignatureSelect(value: string) {
    const [numerator, denominator] = value.split("/").map(Number);
    onTimeSignatureChange({ numerator, denominator });
  }

  return (
    <>
      <PageHeader
        activePage="practice"
        eyebrow={t("heroEyebrow")}
        title={t("practiceTitle")}
        subtitle={t("practiceSubtitle")}
        onNavigate={onNavigate}
      />

      <section className="panel practice-builder-panel">
        <form className="practice-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="practice-input">
            {t("practiceInput")}
          </label>
          <div className="input-shell">
            <Music2 size={22} aria-hidden="true" />
            <input
              id="practice-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t("practicePlaceholder")}
              autoComplete="off"
            />
          </div>
          <button className="primary-button" type="submit">
            <Target size={18} aria-hidden="true" />
            {t("buildPractice")}
          </button>
        </form>

        <div className="example-row practice-example-row" aria-label={t("practiceExamples")}>
          {examples.map((example) => (
            <button key={example} type="button" onClick={() => handleExample(example)}>
              {example}
            </button>
          ))}
        </div>
        {error ? <p className="error-message">{error}</p> : null}
      </section>

      <TuningSelector
        presetId={tuningPresetId}
        storedTuningPresets={storedTuningPresets}
        tuningPitches={tuningPitches}
        onPresetIdChange={onTuningPresetIdChange}
      />

      {plan?.coach ? (
        <section className="panel coach-practice-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{t("aiPracticeCoach")}</p>
              <h2>{plan.coach.style}</h2>
            </div>
            <span className="playing-pill">
              BPM {plan.coach.startingBpm} +{plan.coach.bpmIncreasePerLoop}
            </span>
          </div>
          <div className="coach-plan-grid">
            <div>
              <span>{t("coachRhythm")}</span>
              <strong>{localizePracticeCoachText(plan.coach.rhythmPattern, language)}</strong>
            </div>
            <div>
              <span>{t("coachTempoRamp")}</span>
              <strong>
                {plan.coach.loopCount} {t("practiceLoop")} / {plan.coach.barsPerChord} {t("barsPerChord")}
              </strong>
            </div>
          </div>
          <ol className="coach-goals">
            {plan.coach.goals.map((goal) => (
              <li key={goal}>{localizePracticeCoachText(goal, language)}</li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="panel library-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">{t("library")}</p>
            <h2>{t("musicWorkspace")}</h2>
          </div>
          <button type="button" className="secondary-button" onClick={() => plan ? onSavePlan(plan) : undefined} disabled={!plan}>
            <Save size={16} aria-hidden="true" />
            {t("saveCurrentPlan")}
          </button>
        </div>
        {libraryItems.length > 0 ? (
          <div className="library-dashboard">
            {continueItem ? (
              <article className="library-continue-card">
                <div>
                  <p className="eyebrow">{t("continuePractice")}</p>
                  <h3>{continueItem.coach?.style ?? continueItem.title}</h3>
                  <span>{continueItem.chords.join(" - ")}</span>
                  <small>
                    {getPracticeLevelLabel(continueItem.level, language)} / {getPracticeSourceLabel(continueItem.source, language)}
                    {continueItem.coach ? ` / ${continueItem.coach.startingBpm} BPM` : ""}
                  </small>
                </div>
                <button type="button" className="primary-button" onClick={() => onLoadLibraryItem(continueItem)}>
                  <Dumbbell size={16} aria-hidden="true" />
                  {t("continuePractice")}
                </button>
              </article>
            ) : null}

            {arrangementItems.length > 0 ? (
              <div className="library-column">
                <h3>{t("myArrangements")}</h3>
                {arrangementItems.map((item) => (
                  <LibraryDashboardItem
                    key={`arrangement-${item.id}`}
                    item={item}
                    onLoadLibraryItem={onLoadLibraryItem}
                    onDeleteLibraryItem={onDeleteLibraryItem}
                    labels={{ deleteFromLibrary: t("deleteFromLibrary") }}
                    language={language}
                  />
                ))}
              </div>
            ) : null}

            {practiceDashboardItems.length > 0 ? (
              <div className="library-column">
                <h3>{t("myPracticePlans")}</h3>
                {practiceDashboardItems.map((item) => (
                  <LibraryDashboardItem
                    key={`practice-${item.id}`}
                    item={item}
                    onLoadLibraryItem={onLoadLibraryItem}
                    onDeleteLibraryItem={onDeleteLibraryItem}
                    labels={{ deleteFromLibrary: t("deleteFromLibrary") }}
                    language={language}
                  />
                ))}
              </div>
            ) : null}

            {progressionDashboardItems.length > 0 ? (
              <div className="library-column">
                <h3>{t("inspirationSnippets")}</h3>
                {progressionDashboardItems.map((item) => (
                  <LibraryDashboardItem
                    key={`progression-${item.id}`}
                    item={item}
                    onLoadLibraryItem={onLoadLibraryItem}
                    onDeleteLibraryItem={onDeleteLibraryItem}
                    labels={{ deleteFromLibrary: t("deleteFromLibrary") }}
                    language={language}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="audio-empty">{t("emptyLibrary")}</p>
        )}
      </section>

      <section className={sideToolsCollapsed ? "practice-workspace practice-workspace-tools-collapsed" : "practice-workspace"}>
        <div className="practice-main-stage">
          <div className="panel practice-flow-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{t("practice")}</p>
                <h2>{plan?.title ?? t("currentPracticePlan")}</h2>
              </div>
              <span className="playing-pill">
                BPM {playing?.bpm ?? bpm} / {timeSignature.numerator}/{timeSignature.denominator}
              </span>
            </div>

            <div className="practice-chord-strip">
              {plan?.chords.map((chord, index) => (
                <button
                  key={`${chord}-${index}`}
                  type="button"
                  className={currentIndex === index ? "active" : ""}
                  onClick={() => {
                    setSelectedChordIndex(index);
                    onSelectChord(chord);
                  }}
                >
                  <span>{index + 1}</span>
                  {chord}
                </button>
              ))}
            </div>

            {lyricRows.length > 0 ? (
              <div className="practice-lyrics-panel">
                {lyricRows.map((row, index) => (
                  <article key={`${row.lineId}-${index}`} className={index === activeLyricRowIndex ? "active" : ""}>
                    <span>{row.chords.join(" - ")}</span>
                    <p>{row.text || row.sectionName}</p>
                  </article>
                ))}
              </div>
            ) : null}

            <div className="practice-pulse">
              <div>
                <span>{t("currentPracticeChord")}</span>
                <strong>{cue.currentChord || "--"}</strong>
              </div>
              <div>
                <span>{t("nextChord")}</span>
                <strong>{cue.nextChord || "--"}</strong>
              </div>
              <div>
                <span>{t("remainingBeats")}</span>
                <strong>{playing ? cue.remainingBeats : "--"}</strong>
              </div>
              <div>
                <span>{t("practiceLoop")}</span>
                <strong>{playing?.loop ?? 1} / {loopEnabled ? loopCount : 1}</strong>
              </div>
              <div>
                <span>{t("beat")}</span>
                <strong>{playing?.beat ?? 1} / {timeSignature.numerator}</strong>
              </div>
              <div>
                <span>{t("bar")}</span>
                <strong>{playing?.bar ?? 1}</strong>
              </div>
            </div>

            <div className="practice-actions">
              <button type="button" className="audio-button audio-button-primary" onClick={() => void handleStartPractice()} disabled={!plan}>
                <Play size={16} aria-hidden="true" />
                {t("startPractice")}
              </button>
              <button type="button" className="audio-button" onClick={stopPlayback}>
                <Square size={16} aria-hidden="true" />
                {t("stopPractice")}
              </button>
              <button type="button" className="audio-button" onClick={() => handleRecommendVoicings()} disabled={!plan}>
                <GitBranch size={16} aria-hidden="true" />
                {t("smartVoicing")}
              </button>
              <button type="button" className="audio-button" onClick={() => handleRecommendVoicings(true)} disabled={!plan}>
                <RefreshCw size={16} aria-hidden="true" />
                {t("recommendAllVoicings")}
              </button>
            </div>
          </div>

          <div className="practice-diagram-panel">
            {currentChordData?.voicing ? (
              <>
                <FretboardDiagram chordName={currentChordData.chordName} voicing={currentChordData.voicing} tuningPitches={tuningPitches} />
                <ChordVoicingGallery
                  chordName={currentChordData.chordName}
                  voicings={currentChordData.voicings}
                  selectedVoicing={currentChordData.voicing}
                  onSelect={(voicing) =>
                    setSelectedVoicingKeys((current) => {
                      const key = getVoicingKey(voicing);
                      setLockedVoicingKeys((locked) => ({
                        ...locked,
                        [currentChordData.chordName]: key,
                      }));
                      return {
                        ...current,
                        [currentChordData.chordName]: key,
                      };
                    })
                  }
                />
              </>
            ) : (
              <section className="panel empty-state">
                <h2>{t("diagramUnavailable")}</h2>
                <p>{currentChordData?.error}</p>
              </section>
            )}
          </div>
        </div>

        <div className={sideToolsCollapsed ? "practice-side-stack collapsed" : "practice-side-stack"}>
          <button
            type="button"
            className="practice-side-toggle"
            onClick={() => setSideToolsCollapsed((current) => !current)}
            aria-label={sideToolsToggleLabel}
            title={sideToolsToggleLabel}
            aria-expanded={!sideToolsCollapsed}
          >
            {sideToolsCollapsed ? <PanelRightOpen size={18} aria-hidden="true" /> : <PanelRightClose size={18} aria-hidden="true" />}
            <span className="sr-only">{sideToolsToggleLabel}</span>
          </button>

          {!sideToolsCollapsed ? (
            <>
              <div className="panel practice-settings-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">{t("practiceSettings")}</p>
                    <h2>{t("tempoAndPulse")}</h2>
                  </div>
                  <SlidersHorizontal size={20} aria-hidden="true" />
                </div>

                <div className="practice-settings-grid">
                  <label>
                    <span>BPM</span>
                    <input
                      type="number"
                      min="40"
                      max="240"
                      value={bpm}
                      onChange={(event) => onBpmChange(Number(event.target.value))}
                    />
                  </label>
                  <label>
                    <span>{t("timeSignature")}</span>
                    <select
                      value={`${timeSignature.numerator}/${timeSignature.denominator}`}
                      onChange={(event) => handleTimeSignatureSelect(event.target.value)}
                    >
                      {COMMON_TIME_SIGNATURES.map((item) => (
                        <option key={`${item.numerator}/${item.denominator}`} value={`${item.numerator}/${item.denominator}`}>
                          {getTimeSignatureLabel(item)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{t("barsPerChord")}</span>
                    <select value={barsPerChord} onChange={(event) => setBarsPerChord(Number(event.target.value))}>
                      <option value={1}>{t("oneBar")}</option>
                      <option value={2}>{t("twoBars")}</option>
                      <option value={4}>{t("fourBars")}</option>
                    </select>
                  </label>
                  <label className="practice-checkbox-label">
                    <span>{t("loopPractice")}</span>
                    <input type="checkbox" checked={loopEnabled} onChange={(event) => setLoopEnabled(event.target.checked)} />
                  </label>
                  <label>
                    <span>{t("loopCount")}</span>
                    <input
                      type="number"
                      min="1"
                      max="16"
                      value={loopCount}
                      disabled={!loopEnabled}
                      onChange={(event) => setLoopCount(Math.max(1, Math.min(16, Number(event.target.value))))}
                    />
                  </label>
                  <label>
                    <span>{t("bpmIncrease")}</span>
                    <select
                      value={bpmIncreasePerLoop}
                      disabled={!loopEnabled}
                      onChange={(event) => setBpmIncreasePerLoop(Number(event.target.value))}
                    >
                      <option value={0}>{t("noBpmIncrease")}</option>
                      <option value={2}>+2 BPM</option>
                      <option value={4}>+4 BPM</option>
                      <option value={5}>+5 BPM</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="panel practice-target-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">{t("practiceTargets")}</p>
                    <h2>{currentChordName || "--"}</h2>
                  </div>
                  <button type="button" className="secondary-button" onClick={() => onNavigate("tuner")}>
                    {t("openTuner")}
                  </button>
                </div>

                <div className="practice-target-grid">
                  {tuningTargets.map((target) => (
                    <div key={`${target.stringNumber}-${target.openString}`}>
                      <span>
                        {target.stringNumber} {t("string")}
                      </span>
                      <strong>{target.note}</strong>
                      <small>
                        {target.openString} / {target.fret < 0 ? t("muted") : `${t("fret")} ${target.fret}`}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </>
  );
}

type LibraryDashboardItemProps = {
  item: SavedLibraryItem;
  onLoadLibraryItem: (item: SavedLibraryItem) => void;
  onDeleteLibraryItem: (id: string) => void;
  language: Language;
  labels: {
    deleteFromLibrary: string;
  };
};

function LibraryDashboardItem({ item, onLoadLibraryItem, onDeleteLibraryItem, language, labels }: LibraryDashboardItemProps) {
  const sectionCountLabel =
    item.type === "arrangement" && item.arrangement
      ? language === "zh"
        ? ` / ${item.arrangement.sections.length} \u4e2a\u6bb5\u843d`
        : ` / ${item.arrangement.sections.length} sections`
      : "";
  const loopCountLabel = item.coach
    ? language === "zh"
      ? ` / ${item.coach.loopCount} \u6b21\u5faa\u73af`
      : ` / ${item.coach.loopCount} loops`
    : "";

  return (
    <article className="library-dashboard-item">
      <button type="button" onClick={() => onLoadLibraryItem(item)}>
        <strong>{item.coach?.style ?? item.title}</strong>
        <span>{item.chords.join(" - ")}</span>
        <small>
          {getLibraryItemTypeLabel(item.type, language)} / {getPracticeLevelLabel(item.level, language)}
          {sectionCountLabel}
          {loopCountLabel}
        </small>
      </button>
      <button type="button" className="icon-button" onClick={() => onDeleteLibraryItem(item.id)} aria-label={labels.deleteFromLibrary}>
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </article>
  );
}
