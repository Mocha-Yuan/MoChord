import { Music2, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { useI18n } from "../i18n";

type ChordInputProps = {
  value: string;
  error: string | null;
  recentChords?: string[];
  onGenerate: (name: string) => void;
};

const EXAMPLES = ["C", "Am", "G7", "Fmaj7", "Dm7", "Cadd9"];

export function ChordInput({ value, error, recentChords = [], onGenerate }: ChordInputProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(value);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onGenerate(draft);
  }

  function handleExample(chord: string) {
    setDraft(chord);
    onGenerate(chord);
  }

  return (
    <section className="input-panel">
      <div>
        <p className="eyebrow">{t("chordGenerator")}</p>
        <h2>{t("chordGeneratorTitle")}</h2>
      </div>
      <form className="chord-form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="chord-name">
          {t("chordName")}
        </label>
        <div className="input-shell">
          <Music2 size={22} aria-hidden="true" />
          <input
            id="chord-name"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("chordPlaceholder")}
            autoComplete="off"
          />
        </div>
        <button className="primary-button" type="submit">
          <Sparkles size={18} aria-hidden="true" />
          {t("generateChord")}
        </button>
      </form>
      <div className="example-row" aria-label={t("exampleChords")}>
        {EXAMPLES.map((example) => (
          <button key={example} type="button" onClick={() => handleExample(example)}>
            {example}
          </button>
        ))}
      </div>
      {recentChords.length > 0 ? (
        <div className="example-row recent-row" aria-label={t("recentChords")}>
          {recentChords.map((chord) => (
            <button key={chord} type="button" onClick={() => handleExample(chord)}>
              {chord}
            </button>
          ))}
        </div>
      ) : null}
      {error ? <p className="error-message">{error}</p> : null}
    </section>
  );
}
