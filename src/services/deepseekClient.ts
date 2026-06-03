import { invoke } from "@tauri-apps/api/core";
import type { AIChordProgressionResult, AIProgressionVersion, SupportedMode } from "../types/progression";
import { createLocalChordProgressionResult } from "../utils/diatonicChords";
import { parseProgressionInputLocally } from "../utils/progressionParser";
import { CHORD_PROGRESSION_SYSTEM_PROMPT } from "./deepseekPrompt";

const SUPPORTED_MODES: SupportedMode[] = ["Major", "Natural Minor", "Dorian", "Mixolydian"];

export type DeepSeekApiKeyStatus = {
  configured: boolean;
  source: "saved" | "environment" | "none";
  maskedKey?: string;
};

export class DeepSeekProgressionError extends Error {
  code: "missing-api-key" | "request-failed" | "invalid-json" | "invalid-schema";

  constructor(code: DeepSeekProgressionError["code"], message: string) {
    super(message);
    this.name = "DeepSeekProgressionError";
    this.code = code;
  }
}

export function hasDeepSeekApiKey(): boolean {
  return Boolean(window.__TAURI_INTERNALS__);
}

export function hasDeepSeekRuntime(): boolean {
  return Boolean(window.__TAURI_INTERNALS__);
}

export async function getDeepSeekApiKeyStatus(): Promise<DeepSeekApiKeyStatus> {
  if (!window.__TAURI_INTERNALS__) {
    return { configured: false, source: "none" };
  }

  return invoke<DeepSeekApiKeyStatus>("get_deepseek_api_key_status");
}

export async function saveDeepSeekApiKey(apiKey: string): Promise<DeepSeekApiKeyStatus> {
  return invoke<DeepSeekApiKeyStatus>("save_deepseek_api_key", { apiKey });
}

export async function clearDeepSeekApiKey(): Promise<DeepSeekApiKeyStatus> {
  return invoke<DeepSeekApiKeyStatus>("clear_deepseek_api_key");
}

export async function testDeepSeekApiKey(apiKey?: string): Promise<DeepSeekApiKeyStatus> {
  return invoke<DeepSeekApiKeyStatus>("test_deepseek_api_key", { apiKey: apiKey || null });
}

export async function generateChordProgressionWithDeepSeek(input: string): Promise<AIChordProgressionResult> {
  if (!window.__TAURI_INTERNALS__) {
    throw new DeepSeekProgressionError(
      "missing-api-key",
      "DeepSeek generation is only available in the Tauri desktop app.",
    );
  }

  let content: string;
  try {
    content = await invoke<string>("generate_deepseek_progression", {
      input,
      systemPrompt: CHORD_PROGRESSION_SYSTEM_PROMPT,
    });
  } catch (caught) {
    const message = typeof caught === "string" ? caught : "DeepSeek request failed. You can use local fallback instead.";
    if (message.startsWith("missing-api-key:")) {
      throw new DeepSeekProgressionError(
        "missing-api-key",
        "DeepSeek API key is missing. Save your API key in the app settings.",
      );
    }
    if (message.startsWith("invalid-json:")) {
      throw new DeepSeekProgressionError("invalid-json", "DeepSeek returned an invalid format. Local fallback has been used.");
    }
    throw new DeepSeekProgressionError("request-failed", "DeepSeek request failed. You can use local fallback instead.");
  }

  try {
    return coerceProgressionResult(JSON.parse(content));
  } catch {
    throw new DeepSeekProgressionError("invalid-json", "DeepSeek returned an invalid format. Local fallback has been used.");
  }
}

export function generateLocalFallbackProgression(input: string, warning?: string): AIChordProgressionResult {
  const parsed = parseProgressionInputLocally(input);
  return createLocalChordProgressionResult(input, parsed.key, parsed.mode, parsed.degrees, warning);
}

function coerceProgressionResult(value: unknown): AIChordProgressionResult {
  if (!isRecord(value)) {
    throw new DeepSeekProgressionError("invalid-schema", "DeepSeek returned an invalid format. Local fallback has been used.");
  }

  const mode = value.mode;
  const degrees = value.degrees;

  if (typeof value.key !== "string" || !isSupportedMode(mode) || !isNumberArray(degrees)) {
    throw new DeepSeekProgressionError("invalid-schema", "DeepSeek returned an invalid format. Local fallback has been used.");
  }

  const beginner = coerceVersion(value.beginner, "Beginner");
  const professional = coerceVersion(value.professional, "Professional");

  return {
    normalizedInput: typeof value.normalizedInput === "string" ? value.normalizedInput : `${value.key} ${mode} ${degrees.join("-")}`,
    key: value.key,
    mode,
    degrees,
    romanNumerals: Array.isArray(value.romanNumerals) ? value.romanNumerals.filter(isString) : [],
    beginner,
    professional,
    notes: Array.isArray(value.notes) ? value.notes.filter(isString) : [],
    warnings: Array.isArray(value.warnings) ? value.warnings.filter(isString) : [],
  };
}

function coerceVersion(value: unknown, label: "Beginner" | "Professional"): AIProgressionVersion {
  if (!isRecord(value) || !Array.isArray(value.chords)) {
    throw new DeepSeekProgressionError("invalid-schema", "DeepSeek returned an invalid format. Local fallback has been used.");
  }

  return {
    label,
    description: typeof value.description === "string" ? value.description : "",
    chords: value.chords.map((chord) => {
      if (!isRecord(chord) || typeof chord.chord !== "string") {
        throw new DeepSeekProgressionError("invalid-schema", "DeepSeek returned an invalid format. Local fallback has been used.");
      }

      return {
        degree: typeof chord.degree === "number" ? chord.degree : 1,
        roman: typeof chord.roman === "string" ? chord.roman : "",
        chord: chord.chord,
        function: typeof chord.function === "string" ? chord.function : "",
        explanation: typeof chord.explanation === "string" ? chord.explanation : "",
      };
    }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSupportedMode(value: unknown): value is SupportedMode {
  return typeof value === "string" && SUPPORTED_MODES.includes(value as SupportedMode);
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
