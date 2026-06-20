import { Cloud, CloudOff, LogIn, LogOut, RefreshCw, UserCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../i18n";
import type { SyncStatus } from "../../types/progress";
import { AuthModal } from "./AuthModal";
import { AUTH_COPY } from "./authCopy";

type UserMenuProps = {
  syncStatus: SyncStatus;
  syncError?: string | null;
  onRetrySync: () => void;
};

export function UserMenu({ syncStatus, syncError, onRetrySync }: UserMenuProps) {
  const { user, isAuthenticated, loading, signOut } = useAuth();
  const { language } = useI18n();
  const copy = AUTH_COPY[language];
  const [modalOpen, setModalOpen] = useState(false);
  const syncCopy = copy.sync[syncStatus];

  return (
    <div className="auth-toolbar">
      <span className={`sync-pill sync-pill-${syncStatus}`}>
        {syncStatus === "guest" || syncStatus === "error" ? <CloudOff size={15} aria-hidden="true" /> : <Cloud size={15} aria-hidden="true" />}
        {syncCopy}
      </span>
      {syncStatus === "error" ? (
        <button type="button" className="auth-icon-button" onClick={onRetrySync} title={syncError ?? copy.retrySync} aria-label={copy.retrySync}>
          <RefreshCw size={15} aria-hidden="true" />
        </button>
      ) : null}

      {isAuthenticated ? (
        <div className="user-menu">
          <span>
            <UserCircle size={17} aria-hidden="true" />
            {user?.email ?? copy.userFallback}
          </span>
          <button type="button" className="auth-icon-button" onClick={() => void signOut()} aria-label={copy.logout}>
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button type="button" className="auth-login-button" onClick={() => setModalOpen(true)} disabled={loading}>
          <LogIn size={16} aria-hidden="true" />
          {copy.login}
        </button>
      )}

      <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
