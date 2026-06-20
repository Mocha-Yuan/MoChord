import { RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import {
  DeepSeekSongDraftError,
  generateLocalFallbackSongDraftResult,
  generateSongDraftWithDeepSeek,
} from "../services/songDraftClient";
import type {
  SongArrangement,
  SongArrangementDifficulty,
  SongArrangementStyle,
  SongArrangementTimeSignature,
} from "../types/songArrangement";
import type { SongDraftGenerationResult, SongDraftLength, SongDraftRequest } from "../types/songDraft";
import { createDefaultSongDraftRequest } from "../utils/songDraft";
import { clampArrangementBpm } from "../utils/songArrangement";
import {
  getSongArrangementDifficultyLabel,
  getSongArrangementStyleLabel,
} from "../utils/songArrangementLocalization";

type SongDraftGeneratorProps = {
  arrangement: SongArrangement;
  onApplyDraft: (arrangement: SongArrangement) => void;
};

const STYLE_OPTIONS: SongArrangementStyle[] = ["pop", "folk", "ballad", "rock", "worship", "city-pop", "campfire"];
const DIFFICULTY_OPTIONS: SongArrangementDifficulty[] = ["beginner", "intermediate", "advanced"];
const TIME_SIGNATURE_OPTIONS: SongArrangementTimeSignature[] = ["4/4", "3/4", "6/8"];
const LENGTH_OPTIONS: SongDraftLength[] = ["short", "standard", "full"];

const LENGTH_LABEL_KEYS: Record<SongDraftLength, "songDraftLengthShort" | "songDraftLengthStandard" | "songDraftLengthFull"> = {
  short: "songDraftLengthShort",
  standard: "songDraftLengthStandard",
  full: "songDraftLengthFull",
};

type ArrangementDraftDefaults = Pick<SongDraftRequest, "style" | "key" | "difficulty" | "bpm" | "timeSignature">;

function getArrangementDraftDefaults(arrangement: SongArrangement): ArrangementDraftDefaults {
  return {
    style: arrangement.style,
    key: arrangement.key,
    difficulty: arrangement.difficulty,
    bpm: arrangement.bpm,
    timeSignature: arrangement.timeSignature,
  };
}

export function SongDraftGenerator({ arrangement, onApplyDraft }: SongDraftGeneratorProps) {
  const { language, t } = useI18n();
  const [request, setRequest] = useState<SongDraftRequest>(() => createDefaultSongDraftRequest(arrangement, language));
  const [draft, setDraft] = useState<SongDraftGenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const previousDefaultsRef = useRef<ArrangementDraftDefaults>(getArrangementDraftDefaults(arrangement));
  const previousArrangementIdRef = useRef(arrangement.id);

  useEffect(() => {
    const nextDefaults = getArrangementDraftDefaults(arrangement);
    const previousDefaults = previousDefaultsRef.current;
    const arrangementChanged = previousArrangementIdRef.current !== arrangement.id;

    setRequest((current) => {
      if (arrangementChanged) {
        return {
          ...current,
          lyricLanguage: language,
          ...nextDefaults,
        };
      }

      return {
        ...current,
        lyricLanguage: language,
        style: current.style === previousDefaults.style ? nextDefaults.style : current.style,
        key: current.key === previousDefaults.key ? nextDefaults.key : current.key,
        difficulty: current.difficulty === previousDefaults.difficulty ? nextDefaults.difficulty : current.difficulty,
        bpm: current.bpm === previousDefaults.bpm ? nextDefaults.bpm : current.bpm,
        timeSignature:
          current.timeSignature === previousDefaults.timeSignature ? nextDefaults.timeSignature : current.timeSignature,
      };
    });

    previousDefaultsRef.current = nextDefaults;
    previousArrangementIdRef.current = arrangement.id;
  }, [
    arrangement.bpm,
    arrangement.difficulty,
    arrangement.id,
    arrangement.key,
    arrangement.style,
    arrangement.timeSignature,
    language,
  ]);

  function updateRequest(patch: Partial<SongDraftRequest>) {
    setRequest((current) => ({ ...current, ...patch }));
    setNotice(null);
  }

  async function generateDraft(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsGenerating(true);
    setNotice(null);

    try {
      const nextDraft = await generateSongDraftWithDeepSeek(request, language);
      setDraft(nextDraft);
    } catch (caught) {
      const fallbackWarning =
        caught instanceof DeepSeekSongDraftError && caught.code === "missing-api-key"
          ? t("songDraftMissingKey")
          : t("songDraftFailed");
      const fallbackDraft = generateLocalFallbackSongDraftResult(request, fallbackWarning);
      setDraft(fallbackDraft);
      setNotice(fallbackWarning);
    } finally {
      setIsGenerating(false);
    }
  }

  function applyDraft() {
    if (!draft || isGenerating) return;
    onApplyDraft(draft.arrangement);
    setNotice(t("songDraftApplied"));
  }

  function discardDraft() {
    setDraft(null);
    setNotice(null);
  }

  function sourceLabel(source: SongDraftGenerationResult["source"]) {
    return source === "deepseek" ? t("songDraftSourceDeepSeek") : t("songDraftSourceFallback");
  }

  return (
    <section className="panel song-draft-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{t("aiSongDraft")}</p>
          <h2>{t("songDraftPrompt")}</h2>
        </div>
      </div>

      <div className="song-draft-grid">
        <form className="song-draft-form" onSubmit={generateDraft}>
          <label className="song-draft-prompt">
            <span>{t("songDraftPrompt")}</span>
            <textarea
              value={request.prompt}
              onChange={(event) => updateRequest({ prompt: event.target.value })}
              placeholder={t("songDraftPromptPlaceholder")}
              rows={4}
            />
          </label>

          <div className="song-draft-options" aria-label={t("songDraftOptions")}>
            <label>
              <span>{t("key")}</span>
              <input value={request.key} onChange={(event) => updateRequest({ key: event.target.value })} />
            </label>
            <label>
              <span>BPM</span>
              <input
                type="number"
                min="40"
                max="240"
                value={request.bpm}
                onChange={(event) => updateRequest({ bpm: clampArrangementBpm(Number(event.target.value)) })}
              />
            </label>
            <label>
              <span>{t("timeSignature")}</span>
              <select
                value={request.timeSignature}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  updateRequest({ timeSignature: event.target.value as SongArrangementTimeSignature })
                }
              >
                {TIME_SIGNATURE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("songStyle")}</span>
              <select
                value={request.style}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  updateRequest({ style: event.target.value as SongArrangementStyle })
                }
              >
                {STYLE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {getSongArrangementStyleLabel(value, language)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("songDifficulty")}</span>
              <select
                value={request.difficulty}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  updateRequest({ difficulty: event.target.value as SongArrangementDifficulty })
                }
              >
                {DIFFICULTY_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {getSongArrangementDifficultyLabel(value, language)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("songDraftLength")}</span>
              <select
                value={request.length}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  updateRequest({ length: event.target.value as SongDraftLength })
                }
              >
                {LENGTH_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {t(LENGTH_LABEL_KEYS[value])}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="song-draft-toggle-row">
            <input
              type="checkbox"
              checked={request.generateLyrics}
              onChange={(event) => updateRequest({ generateLyrics: event.target.checked })}
            />
            <span>{request.generateLyrics ? t("songDraftLyricsOn") : t("songDraftLyricsOff")}</span>
          </label>

          <button className="primary-button" type="submit" disabled={isGenerating}>
            <Sparkles size={18} aria-hidden="true" />
            {isGenerating ? t("songDraftGenerating") : draft ? t("songDraftRegenerate") : t("songDraftGenerate")}
          </button>
        </form>

        <section className="song-draft-preview" aria-label={t("songDraftPreview")}>
          <div className="song-draft-preview-header">
            <div>
              <p className="eyebrow">{t("songDraftPreview")}</p>
              <h3>{draft?.arrangement.title ?? t("aiSongDraft")}</h3>
            </div>
            {draft ? <span>{sourceLabel(draft.source)}</span> : null}
          </div>

          {notice ? <p className="save-notice">{notice}</p> : null}

          {draft ? (
            <>
              <div className="song-draft-section-list">
                {draft.arrangement.sections.map((section) => (
                  <article key={section.id} className="song-draft-section-preview">
                    <strong>{section.name}</strong>
                    <span>{section.chords.join(" - ")}</span>
                    {(section.lyricLines ?? []).slice(0, 2).map((line) => (
                      <p key={line.id}>{line.text}</p>
                    ))}
                    {section.notes ? <small>{section.notes}</small> : null}
                  </article>
                ))}
              </div>

              {draft.notes.length > 0 ? (
                <div>
                  <strong>{t("songDraftNotes")}</strong>
                  <ul>
                    {draft.notes.map((note, index) => (
                      <li key={`note-${index}-${note}`}>{note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {draft.warnings.length > 0 ? (
                <div>
                  <strong>{t("songDraftWarnings")}</strong>
                  <ul>
                    {draft.warnings.map((warning, index) => (
                      <li key={`warning-${index}-${warning}`}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="song-draft-actions">
                <button className="primary-button" type="button" onClick={applyDraft} disabled={isGenerating}>
                  <Sparkles size={16} aria-hidden="true" />
                  {t("songDraftApply")}
                </button>
                <button className="secondary-button" type="button" onClick={() => void generateDraft()} disabled={isGenerating}>
                  <RefreshCw size={16} aria-hidden="true" />
                  {t("songDraftRegenerate")}
                </button>
                <button className="audio-button" type="button" onClick={discardDraft}>
                  <Trash2 size={16} aria-hidden="true" />
                  {t("songDraftDiscard")}
                </button>
              </div>
            </>
          ) : (
            <p className="audio-empty">{isGenerating ? t("songDraftGenerating") : t("songDraftNoPreview")}</p>
          )}
        </section>
      </div>
    </section>
  );
}
