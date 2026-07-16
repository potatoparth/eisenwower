import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BadgeGradient { from: string; to: string; angle?: number }

export interface UserProfileInfo {
  userId: string;
  name: string;
  avatarUrl: string | null;
  avatarSignedUrl: string | null;
  badgeColor: string | null;
  badgeGradient: BadgeGradient | null;
}

type Row = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  badge_color: string | null;
  badge_gradient: unknown;
};

const cache = new Map<string, UserProfileInfo>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function signAvatar(path: string): Promise<string | null> {
  if (!path) return null;
  // If already an absolute URL, use as-is.
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 6);
  return data?.signedUrl ?? null;
}

async function fetchIds(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { data } = await supabase
    .from("profiles")
    .select("user_id,display_name,email,avatar_url,badge_color,badge_gradient")
    .in("user_id", ids);
  const rows = ((data as unknown) as Row[] | null) || [];
  await Promise.all(rows.map(async (r) => {
    const info: UserProfileInfo = {
      userId: r.user_id,
      name: r.display_name || (r.email ? r.email.split("@")[0] : "User"),
      avatarUrl: r.avatar_url,
      avatarSignedUrl: r.avatar_url ? await signAvatar(r.avatar_url) : null,
      badgeColor: r.badge_color,
      badgeGradient: (r.badge_gradient as BadgeGradient | null) ?? null,
    };
    cache.set(r.user_id, info);
  }));
  // Ensure requested-but-missing ids don't loop forever.
  ids.forEach((id) => {
    if (!cache.has(id)) cache.set(id, {
      userId: id, name: "User", avatarUrl: null, avatarSignedUrl: null, badgeColor: null, badgeGradient: null,
    });
  });
  emit();
}

function ensureLoaded(ids: string[]) {
  const missing = ids.filter((id) => id && !cache.has(id) && !inflight.has(id));
  if (!missing.length) return;
  const p = fetchIds(missing).finally(() => missing.forEach((id) => inflight.delete(id)));
  missing.forEach((id) => inflight.set(id, p));
}

export function primeUserProfile(info: Partial<UserProfileInfo> & { userId: string }) {
  const prev = cache.get(info.userId);
  cache.set(info.userId, {
    userId: info.userId,
    name: info.name ?? prev?.name ?? "User",
    avatarUrl: info.avatarUrl ?? prev?.avatarUrl ?? null,
    avatarSignedUrl: info.avatarSignedUrl ?? prev?.avatarSignedUrl ?? null,
    badgeColor: info.badgeColor ?? prev?.badgeColor ?? null,
    badgeGradient: info.badgeGradient ?? prev?.badgeGradient ?? null,
  });
  emit();
}

export async function refreshUserProfile(id: string) {
  cache.delete(id);
  inflight.delete(id);
  await fetchIds([id]);
}

export function useUserProfile(id: string | null | undefined): UserProfileInfo | null {
  const [v, setV] = useState<UserProfileInfo | null>(() => (id ? cache.get(id) ?? null : null));
  useEffect(() => {
    if (!id) { setV(null); return; }
    ensureLoaded([id]);
    setV(cache.get(id) ?? null);
    const h = () => setV(cache.get(id) ?? null);
    listeners.add(h);
    return () => { listeners.delete(h); };
  }, [id]);
  return v;
}

export function useUserProfilesMap(ids: string[]): Map<string, UserProfileInfo> {
  const key = ids.slice().sort().join(",");
  const [map, setMap] = useState<Map<string, UserProfileInfo>>(() => {
    const m = new Map<string, UserProfileInfo>();
    ids.forEach((id) => { const v = cache.get(id); if (v) m.set(id, v); });
    return m;
  });
  useEffect(() => {
    const arr = key ? key.split(",") : [];
    ensureLoaded(arr);
    const compute = () => {
      const m = new Map<string, UserProfileInfo>();
      arr.forEach((id) => { const v = cache.get(id); if (v) m.set(id, v); });
      setMap(m);
    };
    compute();
    listeners.add(compute);
    return () => { listeners.delete(compute); };
  }, [key]);
  return map;
}