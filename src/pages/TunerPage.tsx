import { TunerControls } from "../components/TunerControls";
import { useI18n } from "../i18n";
import type { GuitarVoicing } from "../types/music";
import type { TuningPreset, TuningPresetId } from "../types/tuner";
import { PageHeader } from "./PageHeader";
import type { NavigateToPage } from "./pageTypes";

type TunerPageProps = {
  chordName: string;
  voicing: GuitarVoicing | null;
  presetId: TuningPresetId;
  customPitches: string[];
  referenceA: number;
  storedTuningPresets: TuningPreset[];
  onNavigate: NavigateToPage;
  onPresetIdChange: (presetId: TuningPresetId) => void;
  onCustomPitchesChange: (pitches: string[]) => void;
  onReferenceAChange: (referenceA: number) => void;
  onStoredTuningPresetsChange: (presets: TuningPreset[]) => void;
};

export function TunerPage({
  chordName,
  voicing,
  presetId,
  customPitches,
  referenceA,
  storedTuningPresets,
  onNavigate,
  onPresetIdChange,
  onCustomPitchesChange,
  onReferenceAChange,
  onStoredTuningPresetsChange,
}: TunerPageProps) {
  const { t } = useI18n();

  return (
    <>
      <PageHeader
        activePage="tuner"
        eyebrow={t("heroEyebrow")}
        title={t("homeTunerTitle")}
        subtitle={t("homeTunerText")}
        onNavigate={onNavigate}
      />

      <section className="single-tool-layout">
        <TunerControls
          chordName={chordName}
          voicing={voicing}
          presetId={presetId}
          customPitches={customPitches}
          referenceA={referenceA}
          storedTuningPresets={storedTuningPresets}
          onPresetIdChange={onPresetIdChange}
          onCustomPitchesChange={onCustomPitchesChange}
          onReferenceAChange={onReferenceAChange}
          onStoredTuningPresetsChange={onStoredTuningPresetsChange}
        />
      </section>
    </>
  );
}
