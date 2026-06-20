export type UserGender = "female" | "male" | "non_binary" | "prefer_not_to_say" | "other";

export type UserProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  gender: UserGender | null;
  guitar_years: number | null;
  created_at: string;
  updated_at: string;
};

export type ProfileFormInput = {
  displayName: string;
  avatarUrl: string;
  age: string;
  gender: string;
  guitarYears: string;
};

export type NormalizedProfileInput = {
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  gender: UserGender | null;
  guitar_years: number | null;
};
