import { RotateCcw, Save, Volume2, X } from "lucide-react";
import { useI18n } from "../i18n";
import type { GuitarVoicing } from "../types/music";
import { getVoicingNotes } from "../utils/guitar";

type EditableChordDiagramProps = {
  chordName: string;
  voicing: GuitarVoicing;
  onChange: (voicing: GuitarVoicing) => void;
  onSave: () => void;
  onReset: () => void;
};

export function EditableChordDiagram({
  chordName,
  voicing,
  onChange,
  onSave,
  onReset,
}: EditableChordDiagramProps) {
  const { t } = useI18n();
  const notes = getVoicingNotes(voicing);

  function updateString(stringIndex: number, fret: number) {
    const nextFrets = voicing.frets.map((current, index) => (index === stringIndex ? fret : current));
    onChange({
      ...voicing,
      frets: nextFrets,
      fingers: nextFrets.map((value) => (value <= 0 ? 0 : Math.min(value, 4))),
      muted: nextFrets.map((value) => value < 0),
    });
  }

  return (
    <section className="panel editor-panel">
      <div className="panel-heading">
        <p className="eyebrow">{t("editableShape")}</p>
        <h2>{chordName}</h2>
      </div>
      <div className="editor-layout">
        <div className="editor-grid" role="grid" aria-label={t("editableGridLabel")}>
          {voicing.frets.map((fret, stringIndex) => (
            <div key={`string-editor-${stringIndex}`} className="string-editor" role="row">
              <div className="string-head">
                <span>{t("string")} {6 - stringIndex}</span>
                <strong>{notes[stringIndex]}</strong>
              </div>
              <div className="fret-buttons">
                {[-1, 0, 1, 2, 3, 4, 5].map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    className={fret === candidate ? "active" : ""}
                    onClick={() => updateString(stringIndex, candidate)}
                    aria-label={`${t("string")} ${6 - stringIndex}: ${
                      candidate < 0 ? t("muted") : candidate === 0 ? t("open") : `${t("fret")} ${candidate}`
                    }`}
                  >
                    {candidate < 0 ? "X" : candidate}
                  </button>
                ))}
              </div>
              <div className="quick-actions">
                <button type="button" onClick={() => updateString(stringIndex, -1)}>
                  <X size={15} aria-hidden="true" />
                  {t("setMuted")}
                </button>
                <button type="button" onClick={() => updateString(stringIndex, 0)}>
                  <Volume2 size={15} aria-hidden="true" />
                  {t("setOpen")}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="editor-actions">
          <button type="button" className="primary-button" onClick={onSave}>
            <Save size={17} aria-hidden="true" />
            {t("saveShape")}
          </button>
          <button type="button" className="secondary-button" onClick={onReset}>
            <RotateCcw size={17} aria-hidden="true" />
            {t("resetShapeButton")}
          </button>
        </div>
      </div>
    </section>
  );
}
