import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { NormalizedProfileInput, ProfileFormInput, UserGender, UserProfile } from "../types/profile";

type ProfileValidationError = "avatar" | "age" | "gender" | "guitarYears";
type AvatarValidationError = "type" | "size";

type ProfileValidationResult = {
  data: NormalizedProfileInput | null;
  error: ProfileValidationError | null;
};

const GENDERS: UserGender[] = ["female", "male", "non_binary", "prefer_not_to_say", "other"];
const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type AvatarImageFile = Pick<File, "name" | "size" | "type">;

export async function loadProfile(): Promise<{ data: UserProfile | null; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: "Supabase is not configured yet." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: "Please log in before editing your profile." };

  const { data, error } = await supabase.from("profiles").select("*").eq("id", userData.user.id).maybeSingle();
  if (error) return { data: null, error: getFriendlyProfileError(error.message) };

  return { data: data as UserProfile | null, error: null };
}

export async function saveProfile(input: ProfileFormInput): Promise<{ data: UserProfile | null; error: string | null }> {
  if (!isSupabaseConfigured) return { data: null, error: "Supabase is not configured yet." };

  const normalized = normalizeProfileInput(input);
  if (normalized.error || !normalized.data) {
    return { data: null, error: normalized.error };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { data: null, error: "Please log in before editing your profile." };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userData.user.id,
        email: userData.user.email ?? null,
        ...normalized.data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error) return { data: null, error: getFriendlyProfileError(error.message) };
  return { data: data as UserProfile, error: null };
}

export async function uploadAvatarImage(file: File): Promise<{ url: string | null; error: string | null }> {
  if (!isSupabaseConfigured) return { url: null, error: "Supabase is not configured yet." };

  const validation = validateAvatarImageFile(file);
  if (validation.error) return { url: null, error: validation.error };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { url: null, error: "Please log in before uploading an avatar." };

  const path = buildAvatarUploadPath(userData.user.id, file);
  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) return { url: null, error: getFriendlyProfileError(uploadError.message) };

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) return { url: null, error: "Avatar uploaded, but the public URL could not be created." };

  return { url: data.publicUrl, error: null };
}

export function validateAvatarImageFile(file: AvatarImageFile): { error: AvatarValidationError | null } {
  if (!ALLOWED_AVATAR_TYPES[file.type]) return { error: "type" };
  if (file.size > MAX_AVATAR_SIZE_BYTES) return { error: "size" };
  return { error: null };
}

export function buildAvatarUploadPath(userId: string, file: AvatarImageFile, nonce = crypto.randomUUID()): string {
  const extension = ALLOWED_AVATAR_TYPES[file.type] ?? getExtensionFromName(file.name) ?? "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const safeName =
    baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "avatar";

  return `${userId}/${nonce}-${safeName}.${extension}`;
}

export function normalizeProfileInput(input: ProfileFormInput): ProfileValidationResult {
  const displayName = input.displayName.trim();
  const avatarUrl = input.avatarUrl.trim();
  const age = input.age.trim();
  const gender = input.gender.trim();
  const guitarYears = input.guitarYears.trim();

  if (avatarUrl && !isHttpUrl(avatarUrl)) return { data: null, error: "avatar" };

  const normalizedAge = age ? Number(age) : null;
  if (normalizedAge !== null && (!Number.isInteger(normalizedAge) || normalizedAge < 0 || normalizedAge > 120)) {
    return { data: null, error: "age" };
  }

  if (gender && !GENDERS.includes(gender as UserGender)) return { data: null, error: "gender" };

  const normalizedGuitarYears = guitarYears ? Number(guitarYears) : null;
  if (
    normalizedGuitarYears !== null &&
    (!Number.isFinite(normalizedGuitarYears) || normalizedGuitarYears < 0 || normalizedGuitarYears > 100)
  ) {
    return { data: null, error: "guitarYears" };
  }

  return {
    data: {
      display_name: displayName || null,
      avatar_url: avatarUrl || null,
      age: normalizedAge,
      gender: gender ? (gender as UserGender) : null,
      guitar_years: normalizedGuitarYears,
    },
    error: null,
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getExtensionFromName(name: string): string | null {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? null;
}

function getFriendlyProfileError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("bucket") || lower.includes("storage")) {
    return "Avatar upload is not configured yet. Please check the Supabase Storage setup.";
  }
  if (lower.includes("row-level security") || lower.includes("permission")) {
    return "Profile save failed because database permissions are not configured correctly.";
  }
  if (lower.includes("network") || lower.includes("fetch")) return "Network error. Please try again.";
  return message || "Profile save failed. Please try again.";
}
