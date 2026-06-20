import { ArrowLeft, BarChart3, Dumbbell, Gauge, Guitar, Home, ListMusic, Mic2 } from "lucide-react";
import { useI18n } from "../i18n";
import type { AppPage, NavigateToPage } from "./pageTypes";

type PageHeaderProps = {
  activePage: Exclude<AppPage, "home">;
  eyebrow: string;
  title: string;
  subtitle?: string;
  onNavigate: NavigateToPage;
};

const featurePages: Array<{
  page: Exclude<AppPage, "home">;
  labelKey: "chords" | "practice" | "songArranger" | "metronome" | "tuner" | "learningData";
  Icon: typeof Guitar;
}> = [
  { page: "chords", labelKey: "chords", Icon: Guitar },
  { page: "practice", labelKey: "practice", Icon: Dumbbell },
  { page: "arranger", labelKey: "songArranger", Icon: ListMusic },
  { page: "metronome", labelKey: "metronome", Icon: Gauge },
  { page: "tuner", labelKey: "tuner", Icon: Mic2 },
  { page: "learning", labelKey: "learningData", Icon: BarChart3 },
];

export function PageHeader({ activePage, eyebrow, title, subtitle, onNavigate }: PageHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="page-header">
      <div className="page-heading">
        <p className="eyebrow brand-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>

      <nav className="page-nav" aria-label={t("home")}>
        <button type="button" className="page-nav-button" onClick={() => onNavigate("home")}>
          <ArrowLeft aria-hidden="true" size={18} />
          <span>{t("backHome")}</span>
        </button>
        {featurePages.map(({ page, labelKey, Icon }) => (
          <button
            key={page}
            type="button"
            className={`page-nav-button ${activePage === page ? "active" : ""}`}
            onClick={() => onNavigate(page)}
          >
            <Icon aria-hidden="true" size={18} />
            <span>{t(labelKey)}</span>
          </button>
        ))}
        <button
          type="button"
          className="page-nav-button page-nav-icon"
          aria-label={t("home")}
          onClick={() => onNavigate("home")}
        >
          <Home aria-hidden="true" size={18} />
        </button>
      </nav>
    </header>
  );
}
