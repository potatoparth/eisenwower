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
  type BgMeta,
} from "@/lib/customization-store";
import { useTheme } from "@/lib/theme-store";

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
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const m = getBgMeta();
    setMeta(m);
    setEnabled(getBgEnabled());
    setSpotify(getSpotifyUrl());
    setYtInput(m?.type === "youtube" ? m.name : "");
    setErr(null);
    setYtErr(null);
  }, [open]);

  if (!open) return null;

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(null);
    if (!f.type.startsWith("image") && !f.type.startsWith("video")) {
      setErr("Please choose an image or video file.");
      return;
    }
    // ~200MB cap for IndexedDB sanity
    if (f.size > 200 * 1024 * 1024) {
      setErr("File too large (max 200MB).");
      return;
    }
    setBusy(true);
    try {
      const m = await saveBackground(f);
      setMeta(m);
      setEnabled(true);
    } catch {
      setErr("Failed to save file.");
    } finally {
      setBusy(false);
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
            Upload a photo or video as your focus background. Stored on this device only.
          </p>

          {meta ? (
            <div
              style={{
                border: `0.5px solid ${border}`,
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: fg }} className="truncate">
                  {meta.type === "video" ? "🎬" : "🖼"} {meta.name}
                </div>
                <div style={{ fontSize: 11, color: sub }}>{enabled ? "Active" : "Disabled"}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleToggle}
                  className="font-mono uppercase"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    padding: "6px 12px",
                    borderRadius: 100,
                    border: `0.5px solid ${border}`,
                    background: enabled ? (isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)") : "transparent",
                    color: fg,
                    cursor: "pointer",
                  }}
                >
                  {enabled ? "On" : "Off"}
                </button>
                <button
                  onClick={handleClear}
                  className="font-mono uppercase"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    padding: "6px 12px",
                    borderRadius: 100,
                    border: "0.5px solid rgba(255,80,80,0.25)",
                    background: "transparent",
                    color: "rgba(255,100,100,0.75)",
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : null}

          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 100,
              border: `0.5px solid ${border}`,
              background: inputBg,
              color: fg,
              fontSize: 13,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "Saving…" : meta ? "Replace file" : "Upload photo or video"}
          </button>
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
