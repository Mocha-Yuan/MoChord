import { Languages } from "lucide-react";
import { useI18n } from "../i18n";

export function LanguageToggle() {
  const { language, toggleLanguage, t } = useI18n();

  return (
    <button type="button" className="language-toggle" onClick={toggleLanguage} aria-label={t("languageLabel")}>
      <Languages size={16} aria-hidden="true" />
      <span>{language === "en" ? t("switchToChinese") : t("switchToEnglish")}</span>
    </button>
  );
}
