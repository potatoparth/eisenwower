import { useEffect, useState } from "react";
import { get, set, del } from "idb-keyval";

const BG_KEY = "lockin.bg.file";
const BG_META_KEY = "lockin.bg.meta";
const BG_ENABLED_KEY = "lockin.bg.enabled";
const BG_YT_KEY = "lockin.bg.youtube";
const SPOTIFY_KEY = "lockin.spotify.url";

export interface BgMeta {
  type: "image" | "video" | "youtube";
  mime: string;
  name: string;
  youtubeId?: string;
}

export async function saveBackground(file: File): Promise<BgMeta> {
  const meta: BgMeta = {
    type: file.type.startsWith("video") ? "video" : "image",
    mime: file.type,
    name: file.name,
  };
  await set(BG_KEY, file);
  localStorage.removeItem(BG_YT_KEY);
  localStorage.setItem(BG_META_KEY, JSON.stringify(meta));
  localStorage.setItem(BG_ENABLED_KEY, "1");
  window.dispatchEvent(new Event("lockin.bg.change"));
  return meta;
}

/** Extract a YouTube video ID from most YouTube URL formats. */
export function parseYouTubeId(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  // youtu.be/ID
  const short = s.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (short) return short[1];
  // youtube.com/watch?v=ID or /embed/ID or /shorts/ID or /live/ID
  const long = s.match(/youtube\.com\/(?:watch\?[^ ]*v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{6,})/);
  if (long) return long[1];
  // Bare ID
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
}

export async function saveYouTubeBackground(url: string): Promise<BgMeta | null> {
  const id = parseYouTubeId(url);
  if (!id) return null;
  await del(BG_KEY);
  const meta: BgMeta = { type: "youtube", mime: "video/youtube", name: url, youtubeId: id };
  localStorage.setItem(BG_YT_KEY, id);
  localStorage.setItem(BG_META_KEY, JSON.stringify(meta));
  localStorage.setItem(BG_ENABLED_KEY, "1");
  window.dispatchEvent(new Event("lockin.bg.change"));
  return meta;
}

export async function clearBackground() {
  await del(BG_KEY);
  localStorage.removeItem(BG_META_KEY);
  localStorage.removeItem(BG_ENABLED_KEY);
  localStorage.removeItem(BG_YT_KEY);
  window.dispatchEvent(new Event("lockin.bg.change"));
}

export function getBgMeta(): BgMeta | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(BG_META_KEY);
  return raw ? (JSON.parse(raw) as BgMeta) : null;
}

export function getBgEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(BG_ENABLED_KEY) === "1";
}

export function setBgEnabled(v: boolean) {
  if (v) localStorage.setItem(BG_ENABLED_KEY, "1");
  else localStorage.removeItem(BG_ENABLED_KEY);
  window.dispatchEvent(new Event("lockin.bg.change"));
}

export async function loadBackgroundUrl(): Promise<string | null> {
  const file = (await get(BG_KEY)) as File | undefined;
  if (!file) return null;
  return URL.createObjectURL(file);
}

export function useBackground() {
  const [url, setUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<BgMeta | null>(null);
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    let currentUrl: string | null = null;
    const refresh = async () => {
      const m = getBgMeta();
      const en = getBgEnabled();
      setMeta(m);
      setEnabledState(en);
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      currentUrl = null;
      if (m && en) {
        if (m.type === "youtube") {
          setUrl(m.youtubeId ?? null);
        } else {
          currentUrl = await loadBackgroundUrl();
          setUrl(currentUrl);
        }
      } else {
        setUrl(null);
      }
    };
    refresh();
    const handler = () => refresh();
    window.addEventListener("lockin.bg.change", handler);
    return () => {
      window.removeEventListener("lockin.bg.change", handler);
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, []);

  return { url, meta, enabled };
}

// Spotify
export function getSpotifyUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(SPOTIFY_KEY) ?? "";
}

export function setSpotifyUrl(url: string) {
  if (url) localStorage.setItem(SPOTIFY_KEY, url);
  else localStorage.removeItem(SPOTIFY_KEY);
  window.dispatchEvent(new Event("lockin.spotify.change"));
}

export function useSpotifyUrl() {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(getSpotifyUrl());
    const h = () => setUrl(getSpotifyUrl());
    window.addEventListener("lockin.spotify.change", h);
    return () => window.removeEventListener("lockin.spotify.change", h);
  }, []);
  return url;
}

/** Convert a Spotify share URL/URI to an embed URL. */
export function toSpotifyEmbed(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const uriMatch = trimmed.match(/^spotify:(playlist|album|track|episode|show|artist):([A-Za-z0-9]+)/);
  if (uriMatch) return `https://open.spotify.com/embed/${uriMatch[1]}/${uriMatch[2]}`;
  const urlMatch = trimmed.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track|episode|show|artist)\/([A-Za-z0-9]+)/);
  if (urlMatch) return `https://open.spotify.com/embed/${urlMatch[1]}/${urlMatch[2]}?utm_source=generator`;
  return null;
}
