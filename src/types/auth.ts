import type { Session, User } from "@supabase/supabase-js";

export type AuthUser = User;
export type AuthSession = Session;

export type AuthResult<T = unknown> = {
  data: T | null;
  error: string | null;
  needsEmailConfirmation?: boolean;
};
