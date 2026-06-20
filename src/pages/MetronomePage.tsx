import { MetronomeControls } from "../components/MetronomeControls";
import { useI18n } from "../i18n";
import type { MetronomeSoundPreset, TimeSignature } from "../types/metronome";
import { PageHeader } from "./PageHeader";
import type { NavigateToPage } from "./pageTypes";

type MetronomePageProps = {
  bpm: number;
  timeSignature: TimeSignature;
  isRunning: boolean;
  currentBeat: number;
  currentBar: number;
  accentFirstBeat: boolean;
  countInBars: number;
  metronomeDuringPlayback: boolean;
  error: string | null;
  onNavigate: NavigateToPage;
  onBpmChange: (bpm: number) => void;
  onTimeSignatureChange: (timeSignature: TimeSignature) => void;
  onStart: (options?: { preset?: MetronomeSoundPreset; volumeDb?: number; accentVolumeDb?: number }) => void;
  onStop: () => void;
  onAccentFirstBeatChange: (value: boolean) => void;
  onCountInBarsChange: (bars: number) => void;
  onMetronomeDuringPlaybackChange: (value: boolean) => void;
};

export function MetronomePage({
  bpm,
  timeSignature,
  isRunning,
  currentBeat,
  currentBar,
  accentFirstBeat,
  countInBars,
  metronomeDuringPlayback,
  error,
  onNavigate,
  onBpmChange,
  onTimeSignatureChange,
  onStart,
  onStop,
  onAccentFirstBeatChange,
  onCountInBarsChange,
  onMetronomeDuringPlaybackChange,
}: MetronomePageProps) {
  const { t } = useI18n();

  return (
    <>
      <PageHeader
        activePage="metronome"
        eyebrow={t("heroEyebrow")}
        title={t("homeMetronomeTitle")}
        subtitle={t("homeMetronomeText")}
        onNavigate={onNavigate}
      />

      <section className="single-tool-layout metronome-tool-layout">
        <MetronomeControls
          bpm={bpm}
          timeSignature={timeSignature}
          isRunning={isRunning}
          currentBeat={currentBeat}
          currentBar={currentBar}
          accentFirstBeat={accentFirstBeat}
          countInBars={countInBars}
          metronomeDuringPlayback={metronomeDuringPlayback}
          onBpmChange={onBpmChange}
          onTimeSignatureChange={onTimeSignatureChange}
          onStart={onStart}
          onStop={onStop}
          onAccentFirstBeatChange={onAccentFirstBeatChange}
          onCountInBarsChange={onCountInBarsChange}
          onMetronomeDuringPlaybackChange={onMetronomeDuringPlaybackChange}
        />
        {error ? <p className="audio-error">{error}</p> : null}
      </section>
    </>
  );
}
