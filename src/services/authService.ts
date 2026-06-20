import type { AuthResult, AuthSession, AuthUser } from "../types/auth";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export async function signUp(email: string, password: string, displayName?: string): Promise<AuthResult<AuthUser>> {
  const validationError = validateCredentials(email, password);
  if (validationError) return { data: null, error: validationError };
  if (!isSupabaseConfigured) return { data: null, error: "Supabase is not configured yet." };

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        display_name: displayName?.trim() || undefined,
      },
    },
  });

  if (error) return { data: null, error: getFriendlyAuthError(error.message) };

  return {
    data: data.user,
    error: null,
    needsEmailConfirmation: Boolean(data.user && !data.session),
  };
}

export async function signIn(email: string, password: string): Promise<AuthResult<AuthSession>> {
  const validationError = validateCredentials(email, password);
  if (validationError) return { data: null, error: validationError };
  if (!isSupabaseConfigured) return { data: null, error: "Supabase is not configured yet." };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) return { data: null, error: getFriendlyAuthError(error.message) };
  return { data: data.session, error: null };
}

export async function signOut(): Promise<AuthResult<null>> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  const { error } = await supabase.auth.signOut();
  return { data: null, error: error ? getFriendlyAuthError(error.message) : null };
}

export async function getCurrentUser(): Promise<AuthResult<AuthUser>> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  const { data, error } = await supabase.auth.getUser();
  return { data: data.user, error: error ? getFriendlyAuthError(error.message) : null };
}

export async function getCurrentSession(): Promise<AuthResult<AuthSession>> {
  if (!isSupabaseConfigured) return { data: null, error: null };
  const { data, error } = await supabase.auth.getSession();
  return { data: data.session, error: error ? getFriendlyAuthError(error.message) : null };
}

function validateCredentials(email: string, password: string): string | null {
  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Please enter a valid email address.";
  }
  if (password.length < 6) return "Password must be at least 6 characters.";
  return null;
}

function getFriendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "Login failed. Please check your email or password.";
  }
  if (lower.includes("email")) return message;
  if (lower.includes("network") || lower.includes("fetch")) return "Network error. Please try again.";
  return message || "Authentication failed. Please try again.";
}
