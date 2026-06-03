import { useI18n } from "../i18n";
import type { GuitarVoicing } from "../types/music";
import { getVoicingKey, getVoicingShapeCode } from "../utils/guitar";

type ChordVoicingGalleryProps = {
  chordName: string;
  voicings: GuitarVoicing[];
  selectedVoicing: GuitarVoicing;
  onSelect: (voicing: GuitarVoicing) => void;
};

export function ChordVoicingGallery({
  chordName,
  voicings,
  selectedVoicing,
  onSelect,
}: ChordVoicingGalleryProps) {
  const { t } = useI18n();
  const selectedKey = getVoicingKey(selectedVoicing);

  return (
    <section className="panel voicing-gallery-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{t("positionLibrary")}</p>
          <h2>{t("multiPositionCharts")}</h2>
        </div>
        <span className="shape-count">{voicings.length} {t("shapes")}</span>
      </div>
      <div className="voicing-gallery">
        {voicings.map((voicing, index) => {
          const key = getVoicingKey(voicing);
          const active = key === selectedKey;
          return (
            <button
              key={key}
              type="button"
              className={active ? "voicing-card active" : "voicing-card"}
              onClick={() => onSelect(voicing)}
              aria-pressed={active}
            >
              <MiniChordChart chordName={index === 0 ? chordName : ""} voicing={voicing} />
              <span>{getVoicingShapeCode(voicing)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MiniChordChart({ chordName, voicing }: { chordName: string; voicing: GuitarVoicing }) {
  const width = 120;
  const height = 150;
  const left = 22;
  const right = 104;
  const top = 36;
  const fretGap = 20;
  const stringGap = (right - left) / 5;
  const visibleFrets = 4;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mini-chord-svg" aria-hidden="true">
      <text x={width / 2} y="14" className="mini-title">
        {chordName}
      </text>
      <text x="11" y={top + 16} className="mini-fret-label">
        {voicing.baseFret > 1 ? voicing.baseFret : ""}
      </text>
      {Array.from({ length: 6 }).map((_, stringIndex) => {
        const x = left + stringIndex * stringGap;
        return (
          <line
            key={`mini-string-${stringIndex}`}
            x1={x}
            x2={x}
            y1={top}
            y2={top + visibleFrets * fretGap}
            className="mini-string"
          />
        );
      })}
      {Array.from({ length: visibleFrets + 1 }).map((_, fretIndex) => {
        const y = top + fretIndex * fretGap;
        return (
          <line
            key={`mini-fret-${fretIndex}`}
            x1={left}
            x2={right}
            y1={y}
            y2={y}
            className={fretIndex === 0 && voicing.baseFret === 1 ? "mini-nut" : "mini-fret"}
          />
        );
      })}
      {voicing.frets.map((fret, stringIndex) => {
        const x = left + stringIndex * stringGap;
        if (fret < 0) {
          return (
            <text key={`mini-muted-${stringIndex}`} x={x} y={top - 9} className="mini-status">
              x
            </text>
          );
        }
        if (fret === 0) {
          return (
            <text key={`mini-open-${stringIndex}`} x={x} y={top - 9} className="mini-status">
              o
            </text>
          );
        }

        const relativeFret = fret - voicing.baseFret + 1;
        if (relativeFret < 1 || relativeFret > visibleFrets) return null;

        const y = top + (relativeFret - 0.5) * fretGap;
        return (
          <g key={`mini-finger-${stringIndex}`}>
            <circle cx={x} cy={y} r="7.4" className="mini-finger" />
            {voicing.fingers?.[stringIndex] ? (
              <text x={x} y={y + 3.1} className="mini-finger-text">
                {voicing.fingers[stringIndex]}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
