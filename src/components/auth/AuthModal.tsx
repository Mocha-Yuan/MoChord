import { X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../../i18n";
import { AUTH_COPY } from "./authCopy";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const { language } = useI18n();
  const copy = AUTH_COPY[language];

  if (!isOpen) return null;

  return (
    <div className="auth-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-label={copy.dialogLabel} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="auth-close-button" onClick={onClose} aria-label={copy.close}>
          <X size={18} aria-hidden="true" />
        </button>
        {mode === "login" ? (
          <LoginForm onSuccess={onClose} onRegisterClick={() => setMode("register")} />
        ) : (
          <RegisterForm onSuccess={onClose} onLoginClick={() => setMode("login")} />
        )}
      </section>
    </div>
  );
}
