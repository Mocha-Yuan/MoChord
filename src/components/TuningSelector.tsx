import { SlidersHorizontal } from "lucide-react";
import { useI18n } from "../i18n";
import type { TuningPreset, TuningPresetId } from "../types/tuner";
import { getTuningPresetDisplayLabel } from "../utils/practiceDisplay";
import { TUNING_PRESETS } from "../utils/tunerEngine";

type TuningSelectorProps = {
  presetId: TuningPresetId;
  storedTuningPresets: TuningPreset[];
  tuningPitches: string[];
  onPresetIdChange: (presetId: TuningPresetId) => void;
};

export function TuningSelector({
  presetId,
  storedTuningPresets,
  tuningPitches,
  onPresetIdChange,
}: TuningSelectorProps) {
  const { language, t } = useI18n();
  const options = [...TUNING_PRESETS, ...storedTuningPresets];
  const current = options.find((option) => option.id === presetId);

  return (
    <section className="panel tuning-selector-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{t("currentTuning")}</p>
          <h2>{current ? getTuningPresetDisplayLabel(current, language) : t("customTuning")}</h2>
        </div>
        <SlidersHorizontal size={20} aria-hidden="true" />
      </div>

      <label className="tuning-select-label">
        <span>{t("selectTuning")}</span>
        <select value={presetId} onChange={(event) => onPresetIdChange(event.target.value as TuningPresetId)}>
          {options.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {getTuningPresetDisplayLabel(preset, language)}
            </option>
          ))}
        </select>
      </label>

      <div className="tuning-pitch-row" aria-label={t("tuningNotes")}>
        {tuningPitches.map((pitch, index) => (
          <span key={`${pitch}-${index}`}>
            {6 - index}: {pitch}
          </span>
        ))}
      </div>
    </section>
  );
}
