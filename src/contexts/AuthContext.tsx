import { createContext, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import * as authService from "../services/authService";
import type { AuthResult, AuthSession, AuthUser } from "../types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResult<AuthUser>>;
  signIn: (email: string, password: string) => Promise<AuthResult<AuthSession>>;
  signOut: () => Promise<AuthResult<null>>;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const [sessionResult, userResult] = await Promise.all([authService.getCurrentSession(), authService.getCurrentUser()]);
    setSession(sessionResult.data);
    setUser(userResult.data);
  }, []);

  useEffect(() => {
    let mounted = true;

    authService.getCurrentSession().then((result) => {
      if (!mounted) return;
      setSession(result.data);
      setUser(result.data?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      isAuthenticated: Boolean(user && session),
      signUp: async (email, password, displayName) => {
        const result = await authService.signUp(email, password, displayName);
        await refreshUser();
        return result;
      },
      signIn: async (email, password) => {
        const result = await authService.signIn(email, password);
        await refreshUser();
        return result;
      },
      signOut: async () => {
        const result = await authService.signOut();
        setSession(null);
        setUser(null);
        return result;
      },
      refreshUser,
    }),
    [loading, refreshUser, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
