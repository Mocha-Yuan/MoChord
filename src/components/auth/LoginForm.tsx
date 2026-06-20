import { FormEvent, useState } from "react";
import { LogIn } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../i18n";
import { AUTH_COPY, getLocalizedAuthError } from "./authCopy";

type LoginFormProps = {
  onSuccess: () => void;
  onRegisterClick: () => void;
};

export function LoginForm({ onSuccess, onRegisterClick }: LoginFormProps) {
  const { signIn } = useAuth();
  const { language } = useI18n();
  const copy = AUTH_COPY[language];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!email.trim() || !password) {
      setMessage(copy.missingLoginFields);
      return;
    }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (result.error) {
      setMessage(getLocalizedAuthError(result.error, copy));
      return;
    }

    onSuccess();
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div>
        <h2>{copy.loginTitle}</h2>
        <p>{copy.loginSubtitle}</p>
      </div>
      <label>
        <span>{copy.email}</span>
        <input type="email" value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        <span>{copy.password}</span>
        <input
          type="password"
          value={password}
          autoComplete="current-password"
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {message ? <p className="auth-message auth-message-error">{message}</p> : null}
      <button type="submit" className="primary-button" disabled={loading}>
        <LogIn size={17} aria-hidden="true" />
        {loading ? copy.loggingIn : copy.login}
      </button>
      <button type="button" className="auth-link-button" onClick={onRegisterClick}>
        {copy.createAccount}
      </button>
    </form>
  );
}
