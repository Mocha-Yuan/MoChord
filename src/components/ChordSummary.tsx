import { translateQuality, useI18n } from "../i18n";
import type { ParsedChord } from "../types/music";
import { getIntervalLabels } from "../utils/musicTheory";

type ChordSummaryProps = {
  parsedChord: ParsedChord;
};

export function ChordSummary({ parsedChord }: ChordSummaryProps) {
  const { t } = useI18n();

  return (
    <section className="panel summary-panel">
      <div className="panel-heading">
        <p className="eyebrow">{t("chordDna")}</p>
        <h2>{parsedChord.original}</h2>
      </div>
      <dl className="summary-list">
        <div>
          <dt>{t("root")}</dt>
          <dd>{parsedChord.root}</dd>
        </div>
        <div>
          <dt>{t("quality")}</dt>
          <dd>{translateQuality(parsedChord.quality, t)}</dd>
        </div>
        <div>
          <dt>{t("notes")}</dt>
          <dd>{parsedChord.notes.join(" - ")}</dd>
        </div>
        <div>
          <dt>{t("intervals")}</dt>
          <dd>{getIntervalLabels(parsedChord.intervals).join(" - ")}</dd>
        </div>
      </dl>
    </section>
  );
}
