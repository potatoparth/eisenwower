import { useEffect, useRef, useState } from "react";
import { Palette, X, Play, Pause, Maximize2, Minimize2 } from "lucide-react";
import { useSpotifyUrl, toSpotifyEmbed } from "@/lib/sprint/customization-store";
import { useIsMobile } from "@/hooks/use-mobile";

const WIDTH_KEY = "lockin.spotify.width";
const HEIGHT_KEY = "lockin.spotify.height";
const THEME_KEY = "lockin.spotify.theme";
const MODE_KEY = "lockin.spotify.mode";
const POS_KEY = "lockin.spotify.pos";

type PlayerTheme = "dark" | "light";
type Mode = "expanded" | "mini" | "icon";
type ResizeDir = "l" | "r" | "t" | "b" | "tl" | "tr" | "bl" | "br";

const DEFAULT_WIDTH = 490;
const MIN_WIDTH = 260;
const MAX_WIDTH = 900;
const DEFAULT_HEIGHT = 380;
const MIN_HEIGHT = 200;
const MAX_HEIGHT = 820;

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: unknown) => void;
    __spotifyApiPromise?: Promise<any>;
  }
}

function loadSpotifyApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.__spotifyApiPromise) return window.__spotifyApiPromise;
  window.__spotifyApiPromise = new Promise<any>((resolve) => {
    window.onSpotifyIframeApiReady = (api) => resolve(api);
    const s = document.createElement("script");
    s.src = "https://open.spotify.com/embed/iframe-api/v1";
    s.async = true;
    document.body.appendChild(s);
  });
  return window.__spotifyApiPromise;
}

function embedToUri(embedUrl: string): string | null {
  const m = embedUrl.match(/embed\/(playlist|album|track|episode|show|artist)\/([A-Za-z0-9]+)/);
  return m ? `spotify:${m[1]}:${m[2]}` : null;
}

function SpotifyLogo({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 168 168" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M83.996.277C37.747.277.253 37.77.253 84.019c0 46.251 37.494 83.741 83.743 83.741 46.254 0 83.744-37.49 83.744-83.741 0-46.246-37.49-83.738-83.745-83.738l.001-.004zm38.404 120.78a5.217 5.217 0 01-7.18 1.73c-19.662-12.01-44.414-14.73-73.564-8.07a5.222 5.222 0 01-6.249-3.93 5.213 5.213 0 013.926-6.25c31.9-7.291 59.263-4.15 81.337 9.34 2.46 1.51 3.24 4.72 1.73 7.18zm10.25-22.805c-1.89 3.075-5.91 4.045-8.98 2.155-22.51-13.839-56.823-17.846-83.448-9.764-3.453 1.043-7.1-.903-8.148-4.35a6.538 6.538 0 014.354-8.143c30.413-9.228 68.222-4.758 94.072 11.127 3.07 1.89 4.04 5.91 2.15 8.976v-.001zm.88-23.744c-26.99-16.031-71.52-17.505-97.289-9.684-4.138 1.255-8.514-1.081-9.768-5.219a7.835 7.835 0 015.221-9.771c29.581-8.98 78.756-7.245 109.83 11.202a7.823 7.823 0 012.74 10.733c-2.2 3.722-7.02 4.949-10.73 2.739z" />
    </svg>
  );
}

export function SpotifyPlayer() {
  const url = useSpotifyUrl();
  const isMobile = useIsMobile();
  const embed = toSpotifyEmbed(url);

  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "expanded";
    const v = localStorage.getItem(MODE_KEY) as Mode | null;
    if (v === "expanded" || v === "mini" || v === "icon") return v;
    return window.innerWidth < 768 ? "icon" : "expanded";
  });
  const lastOpenMode = useRef<"expanded" | "mini">(mode === "mini" ? "mini" : "expanded");
  useEffect(() => {
    if (mode !== "icon") lastOpenMode.current = mode;
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  const [width, setWidth] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_WIDTH;
    const stored = Number(localStorage.getItem(WIDTH_KEY));
    return stored >= MIN_WIDTH && stored <= MAX_WIDTH ? stored : DEFAULT_WIDTH;
  });
  const [height, setHeight] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_HEIGHT;
    const stored = Number(localStorage.getItem(HEIGHT_KEY));
    return stored >= MIN_HEIGHT && stored <= MAX_HEIGHT ? stored : DEFAULT_HEIGHT;
  });
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(POS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [playerTheme, setPlayerTheme] = useState<PlayerTheme>(() => {
    if (typeof window === "undefined") return "dark";
    const v = localStorage.getItem(THEME_KEY) as PlayerTheme | null;
    if (v === "dark" || v === "light") return v;
    return !document.documentElement.classList.contains("dark") ? "light" : "dark";
  });

  useEffect(() => { localStorage.setItem(WIDTH_KEY, String(width)); }, [width]);
  useEffect(() => { localStorage.setItem(HEIGHT_KEY, String(height)); }, [height]);
  useEffect(() => { localStorage.setItem(THEME_KEY, playerTheme); }, [playerTheme]);
  useEffect(() => { if (pos) localStorage.setItem(POS_KEY, JSON.stringify(pos)); }, [pos]);

  useEffect(() => {
    if (pos || typeof window === "undefined") return;
    const x = window.innerWidth - width - 20;
    const y = window.innerHeight - height - 90;
    setPos({ x: Math.max(8, x), y: Math.max(8, y) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Spotify IFrame API controller — one iframe, always mounted
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<any>(null);
  const [playback, setPlayback] = useState<{ paused: boolean; name: string; artist: string }>({
    paused: true,
    name: "",
    artist: "",
  });

  useEffect(() => {
    if (!embed || !wrapperRef.current) return;
    const uri = embedToUri(embed);
    if (!uri) return;

    const wrap = wrapperRef.current;
    // Create a host div OUTSIDE React's control that the API will replace with an iframe
    const host = document.createElement("div");
    host.style.width = "100%";
    host.style.height = "100%";
    wrap.appendChild(host);

    let cancelled = false;
    let ctrl: any = null;

    loadSpotifyApi().then((api) => {
      if (cancelled) return;
      api.createController(
        host,
        {
          uri,
          theme: playerTheme === "light" ? "light" : "dark",
          width: "100%",
          height: "100%",
        },
        (c: any) => {
          if (cancelled) { try { c.destroy(); } catch { /* ignore */ } return; }
          controllerRef.current = c;
          ctrl = c;
          c.addListener("playback_update", (e: any) => {
            const d = e?.data ?? {};
            setPlayback({
              paused: !!d.isPaused,
              name: d.name || "",
              artist: Array.isArray(d.artists)
                ? d.artists.map((a: any) => a.name).filter(Boolean).join(", ")
                : (d.artist || ""),
            });
          });
        }
      );
    });

    return () => {
      cancelled = true;
      try { ctrl?.destroy?.(); } catch { /* ignore */ }
      controllerRef.current = null;
      // Clean up any leftover iframe/host
      while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
    };
    // Recreate only when a Spotify URL first becomes available (or is removed).
    // URI changes handled via loadUri below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!embed]);

  // URI change while controller is alive
  useEffect(() => {
    const ctrl = controllerRef.current;
    if (!ctrl || !embed) return;
    const uri = embedToUri(embed);
    if (uri) { try { ctrl.loadUri(uri); } catch { /* ignore */ } }
  }, [embed]);

  // Resize / drag
  const resizeRef = useRef<{
    dir: ResizeDir; startX: number; startY: number;
    startW: number; startH: number; startPosX: number; startPosY: number;
  } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (resizeRef.current) {
        const r = resizeRef.current;
        const dx = e.clientX - r.startX;
        const dy = e.clientY - r.startY;
        let w = r.startW, h = r.startH, x = r.startPosX, y = r.startPosY;
        if (r.dir.includes("r")) w = r.startW + dx;
        if (r.dir.includes("l")) { w = r.startW - dx; x = r.startPosX + dx; }
        if (r.dir.includes("b")) h = r.startH + dy;
        if (r.dir.includes("t")) { h = r.startH - dy; y = r.startPosY + dy; }
        if (w < MIN_WIDTH) { if (r.dir.includes("l")) x -= (MIN_WIDTH - w); w = MIN_WIDTH; }
        if (w > MAX_WIDTH) w = MAX_WIDTH;
        if (h < MIN_HEIGHT) { if (r.dir.includes("t")) y -= (MIN_HEIGHT - h); h = MIN_HEIGHT; }
        if (h > MAX_HEIGHT) h = MAX_HEIGHT;
        setWidth(w); setHeight(h); setPos({ x, y });
        return;
      }
      if (dragRef.current) {
        const d = dragRef.current;
        const nx = d.startPosX + (e.clientX - d.startX);
        const ny = d.startPosY + (e.clientY - d.startY);
        const maxX = window.innerWidth - 80;
        const maxY = window.innerHeight - 40;
        setPos({
          x: Math.min(maxX, Math.max(-width + 80, nx)),
          y: Math.min(maxY, Math.max(0, ny)),
        });
      }
    };
    const onUp = () => {
      resizeRef.current = null;
      dragRef.current = null;
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [width]);

  if (!embed) return null;

  const activePos = pos ?? { x: 20, y: 20 };
  const isLight = playerTheme === "light";
  const fg = isLight ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)";
  const iconBg = isLight ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)";
  const iconBorder = isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.22)";
  const iconBtn: React.CSSProperties = {
    color: fg, background: iconBg, border: `1px solid ${iconBorder}`,
    borderRadius: 8, width: 28, height: 28,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
  };

  const togglePlay = () => { try { controllerRef.current?.togglePlay?.(); } catch { /* ignore */ } };
  const nextTheme = (): PlayerTheme => (playerTheme === "light" ? "dark" : "light");

  // Wrapper positioning: visible in expanded mode, off-screen otherwise (keeps audio alive)
  const expandedDesktop = mode === "expanded" && !isMobile;
  const expandedMobile = mode === "expanded" && isMobile;

  const wrapperStyle: React.CSSProperties = expandedDesktop
    ? {
        position: "fixed",
        top: activePos.y, left: activePos.x,
        width, height, zIndex: 45,
        borderRadius: 16, overflow: "hidden",
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
      }
    : expandedMobile
    ? {
        position: "fixed",
        top: 10, left: 10, right: 10,
        height: Math.min(height, (typeof window !== "undefined" ? window.innerHeight - 40 : height)),
        zIndex: 50,
        borderRadius: 16, overflow: "hidden",
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
      }
    : {
        // Hidden but mounted so playback continues
        position: "fixed",
        top: 0, left: 0, width: 1, height: 1,
        opacity: 0, pointerEvents: "none",
        zIndex: -1, overflow: "hidden",
      };

  return (
    <>
      {/* Persistent iframe wrapper. Children are managed imperatively by the Spotify API. */}
      <div ref={wrapperRef} style={wrapperStyle} aria-hidden={mode !== "expanded"} />

      {/* Expanded desktop chrome */}
      {expandedDesktop && (
        <div
          className="fixed"
          style={{
            top: activePos.y, left: activePos.x, width, height, zIndex: 46,
            pointerEvents: "none",
          }}
        >
          <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6, pointerEvents: "auto" }}>
            <button onClick={() => setPlayerTheme(nextTheme())} style={iconBtn} aria-label="Toggle theme" title="Toggle theme">
              <Palette size={14} />
            </button>
            <button onClick={() => setMode("mini")} style={iconBtn} aria-label="Minimize to bar" title="Minimize to bar">
              <Minimize2 size={14} />
            </button>
            <button onClick={() => setMode("icon")} style={iconBtn} aria-label="Hide to icon" title="Hide to icon">
              <X size={14} />
            </button>
          </div>
          <div
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              dragRef.current = {
                startX: e.clientX, startY: e.clientY,
                startPosX: activePos.x, startPosY: activePos.y,
              };
              document.body.style.userSelect = "none";
            }}
            style={{ position: "absolute", top: 0, left: 0, right: 110, height: 22, cursor: "grab", pointerEvents: "auto" }}
            title="Drag to move"
          />
          {(["l", "r", "t", "b", "tl", "tr", "bl", "br"] as ResizeDir[]).map((dir) => {
            const s: React.CSSProperties = { position: "absolute", pointerEvents: "auto", zIndex: 4 };
            if (dir === "l") Object.assign(s, { left: -4, top: 0, bottom: 0, width: 8, cursor: "ew-resize" });
            if (dir === "r") Object.assign(s, { right: -4, top: 0, bottom: 0, width: 8, cursor: "ew-resize" });
            if (dir === "b") Object.assign(s, { left: 0, right: 0, bottom: -4, height: 8, cursor: "ns-resize" });
            if (dir === "t") Object.assign(s, { left: 0, right: 0, top: -4, height: 8, cursor: "ns-resize" });
            if (dir === "tl") Object.assign(s, { left: -6, top: -6, width: 14, height: 14, cursor: "nwse-resize" });
            if (dir === "tr") Object.assign(s, { right: -6, top: -6, width: 14, height: 14, cursor: "nesw-resize" });
            if (dir === "bl") Object.assign(s, { left: -6, bottom: -6, width: 14, height: 14, cursor: "nesw-resize" });
            if (dir === "br") Object.assign(s, { right: -6, bottom: -6, width: 14, height: 14, cursor: "nwse-resize" });
            return (
              <div
                key={dir}
                style={s}
                onPointerDown={(e) => {
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  resizeRef.current = {
                    dir,
                    startX: e.clientX, startY: e.clientY,
                    startW: width, startH: height,
                    startPosX: activePos.x, startPosY: activePos.y,
                  };
                  document.body.style.userSelect = "none";
                }}
              />
            );
          })}
        </div>
      )}

      {/* Expanded mobile chrome */}
      {expandedMobile && (
        <div className="fixed" style={{ top: 18, right: 18, zIndex: 55, display: "flex", gap: 6 }}>
          <button onClick={() => setPlayerTheme(nextTheme())} style={iconBtn} aria-label="Theme"><Palette size={14} /></button>
          <button onClick={() => setMode("mini")} style={iconBtn} aria-label="Minimize"><Minimize2 size={14} /></button>
          <button onClick={() => setMode("icon")} style={iconBtn} aria-label="Hide"><X size={14} /></button>
        </div>
      )}

      {/* Mini bar */}
      {mode === "mini" && (
        <MiniBar
          isMobile={isMobile}
          paused={playback.paused}
          name={playback.name}
          artist={playback.artist}
          onPlayPause={togglePlay}
          onExpand={() => setMode("expanded")}
          onIcon={() => setMode("icon")}
        />
      )}

      {/* Icon */}
      {mode === "icon" && (
        <IconButton isMobile={isMobile} onClick={() => setMode(lastOpenMode.current)} />
      )}
    </>
  );
}

function MiniBar({
  isMobile, paused, name, artist, onPlayPause, onExpand, onIcon,
}: {
  isMobile: boolean; paused: boolean; name: string; artist: string;
  onPlayPause: () => void; onExpand: () => void; onIcon: () => void;
}) {
  const pos: React.CSSProperties = isMobile
    ? { top: 10, left: 10, right: 10 }
    : { bottom: 20, right: 20, width: 320 };
  return (
    <div
      className="fixed"
      style={{
        ...pos,
        zIndex: 55,
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 12px",
        borderRadius: 999,
        background: "color-mix(in oklab, var(--sp-background) 55%, transparent)",
        border: "1px solid var(--sp-border)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        color: "var(--sp-foreground)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      }}
    >
      <button
        onClick={onPlayPause}
        aria-label={paused ? "Play" : "Pause"}
        className="grid place-items-center rounded-full border border-[color:var(--sp-border)] transition hover:opacity-80"
        style={{ width: 30, height: 30, background: "transparent", color: "var(--sp-foreground)", cursor: "pointer" }}
      >
        {paused ? <Play size={13} /> : <Pause size={13} />}
      </button>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {name || "—"}
        </div>
        <div style={{ fontSize: 10, opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {artist || "Spotify"}
        </div>
      </div>
      <button
        onClick={onExpand}
        aria-label="Expand"
        title="Expand"
        className="grid place-items-center text-[color:var(--sp-muted-foreground)] hover:text-[color:var(--sp-foreground)] transition"
        style={{ width: 24, height: 24, cursor: "pointer", background: "transparent", border: "none" }}
      >
        <Maximize2 size={12} />
      </button>
      <button
        onClick={onIcon}
        aria-label="Hide"
        title="Hide"
        className="grid place-items-center text-[color:var(--sp-muted-foreground)] hover:text-[color:var(--sp-foreground)] transition"
        style={{ width: 24, height: 24, cursor: "pointer", background: "transparent", border: "none" }}
      >
        <X size={12} />
      </button>
    </div>
  );
}

function IconButton({ isMobile, onClick }: { isMobile: boolean; onClick: () => void }) {
  const pos: React.CSSProperties = isMobile ? { top: 14, right: 14 } : { bottom: 24, right: 24 };
  return (
    <div className="fixed" style={{ ...pos, zIndex: 55 }}>
      <button
        onClick={onClick}
        aria-label="Open music player"
        title="Open music player"
        className="grid place-items-center rounded-full border border-[color:var(--sp-border)] text-[color:var(--sp-muted-foreground)] transition hover:text-[#1DB954]"
        style={{
          width: isMobile ? 32 : 36,
          height: isMobile ? 32 : 36,
          background: "color-mix(in oklab, var(--sp-background) 75%, transparent)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <SpotifyLogo size={isMobile ? 16 : 18} />
      </button>
    </div>
  );
}
