import type { Language } from "../i18n";
import type { PracticeCoachPlan, PracticeCoachSkillLevel, ProgressionLevel } from "../types/progression";

type DefaultCoachOptions = {
  input: string;
  key: string;
  level: ProgressionLevel;
  language?: Language;
};

const SKILL_LEVELS: PracticeCoachSkillLevel[] = ["beginner", "intermediate", "advanced"];
const ALLOWED_BARS_PER_CHORD = [1, 2, 4];

export function createDefaultPracticeCoachPlan({ input, key, level, language = "en" }: DefaultCoachOptions): PracticeCoachPlan {
  const isProfessional = level === "professional";
  const skillLevel: PracticeCoachSkillLevel = isProfessional ? "intermediate" : "beginner";
  const startingBpm = isProfessional ? 84 : 72;

  if (language === "zh") {
    return {
      style: inferStyle(input, key, language),
      skillLevel,
      rhythmPattern: isProfessional
        ? "4/4 八分音符扫弦，第二轮加入轻微切分。"
        : "4/4 稳定下扫，熟悉后加入轻松的八分音符重音。",
      startingBpm,
      barsPerChord: 1,
      loopCount: 3,
      bpmIncreasePerLoop: 4,
      goals: [
        "第 1 轮：记住和弦顺序，并提前说出下一个和弦。",
        "第 2 轮：把每次换把动作变小、变顺。",
        "第 3 轮：速度提升时仍然保持节拍稳定。",
      ],
      demoNarrative: "AI 教练会把生成的和弦变成三轮递进练习。",
    };
  }

  return {
    style: inferStyle(input, key, language),
    skillLevel,
    rhythmPattern: isProfessional
      ? "4/4 eighth-note strum with light syncopation after the first pass."
      : "4/4 steady down strums first, then add relaxed eighth-note accents.",
    startingBpm,
    barsPerChord: 1,
    loopCount: 3,
    bpmIncreasePerLoop: 4,
    goals: [
      "Round 1: learn the chord order and say the next chord before it arrives.",
      "Round 2: smooth out the hand movement between each voicing.",
      "Round 3: keep the pulse steady while the tempo rises.",
    ],
    demoNarrative: "The coach turns the generated chords into a three-round practice flow.",
  };
}

export function localizePracticeCoachPlan(
  plan: PracticeCoachPlan,
  options: DefaultCoachOptions,
): PracticeCoachPlan {
  if (options.language !== "zh") return plan;

  const fallback = createDefaultPracticeCoachPlan(options);

  return {
    ...plan,
    style: needsChineseFallback(plan.style) ? fallback.style : plan.style,
    rhythmPattern: needsChineseFallback(plan.rhythmPattern) ? fallback.rhythmPattern : plan.rhythmPattern,
    goals: plan.goals.some(needsChineseFallback) ? fallback.goals : plan.goals,
    demoNarrative: needsChineseFallback(plan.demoNarrative) ? fallback.demoNarrative : plan.demoNarrative,
  };
}

export function coercePracticeCoachPlan(value: unknown, fallback: PracticeCoachPlan): PracticeCoachPlan {
  if (!isRecord(value)) return fallback;

  return {
    style: stringOrFallback(value.style, fallback.style),
    skillLevel: isSkillLevel(value.skillLevel) ? value.skillLevel : fallback.skillLevel,
    rhythmPattern: stringOrFallback(value.rhythmPattern, fallback.rhythmPattern),
    startingBpm: clampNumber(value.startingBpm, 40, 180, fallback.startingBpm),
    barsPerChord: allowedNumber(value.barsPerChord, ALLOWED_BARS_PER_CHORD, fallback.barsPerChord),
    loopCount: clampNumber(value.loopCount, 1, 6, fallback.loopCount),
    bpmIncreasePerLoop: clampNumber(value.bpmIncreasePerLoop, 0, 12, fallback.bpmIncreasePerLoop),
    goals: coerceGoals(value.goals, fallback.goals),
    demoNarrative: stringOrFallback(value.demoNarrative, fallback.demoNarrative),
  };
}

function inferStyle(input: string, key: string, language: Language): string {
  const trimmed = input.trim();

  if (language === "zh") {
    if (!trimmed) return `${key} 调 AI 吉他练习`;
    if (/city\s*pop|城市流行/i.test(trimmed)) return `${key} 调城市流行律动练习`;
    if (/r&b|节奏布鲁斯/i.test(trimmed)) return `${key} 调节奏布鲁斯律动练习`;
    if (/rock|摇滚/i.test(trimmed)) return `${key} 调摇滚副歌练习`;
    if (/cinematic|电影|氛围/i.test(trimmed)) return `${key} 调电影感氛围练习`;
    if (/chorus|副歌/i.test(trimmed)) return `${key} 调温暖流行副歌`;
    if (/folk|民谣/i.test(trimmed)) return `${key} 调民谣弹唱练习`;
    if (/sad|忧郁|melancholy/i.test(trimmed)) return `${key} 调忧郁流行练习`;
    return `${key} 调 AI 吉他练习`;
  }

  if (!trimmed) return `${key} guitar practice`;
  if (/chorus|副歌/i.test(trimmed)) return `${key} warm pop chorus`;
  if (/folk|民谣/i.test(trimmed)) return `${key} folk strumming practice`;
  if (/sad|忧郁|melancholy/i.test(trimmed)) return `${key} melancholy pop practice`;
  return `${key} AI guitar practice`;
}

function needsChineseFallback(value: string): boolean {
  const scrubbed = value
    .replace(/\b(?:AI|BPM|DeepSeek|R&B)\b/gi, "")
    .replace(/\b[A-G](?:#|b)?(?=\s|调|$)/g, "");
  return /[A-Za-z]{2,}/.test(scrubbed);
}

function coerceGoals(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const goals = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  return goals.length > 0 ? goals.slice(0, 5) : fallback;
}

function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function allowedNumber(value: unknown, allowed: number[], fallback: number): number {
  if (typeof value !== "number") return fallback;
  return allowed.includes(value) ? value : fallback;
}

function isSkillLevel(value: unknown): value is PracticeCoachSkillLevel {
  return typeof value === "string" && SKILL_LEVELS.includes(value as PracticeCoachSkillLevel);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
