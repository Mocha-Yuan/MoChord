import { useI18n } from "../i18n";
import type { GuitarVoicing } from "../types/music";
import { fretsToTabLines } from "../utils/guitar";

type TabViewerProps = {
  voicing: GuitarVoicing;
};

export function TabViewer({ voicing }: TabViewerProps) {
  const { t } = useI18n();
  const lines = fretsToTabLines(voicing);

  return (
    <section className="panel tab-panel">
      <div className="panel-heading">
        <p className="eyebrow">{t("sixLineTab")}</p>
        <h2>{t("tab")}</h2>
      </div>
      <pre className="tab-block">{lines.join("\n")}</pre>
    </section>
  );
}
