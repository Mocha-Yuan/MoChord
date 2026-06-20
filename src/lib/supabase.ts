import { createClient } from "@supabase/supabase-js";

const viteEnv = (import.meta as unknown as { env?: Record<string, string | boolean | undefined> }).env ?? {};
const supabaseUrl = viteEnv.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = viteEnv.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && viteEnv.DEV) {
  console.warn(
    "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable auth and cloud progress sync.",
  );
}

export const supabase = createClient(
  supabaseUrl || "https://missing-supabase-url.supabase.co",
  supabaseAnonKey || "missing-supabase-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
