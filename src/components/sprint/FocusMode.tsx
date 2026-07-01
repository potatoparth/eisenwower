import { useEffect, useRef, useState } from "react";
import { Settings2, Clock } from "lucide-react";
import type { Sprint, SprintTask } from "@/lib/sprint/sprint-store";
import { ThemeToggle } from "./ThemeToggle";
import { AmbientBackground } from "./AmbientBackground";
import { MediaBackground } from "./MediaBackground";
import { SpotifyPlayer } from "./SpotifyPlayer";
import { CustomizeModal } from "./CustomizeModal";
import { useBackground } from "@/lib/sprint/customization-store";

interface Props {
  sprint: Sprint;
  onUpdate: (s: Sprint) => void;
  onExit: () => void;
  onComplete: (s: Sprint) => void;
}

const TIMER_HIDDEN_KEY = "lockin.timer.hidden";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
      <path d="M2 5.2L4.2 7.4L8 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DragHandle({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <line x1="3" y1="5" x2="15" y2="5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3" y1="9" x2="15" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3" y1="13" x2="15" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function FocusMode({ sprint, onUpdate, onExit, onComplete }: Props) {
  const totalSeconds = sprint.duration * 60;
  const [, force] = useState(0);
  const completedRef = useRef(false);

  // Computed remaining
  const computeRemaining = () => {
    if (sprint.noTimer) return Infinity;
    const now = sprint.pausedAt ?? Date.now();
    const elapsed = Math.floor((now - sprint.startTime - sprint.pauseOffset) / 1000);
    return Math.max(0, totalSeconds - elapsed);
  };

  const [remaining, setRemaining] = useState(computeRemaining);
  const [timerHidden, setTimerHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(TIMER_HIDDEN_KEY) === "1";
  });
  const [dragId, setDragId] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState("");
  const [customizeOpen, setCustomizeOpen] = useState(false);

  useEffect(() => {
    setRemaining(computeRemaining());
    if (sprint.noTimer) return;
    const id = setInterval(() => {
      const r = computeRemaining();
      setRemaining(r);
      if (r <= 0 && !completedRef.current) {
        completedRef.current = true;
        onComplete({ ...sprint, completedAt: Date.now() });
      }
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprint.startTime, sprint.pauseOffset, sprint.pausedAt, totalSeconds, sprint.noTimer, sprint.duration]);


  const paused = sprint.pausedAt != null;
  const doneCount = sprint.tasks.filter((t) => t.done).length;
  const total = sprint.tasks.length;
  const allDone = total > 0 && doneCount === total;
  const currentIdx = sprint.tasks.findIndex((t) => !t.done);
  const currentTask = currentIdx >= 0 ? sprint.tasks[currentIdx] : null;
  const progressPct = total ? (doneCount / total) * 100 : 0;

  useEffect(() => {
    if (allDone && !completedRef.current && !sprint.noTimer) {
      // For timed sprints: auto-complete when all tasks done
      // For noTimer: user must end manually
      completedRef.current = true;
      const t = setTimeout(() => {
        onComplete({ ...sprint, completedAt: Date.now() });
      }, 600);
      return () => clearTimeout(t);
    }
  }, [allDone, sprint, onComplete]);

  const toggle = (id: string) => {
    onUpdate({
      ...sprint,
      tasks: sprint.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    });
  };

  const handlePause = () => {
    if (paused) {
      const offset = sprint.pauseOffset + (Date.now() - (sprint.pausedAt ?? Date.now()));
      onUpdate({ ...sprint, pauseOffset: offset, pausedAt: null });
    } else {
      onUpdate({ ...sprint, pausedAt: Date.now() });
    }
    force((x) => x + 1);
  };

  const toggleTimer = () => {
    setTimerHidden((v) => {
      const next = !v;
      if (typeof window !== "undefined") {
        localStorage.setItem(TIMER_HIDDEN_KEY, next ? "1" : "0");
      }
      return next;
    });
  };

  const extendTime = (minutes: number) => {
    // Decrease pauseOffset to extend remaining time (since elapsed = now - start - pauseOffset)
    onUpdate({ ...sprint, pauseOffset: sprint.pauseOffset + minutes * 60 * 1000 });
  };

  // Drag-and-drop reorder
  const onDragStart = (id: string) => (e: React.DragEvent) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragId || dragId === id) return;
    const from = sprint.tasks.findIndex((t) => t.id === dragId);
    const to = sprint.tasks.findIndex((t) => t.id === id);
    if (from < 0 || to < 0) return;
    const next = [...sprint.tasks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onUpdate({ ...sprint, tasks: next });
  };
  const onDragEnd = () => setDragId(null);

  const commitNewTask = () => {
    const trimmed = newTask.trim();
    if (!trimmed) {
      setAddingTask(false);
      setNewTask("");
      return;
    }
    const titleCap = trimmed[0].toUpperCase() + trimmed.slice(1);
    const t: SprintTask = { id: crypto.randomUUID(), title: titleCap, done: false };
    onUpdate({ ...sprint, tasks: [...sprint.tasks, t] });
    setNewTask("");
    setAddingTask(false);
  };

  const { enabled: bgEnabled } = useBackground();
  const muted = bgEnabled ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.3)";
  const veryMuted = bgEnabled ? "rgba(255,255,255,0.56)" : "rgba(255,255,255,0.2)";
  // When a custom media background is active, force dark-theme text so it stays
  // legible over the darkening overlay regardless of the app theme.
  const isLight =
    !bgEnabled &&
    typeof document !== "undefined" &&
    document.documentElement.!document.documentElement.classList.contains("dark");
  const mutedText = isLight ? "rgba(0,0,0,0.4)" : muted;
  const veryMutedText = isLight ? "rgba(0,0,0,0.3)" : veryMuted;
  const handleColor = isLight ? "rgba(0,0,0,0.2)" : bgEnabled ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)";
  const addColor = isLight ? "rgba(0,0,0,0.3)" : bgEnabled ? "rgba(255,255,255,0.68)" : "rgba(255,255,255,0.2)";
  const popoverBg = isLight ? "#ffffff" : "#13161c";
  const popoverBorder = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col animate-fade-in"
      style={{ background: "var(--sp-background)", overflow: "hidden" }}
    >
      {bgEnabled ? <MediaBackground /> : <AmbientBackground atmosphere={sprint.atmosphere} intense />}
      <SpotifyPlayer />
      {/* Top bar */}
      <div style={{ padding: "28px 32px 0", position: "relative", zIndex: 2, flexShrink: 0 }}>
        <div className="grid items-center" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
          <div className="flex items-center gap-3">
            <span
              className="font-mono uppercase"
              style={{ fontSize: 13, letterSpacing: "0.15em", color: mutedText }}
            >
              Focus Mode
            </span>
            <ThemeToggle
              color={bgEnabled ? "rgba(255,255,255,0.85)" : undefined}
              borderColor={bgEnabled ? "rgba(255,255,255,0.35)" : undefined}
            />
            <button
              onClick={() => setCustomizeOpen(true)}
              style={
                bgEnabled
                  ? { color: "rgba(255,255,255,0.85)", borderColor: "rgba(255,255,255,0.35)" }
                  : undefined
              }
              className={`grid h-7 w-7 place-items-center rounded-full border transition ${
                bgEnabled
                  ? ""
                  : "border-[color:var(--sp-border)] text-[color:var(--sp-muted-foreground)] hover:text-[color:var(--sp-foreground)]"
              }`}
              aria-label="Customize background and music"
              title="Customize"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="relative flex items-center gap-2">
            {sprint.noTimer ? (
              <span />
            ) : (
              <>
                <button
                  onClick={toggleTimer}
                  className="grid place-items-center transition"
                  style={{
                    position: "absolute",
                    right: "calc(100% + 10px)",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 22,
                    height: 22,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    color: mutedText,
                    opacity: timerHidden ? 0.55 : 1,
                  }}
                  aria-label={timerHidden ? "Show timer" : "Hide timer"}
                  title={timerHidden ? "Show timer" : "Hide timer"}
                >
                  <Clock className="h-3.5 w-3.5" />
                </button>
                {!timerHidden && (
                  <>
                    <button
                      onClick={() => extendTime(-5)}
                      disabled={remaining <= 5 * 60}
                      className="font-mono select-none transition"
                      style={{
                        fontSize: 12,
                        letterSpacing: "0.08em",
                        color: mutedText,
                        background: "transparent",
                        border: `0.5px solid ${popoverBorder}`,
                        borderRadius: 999,
                        padding: "3px 9px",
                        cursor: remaining <= 5 * 60 ? "not-allowed" : "pointer",
                        opacity: remaining <= 5 * 60 ? 0.35 : 1,
                      }}
                      aria-label="Subtract 5 minutes"
                    >
                      −5
                    </button>
                    <span
                      className="font-mono tabular-nums select-none"
                      style={{ fontSize: 15, letterSpacing: "0.08em", color: mutedText, minWidth: 56, textAlign: "center" }}
                    >
                      {fmt(remaining)}
                    </span>
                    <button
                      onClick={() => extendTime(5)}
                      className="font-mono select-none transition"
                      style={{
                        fontSize: 12,
                        letterSpacing: "0.08em",
                        color: mutedText,
                        background: "transparent",
                        border: `0.5px solid ${popoverBorder}`,
                        borderRadius: 999,
                        padding: "3px 9px",
                        cursor: "pointer",
                      }}
                      aria-label="Add 5 minutes"
                    >
                      +5
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          <span
            className="font-mono uppercase justify-self-end"
            style={{ fontSize: 13, letterSpacing: "0.15em", color: mutedText }}
          >
            {doneCount} / {total}
          </span>
        </div>

        {/* Progress bar */}
        {!sprint.noTimer && (
          <div
            style={{
              marginTop: 20,
              height: 1,
              width: "100%",
              background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.07)",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background: isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.18)",
                transition: "width 1s linear",
              }}
            />
          </div>
        )}
      </div>

      {/* Hero */}
      <div
        className="flex-1 flex flex-col items-center justify-center text-center"
        style={{ padding: "32px 24px 24px", minHeight: 120, position: "relative", zIndex: 2, overflow: "hidden" }}
      >
        <div
          className="font-mono uppercase"
          style={{ fontSize: 11, letterSpacing: "0.2em", color: veryMutedText, marginBottom: 14 }}
        >
          {allDone ? "" : "NOW"}
        </div>
        {currentTask ? (
          <div
            key={currentTask.id}
            className="animate-fade-in"
            style={{
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: 38,
              fontWeight: 300,
              letterSpacing: "-0.02em",
              color: isLight ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.9)",
              maxWidth: 720,
              lineHeight: 1.2,
              overflowWrap: "anywhere",
            }}
          >
            {currentTask.title}
          </div>
        ) : (
          <div
            className="font-display"
            style={{ fontSize: 20, color: veryMutedText, fontWeight: 300 }}
          >
            all done
          </div>
        )}
      </div>

      {/* Task list */}
      <div
        className="mx-auto w-full"
        style={{
          maxWidth: 560,
          padding: "0 32px",
          borderTop: `1px solid ${isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
          paddingTop: 20,
          maxHeight: "min(34vh, 300px)",
          overflowY: "auto",
          position: "relative",
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        <ul style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {sprint.tasks.map((t, i) => {
            const isCurrent = !t.done && i === currentIdx;
            const isDone = t.done;
            let circleBorder = isLight ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.18)";
            let circleBg = "transparent";
            let checkColor = "transparent";
            let labelColor = isLight ? "rgba(0,0,0,0.55)" : bgEnabled ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.55)";
            let labelWeight = 300;
            let strike = false;

            if (isDone) {
              circleBorder = isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
              circleBg = isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)";
              checkColor = isLight ? "rgba(0,0,0,0.35)" : bgEnabled ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.35)";
              labelColor = isLight ? "rgba(0,0,0,0.28)" : bgEnabled ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.18)";
              strike = true;
            } else if (isCurrent) {
              circleBorder = isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";
              labelColor = isLight ? "rgba(0,0,0,0.9)" : bgEnabled ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.88)";
              labelWeight = 400;
            }

            return (
              <li
                key={t.id}
                draggable={editingId !== t.id}
                onDragStart={onDragStart(t.id)}
                onDragOver={onDragOver(t.id)}
                onDragEnd={onDragEnd}
                style={{
                  opacity: dragId === t.id ? 0.9 : 1,
                  boxShadow: dragId === t.id ? "0 8px 20px rgba(0,0,0,0.25)" : "none",
                  transition: "box-shadow 0.15s, opacity 0.15s",
                  borderRadius: 8,
                }}
              >
                <div
                  className="flex w-full items-center gap-3 text-left transition"
                  style={{
                    padding: "14px 6px",
                    borderRadius: 8,
                    background: "transparent",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span
                    className="shrink-0 grid place-items-center"
                    style={{
                      width: 20,
                      height: 20,
                      cursor: "grab",
                    }}
                    aria-label="Drag to reorder"
                  >
                    <DragHandle color={handleColor} />
                  </span>
                  <button
                    onClick={() => toggle(t.id)}
                    className="grid place-items-center shrink-0"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: `1.5px solid ${circleBorder}`,
                      background: circleBg,
                    }}
                  >
                    {isDone && <CheckIcon color={checkColor} />}
                  </button>
                  {editingId === t.id ? (
                    <input
                      autoFocus
                      value={editingVal}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEditingVal(v.length > 0 ? v[0].toUpperCase() + v.slice(1) : v);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = editingVal.trim();
                          if (v) {
                            onUpdate({
                              ...sprint,
                              tasks: sprint.tasks.map((x) =>
                                x.id === t.id ? { ...x, title: v } : x,
                              ),
                            });
                          }
                          setEditingId(null);
                        } else if (e.key === "Escape") {
                          setEditingId(null);
                        }
                      }}
                      onBlur={() => {
                        const v = editingVal.trim();
                        if (v) {
                          onUpdate({
                            ...sprint,
                            tasks: sprint.tasks.map((x) =>
                              x.id === t.id ? { ...x, title: v } : x,
                            ),
                          });
                        }
                        setEditingId(null);
                      }}
                      className="flex-1 bg-transparent outline-none"
                      style={{
                        fontSize: 16,
                        fontWeight: labelWeight,
                        letterSpacing: "0.01em",
                        color: labelColor,
                        border: "none",
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setEditingVal(t.title);
                        setEditingId(t.id);
                      }}
                      className="flex-1 text-left"
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        fontSize: 16,
                        fontWeight: labelWeight,
                        letterSpacing: "0.01em",
                        color: labelColor,
                        textDecoration: strike ? "line-through" : "none",
                        cursor: "text",
                      }}
                    >
                      {t.title}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>



        {/* Add task */}
        <div style={{ marginTop: 6 }}>
          {addingTask ? (
            <div
              className="flex w-full items-center gap-3"
              style={{ padding: "14px 6px" }}
            >
              <span
                className="shrink-0"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: `1.5px solid ${isLight ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.18)"}`,
                }}
              />
              <input
                autoFocus
                value={newTask}
                onChange={(e) => {
                  const v = e.target.value;
                  setNewTask(v.length > 0 ? v[0].toUpperCase() + v.slice(1) : v);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitNewTask();
                  else if (e.key === "Escape") {
                    setAddingTask(false);
                    setNewTask("");
                  }
                }}
                onBlur={commitNewTask}
                placeholder="New task"
                className="flex-1 bg-transparent outline-none"
                style={{
                  fontSize: 16,
                  fontWeight: 300,
                  letterSpacing: "0.01em",
                  color: isLight ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.88)",
                  border: "none",
                }}
              />
            </div>
          ) : (
            <button
              onClick={() => setAddingTask(true)}
              className="font-mono transition-colors"
              style={{
                fontSize: 12,
                color: addColor,
                background: "transparent",
                border: "none",
                padding: "10px 6px",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.4)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.color = addColor)}
            >
              + add task
            </button>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="flex items-center justify-center"
        style={{ gap: 16, marginTop: 20, paddingBottom: 28, position: "relative", zIndex: 2, flexShrink: 0 }}
      >
        {!sprint.noTimer && (
          <button
            onClick={handlePause}
            className="font-mono uppercase transition"
            style={{
              borderRadius: 100,
              border: `0.5px solid ${isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"}`,
              background: "transparent",
              color: isLight ? "rgba(0,0,0,0.5)" : bgEnabled ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.4)",
              fontSize: 12,
              letterSpacing: "0.12em",
              padding: "9px 18px",
            }}
          >
            {paused ? "Resume" : "Pause"}
          </button>
        )}
        <button
          onClick={() => onComplete({ ...sprint, completedAt: Date.now() })}
          className="font-mono uppercase transition"
          style={{
            borderRadius: 100,
            border: "0.5px solid rgba(255,60,60,0.2)",
            background: "transparent",
            color: bgEnabled ? "rgba(255,130,130,0.9)" : "rgba(255,100,100,0.6)",
            fontSize: 12,
            letterSpacing: "0.12em",
            padding: "9px 18px",
          }}
        >
          End sprint
        </button>
        <button
          onClick={onExit}
          className="font-mono uppercase transition"
          style={{
            borderRadius: 100,
            border: `0.5px solid ${isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
            background: "transparent",
            color: isLight ? "rgba(0,0,0,0.35)" : bgEnabled ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.25)",
            fontSize: 12,
            letterSpacing: "0.12em",
            padding: "9px 18px",
          }}
        >
          Exit
        </button>
      </div>
      <CustomizeModal open={customizeOpen} onClose={() => setCustomizeOpen(false)} />
    </div>
  );
}
