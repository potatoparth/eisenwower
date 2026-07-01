import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CreateSprintModal } from "@/components/sprint/CreateSprintModal";
import { Countdown } from "@/components/sprint/Countdown";
import { FocusMode } from "@/components/sprint/FocusMode";
import { CompleteScreen } from "@/components/sprint/CompleteScreen";
import { ThemeToggle } from "@/components/sprint/ThemeToggle";
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

type Phase = "home" | "countdown" | "focus" | "complete";

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
    if (active && !active.completedAt) setResumable(active);
    setActive(null);
  };

  const resume = () => {
    if (!resumable) return;
    setActive(resumable);
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
              <div className="flex items-center gap-3">
                <span
                  className="font-mono uppercase"
                  style={{ fontSize: 13, letterSpacing: "0.15em", color: fgNav }}
                >
                  Focus Mode
                </span>
              </div>
              <div className="flex items-center gap-5">
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
                      onClick={resume}
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

              {sprints.length > 0 && (
                <div className="animate-fade-up-delay mt-16 w-full max-w-md text-left">
                  <div className="flex items-baseline justify-between mb-3">
                    <span
                      className="font-mono uppercase"
                      style={{ fontSize: 11, letterSpacing: "0.15em", color: fgNav }}
                    >
                      My Sprints
                    </span>
                    <span
                      className="font-mono"
                      style={{ fontSize: 10, color: fgNav }}
                    >
                      {sprints.length}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {sprints.slice(0, 8).map((s) => {
                      const done = s.tasks.filter((t) => t.done).length;
                      const total = s.tasks.length;
                      const when = s.completedAt
                        ? new Date(s.completedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        : "—";
                      const mins = s.actualMinutes ?? s.duration;
                      return (
                        <li
                          key={s.id}
                          className="flex items-center justify-between gap-3"
                          style={{
                            border: `0.5px solid ${resumeCardBorder}`,
                            borderRadius: 12,
                            padding: "10px 14px",
                          }}
                        >
                          <div className="min-w-0">
                            <div className="truncate" style={{ fontSize: 13, color: fgMain }}>
                              {s.title}
                            </div>
                            <div
                              className="font-mono mt-0.5"
                              style={{ fontSize: 10, color: fgNav }}
                            >
                              {when} · {mins}m · {done}/{total} tasks
                              {s.endedEarly ? " · ended early" : ""}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setSprints(sprints.filter((x) => x.id !== s.id))
                            }
                            className="font-mono shrink-0 transition-opacity opacity-40 hover:opacity-100"
                            style={{ fontSize: 10, color: fgNav, background: "transparent" }}
                            aria-label="Remove sprint"
                          >
                            ✕
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
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