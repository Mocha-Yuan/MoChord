import { invoke } from "@tauri-apps/api/core";
import type { Language } from "../i18n";
import type { SongDraftGenerationResult, SongDraftRequest } from "../types/songDraft";
import { getRuntimeLabel, hasTauriRuntime } from "../utils/runtime";
import { coerceSongDraftResult, createLocalFallbackSongDraft } from "../utils/songDraft";
import { buildSongDraftSystemPrompt, buildSongDraftUserInput } from "./songDraftPrompt";

export class DeepSeekSongDraftError extends Error {
  code: "missing-api-key" | "request-failed" | "invalid-json" | "invalid-schema";

  constructor(code: DeepSeekSongDraftError["code"], message: string) {
    super(message);
    this.name = "DeepSeekSongDraftError";
    this.code = code;
  }
}

export async function generateSongDraftWithDeepSeek(
  request: SongDraftRequest,
  language: Language,
): Promise<SongDraftGenerationResult> {
  if (!hasTauriRuntime()) {
    throw new DeepSeekSongDraftError(
      "missing-api-key",
      `DeepSeek song drafts are only available in the ${getRuntimeLabel("tauri")}.`,
    );
  }

  let content: string;
  try {
    content = await invoke<string>("generate_deepseek_progression", {
      input: buildSongDraftUserInput(request),
      systemPrompt: buildSongDraftSystemPrompt(language),
    });
  } catch (caught) {
    const message = typeof caught === "string" ? caught : "DeepSeek request failed. Local fallback has been used.";
    if (message.startsWith("missing-api-key:")) {
      throw new DeepSeekSongDraftError(
        "missing-api-key",
        "DeepSeek API key is missing. Save your API key in the app settings.",
      );
    }
    if (message.startsWith("invalid-json:")) {
      throw new DeepSeekSongDraftError("invalid-json", "DeepSeek returned invalid JSON. Local fallback has been used.");
    }
    throw new DeepSeekSongDraftError("request-failed", "DeepSeek request failed. Local fallback has been used.");
  }

  try {
    return coerceSongDraftResult(JSON.parse(content), request, "deepseek");
  } catch (caught) {
    if (caught instanceof DeepSeekSongDraftError) throw caught;
    throw new DeepSeekSongDraftError(
      "invalid-json",
      "DeepSeek returned an invalid song draft. Local fallback has been used.",
    );
  }
}

export function generateLocalFallbackSongDraftResult(
  request: SongDraftRequest,
  warning: string,
): SongDraftGenerationResult {
  return createLocalFallbackSongDraft(request, warning);
}
