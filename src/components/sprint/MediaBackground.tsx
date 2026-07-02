import { useEffect, useRef } from "react";
import { useBackground, useBgMuted } from "@/lib/sprint/customization-store";

export function MediaBackground() {
  const { url, meta, enabled } = useBackground();
  const muted = useBgMuted();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, url]);

  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const func = muted ? "mute" : "unMute";
    win.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
  }, [muted, url]);

  if (!enabled || !url || !meta) return null;
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden style={{ zIndex: 0 }}>
      {meta.type === "video" ? (
        <video
          ref={videoRef}
          src={url}
          autoPlay
          loop
          muted={muted}
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : meta.type === "youtube" ? (
        // youtube-nocookie + mute=1 + loop trick (playlist must be the same id).
        // Scaled up to hide the letterbox / branding bars.
        <div className="absolute inset-0 overflow-hidden">
          <iframe
            ref={iframeRef}
            title="Background video"
            src={`https://www.youtube-nocookie.com/embed/${url}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&loop=1&playlist=${url}&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&disablekb=1&showinfo=0&enablejsapi=1`}
            allow="autoplay; encrypted-media; picture-in-picture"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: "177.78vh", // 16:9 wider than tall
              height: "56.25vw", // 16:9 taller than wide
              minWidth: "100%",
              minHeight: "100%",
              border: 0,
              pointerEvents: "none",
            }}
          />
        </div>
      ) : (
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {/* Readability overlay */}
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />
    </div>
  );
}
