import { BarChart3, CalendarDays, CheckCircle2, Clock3, Dumbbell, Flame, Music2, Play, Trophy } from "lucide-react";

import { type Language, useI18n } from "../i18n";
import type { HomePracticeSummary, LearningDataSessionSummary, LearningDataSummary } from "../utils/practiceStats";
import { PageHeader } from "./PageHeader";
import type { NavigateToPage } from "./pageTypes";

type LearningDataPageProps = {
  summary: LearningDataSummary;
  homeSummary: HomePracticeSummary;
  onNavigate: NavigateToPage;
  onResumeSession: (session: LearningDataSessionSummary) => void;
};

const COPY: Record<
  Language,
  {
    title: string;
    subtitle: string;
    overview: string;
    streak: string;
    weekMinutes: string;
    totalMinutes: string;
    completion: string;
    totalSessions: string;
    completedSessions: string;
    trend: string;
    trendHint: string;
    topChords: string;
    history: string;
    emptyTitle: string;
    emptyText: string;
    continuePractice: string;
    completed: string;
    inProgress: string;
    minutes: string;
    sessions: string;
    loops: string;
    saved: string;
  }
> = {
  en: {
    title: "Learning data",
    subtitle: "Real practice records, weekly progress, chord focus, and recent session history.",
    overview: "Practice overview",
    streak: "Streak",
    weekMinutes: "This week",
    totalMinutes: "Total minutes",
    completion: "Average completion",
    totalSessions: "Total sessions",
    completedSessions: "Completed",
    trend: "7-day trend",
    trendHint: "Minutes and completion are calculated from completed or stopped practice sessions.",
    topChords: "Top practiced chords",
    history: "Practice history",
    emptyTitle: "No learning data yet",
    emptyText: "Start a practice session and MoChord will build this dashboard from real records.",
    continuePractice: "Continue",
    completed: "Completed",
    inProgress: "In progress",
    minutes: "min",
    sessions: "sessions",
    loops: "loops",
    saved: "saved items",
  },
  zh: {
    title: "学习数据",
    subtitle: "基于真实练习记录展示周进度、常练和弦、完成率与历史会话。",
    overview: "练习总览",
    streak: "连续练习",
    weekMinutes: "本周练习",
    totalMinutes: "累计时长",
    completion: "平均完成率",
    totalSessions: "练习次数",
    completedSessions: "已完成",
    trend: "近 7 天趋势",
    trendHint: "练习分钟与完成率来自已完成或手动停止的真实练习会话。",
    topChords: "常练和弦",
    history: "练习历史",
    emptyTitle: "还没有学习数据",
    emptyText: "开始一次练习后，MoChord 会用真实记录自动生成这里的数据。",
    continuePractice: "继续练习",
    completed: "已完成",
    inProgress: "进行中",
    minutes: "分钟",
    sessions: "次",
    loops: "轮",
    saved: "已保存",
  },
};

export function LearningDataPage({ summary, homeSummary, onNavigate, onResumeSession }: LearningDataPageProps) {
  const { language, t } = useI18n();
  const copy = COPY[language];
  const maxTrendMinutes = Math.max(1, ...summary.dailyTrend.map((day) => day.minutes));

  return (
    <>
      <PageHeader
        activePage="learning"
        eyebrow={t("heroEyebrow")}
        title={copy.title}
        subtitle={copy.subtitle}
        onNavigate={onNavigate}
      />

      <section className="learning-overview-grid" aria-label={copy.overview}>
        <MetricCard Icon={Flame} label={copy.streak} value={`${homeSummary.streakDays}`} detail={language === "zh" ? "天" : "days"} />
        <MetricCard Icon={CalendarDays} label={copy.weekMinutes} value={`${homeSummary.weekMinutes}`} detail={copy.minutes} />
        <MetricCard Icon={Clock3} label={copy.totalMinutes} value={`${summary.totalMinutes}`} detail={copy.minutes} />
        <MetricCard Icon={CheckCircle2} label={copy.completion} value={`${summary.averageCompletionRate}%`} detail={copy.completed} />
        <MetricCard Icon={Dumbbell} label={copy.totalSessions} value={`${summary.totalSessions}`} detail={copy.sessions} />
        <MetricCard Icon={Trophy} label={copy.completedSessions} value={`${summary.completedSessions}`} detail={copy.sessions} />
      </section>

      <section className="learning-data-layout">
        <article className="panel learning-trend-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{copy.overview}</p>
              <h2>{copy.trend}</h2>
            </div>
            <BarChart3 size={22} aria-hidden="true" />
          </div>
          <div className="learning-trend-chart" role="list" aria-label={copy.trend}>
            {summary.dailyTrend.map((day) => (
              <div key={day.dateKey} role="listitem" className="learning-trend-day">
                <span>{day.minutes}</span>
                <i style={{ height: `${Math.max(8, (day.minutes / maxTrendMinutes) * 100)}%` }}>
                  <b style={{ height: `${day.completionRate}%` }} />
                </i>
                <small>{formatShortDate(day.dateKey, language)}</small>
              </div>
            ))}
          </div>
          <p className="learning-muted">{copy.trendHint}</p>
        </article>

        <article className="panel learning-chord-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{copy.history}</p>
              <h2>{copy.topChords}</h2>
            </div>
            <Music2 size={22} aria-hidden="true" />
          </div>
          {summary.topChords.length > 0 ? (
            <div className="learning-chord-list">
              {summary.topChords.map((chord) => (
                <div key={chord.name}>
                  <strong>{chord.name}</strong>
                  <span>{chord.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyLearningState title={copy.emptyTitle} text={copy.emptyText} />
          )}
        </article>
      </section>

      <section className="panel learning-history-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">{copy.overview}</p>
            <h2>{copy.history}</h2>
          </div>
          <span className="playing-pill">{summary.recentSessions.length} {copy.sessions}</span>
        </div>

        {summary.recentSessions.length > 0 ? (
          <div className="learning-history-list">
            {summary.recentSessions.map((session) => (
              <article key={session.id} className="learning-history-item">
                <div>
                  <strong>{session.title}</strong>
                  <span>{session.chords.join(" - ")}</span>
                  <small>
                    {formatDateTime(session.startedAt, language)} / {session.bpm} BPM / {session.timeSignatureLabel}
                  </small>
                </div>
                <div className="learning-history-progress">
                  <span>{session.completed ? copy.completed : copy.inProgress}</span>
                  <i><b style={{ width: `${session.progressPercent}%` }} /></i>
                  <small>
                    {session.durationMinutes} {copy.minutes} / {session.completedLoops}-{session.targetLoops} {copy.loops}
                  </small>
                </div>
                <button type="button" className="secondary-button" onClick={() => onResumeSession(session)}>
                  <Play size={16} aria-hidden="true" />
                  {copy.continuePractice}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyLearningState title={copy.emptyTitle} text={copy.emptyText} />
        )}
      </section>
    </>
  );
}

type MetricCardProps = {
  Icon: typeof Flame;
  label: string;
  value: string;
  detail: string;
};

function MetricCard({ Icon, label, value, detail }: MetricCardProps) {
  return (
    <article className="learning-metric-card">
      <span aria-hidden="true">
        <Icon size={19} />
      </span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
      <em>{detail}</em>
    </article>
  );
}

function EmptyLearningState({ title, text }: { title: string; text: string }) {
  return (
    <div className="learning-empty-state">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function formatShortDate(dateKey: string, language: Language): string {
  const [, month, day] = dateKey.split("-");
  return language === "zh" ? `${Number(month)}/${Number(day)}` : `${month}/${day}`;
}

function formatDateTime(iso: string, language: Language): string {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
