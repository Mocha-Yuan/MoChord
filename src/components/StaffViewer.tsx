import { useI18n } from "../i18n";
import type { ParsedChord } from "../types/music";

type StaffViewerProps = {
  parsedChord: ParsedChord;
};

const STAFF_POSITIONS: Record<string, number> = {
  C: 130,
  "C#": 124,
  D: 118,
  "D#": 112,
  E: 106,
  F: 100,
  "F#": 94,
  G: 88,
  "G#": 82,
  A: 76,
  "A#": 70,
  B: 64,
};

export function StaffViewer({ parsedChord }: StaffViewerProps) {
  const { t } = useI18n();
  const width = 480;
  const height = 190;
  const staffTop = 54;
  const gap = 14;

  return (
    <section className="panel staff-panel">
      <div className="panel-heading">
        <p className="eyebrow">{t("simplifiedStaff")}</p>
        <h2>{parsedChord.notes.join("  ")}</h2>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="staff-svg" role="img">
        <title>{`${parsedChord.original} ${t("staffTitleSuffix")}`}</title>
        {Array.from({ length: 5 }).map((_, index) => (
          <line
            key={`staff-${index}`}
            x1="54"
            x2="430"
            y1={staffTop + index * gap}
            y2={staffTop + index * gap}
            className="staff-line"
          />
        ))}
        <text x="62" y="102" className="treble-clef">
          𝄞
        </text>
        {parsedChord.notes.map((note, index) => {
          const x = 156 + index * 66;
          const y = STAFF_POSITIONS[note] ?? 96;
          return (
            <g key={`${note}-${index}`}>
              <ellipse cx={x} cy={y} rx={15} ry={10} className="staff-note" transform={`rotate(-18 ${x} ${y})`} />
              <line x1={x + 13} x2={x + 13} y1={y - 3} y2={y - 52} className="note-stem" />
              <text x={x} y={154} className="note-name">
                {note}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
