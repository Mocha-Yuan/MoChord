import type { TunerStatus } from "../types/tuner";

type TunerDialProps = {
  targetLabel: string;
  detectedNoteLabel: string;
  frequencyLabel: string;
  targetCents: number | null;
  pointerCents: number | null;
  status: TunerStatus;
  statusLabel: string;
  directionLabel: string;
  referenceLabel: string;
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const TICK_COUNT = 96;
const CENTER = 200;
const NOTE_RADIUS = 155;
const TICK_OUTER_RADIUS = 135;
const TICK_INNER_RADIUS = 126;
const STRONG_TICK_INNER_RADIUS = 116;
const POINTER_LENGTH = 118;
const POINTER_BASE_LENGTH = 18;
const POINTER_OFFSET_DEGREES = 18;

export function TunerDial({
  targetLabel,
  detectedNoteLabel,
  frequencyLabel,
  targetCents,
  pointerCents,
  status,
  statusLabel,
  directionLabel,
  referenceLabel,
}: TunerDialProps) {
  const targetNote = extractNoteName(targetLabel);
  const pointerNote = extractNoteName(detectedNoteLabel) || targetNote;
  const pointerIndex = Math.max(0, NOTE_NAMES.indexOf(pointerNote));
  const clampedCents = pointerCents === null ? 0 : clamp(pointerCents, -50, 50);
  const baseAngle = noteIndexToAngle(pointerIndex);
  const pointerAngle = baseAngle + (clampedCents / 50) * POINTER_OFFSET_DEGREES;
  const pointerStart = polarToPoint(CENTER, CENTER, POINTER_BASE_LENGTH, pointerAngle + 180);
  const pointerEnd = polarToPoint(CENTER, CENTER, POINTER_LENGTH, pointerAngle);
  const centsLabel = targetCents === null ? "--" : `${targetCents > 0 ? "+" : ""}${Math.round(targetCents)} cents`;
  const detailLabel = targetCents === null ? referenceLabel : `${directionLabel} / ${targetLabel} / ${referenceLabel}`;
  const ariaLabel = `Tuner target ${targetLabel}, detected ${detectedNoteLabel}, frequency ${frequencyLabel}, offset ${centsLabel}, status ${statusLabel}.`;

  return (
    <section className={`tuner-dial tuner-dial-${status}`} aria-label={ariaLabel}>
      <div className="tuner-dial-orbit">
        <svg className="tuner-dial-svg" viewBox="0 0 400 400" role="img" aria-label={ariaLabel}>
          <defs>
            <radialGradient id="tunerDialFace" cx="50%" cy="48%" r="58%">
              <stop offset="0%" stopColor="#10202a" />
              <stop offset="62%" stopColor="#071019" />
              <stop offset="100%" stopColor="#03070d" />
            </radialGradient>
            <filter id="tunerPointerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle className="tuner-dial-face" cx={CENTER} cy={CENTER} r="178" />
          <circle className="tuner-dial-ring tuner-dial-ring-outer" cx={CENTER} cy={CENTER} r="176" />
          <circle className="tuner-dial-ring tuner-dial-ring-inner" cx={CENTER} cy={CENTER} r="144" />

          <g aria-hidden="true">
            {Array.from({ length: TICK_COUNT }).map((_, index) => {
              const isStrong = index % 8 === 0;
              const angle = (index / TICK_COUNT) * 360 - 90;
              const outer = polarToPoint(CENTER, CENTER, TICK_OUTER_RADIUS, angle);
              const inner = polarToPoint(
                CENTER,
                CENTER,
                isStrong ? STRONG_TICK_INNER_RADIUS : TICK_INNER_RADIUS,
                angle,
              );

              return (
                <line
                  key={index}
                  className={isStrong ? "tuner-dial-tick tuner-dial-tick-strong" : "tuner-dial-tick"}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                />
              );
            })}
          </g>

          <g aria-hidden="true">
            {NOTE_NAMES.map((note, index) => {
              const point = polarToPoint(CENTER, CENTER, NOTE_RADIUS, noteIndexToAngle(index));
              const isTarget = note === targetNote;
              const isDetected = note === pointerNote;

              return (
                <text
                  key={note}
                  className={[
                    "tuner-dial-note",
                    isTarget ? "tuner-dial-note-target" : "",
                    isDetected ? "tuner-dial-note-detected" : "",
                  ].join(" ")}
                  x={point.x}
                  y={point.y}
                  dominantBaseline="middle"
                  textAnchor="middle"
                >
                  {note}
                </text>
              );
            })}
          </g>

          <line
            className="tuner-dial-pointer"
            x1={pointerStart.x}
            y1={pointerStart.y}
            x2={pointerEnd.x}
            y2={pointerEnd.y}
            filter="url(#tunerPointerGlow)"
          />
          <circle className="tuner-dial-hub-shadow" cx={CENTER} cy={CENTER} r="19" />
          <circle className="tuner-dial-hub" cx={CENTER} cy={CENTER} r="14" />

          <text className="tuner-dial-center-note" x={CENTER} y="224" textAnchor="middle">
            {detectedNoteLabel}
          </text>
          <text className="tuner-dial-center-frequency" x={CENTER} y="250" textAnchor="middle">
            {frequencyLabel}
          </text>
        </svg>
      </div>

      <div className="tuner-dial-status-card">
        <span className="tuner-dial-status-mark" aria-hidden="true">
          {status === "in-tune" ? "OK" : "--"}
        </span>
        <span>
          <strong>{statusLabel}</strong>
          <small>{detailLabel}</small>
        </span>
      </div>
    </section>
  );
}

function extractNoteName(label: string): string {
  const match = label.match(/[A-G]#?/);
  return match?.[0] ?? "A";
}

function noteIndexToAngle(index: number): number {
  return (index / NOTE_NAMES.length) * 360 - 90;
}

function polarToPoint(cx: number, cy: number, radius: number, angleDegrees: number): { x: number; y: number } {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRadians),
    y: cy + radius * Math.sin(angleRadians),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
