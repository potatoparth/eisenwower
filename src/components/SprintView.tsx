import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CreateSprintModal } from "@/components/sprint/CreateSprintModal";
import { Countdown } from "@/components/sprint/Countdown";
import { FocusMode } from "@/components/sprint/FocusMode";
import { CompleteScreen } from "@/components/sprint/CompleteScreen";
import { CustomizeModal } from "@/components/sprint/CustomizeModal";
import { MediaBackground } from "@/components/sprint/MediaBackground";
import {
  elapsedMs,
  loadActiveSprint,
  saveActiveSprint,
  useSprints,
  type Sprint,
} from "@/lib/sprint/sprint-store";
import { useBackground } from "@/lib/sprint/customization-store";
import { useTheme } from "@/lib/sprint/theme-store";

export interface SprintSeedTask {
  id: string;
  title: string;
}

interface Props {
  /** Optional seed tasks used to auto-open the composer prefilled from another view. */
  seedTasks?: SprintSeedTask[];
  onSeedConsumed?: () => void;
}

type Phase = "home" | "countdown" | "focus" | "complete" | "history";

function fmtRemain(s: Sprint) {
  if (s.noTimer) return null;
  const total = s.duration * 60 * 1000;
  const left = Math.max(0, total - elapsedMs(s));
  const sec = Math.floor(left / 1000);
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/**
 * Ported from Focus Mode 2 / routes/index.tsx. Renders the sprint home,
 * countdown, focus, and complete phases entirely inside the current app's
 * "sprint" view — no router changes required.
 */
export function SprintView({ seedTasks, onSeedConsumed }: Props) {
  const [open, setOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("home");
  const [active, setActive] = useState<Sprint | null>(null);
  const [sprints, setSprints] = useSprints();
  const [resumable, setResumable] = useState<Sprint | null>(null);
  const [seedForModal, setSeedForModal] = useState<SprintSeedTask[] | undefined>(undefined);
  const { theme } = useTheme();
  const { enabled: bgEnabled } = useBackground();

  // Immersive mode: when a media background is enabled inside sprint,
  // hide the app chrome (header/footer/padding) so the media fills the screen.
  // Reverting is automatic on unmount (i.e. switching to any other view).
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (bgEnabled) {
      document.body.classList.add("sprint-immersive");
      return () => document.body.classList.remove("sprint-immersive");
    }
    document.body.classList.remove("sprint-immersive");
  }, [bgEnabled]);

  useEffect(() => {
    const act = loadActiveSprint();
    if (act && !act.completedAt) setResumable(act);
  }, []);

  // When another view sends over selected tasks, prefill and open the composer.
  useEffect(() => {
    if (!seedTasks || seedTasks.length === 0) return;
    setSeedForModal(seedTasks.slice(0, 5));
    setOpen(true);
    onSeedConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedTasks]);

  const handleLockIn = (data: {
    title: string;
    duration: number;
    tasks: { id: string; title: string }[];
    noTimer?: boolean;
    atmosphere?: string;
  }) => {
    const sprint: Sprint = {
      id: crypto.randomUUID(),
      title: data.title,
      duration: data.duration,
      tasks: data.tasks.map((t) => ({ ...t, done: false })),
      startTime: Date.now(),
      pauseOffset: 0,
      pausedAt: null,
      noTimer: data.noTimer,
      atmosphere: data.atmosphere as Sprint["atmosphere"],
    };
    saveActiveSprint(sprint);
    setActive(sprint);
    setResumable(null);
    setOpen(false);
    setSeedForModal(undefined);
    setPhase("countdown");
  };

  const updateActive = (s: Sprint) => {
    setActive(s);
    saveActiveSprint(s);
  };

  const finish = (s: Sprint) => {
    const actualMs = elapsedMs(s);
    const actualMinutes = Math.max(1, Math.round(actualMs / 60000));
    const endedEarly = !s.noTimer && actualMinutes < s.duration;
    const done: Sprint = {
      ...s,
      completedAt: Date.now(),
      actualMinutes,
      endedEarly,
    };
    setActive(done);
    setSprints([done, ...sprints.filter((x) => x.id !== done.id)].slice(0, 50));
    saveActiveSprint(null);
    setResumable(null);
    setPhase("complete");
  };

  const exitToHome = () => {
    setPhase("home");
    if (active && !active.completedAt) {
      // Pause on exit so the timer freezes until the user resumes.
      const paused: Sprint =
        active.pausedAt != null ? active : { ...active, pausedAt: Date.now() };
      saveActiveSprint(paused);
      setResumable(paused);
    }
    setActive(null);
  };

  const unpause = (s: Sprint): Sprint => {
    if (s.pausedAt == null) return s;
    const addedOffset = Date.now() - s.pausedAt;
    return { ...s, pauseOffset: s.pauseOffset + addedOffset, pausedAt: null };
  };

  const resume = (s?: Sprint) => {
    const target = s ?? resumable;
    if (!target) return;
    const running = unpause(target);
    saveActiveSprint(running);
    setActive(running);
    setResumable(null);
    setPhase("focus");
  };

  const dismissResumable = () => {
    saveActiveSprint(null);
    setResumable(null);
  };

  const isLight = theme === "light";
  const onMedia = bgEnabled;

  const fgMain = onMedia ? "rgba(255,255,255,0.92)" : isLight ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.88)";
  const fgSub = onMedia ? "rgba(255,255,255,0.6)" : isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.35)";
  const fgNav = onMedia ? "rgba(255,255,255,0.7)" : isLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.45)";
  const ctaBorder = onMedia ? "rgba(255,255,255,0.3)" : isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)";
  const ctaBg = onMedia ? "rgba(255,255,255,0.06)" : isLight ? "transparent" : "rgba(255,255,255,0.04)";
  const ctaBorderHover = onMedia ? "rgba(255,255,255,0.5)" : isLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)";
  const ctaBgHover = onMedia ? "rgba(255,255,255,0.12)" : isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)";
  const ctaText = onMedia ? "rgba(255,255,255,0.85)" : isLight ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.7)";
  const resumeCardBorder = onMedia ? "rgba(255,255,255,0.25)" : isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.15)";

  const resumePreview = (() => {
    if (!resumable) return null;
    const doneCount = resumable.tasks.filter((t) => t.done).length;
    const total = resumable.tasks.length;
    if (resumable.noTimer) return `running · ${doneCount} of ${total} done`;
    const left = fmtRemain(resumable);
    return `${left} left · ${doneCount} of ${total} done`;
  })();

  return (
    <div
      className="sprint-scope relative flex-1 min-h-0 overflow-hidden"
      style={{ background: "var(--sp-background)" }}
    >
      <MediaBackground />
      <AnimatePresence mode="wait">
        {phase === "home" && (
          <div key="home" className="relative h-full overflow-y-auto">
            <div
              aria-hidden
              className="pointer-events-none absolute animate-breathing-orb"
              style={{
                top: "50%", left: "50%", width: 320, height: 320,
                borderRadius: "50%",
                background: isLight
                  ? "radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(100,180,255,0.06) 0%, transparent 70%)",
                zIndex: 0,
              }}
            />

            <header
              className="relative flex items-center justify-between px-6 pt-6 sm:px-10 sm:pt-8"
              style={{ zIndex: 2 }}
            >
              <div className="flex items-center gap-3" />
              <div className="flex items-center gap-5">
                <button
                  onClick={() => setPhase("history")}
                  className="font-mono uppercase transition-colors duration-300"
                  style={{
                    fontSize: 13, letterSpacing: "0.12em", color: fgNav,
                    background: "transparent", border: "none", cursor: "pointer",
                  }}
                >
                  My Sprints
                </button>
                <button
                  onClick={() => setCustomizeOpen(true)}
                  className="font-mono uppercase transition-colors duration-300"
                  style={{
                    fontSize: 13, letterSpacing: "0.12em", color: fgNav,
                    background: "transparent", border: "none", cursor: "pointer",
                  }}
                >
                  Customize
                </button>
              </div>
            </header>

            <div
              className="relative flex min-h-[calc(100%-5rem)] flex-col items-center justify-center px-6 py-16 text-center"
              style={{ zIndex: 2 }}
            >
              <div className="animate-fade-up max-w-3xl">
                <h1
                  className="text-4xl leading-[1.15] tracking-tight text-balance sm:text-6xl"
                  style={{
                    fontFamily: "var(--sp-font-display)",
                    fontWeight: 300,
                    color: fgMain,
                  }}
                >
                  What deserves your attention{" "}
                  <span style={{ fontWeight: 300, color: fgMain }}>right now</span>?
                </h1>
                <p
                  className="mt-6"
                  style={{
                    fontFamily: "var(--sp-font-display)",
                    fontSize: 20, fontWeight: 300, color: fgSub,
                  }}
                >
                  One session. A few tasks. Nothing else.
                </p>
              </div>

              <div className="animate-fade-up-delay mt-12 flex flex-col items-center gap-4 w-full max-w-md">
                {resumable && (
                  <div className="w-full flex flex-col items-center">
                    <button
                      onClick={() => resume()}
                      className="w-full flex items-center justify-between text-left transition-colors"
                      style={{
                        border: `0.5px solid ${resumeCardBorder}`,
                        borderRadius: 14,
                        padding: "12px 20px",
                        marginBottom: 6,
                        background: "transparent",
                      }}
                    >
                      <div className="min-w-0">
                        <div className="truncate" style={{ fontSize: 13, fontWeight: 400, color: fgMain }}>
                          {resumable.title}
                        </div>
                        <div
                          className="font-mono mt-0.5"
                          style={{ fontSize: 11, color: isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)" }}
                        >
                          {resumePreview}
                        </div>
                      </div>
                      <span
                        className="ml-3 shrink-0"
                        style={{ fontSize: 14, color: isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)" }}
                      >
                        →
                      </span>
                    </button>
                    <button
                      onClick={dismissResumable}
                      className="font-mono mt-2 transition-colors"
                      style={{ fontSize: 10, color: isLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.25)" }}
                    >
                      dismiss
                    </button>
                  </div>
                )}

                <button
                  onClick={() => { setSeedForModal(undefined); setOpen(true); }}
                  className="group inline-flex items-center gap-2.5 transition-all duration-300"
                  style={{
                    borderRadius: 100,
                    border: `0.5px solid ${ctaBorder}`,
                    background: ctaBg,
                    padding: "13px 28px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.border = `0.5px solid ${ctaBorderHover}`;
                    e.currentTarget.style.background = ctaBgHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = `0.5px solid ${ctaBorder}`;
                    e.currentTarget.style.background = ctaBg;
                  }}
                >
                  <span
                    className="animate-dot-pulse"
                    style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: isLight ? "rgba(0,0,0,0.4)" : "rgba(100,200,255,0.6)",
                      display: "inline-block",
                    }}
                  />
                  <span style={{ fontSize: 15, fontWeight: 400, color: ctaText }}>
                    Begin a sprint
                  </span>
                </button>
              </div>

            </div>
          </div>
        )}

        {phase === "history" && (
          <div key="history" className="relative h-full overflow-y-auto">
            <header
              className="relative flex items-center justify-between px-6 pt-6 sm:px-10 sm:pt-8"
              style={{ zIndex: 2 }}
            >
              <button
                onClick={() => setPhase("home")}
                className="font-mono uppercase transition-colors duration-300"
                style={{
                  fontSize: 13, letterSpacing: "0.12em", color: fgNav,
                  background: "transparent", border: "none", cursor: "pointer",
                }}
              >
                ← Back
              </button>
              <span
                className="font-mono uppercase"
                style={{ fontSize: 13, letterSpacing: "0.15em", color: fgNav }}
              >
                My Sprints
              </span>
            </header>

            <div
              className="relative mx-auto w-full max-w-2xl px-6 pt-8 pb-16 sm:px-10"
              style={{ zIndex: 2 }}
            >
              <h1
                className="text-3xl tracking-tight sm:text-4xl"
                style={{
                  fontFamily: "var(--sp-font-display)",
                  fontWeight: 300,
                  color: fgMain,
                }}
              >
                Your sessions
              </h1>

              {resumable == null && sprints.length === 0 ? (
                <p
                  className="mt-16 text-center"
                  style={{
                    fontFamily: "var(--sp-font-display)",
                    fontSize: 18, fontWeight: 300, color: fgSub,
                  }}
                >
                  No sprints yet.
                </p>
              ) : (
                <ul className="mt-8 flex flex-col gap-2.5">
                  {[
                    ...(resumable
                      ? [{
                          s: resumable,
                          status: (resumable.pausedAt != null ? "paused" : "ongoing") as
                            | "paused" | "ongoing" | "completed" | "incomplete",
                        }]
                      : []),
                    ...sprints.map((s) => {
                      const total = s.tasks.length;
                      const done = s.tasks.filter((t) => t.done).length;
                      const status: "completed" | "incomplete" =
                        total > 0 && done < total ? "incomplete" : "completed";
                      return { s, status };
                    }),
                  ].map(({ s, status }) => {
                    const done = s.tasks.filter((t) => t.done).length;
                    const total = s.tasks.length;
                    const ref = s.completedAt ?? s.startTime;
                    const when = new Date(ref).toLocaleDateString(undefined, {
                      weekday: "short", month: "short", day: "numeric",
                    });
                    const mins = s.actualMinutes ?? s.duration;
                    const pillFg =
                      status === "completed"
                        ? isLight ? "#16a34a" : "#4ade80"
                        : status === "ongoing"
                        ? isLight ? "#2563eb" : "#60a5fa"
                        : status === "paused"
                        ? fgNav
                        : isLight ? "#dc2626" : "#f87171";
                    const pillBg =
                      status === "completed"
                        ? isLight ? "rgba(34,197,94,0.1)" : "rgba(74,222,128,0.12)"
                        : status === "ongoing"
                        ? isLight ? "rgba(59,130,246,0.1)" : "rgba(96,165,250,0.12)"
                        : status === "paused"
                        ? isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"
                        : isLight ? "rgba(220,38,38,0.1)" : "rgba(248,113,113,0.12)";
                    const isLive = status === "paused" || status === "ongoing";
                    return (
                      <li
                        key={s.id}
                        className="flex items-start justify-between gap-3"
                        style={{
                          border: `0.5px solid ${resumeCardBorder}`,
                          borderRadius: 16,
                          padding: "16px 18px",
                          background: isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)",
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div
                              className="truncate"
                              style={{ fontSize: 15, color: fgMain }}
                            >
                              {s.title}
                            </div>
                            <span
                              className="font-mono uppercase shrink-0"
                              style={{
                                fontSize: 9, letterSpacing: "0.12em",
                                padding: "3px 8px", borderRadius: 100,
                                background: pillBg, color: pillFg,
                              }}
                            >
                              {status}
                            </span>
                          </div>
                          <div
                            className="font-mono mt-1.5"
                            style={{ fontSize: 11, letterSpacing: "0.08em", color: fgNav }}
                          >
                            {when} · {total} task{total === 1 ? "" : "s"} ·{" "}
                            {s.noTimer ? "no timer" : `${mins}m`}
                            {status === "completed" && total > 0 ? ` · ${done}/${total} done` : ""}
                            {s.endedEarly ? " · ended early" : ""}
                          </div>
                          {isLive && (
                            <button
                              onClick={() => resume(s)}
                              className="font-mono mt-3 transition-colors"
                              style={{
                                fontSize: 12, color: fgMain,
                                background: "transparent", border: "none", padding: 0,
                              }}
                            >
                              Resume →
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (isLive) {
                              saveActiveSprint(null);
                              setResumable(null);
                            } else {
                              setSprints(sprints.filter((x) => x.id !== s.id));
                            }
                          }}
                          className="shrink-0 transition-opacity opacity-40 hover:opacity-100"
                          style={{ fontSize: 14, color: fgNav, background: "transparent" }}
                          aria-label="Remove sprint"
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {phase === "countdown" && (
          <Countdown key="cd" onDone={() => setPhase("focus")} />
        )}

        {phase === "focus" && active && (
          <FocusMode
            key="focus"
            sprint={active}
            onUpdate={updateActive}
            onExit={exitToHome}
            onComplete={finish}
          />
        )}

        {phase === "complete" && active && (
          <CompleteScreen
            key="done"
            sprint={active}
            onAnother={() => {
              setActive(null);
              setPhase("home");
              setTimeout(() => { setSeedForModal(undefined); setOpen(true); }, 100);
            }}
            onHome={exitToHome}
          />
        )}
      </AnimatePresence>

      <CreateSprintModal
        open={open}
        onClose={() => { setOpen(false); setSeedForModal(undefined); }}
        onLockIn={handleLockIn}
        seedTasks={seedForModal}
      />
      <CustomizeModal open={customizeOpen} onClose={() => setCustomizeOpen(false)} />
    </div>
  );
}