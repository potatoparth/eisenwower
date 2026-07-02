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
  toSpotifyEmbed,
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
    if (!f.type.startsWith("image") && !f.type.startsWith("video")) {
      setErr("Please choose an image or video file.");
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

  const spotifyValid = spotify.trim() === "" || !!toSpotifyEmbed(spotify);

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
              : "Upload photo or video"}
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
                        src={p.url}
                        alt={p.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        loading="lazy"
                      />
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
            accept="image/*,video/*"
            style={{ display: "none" }}
            onChange={onPick}
          />
          {err && <div style={{ fontSize: 12, color: "rgb(255,120,120)", marginTop: 8 }}>{err}</div>}

          {/* YouTube link */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: `0.5px solid ${border}` }}>
            <div style={{ fontSize: 12, color: sub, marginBottom: 8 }}>
              …or paste a YouTube link (muted, looped, ad-free not guaranteed):
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
                const id = parseYouTubeId(v);
                if (id) {
                  const m = await saveYouTubeBackground(v);
                  if (m) { setMeta(m); setEnabled(true); }
                }
              }}
              placeholder="https://youtube.com/watch?v=..."
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 100,
                border: `0.5px solid ${border}`,
                background: inputBg,
                color: fg,
                fontSize: 13,
                outline: "none",
              }}
            />
            {ytErr && <div style={{ fontSize: 12, color: "rgb(255,120,120)", marginTop: 6 }}>{ytErr}</div>}
          </div>
        </section>


        {/* Spotify */}
        <section>
          <div className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "0.15em", color: sub, marginBottom: 12 }}>
            Spotify
          </div>
          <p style={{ fontSize: 13, color: sub, marginBottom: 14 }}>
            Paste a Spotify playlist, album, or track link. It appears in the corner during focus mode.
          </p>
          <input
            type="text"
            value={spotify}
            onChange={(e) => {
              const v = e.target.value;
              setSpotify(v);
              if (v.trim() === "" || toSpotifyEmbed(v)) setSpotifyUrl(v.trim());
            }}
            placeholder="https://open.spotify.com/playlist/..."
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 100,
              border: `0.5px solid ${spotifyValid ? border : "rgba(255,80,80,0.4)"}`,
              background: inputBg,
              color: fg,
              fontSize: 13,
              outline: "none",
            }}
          />
          {!spotifyValid && (
            <div style={{ fontSize: 12, color: "rgb(255,120,120)", marginTop: 6 }}>
              Not a valid Spotify link.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
