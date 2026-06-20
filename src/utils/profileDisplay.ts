type ProfileDisplayInput = {
  profile: {
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
  user: {
    email?: string | null;
    user_metadata?: Record<string, unknown> | null;
  } | null;
};

export type ProfileDisplay = {
  name: string;
  avatarUrl: string;
  initials: string;
};

export function getProfileDisplay({ profile, user }: ProfileDisplayInput): ProfileDisplay {
  const metadataName = getStringMetadata(user?.user_metadata, "display_name") || getStringMetadata(user?.user_metadata, "full_name");
  const emailName = user?.email ? user.email.split("@")[0] : "";
  const name = profile?.display_name?.trim() || metadataName || emailName || "MoChord";
  const avatarUrl = profile?.avatar_url?.trim() || "";

  return {
    name,
    avatarUrl,
    initials: getInitials(name),
  };
}

export function getInitials(value: string): string {
  return (
    value
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CF"
  );
}

function getStringMetadata(metadata: Record<string, unknown> | null | undefined, key: string): string {
  const value = metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}
