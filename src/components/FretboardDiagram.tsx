import { useI18n } from "../i18n";
import type { GuitarVoicing } from "../types/music";
import { getVoicingNotes, getVoicingShapeCode, STANDARD_TUNING } from "../utils/guitar";

type FretboardDiagramProps = {
  chordName: string;
  voicing: GuitarVoicing;
};

export function FretboardDiagram({ chordName, voicing }: FretboardDiagramProps) {
  const { t } = useI18n();
  const maxRelativeFret = Math.max(
    4,
    ...voicing.frets.filter((fret) => fret > 0).map((fret) => fret - voicing.baseFret + 1),
  );
  const visibleFrets = Math.min(5, maxRelativeFret);
  const width = 300;
  const height = 380;
  const left = 46;
  const right = 254;
  const top = 78;
  const fretGap = 42;
  const stringGap = (right - left) / 5;
  const notes = getVoicingNotes(voicing);

  return (
    <section className="panel diagram-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{t("selectedShape")}</p>
          <h2>{chordName}</h2>
        </div>
        <span className="shape-code">{getVoicingShapeCode(voicing)}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="fretboard-svg" role="img">
        <title>{`${chordName} ${t("guitarDiagramTitle")}`}</title>
        <defs>
          <filter id="selectedFingerShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.35" />
          </filter>
        </defs>
        <text x={width / 2} y="28" className="chart-title">
          {chordName}
        </text>
        <text x={left - 28} y={top + 28} className="fret-label">
          {voicing.baseFret > 1 ? `${voicing.baseFret}fr` : ""}
        </text>
        {Array.from({ length: 6 }).map((_, index) => {
          const x = left + index * stringGap;
          return (
            <line
              key={`string-${index}`}
              x1={x}
              x2={x}
              y1={top}
              y2={top + visibleFrets * fretGap}
              className="chart-string"
            />
          );
        })}
        {Array.from({ length: visibleFrets + 1 }).map((_, index) => {
          const y = top + index * fretGap;
          return (
            <line
              key={`fret-${index}`}
              x1={left}
              x2={right}
              y1={y}
              y2={y}
              className={index === 0 && voicing.baseFret === 1 ? "chart-nut" : "chart-fret"}
            />
          );
        })}
        {voicing.frets.map((fret, stringIndex) => {
          const x = left + stringIndex * stringGap;
          if (fret < 0) {
            return (
              <text key={`mute-${stringIndex}`} x={x} y={top - 22} className="status-marker">
                x
              </text>
            );
          }
          if (fret === 0) {
            return (
              <text key={`open-${stringIndex}`} x={x} y={top - 22} className="status-marker">
                o
              </text>
            );
          }

          const relativeFret = fret - voicing.baseFret + 1;
          const clampedFret = Math.max(1, Math.min(visibleFrets, relativeFret));
          const y = top + (clampedFret - 0.5) * fretGap;
          return (
            <g key={`finger-${stringIndex}`}>
              <circle cx={x} cy={y} r={15} className="chart-finger-dot" />
              {voicing.fingers?.[stringIndex] ? (
                <text x={x} y={y + 5} className="finger-text">
                  {voicing.fingers[stringIndex]}
                </text>
              ) : null}
            </g>
          );
        })}
        {STANDARD_TUNING.map((stringName, index) => {
          const x = left + index * stringGap;
          return (
            <g key={`note-${index}`}>
              <text x={x} y={top + visibleFrets * fretGap + 28} className="string-note">
                {notes[index]}
              </text>
              <text x={x} y={top + visibleFrets * fretGap + 50} className="string-tuning">
                {stringName}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
