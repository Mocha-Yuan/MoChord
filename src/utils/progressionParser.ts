import type { SupportedMode } from "../types/progression";
import { getNoteIndex, normalizeNoteName } from "./musicTheory";

const CHINESE_DEGREES: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
};

const ROMAN_DEGREES: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
};

export function parseProgressionInputLocally(input: string): {
  key: string;
  mode: SupportedMode;
  degrees: number[];
} {
  const normalized = input.trim();
  const keyMatch = normalized.match(/\b([A-Ga-g](?:#|b)?)/);

  if (!keyMatch) {
    throw new Error("Please enter a key and progression, such as D调4566 or G Major I-V-vi-IV.");
  }

  const key = normalizeNoteName(keyMatch[1]);
  if (getNoteIndex(key) < 0) {
    throw new Error("Please enter a key and progression, such as D调4566 or G Major I-V-vi-IV.");
  }

  const mode = parseMode(normalized);
  const degrees = parseDegrees(normalized);

  if (degrees.length === 0) {
    throw new Error("Please enter a key and progression, such as D调4566 or G Major I-V-vi-IV.");
  }

  return { key, mode, degrees };
}

function parseMode(input: string): SupportedMode {
  const lower = input.toLowerCase();

  if (lower.includes("dorian")) return "Dorian";
  if (lower.includes("mixolydian")) return "Mixolydian";
  if (input.includes("自然小调") || input.includes("小调") || lower.includes("natural minor") || lower.includes("minor")) {
    return "Natural Minor";
  }
  if (input.includes("大调") || lower.includes("major")) return "Major";

  return "Major";
}

function parseDegrees(input: string): number[] {
  let working = input
    .replace(/\b[A-Ga-g](?:#|b)?\b/g, " ")
    .replace(/\b(natural\s+minor|major|minor|dorian|mixolydian)\b/gi, " ")
    .replace(/[大小自然]?调/g, " ")
    .replace(/\//g, " ");

  working = working.replace(/([一二三四五六七])\s*级/g, (_, chinese: string) => ` ${CHINESE_DEGREES[chinese]} `);

  const compact = working.match(/(?:^|[^0-9])([1-7]{2,})(?:$|[^0-9])/);
  if (compact) {
    return compact[1].split("").map(Number);
  }

  const tokens = working.match(/b?[1-7]|[ivIV]{1,4}/g) ?? [];

  return tokens
    .map((token) => {
      const numberMatch = token.match(/[1-7]/);
      if (numberMatch) return Number(numberMatch[0]);
      return ROMAN_DEGREES[token.toUpperCase()] ?? null;
    })
    .filter((degree): degree is number => degree !== null && degree >= 1 && degree <= 7);
}
