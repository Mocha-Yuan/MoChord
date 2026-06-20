import type { PracticePlanSource } from "../types/practice";
import type { ProgressionLevel } from "../types/progression";
import type { TuningPreset } from "../types/tuner";
import type { SavedLibraryItemType } from "./library";

type DisplayLanguage = "en" | "zh";

const TUNING_LABELS: Record<string, { en: string; zh: string }> = {
  standard: { en: "Standard", zh: "\u6807\u51c6\u8c03\u5f26" },
  "drop-d": { en: "Drop D", zh: "Drop D \u8c03\u5f26" },
  "low-c": { en: "Low C", zh: "\u4f4e C \u8c03\u5f26" },
  dadgad: { en: "DADGAD", zh: "DADGAD \u8c03\u5f26" },
  "half-step-down": { en: "Half Step Down", zh: "\u964d\u534a\u97f3\u8c03\u5f26" },
  custom: { en: "Custom", zh: "\u81ea\u5b9a\u4e49\u8c03\u5f26" },
};

const LIBRARY_TYPE_LABELS: Record<SavedLibraryItemType, { en: string; zh: string }> = {
  arrangement: { en: "arrangement", zh: "\u7f16\u6392" },
  practice: { en: "practice", zh: "\u7ec3\u4e60\u8ba1\u5212" },
  progression: { en: "progression", zh: "\u548c\u5f26\u8fdb\u884c" },
};

const LEVEL_LABELS: Record<ProgressionLevel, { en: string; zh: string }> = {
  beginner: { en: "beginner", zh: "\u5165\u95e8" },
  professional: { en: "professional", zh: "\u4e13\u4e1a" },
};

const SOURCE_LABELS: Record<PracticePlanSource, { en: string; zh: string }> = {
  ai: { en: "ai", zh: "AI" },
  local: { en: "local", zh: "\u672c\u5730" },
  manual: { en: "manual", zh: "\u624b\u52a8" },
};

const ARRANGEMENT_COACH_TEXT: Record<string, { en: string; zh: string }> = {
  "Song arrangement": { en: "Song arrangement", zh: "\u6b4c\u66f2\u7f16\u6392" },
  "Follow the arrangement form.": {
    en: "Follow the arrangement form.",
    zh: "\u8ddf\u7a33\u6574\u9996\u6b4c\u7684\u7ed3\u6784\u3002",
  },
  "Keep chord changes aligned with the section timing.": {
    en: "Keep chord changes aligned with the section timing.",
    zh: "\u8ba9\u548c\u5f26\u5207\u6362\u5bf9\u9f50\u6bb5\u843d\u65f6\u503c\u3002",
  },
  "Generated from Song Arranger.": {
    en: "Generated from Song Arranger.",
    zh: "\u6765\u81ea\u6b4c\u66f2\u7f16\u6392\u3002",
  },
};

export function getTuningPresetDisplayLabel(preset: Pick<TuningPreset, "id" | "label">, language: DisplayLanguage): string {
  return TUNING_LABELS[preset.id]?.[language] ?? preset.label;
}

export function getLibraryItemTypeLabel(type: SavedLibraryItemType, language: DisplayLanguage): string {
  return LIBRARY_TYPE_LABELS[type][language];
}

export function getPracticeLevelLabel(level: ProgressionLevel, language: DisplayLanguage): string {
  return LEVEL_LABELS[level][language];
}

export function getPracticeSourceLabel(source: PracticePlanSource, language: DisplayLanguage): string {
  return SOURCE_LABELS[source][language];
}

export function getArrangementPracticeCoachCopy(language: DisplayLanguage): {
  rhythmPattern: string;
  goals: string[];
  demoNarrative: string;
} {
  return {
    rhythmPattern: ARRANGEMENT_COACH_TEXT["Song arrangement"][language],
    goals: [
      ARRANGEMENT_COACH_TEXT["Follow the arrangement form."][language],
      ARRANGEMENT_COACH_TEXT["Keep chord changes aligned with the section timing."][language],
    ],
    demoNarrative: ARRANGEMENT_COACH_TEXT["Generated from Song Arranger."][language],
  };
}

export function localizePracticeCoachText(text: string, language: DisplayLanguage): string {
  if (language !== "zh") return text;
  return ARRANGEMENT_COACH_TEXT[text]?.zh ?? text;
}
