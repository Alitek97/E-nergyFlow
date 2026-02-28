import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type UserProfile = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  updatedAt?: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  updated_at?: string | null;
};

function mapProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, updated_at")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error) throw error;
  return data ? mapProfile(data) : null;
}

export async function upsertProfile({
  userId,
  displayName,
  avatarUrl,
}: {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}): Promise<UserProfile> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured");
  }

  const payload: Record<string, unknown> = {
    id: userId,
    updated_at: new Date().toISOString(),
  };
  if (displayName !== undefined) payload.display_name = displayName;
  if (avatarUrl !== undefined) payload.avatar_url = avatarUrl;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id, display_name, avatar_url, updated_at")
    .single<ProfileRow>();

  if (error) throw error;
  return mapProfile(data);
}

export async function ensureProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) return null;

  const existing = await getProfile(userId);
  if (existing) return existing;
  return upsertProfile({ userId });
}
