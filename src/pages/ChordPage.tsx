import { AIProgressionGenerator } from "../components/AIProgressionGenerator";
import { AudioControls } from "../components/AudioControls";
import { ChordInput } from "../components/ChordInput";
import { ChordSummary } from "../components/ChordSummary";
import { ChordVoicingGallery } from "../components/ChordVoicingGallery";
import { EditableChordDiagram } from "../components/EditableChordDiagram";
import { FretboardDiagram } from "../components/FretboardDiagram";
import { ScaleModeGenerator } from "../components/ScaleModeGenerator";
import { StaffViewer } from "../components/StaffViewer";
import { TabViewer } from "../components/TabViewer";
import { TuningSelector } from "../components/TuningSelector";
import { useI18n } from "../i18n";
import type { TimeSignature } from "../types/metronome";
import type { GuitarVoicing, ParsedChord, ScaleMode } from "../types/music";
import type { PracticeCoachPlan, ProgressionLevel } from "../types/progression";
import type { TuningPreset, TuningPresetId } from "../types/tuner";
import { PageHeader } from "./PageHeader";
import type { NavigateToPage } from "./pageTypes";

type ChordPageProps = {
  chordName: string;
  parsedChord: ParsedChord | null;
  voicing: GuitarVoicing | null;
  voicings: GuitarVoicing[];
  displayChordName: string;
  error: string | null;
  selectedKey: string;
  selectedMode: ScaleMode;
  saveNotice: string | null;
  bpm: number;
  timeSignature: TimeSignature;
  countInBars: number;
  metronomeDuringPlayback: boolean;
  accentFirstBeat: boolean;
  tuningPitches: string[];
  tuningPresetId: TuningPresetId;
  storedTuningPresets: TuningPreset[];
  recentChords: string[];
  onNavigate: NavigateToPage;
  onTuningPresetIdChange: (presetId: TuningPresetId) => void;
  onGenerateChord: (name: string) => void;
  onVoicingChange: (voicing: GuitarVoicing) => void;
  onSelectVoicing: (voicing: GuitarVoicing) => void;
  onSaveShape: () => void;
  onResetShape: () => void;
  onSelectedKeyChange: (key: string) => void;
  onSelectedModeChange: (mode: ScaleMode) => void;
  onStartPractice: (payload: { title: string; chords: string[]; level: ProgressionLevel; coach?: PracticeCoachPlan }) => void;
  onSaveProgression: (payload: { title: string; chords: string[]; level: ProgressionLevel }) => void;
  onBeat: (beat: { beat: number; bar: number }) => void;
};

export function ChordPage({
  chordName,
  parsedChord,
  voicing,
  voicings,
  displayChordName,
  error,
  selectedKey,
  selectedMode,
  saveNotice,
  bpm,
  timeSignature,
  countInBars,
  metronomeDuringPlayback,
  accentFirstBeat,
  tuningPitches,
  tuningPresetId,
  storedTuningPresets,
  recentChords,
  onNavigate,
  onTuningPresetIdChange,
  onGenerateChord,
  onVoicingChange,
  onSelectVoicing,
  onSaveShape,
  onResetShape,
  onSelectedKeyChange,
  onSelectedModeChange,
  onStartPractice,
  onSaveProgression,
  onBeat,
}: ChordPageProps) {
  const { t } = useI18n();

  return (
    <>
      <PageHeader
        activePage="chords"
        eyebrow={t("heroEyebrow")}
        title={t("homeChordTitle")}
        subtitle={t("homeChordText")}
        onNavigate={onNavigate}
      />

      <ChordInput value={chordName} error={error} recentChords={recentChords} onGenerate={onGenerateChord} />

      <TuningSelector
        presetId={tuningPresetId}
        storedTuningPresets={storedTuningPresets}
        tuningPitches={tuningPitches}
        onPresetIdChange={onTuningPresetIdChange}
      />

      <AIProgressionGenerator
        bpm={bpm}
        timeSignature={timeSignature}
        countInBars={countInBars}
        metronomeDuringPlayback={metronomeDuringPlayback}
        accentFirstBeat={accentFirstBeat}
        tuningPitches={tuningPitches}
        onBeat={onBeat}
        onSelectChord={onGenerateChord}
        onStartPractice={onStartPractice}
        onSaveProgression={onSaveProgression}
      />

      {parsedChord && voicing ? (
        <>
          <div className="dashboard-grid">
            <div className="left-rail">
              <ChordSummary parsedChord={parsedChord} />
              <AudioControls parsedChord={parsedChord} voicing={voicing} bpm={bpm} timeSignature={timeSignature} tuningPitches={tuningPitches} />
              <ScaleModeGenerator
                selectedKey={selectedKey}
                selectedMode={selectedMode}
                onKeyChange={onSelectedKeyChange}
                onModeChange={onSelectedModeChange}
                onSelectChord={onGenerateChord}
              />
            </div>
            <div className="right-rail">
              <StaffViewer parsedChord={parsedChord} />
              <div className="visual-grid">
                <TabViewer voicing={voicing} tuningPitches={tuningPitches} />
                <FretboardDiagram chordName={displayChordName} voicing={voicing} tuningPitches={tuningPitches} />
              </div>
              <ChordVoicingGallery
                chordName={displayChordName}
                voicings={voicings}
                selectedVoicing={voicing}
                onSelect={onSelectVoicing}
              />
            </div>
          </div>
          <EditableChordDiagram
            chordName={displayChordName}
            voicing={voicing}
            onChange={onVoicingChange}
            onSave={onSaveShape}
            onReset={onResetShape}
          />
          {saveNotice ? <p className="save-notice">{saveNotice}</p> : null}
        </>
      ) : (
        <section className="panel empty-state">
          <h2>{t("noPlayableShapeTitle")}</h2>
          <p>{t("noPlayableShapeHint")}</p>
        </section>
      )}
    </>
  );
}
