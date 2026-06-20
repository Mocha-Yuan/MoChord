import { FormEvent, useState } from "react";
import { UserPlus } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../i18n";
import { AUTH_COPY, getLocalizedAuthError } from "./authCopy";

type RegisterFormProps = {
  onSuccess: () => void;
  onLoginClick: () => void;
};

export function RegisterForm({ onSuccess, onLoginClick }: RegisterFormProps) {
  const { signUp } = useAuth();
  const { language } = useI18n();
  const copy = AUTH_COPY[language];
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSuccess(false);

    if (password.length < 6) {
      setMessage(copy.shortPassword);
      return;
    }
    if (password !== confirmPassword) {
      setMessage(copy.passwordMismatch);
      return;
    }

    setLoading(true);
    const result = await signUp(email, password, displayName);
    setLoading(false);

    if (result.error) {
      setMessage(getLocalizedAuthError(result.error, copy));
      return;
    }

    if (result.needsEmailConfirmation) {
      setIsSuccess(true);
      setMessage(copy.emailConfirmation);
      return;
    }

    onSuccess();
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div>
        <h2>{copy.registerTitle}</h2>
        <p>{copy.registerSubtitle}</p>
      </div>
      <label>
        <span>{copy.displayName}</span>
        <input value={displayName} autoComplete="name" onChange={(event) => setDisplayName(event.target.value)} />
      </label>
      <label>
        <span>{copy.email}</span>
        <input type="email" value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        <span>{copy.password}</span>
        <input
          type="password"
          value={password}
          autoComplete="new-password"
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <label>
        <span>{copy.confirmPassword}</span>
        <input
          type="password"
          value={confirmPassword}
          autoComplete="new-password"
          minLength={6}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </label>
      {message ? <p className={isSuccess ? "auth-message auth-message-success" : "auth-message auth-message-error"}>{message}</p> : null}
      <button type="submit" className="primary-button" disabled={loading}>
        <UserPlus size={17} aria-hidden="true" />
        {loading ? copy.creating : copy.createAccount}
      </button>
      <button type="button" className="auth-link-button" onClick={onLoginClick}>
        {copy.alreadyHaveAccount}
      </button>
    </form>
  );
}
