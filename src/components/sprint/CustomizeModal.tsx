import { useEffect, useRef, useState } from "react";
import {
  saveBackground,
  saveYouTubeBackground,
  parseYouTubeId,
  clearBackground,
  getBgMeta,
  getBgEnabled,
  setBgEnabled,
  getSpotifyUrl,
  setSpotifyUrl,
  useUploads,
  setActiveUpload,
  deleteUpload,
  MAX_UPLOADS,
  MAX_TOTAL_BYTES,
  type BgMeta,
  setActivePreset,
  getActivePresetId,
} from "@/lib/sprint/customization-store";
import { PRESETS, getHiddenPresetIds, hidePreset, restoreHiddenPresets, HIDDEN_PRESETS_CHANGE_EVENT } from "@/lib/sprint/presets";
import { useTheme } from "@/lib/sprint/theme-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

/* -------- Recommended links (curated) -------- */
const YT_RECOMMENDED: { url: string; label: string }[] = [
  { url: "https://www.youtube.com/watch?v=sLCh68VXxIg", label: "Lofi Pokémon" },
  { url: "https://www.youtube.com/watch?v=-iVACinS6EY", label: "Lofi Pokémon II" },
  { url: "https://www.youtube.com/watch?v=4VXErA63_eg", label: "Hans Zimmer Focus" },
];
const SPOTIFY_RECOMMENDED: { url: string; label: string }[] = [
  { url: "https://open.spotify.com/playlist/37i9dQZF1DX8NTLI2TtZa6", label: "Deep Focus" },
  { url: "https://open.spotify.com/playlist/2l9ZVHXeSDabJI5jx6UN6j", label: "Study Mix" },
  { url: "https://open.spotify.com/album/3SU6xTHJfl7WkFDl1C9eAn", label: "Interstellar OST" },
];

/* -------- Recent links (per-device localStorage) -------- */
const YT_RECENT_KEY = "sprint.recent.youtube";
const SPOTIFY_RECENT_KEY = "sprint.recent.spotify";
const MAX_RECENT = 5;

function readRecent(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}
function pushRecent(key: string, value: string) {
  if (typeof window === "undefined") return;
  const v = value.trim();
  if (!v) return;
  const cur = readRecent(key).filter((u) => u !== v);
  const next = [v, ...cur].slice(0, MAX_RECENT);
  window.localStorage.setItem(key, JSON.stringify(next));
}

function ytThumb(url: string): string | null {
  const m = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/) ?? url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : null;
}
function shortSpotify(url: string): string {
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track)\/([A-Za-z0-9]+)/);
  return m ? `${m[1]}/${m[2].slice(0, 6)}…` : url;
}

export function CustomizeModal({ open, onClose }: Props) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [meta, setMeta] = useState<BgMeta | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [spotify, setSpotify] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ytInput, setYtInput] = useState("");
  const [ytErr, setYtErr] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [ytRecent, setYtRecent] = useState<string[]>([]);
  const [spotifyRecent, setSpotifyRecent] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { uploads, activeUploadId, usedBytes } = useUploads();

  useEffect(() => {
    if (!open) return;
    const m = getBgMeta();
    setMeta(m);
    setEnabled(getBgEnabled());
    setSpotify(getSpotifyUrl());
    setYtInput(m?.type === "youtube" ? m.name : "");
    setErr(null);
    setYtErr(null);
    setPresetId(getActivePresetId());
    setHiddenIds(getHiddenPresetIds());
    setYtRecent(readRecent(YT_RECENT_KEY));
    setSpotifyRecent(readRecent(SPOTIFY_RECENT_KEY));
  }, [open]);

  useEffect(() => {
    const h = () => setHiddenIds(getHiddenPresetIds());
    window.addEventListener(HIDDEN_PRESETS_CHANGE_EVENT, h);
    return () => window.removeEventListener(HIDDEN_PRESETS_CHANGE_EVENT, h);
  }, []);

  if (!open) return null;

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(null);
    const nameLower = f.name.toLowerCase();
    const isJpeg =
      f.type === "image/jpeg" || nameLower.endsWith(".jpg") || nameLower.endsWith(".jpeg");
    const isMp4 = f.type === "video/mp4" || nameLower.endsWith(".mp4");
    if (!isJpeg && !isMp4) {
      setErr("Only JPEG images and MP4 videos are supported.");
      return;
    }
    // Per-file safety cap (50MB total is enforced server-side).
    if (f.size > MAX_TOTAL_BYTES) {
      setErr(`File too large (max ${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)}MB).`);
      return;
    }
    setBusy(true);
    try {
      const m = await saveBackground(f);
      setMeta(m);
      setEnabled(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save file.";
      setErr(msg);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleClear = async () => {
    await clearBackground();
    setMeta(null);
    setEnabled(false);
  };

  const handleToggle = () => {
    const next = !enabled;
    setBgEnabled(next);
    setEnabled(next);
  };


  const bg = isLight ? "#ffffff" : "#0e1116";
  const fg = isLight ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.9)";
  const sub = isLight ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.55)";
  const border = isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
  const inputBg = isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)";

  const isYoutubeComUrl = (v: string) => {
    try {
      const u = new URL(v.trim());
      const host = u.hostname.replace(/^www\.|^m\./, "");
      return host === "youtube.com";
    } catch {
      return false;
    }
  };
  const isSpotifyPlaylistUrl = (v: string) => {
    try {
      const u = new URL(v.trim());
      const host = u.hostname.replace(/^www\./, "");
      return host === "open.spotify.com" && /^\/(intl-[a-z]+\/)?playlist\/[A-Za-z0-9]+/.test(u.pathname);
    } catch {
      return false;
    }
  };
  const spotifyPlaylistValid = spotify.trim() === "" || isSpotifyPlaylistUrl(spotify);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: bg,
          border: `0.5px solid ${border}`,
          borderRadius: 18,
          padding: 28,
          width: "min(520px, 92vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          color: fg,
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 400 }}>Customize</h2>
          <button
            onClick={onClose}
            style={{ color: sub, background: "transparent", border: "none", fontSize: 20, cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        {/* Background */}
        <section style={{ marginBottom: 28 }}>
          <div className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "0.15em", color: sub, marginBottom: 12 }}>
            Background
          </div>
          <p style={{ fontSize: 13, color: sub, marginBottom: 14 }}>
            Upload photos or videos to your library ({MAX_UPLOADS} files, 50MB total). Saved to your account.
          </p>

          {/* Uploads list (per-user, max 3 / 50MB) */}
          {uploads.length > 0 && (
            <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {uploads.map((u) => {
                const isActive = u.id === activeUploadId;
                const mb = (u.size / (1024 * 1024)).toFixed(1);
                return (
                  <div
                    key={u.id}
                    style={{
                      border: `0.5px solid ${isActive ? (isLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)") : border}`,
                      borderRadius: 12,
                      padding: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      background: isActive ? (isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)") : "transparent",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, color: fg }} className="truncate">
                        {u.mime.startsWith("video") ? "🎬" : "🖼"} {u.name}
                      </div>
                      <div style={{ fontSize: 11, color: sub }}>
                        {mb} MB{isActive ? " · Active" : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={async () => {
                          await setActiveUpload(isActive ? null : u.id);
                          setMeta(getBgMeta());
                          setEnabled(getBgEnabled());
                        }}
                        className="font-mono uppercase"
                        style={{
                          fontSize: 10, letterSpacing: "0.1em",
                          padding: "5px 10px", borderRadius: 100,
                          border: `0.5px solid ${border}`,
                          background: "transparent", color: fg, cursor: "pointer",
                        }}
                      >
                        {isActive ? "Deselect" : "Use"}
                      </button>
                      <button
                        onClick={async () => {
                          await deleteUpload(u.id);
                          setMeta(getBgMeta());
                          setEnabled(getBgEnabled());
                        }}
                        className="font-mono uppercase"
                        style={{
                          fontSize: 10, letterSpacing: "0.1em",
                          padding: "5px 10px", borderRadius: 100,
                          border: "0.5px solid rgba(255,80,80,0.25)",
                          background: "transparent", color: "rgba(255,100,100,0.75)", cursor: "pointer",
                        }}
                        aria-label="Delete upload"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {meta && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <button
                onClick={handleToggle}
                className="font-mono uppercase"
                style={{
                  fontSize: 11, letterSpacing: "0.1em",
                  padding: "6px 12px", borderRadius: 100,
                  border: `0.5px solid ${border}`,
                  background: enabled ? (isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)") : "transparent",
                  color: fg, cursor: "pointer",
                }}
              >
                Background {enabled ? "On" : "Off"}
              </button>
            </div>
          )}

          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy || uploads.length >= MAX_UPLOADS}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 100,
              border: `0.5px solid ${border}`,
              background: inputBg,
              color: fg,
              fontSize: 13,
              cursor: busy ? "wait" : uploads.length >= MAX_UPLOADS ? "not-allowed" : "pointer",
              opacity: uploads.length >= MAX_UPLOADS ? 0.5 : 1,
            }}
          >
            {busy
              ? "Uploading…"
              : uploads.length >= MAX_UPLOADS
              ? `Limit reached (${MAX_UPLOADS} files)`
              : "Upload JPEG or MP4"}
          </button>
          <div style={{ fontSize: 11, color: sub, marginTop: 6, textAlign: "right" }}>
            {uploads.length} / {MAX_UPLOADS} files · {(usedBytes / (1024 * 1024)).toFixed(1)} /{" "}
            {Math.round(MAX_TOTAL_BYTES / 1024 / 1024)} MB
          </div>

          {/* View presets */}
          <button
            onClick={() => setShowPresets((v) => !v)}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "12px",
              borderRadius: 100,
              border: `0.5px solid ${border}`,
              background: "transparent",
              color: fg,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {showPresets ? "Hide presets" : "View presets"}
          </button>
          {showPresets && (
            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
              }}
            >
              {PRESETS.filter((p) => !hiddenIds.includes(p.id)).map((p) => {
                const active = presetId === p.id;
                return (
                  <div
                    key={p.id}
                    className="group"
                    style={{
                      position: "relative",
                      aspectRatio: "16 / 10",
                      borderRadius: 10,
                      overflow: "hidden",
                      border: active
                        ? `2px solid ${isLight ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.85)"}`
                        : `0.5px solid ${border}`,
                    }}
                  >
                    <button
                      onClick={async () => {
                        const next = active ? null : p.id;
                        await setActivePreset(next);
                        setPresetId(next);
                        setMeta(getBgMeta());
                        setEnabled(getBgEnabled());
                        if (next) setYtInput("");
                      }}
                      title={p.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        padding: 0,
                        cursor: "pointer",
                        background: "transparent",
                        border: "none",
                        display: "block",
                      }}
                    >
                      <img
                        src={p.poster ?? p.url}
                        alt={p.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        loading="lazy"
                      />
                      {p.type === "video" && (
                        <div
                          className="font-mono uppercase"
                          style={{
                            position: "absolute",
                            bottom: 4,
                            left: 4,
                            fontSize: 9,
                            letterSpacing: "0.1em",
                            padding: "2px 6px",
                            borderRadius: 999,
                            background: "rgba(0,0,0,0.6)",
                            color: "rgba(255,255,255,0.95)",
                          }}
                        >
                          ▶ Video
                        </div>
                      )}
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: 0,
                          padding: "10px 6px 4px",
                          fontSize: 10,
                          color: "rgba(255,255,255,0.95)",
                          background:
                            "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0))",
                          textAlign: p.type === "video" ? "right" : "left",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          pointerEvents: "none",
                        }}
                      >
                        {p.name}
                      </div>
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (active) {
                          await setActivePreset(null);
                          setPresetId(null);
                          setMeta(getBgMeta());
                          setEnabled(getBgEnabled());
                        }
                        hidePreset(p.id);
                      }}
                      title="Remove preset"
                      aria-label={`Remove ${p.name}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        width: 20,
                        height: 20,
                        borderRadius: 999,
                        border: "none",
                        background: "rgba(0,0,0,0.65)",
                        color: "rgba(255,255,255,0.95)",
                        fontSize: 12,
                        lineHeight: 1,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {showPresets && hiddenIds.length > 0 && (
            <button
              onClick={() => restoreHiddenPresets()}
              className="font-mono uppercase"
              style={{
                marginTop: 10,
                fontSize: 10,
                letterSpacing: "0.1em",
                padding: "6px 12px",
                borderRadius: 100,
                border: `0.5px solid ${border}`,
                background: "transparent",
                color: sub,
                cursor: "pointer",
              }}
            >
              Restore {hiddenIds.length} hidden
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,.jpg,.jpeg,video/mp4,.mp4"
            style={{ display: "none" }}
            onChange={onPick}
          />
          {err && <div style={{ fontSize: 12, color: "rgb(255,120,120)", marginTop: 8 }}>{err}</div>}

          {/* YouTube link */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: `0.5px solid ${border}` }}>
            <div style={{ fontSize: 12, color: sub, marginBottom: 8 }}>
              …or paste a youtube.com link (muted, looped, ad-free not guaranteed):
            </div>
            <input
              type="text"
              value={ytInput}
              onChange={async (e) => {
                const v = e.target.value;
                setYtInput(v);
                setYtErr(null);
                if (v.trim() === "") {
                  await clearBackground();
                  setMeta(null);
                  setEnabled(false);
                  return;
                }
                if (!isYoutubeComUrl(v)) {
                  setYtErr("Only youtube.com URLs are supported.");
                  return;
                }
                const id = parseYouTubeId(v);
                if (id) {
                  const m = await saveYouTubeBackground(v);
                  if (m) { setMeta(m); setEnabled(true); }
                  pushRecent(YT_RECENT_KEY, v);
                  setYtRecent(readRecent(YT_RECENT_KEY));
                } else {
                  setYtErr("Couldn't find a video ID in that link.");
                }
              }}
              placeholder="https://youtube.com/watch?v=..."
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 100,
                border: `0.5px solid ${ytErr ? "rgba(255,80,80,0.4)" : border}`,
                background: inputBg,
                color: fg,
                fontSize: 13,
                outline: "none",
              }}
            />
            {ytErr && <div style={{ fontSize: 12, color: "rgb(255,120,120)", marginTop: 6 }}>{ytErr}</div>}

            {/* Recommended YouTube */}
            <div className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.15em", color: sub, marginTop: 14, marginBottom: 8 }}>
              Recommended
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {YT_RECOMMENDED.map((r) => {
                const thumb = ytThumb(r.url);
                const active = ytInput.trim() === r.url;
                return (
                  <button
                    key={r.url}
                    onClick={async () => {
                      setYtInput(r.url);
                      setYtErr(null);
                      const m = await saveYouTubeBackground(r.url);
                      if (m) { setMeta(m); setEnabled(true); }
                      pushRecent(YT_RECENT_KEY, r.url);
                      setYtRecent(readRecent(YT_RECENT_KEY));
                    }}
                    title={r.label}
                    style={{
                      position: "relative",
                      aspectRatio: "16 / 10",
                      borderRadius: 10,
                      overflow: "hidden",
                      padding: 0,
                      cursor: "pointer",
                      border: active
                        ? `2px solid ${isLight ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.85)"}`
                        : `0.5px solid ${border}`,
                      background: "transparent",
                    }}
                  >
                    {thumb && (
                      <img src={thumb} alt={r.label} loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    )}
                    <div style={{
                      position: "absolute", left: 0, right: 0, bottom: 0,
                      padding: "10px 6px 4px", fontSize: 10, color: "rgba(255,255,255,0.95)",
                      background: "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0))",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      pointerEvents: "none",
                    }}>{r.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Recent YouTube */}
            {ytRecent.length > 0 && (
              <>
                <div className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.15em", color: sub, marginTop: 14, marginBottom: 8 }}>
                  Recent
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ytRecent.map((u) => {
                    const active = ytInput.trim() === u;
                    const id = parseYouTubeId(u);
                    return (
                      <div key={u} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button
                          onClick={async () => {
                            setYtInput(u);
                            setYtErr(null);
                            const m = await saveYouTubeBackground(u);
                            if (m) { setMeta(m); setEnabled(true); }
                          }}
                          title={u}
                          style={{
                            maxWidth: 200, fontSize: 11, padding: "5px 10px", borderRadius: 100,
                            border: `0.5px solid ${active ? (isLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)") : border}`,
                            background: active ? (isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)") : "transparent",
                            color: fg, cursor: "pointer",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}
                        >
                          ▶ {id ?? u}
                        </button>
                        <button
                          onClick={() => {
                            const next = ytRecent.filter((x) => x !== u);
                            window.localStorage.setItem(YT_RECENT_KEY, JSON.stringify(next));
                            setYtRecent(next);
                          }}
                          aria-label="Forget"
                          style={{
                            fontSize: 11, lineHeight: 1, width: 18, height: 18, borderRadius: 999,
                            border: "none", background: "transparent", color: sub, cursor: "pointer",
                          }}
                        >×</button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>


        {/* Spotify */}
        <section>
          <div className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "0.15em", color: sub, marginBottom: 12 }}>
            Spotify
          </div>
          <p style={{ fontSize: 13, color: sub, marginBottom: 14 }}>
            Paste an open.spotify.com playlist link. It appears in the corner during focus mode.
          </p>
          <input
            type="text"
            value={spotify}
            onChange={(e) => {
              const v = e.target.value;
              setSpotify(v);
              if (v.trim() === "" || isSpotifyPlaylistUrl(v)) {
                setSpotifyUrl(v.trim());
                if (v.trim()) {
                  pushRecent(SPOTIFY_RECENT_KEY, v.trim());
                  setSpotifyRecent(readRecent(SPOTIFY_RECENT_KEY));
                }
              }
            }}
            placeholder="https://open.spotify.com/playlist/..."
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 100,
              border: `0.5px solid ${spotifyPlaylistValid ? border : "rgba(255,80,80,0.4)"}`,
              background: inputBg,
              color: fg,
              fontSize: 13,
              outline: "none",
            }}
          />
          {!spotifyPlaylistValid && (
            <div style={{ fontSize: 12, color: "rgb(255,120,120)", marginTop: 6 }}>
              Only open.spotify.com/playlist links are supported.
            </div>
          )}

          {/* Recommended Spotify */}
          <div className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.15em", color: sub, marginTop: 14, marginBottom: 8 }}>
            Recommended
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SPOTIFY_RECOMMENDED.map((r) => {
              const active = spotify.trim() === r.url;
              return (
                <button
                  key={r.url}
                  onClick={() => {
                    setSpotify(r.url);
                    setSpotifyUrl(r.url);
                    pushRecent(SPOTIFY_RECENT_KEY, r.url);
                    setSpotifyRecent(readRecent(SPOTIFY_RECENT_KEY));
                  }}
                  title={r.url}
                  style={{
                    maxWidth: 220, fontSize: 11, padding: "5px 10px", borderRadius: 100,
                    border: `0.5px solid ${active ? (isLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)") : border}`,
                    background: active ? (isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)") : "transparent",
                    color: fg, cursor: "pointer",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}
                >
                  ♫ {r.label}
                </button>
              );
            })}
          </div>

          {/* Recent Spotify */}
          {spotifyRecent.length > 0 && (
            <>
              <div className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.15em", color: sub, marginTop: 14, marginBottom: 8 }}>
                Recent
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {spotifyRecent.map((u) => {
                  const active = spotify.trim() === u;
                  return (
                    <div key={u} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button
                        onClick={() => {
                          setSpotify(u);
                          setSpotifyUrl(u);
                        }}
                        title={u}
                        style={{
                          maxWidth: 200, fontSize: 11, padding: "5px 10px", borderRadius: 100,
                          border: `0.5px solid ${active ? (isLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)") : border}`,
                          background: active ? (isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)") : "transparent",
                          color: fg, cursor: "pointer",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}
                      >
                        ♫ {shortSpotify(u)}
                      </button>
                      <button
                        onClick={() => {
                          const next = spotifyRecent.filter((x) => x !== u);
                          window.localStorage.setItem(SPOTIFY_RECENT_KEY, JSON.stringify(next));
                          setSpotifyRecent(next);
                        }}
                        aria-label="Forget"
                        style={{
                          fontSize: 11, lineHeight: 1, width: 18, height: 18, borderRadius: 999,
                          border: "none", background: "transparent", color: sub, cursor: "pointer",
                        }}
                      >×</button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
