import { useI18n } from "../i18n";
import type { ScaleMode } from "../types/music";
import { CHROMATIC_NOTES, generateDiatonicChords, getScaleNotes } from "../utils/musicTheory";

type ScaleModeGeneratorProps = {
  selectedKey: string;
  selectedMode: ScaleMode;
  onKeyChange: (key: string) => void;
  onModeChange: (mode: ScaleMode) => void;
  onSelectChord: (chord: string) => void;
};

const MODES: ScaleMode[] = ["Major", "Natural Minor", "Dorian", "Mixolydian"];

export function ScaleModeGenerator({
  selectedKey,
  selectedMode,
  onKeyChange,
  onModeChange,
  onSelectChord,
}: ScaleModeGeneratorProps) {
  const { t } = useI18n();
  const chords = generateDiatonicChords(selectedKey, selectedMode);
  const notes = getScaleNotes(selectedKey, selectedMode);

  return (
    <section className="panel scale-panel">
      <div className="panel-heading">
        <p className="eyebrow">{t("modeBuilder")}</p>
        <h2>{`${selectedKey} ${selectedMode}`}</h2>
      </div>
      <div className="control-grid">
        <label>
          {t("key")}
          <select value={selectedKey} onChange={(event) => onKeyChange(event.target.value)}>
            {CHROMATIC_NOTES.map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("mode")}
          <select value={selectedMode} onChange={(event) => onModeChange(event.target.value as ScaleMode)}>
            {MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="scale-notes">{notes.join(" - ")}</p>
      <div className="diatonic-grid">
        {chords.map((chord, index) => (
          <button key={`${chord}-${index}`} type="button" onClick={() => onSelectChord(chord)}>
            <span>{index + 1}</span>
            {chord}
          </button>
        ))}
      </div>
    </section>
  );
}
