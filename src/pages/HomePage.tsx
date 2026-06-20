import {
  CalendarDays,
  Dumbbell,
  Flame,
  Gauge,
  Guitar,
  Home,
  ListMusic,
  Mic2,
  Music2,
  Play,
  Settings,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ProfileSettings } from "../components/auth/ProfileSettings";
import { useAuth } from "../hooks/useAuth";
import { type Language, useI18n } from "../i18n";
import { loadProfile } from "../services/profileService";
import type { UserProfile } from "../types/profile";
import { getProfileDisplay, type ProfileDisplay } from "../utils/profileDisplay";
import type { HomePracticeSummary } from "../utils/practiceStats";
import type { NavigateToPage } from "./pageTypes";

type HomePageProps = {
  currentChordName: string;
  practicePlanTitle?: string;
  recentArrangementTitle?: string;
  bpm: number;
  referencePitchLabel?: string;
  homeSummary: HomePracticeSummary;
  recentProgression?: string;
  onNavigate: NavigateToPage;
  onResumeRecentPractice: () => void;
};

const WAVEFORM_BARS = 44;

const COPY: Record<
  Language,
  {
    title: string;
    subtitle: string;
    support: string;
    welcome: string;
    welcomeText: string;
    streak: string;
    week: string;
    dayUnit: string;
    minuteUnit: string;
    home: string;
    chord: string;
    practice: string;
    arranger: string;
    metronome: string;
    tuner: string;
    music: string;
    data: string;
    settings: string;
    enter: string;
    startPractice: string;
    openArranger: string;
    openMetronome: string;
    openTuner: string;
    chordText: string;
    practiceText: string;
    arrangerText: string;
    metronomeText: string;
    tunerText: string;
    today: string;
    minutes: string;
    completion: string;
    days: string;
    saved: string;
    savedUnit: string;
    realRecord: string;
    todayProgress: string;
    recent: string;
    base: string;
    progress: string;
    noRecent: string;
    completed: string;
    inProgress: string;
    settingsTitle: string;
    settingsText: string;
  }
> = {
  en: {
    title: "MoChord Home / Tool Selection",
    subtitle: "Four core tools to begin your music learning and creation journey.",
    support: "Practice-focused · chord-friendly · science-backed growth",
    welcome: "Welcome back, musician",
    welcomeText: "Choose the tool you want to use. Today's progress is waiting.",
    streak: "Streak",
    week: "This week",
    dayUnit: "days",
    minuteUnit: "min",
    home: "Home",
    chord: "Chord workspace",
    practice: "Practice mode",
    arranger: "Song arranger",
    metronome: "Metronome",
    tuner: "Tuner",
    music: "My music",
    data: "Learning data",
    settings: "Settings",
    enter: "Enter workspace",
    startPractice: "Start practice",
    openArranger: "Arrange song",
    openMetronome: "Open metronome",
    openTuner: "Open tuner",
    chordText: "Build, explore, save, and hear chords.",
    practiceText: "Train with progressions, timing, and diagrams.",
    arrangerText: "Build song sections, chords, repeats, and rehearsal notes without lyrics.",
    metronomeText: "Stable pulse, accent control, count-in, and tempo tools.",
    tunerText: "Precise tuning with visual target feedback.",
    today: "Today's practice overview",
    minutes: "practice time",
    completion: "completion",
    days: "streak",
    saved: "saved items",
    savedUnit: "items",
    realRecord: "real record",
    todayProgress: "today",
    recent: "Recent practice",
    base: "Basic",
    progress: "Progress",
    noRecent: "No practice record yet",
    completed: "Completed",
    inProgress: "In progress",
    settingsTitle: "Homepage actions",
    settingsText: "Sidebar entries jump to real tools. Learning data opens the analytics page, and My music opens the practice library area.",
  },
  zh: {
    title: "MoChord 首页 / 工具选择",
    subtitle: "四大核心工具，开启你的音乐学习与创作之旅",
    support: "专注练习 · 乐在和弦 · 科学练习 · 高效成长",
    welcome: "欢迎回来，音乐人",
    welcomeText: "选择你想使用的工具，今天也要持续进步！",
    streak: "连续练习",
    week: "本周练习",
    dayUnit: "天",
    minuteUnit: "分钟",
    home: "首页",
    chord: "和弦工作台",
    practice: "练习模式",
    arranger: "歌曲编排",
    metronome: "节拍器",
    tuner: "调音器",
    music: "我的音乐",
    data: "学习数据",
    settings: "设置",
    enter: "进入工作台",
    startPractice: "开始练习",
    openArranger: "编排歌曲",
    openMetronome: "打开节拍器",
    openTuner: "打开调音器",
    chordText: "构建、探索、创作，创建和弦、查看指法与和声。",
    practiceText: "刻意练习、提升演奏，系统化训练科学提升技巧。",
    arrangerText: "编写歌曲段落、和弦、反复次数和排练备注，不包含歌词。",
    metronomeText: "稳定节奏、精准监控，专业节拍器支持多种节奏型。",
    tunerText: "精准调音、音准无忧，快速校准支持多种调音模式。",
    today: "今日练习概览",
    minutes: "练习时长",
    completion: "练习完成率",
    days: "连续练习",
    saved: "已保存乐段",
    savedUnit: "个",
    realRecord: "真实记录",
    todayProgress: "今日进度",
    recent: "最近练习",
    base: "基础",
    progress: "进度",
    noRecent: "还没有练习记录",
    completed: "已完成",
    inProgress: "进行中",
    settingsTitle: "首页功能说明",
    settingsText: "侧边栏入口都已接入真实页面；学习数据会打开分析页面，我的音乐会进入练习页的曲库区域。",
  },
};

export function HomePage({
  currentChordName,
  practicePlanTitle,
  recentArrangementTitle,
  bpm,
  referencePitchLabel = "A4 440 Hz",
  homeSummary,
  recentProgression,
  onNavigate,
  onResumeRecentPractice,
}: HomePageProps) {
  const { language } = useI18n();
  const { isAuthenticated, user } = useAuth();
  const copy = COPY[language];
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const recentSession = homeSummary.recentSession;
  const recentTitle = recentSession?.title ?? practicePlanTitle ?? recentProgression ?? currentChordName;
  const recentProgress = recentSession?.progressPercent ?? 0;
  const recentChords = recentSession?.chords.join(" - ") ?? copy.noRecent;
  const recentTempo = recentSession ? `${recentSession.bpm} BPM · ${recentSession.timeSignatureLabel}` : `${bpm} BPM · 4/4`;
  const profileDisplay = useMemo(() => getProfileDisplay({ profile, user }), [profile, user]);
  const welcomeTitle = isAuthenticated
    ? language === "zh"
      ? `欢迎回来，${profileDisplay.name}`
      : `Welcome back, ${profileDisplay.name}`
    : copy.welcome;

  useEffect(() => {
    if (!isAuthenticated) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    loadProfile().then((result) => {
      if (!cancelled && !result.error) setProfile(result.data);
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  return (
    <>
      <header className="home-showcase-header">
        <p className="eyebrow brand-eyebrow">MOCHORD</p>
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
        <span>{copy.support}</span>
      </header>

      <section className="home-workbench" aria-label={copy.title}>
        <aside className="home-sidebar">
          <div className="home-sidebar-brand">
            <span className="home-logo-mark" aria-hidden="true">
              <Music2 size={22} />
            </span>
            <strong>MOCHORD</strong>
          </div>

          <nav className="home-sidebar-nav" aria-label={copy.title}>
            <button type="button" className="active" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              <Home size={18} aria-hidden="true" />
              {copy.home}
            </button>
            <button type="button" onClick={() => onNavigate("chords")}>
              <Guitar size={18} aria-hidden="true" />
              {copy.chord}
            </button>
            <button type="button" onClick={() => onNavigate("practice")}>
              <Dumbbell size={18} aria-hidden="true" />
              {copy.practice}
            </button>
            <button type="button" onClick={() => onNavigate("arranger")}>
              <ListMusic size={18} aria-hidden="true" />
              {copy.arranger}
            </button>
            <button type="button" onClick={() => onNavigate("metronome")}>
              <Gauge size={18} aria-hidden="true" />
              {copy.metronome}
            </button>
            <button type="button" onClick={() => onNavigate("tuner")}>
              <Mic2 size={18} aria-hidden="true" />
              {copy.tuner}
            </button>
          </nav>

          <nav className="home-sidebar-nav home-sidebar-secondary" aria-label={copy.settings}>
            <button type="button" onClick={() => onNavigate("practice")}>
              <Music2 size={17} aria-hidden="true" />
              {copy.music}
            </button>
            <button type="button" onClick={() => onNavigate("learning")}>
              <ShieldCheck size={17} aria-hidden="true" />
              {copy.data}
            </button>
          </nav>

          <button type="button" className="home-settings-button" onClick={() => setSettingsOpen((current) => !current)}>
            <Settings size={17} aria-hidden="true" />
            {copy.settings}
          </button>
        </aside>

        <div className="home-main-stage">
          <section className="home-stage-hero">
            <div className="home-stage-copy">
              {isAuthenticated ? <HomeUserWelcome display={profileDisplay} language={language} /> : null}
              <h2>{welcomeTitle}</h2>
              <p>{copy.welcomeText}</p>
            </div>
            <div className="home-status-row">
              <span>
                <CalendarDays size={15} aria-hidden="true" />
                {copy.streak} {homeSummary.streakDays} {copy.dayUnit}
              </span>
              <span>
                <Gauge size={15} aria-hidden="true" />
                {copy.week} {homeSummary.weekMinutes} {copy.minuteUnit}
              </span>
            </div>
            <div className="home-wave-scene" aria-hidden="true">
              <div className="home-wave-line" />
              <div className="home-wave-bars">
                {Array.from({ length: WAVEFORM_BARS }, (_, index) => (
                  <i key={index} style={{ animationDelay: `${index * 34}ms` }} />
                ))}
              </div>
            </div>
          </section>

          <section className="home-tool-grid" aria-label={copy.title}>
            <ToolCard
              variant="chord"
              title={copy.chord}
              text={copy.chordText}
              action={copy.enter}
              meta={currentChordName}
              onClick={() => onNavigate("chords")}
            />
            <ToolCard
              variant="practice"
              title={copy.practice}
              text={copy.practiceText}
              action={copy.startPractice}
              meta={`${bpm} BPM`}
              onClick={() => onNavigate("practice")}
            />
            <ToolCard
              variant="arranger"
              title={copy.arranger}
              text={copy.arrangerText}
              action={copy.openArranger}
              meta={recentArrangementTitle ?? copy.arranger}
              onClick={() => onNavigate("arranger")}
            />
            <ToolCard
              variant="metronome"
              title={copy.metronome}
              text={copy.metronomeText}
              action={copy.openMetronome}
              meta={`${bpm} BPM`}
              onClick={() => onNavigate("metronome")}
            />
            <ToolCard
              variant="tuner"
              title={copy.tuner}
              text={copy.tunerText}
              action={copy.openTuner}
              meta={referencePitchLabel}
              onClick={() => onNavigate("tuner")}
            />
          </section>

          <section className="home-bottom-grid">
            <div className="home-stats-panel">
              <h3>{copy.today}</h3>
              <div className="home-stat-grid">
                <div>
                  <strong>{homeSummary.todayMinutes}</strong>
                  <span>{copy.minutes}</span>
                  <small>{copy.realRecord}</small>
                </div>
                <div>
                  <strong>{homeSummary.completionRate}%</strong>
                  <span>{copy.completion}</span>
                  <small>{copy.todayProgress}</small>
                </div>
                <div>
                  <strong>{homeSummary.streakDays}</strong>
                  <span>{copy.days}</span>
                  <small><Flame size={15} aria-hidden="true" /> {homeSummary.streakDays} {copy.dayUnit}</small>
                </div>
                <div>
                  <strong>{homeSummary.savedItemCount}</strong>
                  <span>{copy.saved}</span>
                  <small><Trophy size={15} aria-hidden="true" /> {homeSummary.savedItemCount} {copy.savedUnit}</small>
                </div>
              </div>
            </div>

            <button type="button" className="home-recent-card" onClick={onResumeRecentPractice}>
              <span className="home-recent-icon">
                <Music2 size={18} aria-hidden="true" />
              </span>
              <span>
                <strong>{copy.recent}</strong>
                <small>{recentSession ? `${recentChords} · ${recentSession.completed ? copy.completed : copy.inProgress}` : recentChords}</small>
                <em>{recentTempo}</em>
              </span>
              <span className="home-recent-play" aria-hidden="true">
                <Play size={18} />
              </span>
              <i>
                <b style={{ width: `${recentProgress}%` }} />
              </i>
              <small>{copy.progress} {recentProgress}%</small>
            </button>
          </section>

          {settingsOpen ? (
            <section className="home-settings-panel">
              <strong>{copy.settingsTitle}</strong>
              <p>{copy.settingsText}</p>
              <ProfileSettings />
            </section>
          ) : null}
        </div>
      </section>
    </>
  );
}

function HomeUserWelcome({ display, language }: { display: ProfileDisplay; language: Language }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const label = language === "zh" ? "已登录，云端同步已开启" : "Signed in, cloud sync is on";

  useEffect(() => {
    setAvatarFailed(false);
  }, [display.avatarUrl]);

  return (
    <div className="home-user-welcome">
      <span className="home-user-avatar" aria-hidden="true">
        {display.avatarUrl && !avatarFailed ? <img src={display.avatarUrl} alt="" onError={() => setAvatarFailed(true)} /> : display.initials}
      </span>
      <span>
        <small>{label}</small>
        <strong>{display.name}</strong>
      </span>
    </div>
  );
}

type ToolCardProps = {
  variant: "chord" | "practice" | "arranger" | "metronome" | "tuner";
  title: string;
  text: string;
  action: string;
  meta: string;
  onClick: () => void;
};

function ToolCard({ variant, title, text, action, meta, onClick }: ToolCardProps) {
  return (
    <button type="button" className={`home-tool-card home-tool-${variant}`} onClick={onClick}>
      <span className="home-tool-art" aria-hidden="true">
        {variant === "chord" ? <ChordPreview /> : null}
        {variant === "practice" ? <PracticePreview /> : null}
        {variant === "arranger" ? <ArrangerPreview /> : null}
        {variant === "metronome" ? <MetronomePreview /> : null}
        {variant === "tuner" ? <TunerPreview /> : null}
      </span>
      <strong>{title}</strong>
      <span>{text}</span>
      <small>{meta}</small>
      <em>{action} <span aria-hidden="true">→</span></em>
    </button>
  );
}

function ChordPreview() {
  return (
    <svg viewBox="0 0 150 76" role="img" aria-hidden="true">
      <path d="M24 14h76M24 28h76M24 42h76M24 56h76M36 8v56M52 8v56M68 8v56M84 8v56" />
      <circle cx="52" cy="38" r="6" />
      <circle cx="76" cy="26" r="5" />
      <path d="M111 37c8-10 17-10 25 0" />
      <path d="M13 42c8-10 17-10 25 0" />
    </svg>
  );
}

function PracticePreview() {
  return (
    <span className="home-practice-preview">
      <i />
      <b><Play size={22} fill="currentColor" /></b>
      <i />
    </span>
  );
}

function ArrangerPreview() {
  return (
    <svg viewBox="0 0 150 76" role="img" aria-hidden="true">
      <path d="M28 18h78M28 38h92M28 58h70" />
      <path d="M22 18v40M112 18v40" />
      <circle cx="42" cy="18" r="5" />
      <circle cx="64" cy="38" r="5" />
      <circle cx="86" cy="58" r="5" />
      <path d="M122 22h14M122 34h14M122 46h14" />
    </svg>
  );
}

function MetronomePreview() {
  return (
    <span className="home-metronome-preview">
      <strong>72</strong>
      <small>BPM</small>
      <i />
    </span>
  );
}

function TunerPreview() {
  return (
    <span className="home-tuner-preview">
      <strong>E</strong>
      <small>-2 ct</small>
    </span>
  );
}
