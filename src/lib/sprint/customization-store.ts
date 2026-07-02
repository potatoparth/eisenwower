import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ---------------- Types ---------------- */

export interface BgMeta {
  type: "image" | "video" | "youtube";
  mime: string;
  name: string;
  youtubeId?: string;
}

export interface SprintUpload {
  id: string;
  storagePath: string;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
}

interface Preferences {
  activeUploadId: string | null;
  youtubeUrl: string;
  spotifyUrl: string;
  backgroundEnabled: boolean;
}

const BUCKET = "sprint-backgrounds";
export const MAX_UPLOADS = 3;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

const CHANGE = "sprint.customization.change";
const emit = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE));
};

/* ---------------- In-memory cache ---------------- */

let cache: {
  uploads: SprintUpload[];
  prefs: Preferences;
  activeUrl: string | null; // signed URL for the current active upload
  hydrated: boolean;
} = {
  uploads: [],
  prefs: {
    activeUploadId: null,
    youtubeUrl: "",
    spotifyUrl: "",
    backgroundEnabled: true,
  },
  activeUrl: null,
  hydrated: false,
};

let hydratePromise: Promise<void> | null = null;

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function signUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 6); // 6h
  if (error) return null;
  return data?.signedUrl ?? null;
}

async function hydrate(force = false): Promise<void> {
  if (cache.hydrated && !force) return;
  if (!force && hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    const userId = await getUserId();
    if (!userId) {
      cache = { ...cache, hydrated: true };
      emit();
      return;
    }
    const [{ data: uploads }, { data: prefsRow }] = await Promise.all([
      supabase
        .from("sprint_uploads")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("sprint_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    const list: SprintUpload[] = (uploads ?? []).map((r: {
      id: string;
      storage_path: string;
      name: string;
      mime: string;
      size: number;
      created_at: string;
    }) => ({
      id: r.id,
      storagePath: r.storage_path,
      name: r.name,
      mime: r.mime,
      size: Number(r.size),
      createdAt: r.created_at,
    }));
    const prefs: Preferences = prefsRow
      ? {
          activeUploadId: (prefsRow as { active_upload_id: string | null }).active_upload_id,
          youtubeUrl: (prefsRow as { youtube_url: string | null }).youtube_url ?? "",
          spotifyUrl: (prefsRow as { spotify_url: string | null }).spotify_url ?? "",
          backgroundEnabled: (prefsRow as { background_enabled: boolean }).background_enabled ?? true,
        }
      : cache.prefs;
    // Signed URL for active upload
    let activeUrl: string | null = null;
    if (prefs.activeUploadId) {
      const active = list.find((u) => u.id === prefs.activeUploadId);
      if (active) activeUrl = await signUrl(active.storagePath);
    }
    cache = { uploads: list, prefs, activeUrl, hydrated: true };
    emit();
  })().finally(() => {
    hydratePromise = null;
  });
  return hydratePromise;
}

// Re-hydrate whenever auth changes
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange(() => {
    cache = {
      uploads: [],
      prefs: { activeUploadId: null, youtubeUrl: "", spotifyUrl: "", backgroundEnabled: true },
      activeUrl: null,
      hydrated: false,
    };
    void hydrate(true);
  });
}

async function upsertPreferences(patch: Partial<Preferences>) {
  const userId = await getUserId();
  if (!userId) return;
  const next = { ...cache.prefs, ...patch };
  cache = { ...cache, prefs: next };
  emit();
  await supabase.from("sprint_preferences").upsert(
    {
      user_id: userId,
      active_upload_id: next.activeUploadId,
      youtube_url: next.youtubeUrl || null,
      spotify_url: next.spotifyUrl || null,
      background_enabled: next.backgroundEnabled,
    },
    { onConflict: "user_id" }
  );
}

/* ---------------- Public API ---------------- */

/** Extract a YouTube video ID from most YouTube URL formats. */
export function parseYouTubeId(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  const short = s.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (short) return short[1];
  const long = s.match(/youtube\.com\/(?:watch\?[^ ]*v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{6,})/);
  if (long) return long[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
}

export function toSpotifyEmbed(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const uriMatch = trimmed.match(/^spotify:(playlist|album|track|episode|show|artist):([A-Za-z0-9]+)/);
  if (uriMatch) return `https://open.spotify.com/embed/${uriMatch[1]}/${uriMatch[2]}`;
  const urlMatch = trimmed.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track|episode|show|artist)\/([A-Za-z0-9]+)/);
  if (urlMatch) return `https://open.spotify.com/embed/${urlMatch[1]}/${urlMatch[2]}?utm_source=generator`;
  return null;
}

function metaFromCache(): BgMeta | null {
  const { prefs, uploads } = cache;
  if (prefs.activeUploadId) {
    const u = uploads.find((x) => x.id === prefs.activeUploadId);
    if (u) {
      return {
        type: u.mime.startsWith("video") ? "video" : "image",
        mime: u.mime,
        name: u.name,
      };
    }
  }
  if (prefs.youtubeUrl) {
    const id = parseYouTubeId(prefs.youtubeUrl);
    if (id) return { type: "youtube", mime: "video/youtube", name: prefs.youtubeUrl, youtubeId: id };
  }
  return null;
}

/** Upload a new background file. Errors bubble up (e.g. limit reached). */
export async function saveBackground(file: File): Promise<BgMeta> {
  const userId = await getUserId();
  if (!userId) throw new Error("Sign in to save backgrounds.");
  await hydrate();
  if (cache.uploads.length >= MAX_UPLOADS) {
    throw new Error(`Max ${MAX_UPLOADS} uploads. Remove one first.`);
  }
  const usedBytes = cache.uploads.reduce((n, u) => n + u.size, 0);
  if (usedBytes + file.size > MAX_TOTAL_BYTES) {
    throw new Error(`Not enough space (50MB total).`);
  }
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (upErr) throw upErr;
  const { data: row, error: insErr } = await supabase
    .from("sprint_uploads")
    .insert({
      user_id: userId,
      storage_path: path,
      name: file.name,
      mime: file.type,
      size: file.size,
    })
    .select()
    .single();
  if (insErr || !row) {
    // Rollback the storage object if the DB rejected it (e.g. trigger).
    await supabase.storage.from(BUCKET).remove([path]);
    throw insErr ?? new Error("Failed to save upload.");
  }
  await hydrate(true);
  await setActiveUpload((row as { id: string }).id);
  return metaFromCache()!;
}

export async function deleteUpload(id: string): Promise<void> {
  const u = cache.uploads.find((x) => x.id === id);
  if (!u) return;
  await supabase.storage.from(BUCKET).remove([u.storagePath]);
  await supabase.from("sprint_uploads").delete().eq("id", id);
  await hydrate(true);
}

export async function setActiveUpload(id: string | null): Promise<void> {
  await upsertPreferences({ activeUploadId: id, youtubeUrl: id ? "" : cache.prefs.youtubeUrl });
  const u = id ? cache.uploads.find((x) => x.id === id) : null;
  cache = { ...cache, activeUrl: u ? await signUrl(u.storagePath) : null };
  emit();
}

export async function saveYouTubeBackground(url: string): Promise<BgMeta | null> {
  const id = parseYouTubeId(url);
  if (!id) return null;
  await upsertPreferences({ youtubeUrl: url, activeUploadId: null });
  cache = { ...cache, activeUrl: null };
  emit();
  return metaFromCache();
}

export async function clearBackground(): Promise<void> {
  await upsertPreferences({ activeUploadId: null, youtubeUrl: "" });
  cache = { ...cache, activeUrl: null };
  emit();
}

/* ---- Sync-ish getters (read from cache; trigger hydrate) ---- */

function ensureHydrated() {
  if (!cache.hydrated) void hydrate();
}

export function getBgMeta(): BgMeta | null {
  ensureHydrated();
  return metaFromCache();
}

export function getBgEnabled(): boolean {
  ensureHydrated();
  return cache.prefs.backgroundEnabled && metaFromCache() != null;
}

export function setBgEnabled(v: boolean) {
  void upsertPreferences({ backgroundEnabled: v });
}

export function getSpotifyUrl(): string {
  ensureHydrated();
  return cache.prefs.spotifyUrl;
}

export function setSpotifyUrl(url: string) {
  void upsertPreferences({ spotifyUrl: url });
}

/* ---------------- Hooks ---------------- */

function useCache<T>(select: () => T): T {
  const [v, setV] = useState<T>(select);
  useEffect(() => {
    ensureHydrated();
    setV(select());
    const h = () => setV(select());
    window.addEventListener(CHANGE, h);
    return () => window.removeEventListener(CHANGE, h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return v;
}

export function useBackground() {
  return useCache(() => {
    const meta = metaFromCache();
    const enabled = cache.prefs.backgroundEnabled && meta != null;
    let url: string | null = null;
    if (meta?.type === "youtube") url = meta.youtubeId ?? null;
    else url = cache.activeUrl;
    return { url, meta, enabled };
  });
}

export function useSpotifyUrl(): string {
  return useCache(() => cache.prefs.spotifyUrl);
}

export function useUploads() {
  return useCache(() => ({
    uploads: cache.uploads,
    activeUploadId: cache.prefs.activeUploadId,
    usedBytes: cache.uploads.reduce((n, u) => n + u.size, 0),
    maxUploads: MAX_UPLOADS,
    maxBytes: MAX_TOTAL_BYTES,
  }));
}
