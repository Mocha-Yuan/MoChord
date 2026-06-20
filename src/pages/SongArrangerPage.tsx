import { ArrowDown, ArrowUp, Copy, FilePlus2, ListPlus, Mic2, Play, Save, Trash2 } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { DEFAULT_SONG_ARRANGEMENT_TEMPLATES } from "../data/songArrangementTemplates";
import { useI18n } from "../i18n";
import type {
  SongArrangement,
  SongArrangementDifficulty,
  SongArrangementStyle,
  SongArrangementTimeSignature,
  SongLyricLine,
  SongPracticeLyricRow,
  SongSection,
} from "../types/songArrangement";
import {
  BAR_OPTIONS,
  REPEAT_OPTIONS,
  clampArrangementBpm,
  cloneArrangement,
  createBlankArrangement,
  createBlankLyricLine,
  createBlankSection,
  duplicateSection,
  evaluateSectionChordInput,
  expandArrangementToPracticeChords,
  expandSectionLyricsToPracticeRows,
  expandSectionToPracticeChords,
  getMostCommonBarsPerChord,
  getSectionSummaryChords,
  sectionHasLyrics,
  validateArrangement,
  validateSection,
} from "../utils/songArrangement";
import {
  getLocalizedArrangementText,
  getSongArrangementDifficultyLabel,
  getSongArrangementStyleLabel,
  localizeSongArrangementForLanguage,
} from "../utils/songArrangementLocalization";
import { SongDraftGenerator } from "../components/SongDraftGenerator";
import { PageHeader } from "./PageHeader";
import type { NavigateToPage } from "./pageTypes";

type SongPracticePayload = {
  title: string;
  chords: string[];
  lyricRows?: SongPracticeLyricRow[];
  bpm: number;
  timeSignature: SongArrangementTimeSignature;
  barsPerChord: number;
  loopCount: number;
};

type SongArrangerPageProps = {
  arrangement: SongArrangement;
  onArrangementChange: (arrangement: SongArrangement) => void;
  onNavigate: NavigateToPage;
  onPracticeArrangement: (payload: SongPracticePayload) => void;
  onSaveArrangement: (arrangement: SongArrangement) => void;
};

const TIME_SIGNATURE_OPTIONS: SongArrangementTimeSignature[] = ["4/4", "3/4", "6/8"];
const STYLE_OPTIONS: SongArrangementStyle[] = ["pop", "folk", "ballad", "rock", "worship", "city-pop", "campfire"];
const DIFFICULTY_OPTIONS: SongArrangementDifficulty[] = ["beginner", "intermediate", "advanced"];

const VALIDATION_ERROR_KEYS = {
  "Arrangement needs at least one section.": "arrangementNeedsSection",
  "Full-song practice needs at least two valid chords.": "fullSongNeedsTwoChords",
  "Section name is empty.": "sectionNameEmpty",
  "Section needs at least one valid chord.": "sectionNeedsChord",
  "Bars per chord must be 1, 2, or 4.": "sectionBarsInvalid",
  "Repeat count must be between 1 and 8.": "sectionRepeatInvalid",
} as const;

function removeLineKeys<T>(values: Record<string, T>, currentLineIds: Set<string>, shouldKeepValue: (value: T) => boolean = () => true) {
  const nextValues: Record<string, T> = {};
  let changed = false;

  for (const [lineId, value] of Object.entries(values)) {
    if (currentLineIds.has(lineId) && shouldKeepValue(value)) {
      nextValues[lineId] = value;
    } else {
      changed = true;
    }
  }

  return changed ? nextValues : values;
}

function isPresentError(error: string | undefined): error is string {
  return Boolean(error);
}

export function SongArrangerPage({
  arrangement,
  onArrangementChange,
  onNavigate,
  onPracticeArrangement,
  onSaveArrangement,
}: SongArrangerPageProps) {
  const { language, t } = useI18n();
  const [selectedSectionId, setSelectedSectionId] = useState(() => arrangement.sections[0]?.id ?? "");
  const [sectionChordInputs, setSectionChordInputs] = useState<Record<string, string>>({});
  const [sectionInputErrors, setSectionInputErrors] = useState<Record<string, string>>({});
  const [lyricChordInputs, setLyricChordInputs] = useState<Record<string, string>>({});
  const [lyricInputErrors, setLyricInputErrors] = useState<Record<string, string>>({});
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const selectedSection = arrangement.sections.find((section) => section.id === selectedSectionId) ?? arrangement.sections[0];
  const arrangementValidation = useMemo(() => validateArrangement(arrangement), [arrangement]);
  const currentSectionIds = useMemo(() => new Set(arrangement.sections.map((section) => section.id)), [arrangement.sections]);
  const currentLyricLineIds = useMemo(
    () => new Set(arrangement.sections.flatMap((section) => section.lyricLines?.map((line) => line.id) ?? [])),
    [arrangement.sections],
  );
  const hasInputErrors = arrangement.sections.some(
    (section) => Boolean(sectionInputErrors[section.id]) || (section.lyricLines ?? []).some((line) => Boolean(lyricInputErrors[line.id])),
  );
  const hasArrangementErrors = arrangementValidation.errors.length > 0 || hasInputErrors;

  useEffect(() => {
    setSectionChordInputs((current) => {
      const nextInputs: Record<string, string> = {};
      let changed = false;

      for (const section of arrangement.sections) {
        if (current[section.id] !== undefined) nextInputs[section.id] = current[section.id];
      }

      for (const sectionId of Object.keys(current)) {
        if (!currentSectionIds.has(sectionId)) {
          changed = true;
          break;
        }
      }

      return changed ? nextInputs : current;
    });

    setSectionInputErrors((current) => {
      const nextErrors: Record<string, string> = {};
      let changed = false;

      for (const section of arrangement.sections) {
        const error = current[section.id];
        if (error) nextErrors[section.id] = error;
      }

      for (const sectionId of Object.keys(current)) {
        if (!currentSectionIds.has(sectionId) || !current[sectionId]) {
          changed = true;
          break;
        }
      }

      return changed ? nextErrors : current;
    });

    setLyricChordInputs((current) => removeLineKeys(current, currentLyricLineIds));
    setLyricInputErrors((current) => removeLineKeys(current, currentLyricLineIds, Boolean));

    if (!selectedSectionId || !currentSectionIds.has(selectedSectionId)) {
      setSelectedSectionId(arrangement.sections[0]?.id ?? "");
    }
  }, [arrangement.sections, currentSectionIds, currentLyricLineIds, selectedSectionId]);

  function setArrangement(nextArrangement: SongArrangement) {
    onArrangementChange(nextArrangement);
    setSaveNotice(null);
  }

  function applyTemplate(template: SongArrangement) {
    const localizedTemplate = localizeSongArrangementForLanguage(template, language);
    const nextArrangement = cloneArrangement(localizedTemplate, localizedTemplate.title);
    setSelectedSectionId(nextArrangement.sections[0]?.id ?? "");
    setSectionChordInputs({});
    setSectionInputErrors({});
    setLyricChordInputs({});
    setLyricInputErrors({});
    setArrangement(nextArrangement);
  }

  function applySongDraft(nextArrangement: SongArrangement) {
    setSelectedSectionId(nextArrangement.sections[0]?.id ?? "");
    setSectionChordInputs({});
    setSectionInputErrors({});
    setLyricChordInputs({});
    setLyricInputErrors({});
    setArrangement(nextArrangement);
  }

  function createNewArrangement() {
    const nextArrangement = localizeSongArrangementForLanguage(createBlankArrangement(), language);
    setSelectedSectionId(nextArrangement.sections[0]?.id ?? "");
    setSectionChordInputs({});
    setSectionInputErrors({});
    setLyricChordInputs({});
    setLyricInputErrors({});
    setArrangement(nextArrangement);
  }

  function updateArrangement(patch: Partial<SongArrangement>) {
    setArrangement({ ...arrangement, ...patch });
  }

  function updateSection(sectionId: string, patch: Partial<SongSection>) {
    setArrangement({
      ...arrangement,
      sections: arrangement.sections.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)),
    });
  }

  function updateSectionLyricLines(
    sectionId: string,
    getNextLines: (currentLines: SongLyricLine[], section: SongSection) => SongLyricLine[],
  ) {
    setArrangement({
      ...arrangement,
      sections: arrangement.sections.map((section) => {
        if (section.id !== sectionId) return section;

        const nextLyricLines = getNextLines(section.lyricLines ?? [], section);
        const nextLineChords = nextLyricLines.flatMap((line) => line.chords);

        return {
          ...section,
          chords: nextLineChords.length > 0 ? nextLineChords : section.chords,
          lyricLines: nextLyricLines.length > 0 ? nextLyricLines : undefined,
        };
      }),
    });
  }

  function addLyricsToSection(section: SongSection) {
    const nextLine = {
      ...createBlankLyricLine(),
      chords: section.chords,
    };

    setSectionChordInputs((current) => {
      const { [section.id]: _removed, ...remaining } = current;
      return remaining;
    });
    setSectionInputErrors((current) => {
      const { [section.id]: _removed, ...remaining } = current;
      return remaining;
    });
    setLyricChordInputs((current) => ({
      ...current,
      [nextLine.id]: nextLine.chords.join(" - "),
    }));
    setLyricInputErrors((current) => ({
      ...current,
      [nextLine.id]: "",
    }));
    updateSectionLyricLines(section.id, () => [nextLine]);
  }

  function clearLyricsFromSection(sectionId: string) {
    const removedLineIds = new Set(
      arrangement.sections.find((section) => section.id === sectionId)?.lyricLines?.map((line) => line.id) ?? [],
    );

    setLyricChordInputs((current) => removeLineKeys(current, new Set(Object.keys(current).filter((lineId) => !removedLineIds.has(lineId)))));
    setLyricInputErrors((current) => removeLineKeys(current, new Set(Object.keys(current).filter((lineId) => !removedLineIds.has(lineId)))));
    setArrangement({
      ...arrangement,
      sections: arrangement.sections.map((section) => (section.id === sectionId ? { ...section, lyricLines: undefined } : section)),
    });
  }

  function addLyricLine(sectionId: string) {
    const nextLine = createBlankLyricLine();
    updateSectionLyricLines(sectionId, (currentLines) => [...currentLines, nextLine]);
  }

  function updateLyricLine(sectionId: string, lineId: string, patch: Partial<SongLyricLine>) {
    updateSectionLyricLines(sectionId, (currentLines) =>
      currentLines.map((line) => (line.id === lineId ? { ...line, ...patch, id: line.id } : line)),
    );
  }

  function duplicateLyricLine(sectionId: string, lineId: string) {
    const sourceLine = arrangement.sections
      .find((section) => section.id === sectionId)
      ?.lyricLines?.find((line) => line.id === lineId);
    if (!sourceLine) return;

    const duplicatedLine = {
      ...sourceLine,
      id: createBlankLyricLine().id,
    };
    updateSectionLyricLines(sectionId, (currentLines) => {
      const lineIndex = currentLines.findIndex((line) => line.id === lineId);
      if (lineIndex < 0) return currentLines;

      const nextLines = [...currentLines];
      nextLines.splice(lineIndex + 1, 0, duplicatedLine);
      return nextLines;
    });

    setLyricChordInputs((current) => ({
      ...current,
      [duplicatedLine.id]: duplicatedLine.chords.join(" - "),
    }));
    setLyricInputErrors((current) => ({
      ...current,
      [duplicatedLine.id]: "",
    }));
  }

  function deleteLyricLine(sectionId: string, lineId: string) {
    setLyricChordInputs((current) => {
      const { [lineId]: _removed, ...remaining } = current;
      return remaining;
    });
    setLyricInputErrors((current) => {
      const { [lineId]: _removed, ...remaining } = current;
      return remaining;
    });
    updateSectionLyricLines(sectionId, (currentLines) => currentLines.filter((line) => line.id !== lineId));
  }

  function moveLyricLine(sectionId: string, lineId: string, direction: -1 | 1) {
    updateSectionLyricLines(sectionId, (currentLines) => {
      const index = currentLines.findIndex((line) => line.id === lineId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= currentLines.length) return currentLines;

      const nextLines = [...currentLines];
      const [line] = nextLines.splice(index, 1);
      nextLines.splice(nextIndex, 0, line);
      return nextLines;
    });
  }

  function handleLyricChordInput(sectionId: string, lineId: string, value: string) {
    const result = evaluateSectionChordInput(value);
    setSaveNotice(null);
    setLyricChordInputs((current) => ({
      ...current,
      [lineId]: result.rawValue,
    }));
    if (result.nextChords) updateLyricLine(sectionId, lineId, { chords: result.nextChords });
    setLyricInputErrors((current) => ({
      ...current,
      [lineId]: result.invalidChords.length > 0 ? `${t("invalidLyricChord")}: ${result.invalidChords.join(", ")}` : "",
    }));
  }

  function getLyricChordInputValue(line: SongLyricLine) {
    return lyricChordInputs[line.id] ?? line.chords.join(" - ");
  }

  function handleChordInput(sectionId: string, value: string) {
    const result = evaluateSectionChordInput(value);
    setSaveNotice(null);
    setSectionChordInputs((current) => ({
      ...current,
      [sectionId]: result.rawValue,
    }));
    if (result.nextChords) updateSection(sectionId, { chords: result.nextChords });
    setSectionInputErrors((current) => ({
      ...current,
      [sectionId]: result.invalidChords.length > 0 ? `${t("unsupportedChordInput")}: ${result.invalidChords.join(", ")}` : "",
    }));
  }

  function getSectionChordInputValue(section: SongSection) {
    return sectionChordInputs[section.id] ?? section.chords.join(" - ");
  }

  function addSection() {
    const nextSection = createBlankSection(language === "zh" ? "段落" : "Section");
    setSelectedSectionId(nextSection.id);
    setArrangement({
      ...arrangement,
      sections: [...arrangement.sections, nextSection],
    });
  }

  function duplicateExistingSection(section: SongSection) {
    const nextSection = duplicateSection(section);
    if (language === "zh") {
      nextSection.name = `${section.name.trim() || "段落"} 复制`;
    }
    const sectionIndex = arrangement.sections.findIndex((candidate) => candidate.id === section.id);
    const insertIndex = sectionIndex >= 0 ? sectionIndex + 1 : arrangement.sections.length;
    const nextSections = [...arrangement.sections];
    nextSections.splice(insertIndex, 0, nextSection);
    setSelectedSectionId(nextSection.id);
    setArrangement({ ...arrangement, sections: nextSections });
  }

  function deleteSection(sectionId: string) {
    const removedLineIds = new Set(
      arrangement.sections.find((section) => section.id === sectionId)?.lyricLines?.map((line) => line.id) ?? [],
    );
    const nextSections = arrangement.sections.filter((section) => section.id !== sectionId);
    const fallbackSectionId = nextSections[0]?.id ?? "";
    setSelectedSectionId((current) => (current === sectionId ? fallbackSectionId : current));
    setSectionInputErrors((current) => {
      const { [sectionId]: _removed, ...remaining } = current;
      return remaining;
    });
    setSectionChordInputs((current) => {
      const { [sectionId]: _removed, ...remaining } = current;
      return remaining;
    });
    setLyricInputErrors((current) => removeLineKeys(current, new Set(Object.keys(current).filter((lineId) => !removedLineIds.has(lineId)))));
    setLyricChordInputs((current) => removeLineKeys(current, new Set(Object.keys(current).filter((lineId) => !removedLineIds.has(lineId)))));
    setArrangement({ ...arrangement, sections: nextSections });
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    const index = arrangement.sections.findIndex((section) => section.id === sectionId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= arrangement.sections.length) return;

    const nextSections = [...arrangement.sections];
    const [section] = nextSections.splice(index, 1);
    nextSections.splice(nextIndex, 0, section);
    setArrangement({ ...arrangement, sections: nextSections });
  }

  function practiceSection(section: SongSection) {
    const errors = getSectionDisplayErrors(section);
    if (errors.length > 0 || sectionHasLyricInputErrors(section)) return;

    onPracticeArrangement({
      title: `${arrangement.title} - ${section.name || "Section"}`,
      chords: expandSectionToPracticeChords(section),
      lyricRows: expandSectionPracticeLyricRows(section),
      bpm: arrangement.bpm,
      timeSignature: arrangement.timeSignature,
      barsPerChord: section.barsPerChord,
      loopCount: section.repeatCount,
    });
  }

  function practiceFullSong() {
    if (hasArrangementErrors) return;

    onPracticeArrangement({
      title: arrangement.title,
      chords: expandArrangementToPracticeChords(arrangement),
      lyricRows: arrangement.sections.flatMap(expandSectionPracticeLyricRows),
      bpm: arrangement.bpm,
      timeSignature: arrangement.timeSignature,
      barsPerChord: getMostCommonBarsPerChord(arrangement),
      loopCount: 1,
    });
  }

  function saveArrangement() {
    if (hasArrangementErrors) {
      setSaveNotice(t("arrangementValidationFailed"));
      return;
    }

    onSaveArrangement(arrangement);
    setSaveNotice(t("arrangementSaved"));
  }

  function getSectionDisplayErrors(section: SongSection) {
    const inputError = sectionInputErrors[section.id];
    const validationErrors = validateSection(section).errors.map(translateArrangementError);
    return Array.from(new Set([inputError, ...validationErrors].filter(isPresentError)));
  }

  function sectionHasLyricInputErrors(section: SongSection) {
    return (section.lyricLines ?? []).some((line) => Boolean(lyricInputErrors[line.id]));
  }

  function translateArrangementError(error: string) {
    if (error.includes("Lyric line") && error.includes("has no valid chords.")) {
      return error.replace(/Lyric line (\d+) has no valid chords\./g, `${t("lyricLine")} $1: ${t("invalidLyricChord")}`);
    }

    const prefixedError = Object.entries(VALIDATION_ERROR_KEYS).find(([sourceError]) => error.endsWith(sourceError));
    if (!prefixedError) return error;

    const [sourceError, key] = prefixedError;
    return error === sourceError ? t(key) : error.replace(sourceError, t(key));
  }

  function getArrangementText(value: string) {
    return getLocalizedArrangementText(value, language);
  }

  return (
    <>
      <PageHeader
        activePage="arranger"
        eyebrow={t("heroEyebrow")}
        title={t("songArrangerTitle")}
        subtitle={t("songArrangerSubtitle")}
        onNavigate={onNavigate}
      />

      <section className="song-arranger-layout">
        <aside className="panel arranger-template-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{t("arrangementTemplates")}</p>
              <h2>{t("songArranger")}</h2>
            </div>
            <button type="button" className="secondary-button arranger-template-new-button" onClick={createNewArrangement}>
              <FilePlus2 size={16} aria-hidden="true" />
              {t("newArrangement")}
            </button>
          </div>
          <p className="audio-empty">{t("noArrangementLyrics")}</p>
          <div className="arranger-template-list">
            {DEFAULT_SONG_ARRANGEMENT_TEMPLATES.map((template) => (
              <button key={template.id} type="button" onClick={() => applyTemplate(template)}>
                <strong>{getArrangementText(template.title)}</strong>
                <span>
                  {template.key} / {template.bpm} BPM / {template.timeSignature}
                </span>
                <small>
                  {getSongArrangementStyleLabel(template.style, language)} / {getSongArrangementDifficultyLabel(template.difficulty, language)} /{" "}
                  {template.sections.length} {t("songSections")}
                </small>
              </button>
            ))}
          </div>
        </aside>

        <div className="song-arranger-main">
          <SongDraftGenerator arrangement={arrangement} onApplyDraft={applySongDraft} />

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{t("newArrangement")}</p>
                <h2>{arrangement.title ? getArrangementText(arrangement.title) : t("songArranger")}</h2>
              </div>
              <button type="button" className="secondary-button" onClick={createNewArrangement}>
                <FilePlus2 size={16} aria-hidden="true" />
                {t("newArrangement")}
              </button>
            </div>

            <div className="arranger-meta-grid">
              <label>
                <span>{t("songTitle")}</span>
                <input value={getArrangementText(arrangement.title)} onChange={(event) => updateArrangement({ title: event.target.value })} />
              </label>
              <label>
                <span>{t("key")}</span>
                <input value={arrangement.key} onChange={(event) => updateArrangement({ key: event.target.value })} />
              </label>
              <label>
                <span>BPM</span>
                <input
                  type="number"
                  min="40"
                  max="240"
                  value={arrangement.bpm}
                  onChange={(event) => updateArrangement({ bpm: clampArrangementBpm(Number(event.target.value)) })}
                />
              </label>
              <label>
                <span>{t("timeSignature")}</span>
                <select
                  value={arrangement.timeSignature}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    updateArrangement({ timeSignature: event.target.value as SongArrangementTimeSignature })
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
                  value={arrangement.style}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    updateArrangement({ style: event.target.value as SongArrangementStyle })
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
                  value={arrangement.difficulty}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    updateArrangement({ difficulty: event.target.value as SongArrangementDifficulty })
                  }
                >
                  {DIFFICULTY_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {getSongArrangementDifficultyLabel(value, language)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{t("songSections")}</p>
                <h2>{selectedSection?.name ? getArrangementText(selectedSection.name) : t("sectionName")}</h2>
              </div>
              <button type="button" className="secondary-button" onClick={addSection}>
                <ListPlus size={16} aria-hidden="true" />
                {t("addSection")}
              </button>
            </div>

            <div className="arranger-section-list">
              {arrangement.sections.map((section, index) => {
                const displayErrors = getSectionDisplayErrors(section);
                const hasSectionBlockingErrors = displayErrors.length > 0 || sectionHasLyricInputErrors(section);
                const hasLyrics = sectionHasLyrics(section);
                const summaryChords = hasLyrics ? getSectionSummaryChords(section) : section.chords;

                return (
                  <article key={section.id} className={`arranger-section ${selectedSection?.id === section.id ? "active" : ""}`}>
                    <button type="button" className="arranger-section-summary" onClick={() => setSelectedSectionId(section.id)}>
                      <strong>
                        {index + 1}. {section.name ? getArrangementText(section.name) : t("sectionName")}
                      </strong>
                      <span>{summaryChords.join(" - ") || "--"}</span>
                      <small>
                        {section.barsPerChord} {t("barsPerChord")} / x{section.repeatCount} / {getArrangementText(section.rhythmPattern)}
                      </small>
                    </button>

                    <div className="arranger-section-controls">
                      <label>
                        <span>{t("sectionName")}</span>
                        <input value={getArrangementText(section.name)} onChange={(event) => updateSection(section.id, { name: event.target.value })} />
                      </label>
                      <label>
                        <span>{t("sectionChords")}</span>
                        <input
                          value={hasLyrics ? summaryChords.join(" - ") : getSectionChordInputValue(section)}
                          onChange={(event) => {
                            if (!hasLyrics) handleChordInput(section.id, event.target.value);
                          }}
                          readOnly={hasLyrics}
                        />
                      </label>
                      <label>
                        <span>{t("barsPerChord")}</span>
                        <select
                          value={section.barsPerChord}
                          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                            updateSection(section.id, { barsPerChord: Number(event.target.value) })
                          }
                        >
                          {BAR_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>{t("repeatCount")}</span>
                        <select
                          value={section.repeatCount}
                          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                            updateSection(section.id, { repeatCount: Number(event.target.value) })
                          }
                        >
                          {REPEAT_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>{t("rhythmPattern")}</span>
                        <input
                          value={getArrangementText(section.rhythmPattern)}
                          onChange={(event) => updateSection(section.id, { rhythmPattern: event.target.value })}
                        />
                      </label>
                      <label>
                        <span>{t("sectionNotes")}</span>
                        <input
                          value={section.notes ? getArrangementText(section.notes) : ""}
                          onChange={(event) => updateSection(section.id, { notes: event.target.value })}
                        />
                      </label>
                    </div>

                    <div className="arranger-lyrics-controls">
                      <p className="audio-empty">{t("lyricsOptional")}</p>
                      {hasLyrics ? (
                        <button type="button" className="secondary-button" onClick={() => clearLyricsFromSection(section.id)}>
                          <Mic2 size={16} aria-hidden="true" />
                          {t("clearLyrics")}
                        </button>
                      ) : (
                        <button type="button" className="secondary-button" onClick={() => addLyricsToSection(section)}>
                          <Mic2 size={16} aria-hidden="true" />
                          {t("addLyrics")}
                        </button>
                      )}
                    </div>

                    {hasLyrics ? (
                      <div className="arranger-lyrics-editor">
                        {(section.lyricLines ?? []).map((line, lineIndex, lines) => {
                          const lyricError = lyricInputErrors[line.id];

                          return (
                            <div key={line.id} className="arranger-lyric-row">
                              <label className="arranger-lyric-chords">
                                <span>{t("lyricChords")}</span>
                                <input
                                  value={getLyricChordInputValue(line)}
                                  onChange={(event) => handleLyricChordInput(section.id, line.id, event.target.value)}
                                  aria-label={`${t("lyricChords")} ${lineIndex + 1}`}
                                />
                              </label>
                              <label className="arranger-lyric-text">
                                <span>
                                  {t("lyricLine")} {lineIndex + 1}
                                </span>
                                <textarea
                                  value={line.text}
                                  onChange={(event) => updateLyricLine(section.id, line.id, { text: event.target.value })}
                                  aria-label={`${t("lyricLine")} ${lineIndex + 1}`}
                                />
                              </label>
                              <div className="arranger-lyric-actions">
                                <button
                                  type="button"
                                  className="icon-button"
                                  onClick={() => moveLyricLine(section.id, line.id, -1)}
                                  disabled={lineIndex === 0}
                                  aria-label={t("moveLyricLineUp")}
                                >
                                  <ArrowUp size={16} aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  className="icon-button"
                                  onClick={() => moveLyricLine(section.id, line.id, 1)}
                                  disabled={lineIndex === lines.length - 1}
                                  aria-label={t("moveLyricLineDown")}
                                >
                                  <ArrowDown size={16} aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  className="icon-button"
                                  onClick={() => duplicateLyricLine(section.id, line.id)}
                                  aria-label={t("duplicateLyricLine")}
                                >
                                  <Copy size={16} aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  className="icon-button"
                                  onClick={() => deleteLyricLine(section.id, line.id)}
                                  aria-label={t("deleteLyricLine")}
                                >
                                  <Trash2 size={16} aria-hidden="true" />
                                </button>
                              </div>
                              {lyricError ? <p className="error-message">{lyricError}</p> : null}
                            </div>
                          );
                        })}
                        <button type="button" className="secondary-button" onClick={() => addLyricLine(section.id)}>
                          <ListPlus size={16} aria-hidden="true" />
                          {t("addLyricLine")}
                        </button>
                      </div>
                    ) : null}

                    {displayErrors.length > 0 ? <p className="error-message">{displayErrors.join(" ")}</p> : null}

                    <div className="arranger-section-actions">
                      <button type="button" className="icon-button" onClick={() => moveSection(section.id, -1)} aria-label={t("moveSectionUp")}>
                        <ArrowUp size={16} aria-hidden="true" />
                      </button>
                      <button type="button" className="icon-button" onClick={() => moveSection(section.id, 1)} aria-label={t("moveSectionDown")}>
                        <ArrowDown size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => duplicateExistingSection(section)}
                        aria-label={t("duplicateSection")}
                      >
                        <Copy size={16} aria-hidden="true" />
                      </button>
                      <button type="button" className="icon-button" onClick={() => deleteSection(section.id)} aria-label={t("deleteSection")}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                      <button type="button" className="audio-button" onClick={() => practiceSection(section)} disabled={hasSectionBlockingErrors}>
                        <Play size={16} aria-hidden="true" />
                        {t("practiceSection")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {arrangementValidation.errors.length > 0 ? (
            <p className="error-message">{arrangementValidation.errors.map(translateArrangementError).join(" ")}</p>
          ) : null}
          {hasInputErrors ? <p className="error-message">{t("arrangementValidationFailed")}</p> : null}
          {saveNotice ? <p className="save-notice">{saveNotice}</p> : null}

          <section className="arranger-footer-actions">
            <button type="button" className="primary-button" onClick={practiceFullSong} disabled={hasArrangementErrors}>
              <Play size={16} aria-hidden="true" />
              {t("practiceFullSong")}
            </button>
            <button type="button" className="secondary-button" onClick={saveArrangement} disabled={hasArrangementErrors}>
              <Save size={16} aria-hidden="true" />
              {t("saveArrangement")}
            </button>
          </section>
        </div>
      </section>
    </>
  );
}

function expandSectionPracticeLyricRows(section: SongSection): SongPracticeLyricRow[] {
  const rows = expandSectionLyricsToPracticeRows(section);
  return Array.from({ length: section.repeatCount }, () => rows).flat();
}
