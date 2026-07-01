import { useEffect, useState, useRef, useMemo, type KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";
import { durations, atmospheres, type AtmosphereId } from "@/lib/sprint/atmospheres";
import { loadSprints } from "@/lib/sprint/sprint-store";
import { useTheme } from "@/lib/sprint/theme-store";

interface DraftTask { id: string; title: string }

interface Props {
  open: boolean;
  onClose: () => void;
  onLockIn: (data: {
    title: string;
    duration: number;
    tasks: { id: string; title: string }[];
    noTimer?: boolean;
    atmosphere?: AtmosphereId;
  }) => void;
  /** Prefilled tasks (e.g. from "Add to Sprint" bulk action). Capped at 5. */
  seedTasks?: { id: string; title: string }[];
}

function generateDefaultTitle(): string {
  const now = new Date();
  const day = now.getDate();
  const month = now.toLocaleDateString("en-US", { month: "short" });
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${day}`;
  const all = loadSprints();
  const count =
    all.filter((s) => {
      const d = new Date(s.startTime);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === todayKey;
    }).length + 1;
  return `${day} ${month} Sprint #${count}`;
}

function DragHandleIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <line x1="3" y1="4" x2="11" y2="4" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="3" y1="7" x2="11" y2="7" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="3" y1="10" x2="11" y2="10" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function CreateSprintModal({ open, onClose, onLockIn, seedTasks }: Props) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState<number>(45);
  const [customMode, setCustomMode] = useState(false);
  const [noTimer, setNoTimer] = useState(false);
  const [tasks, setTasks] = useState<DraftTask[]>([]);
  const [taskInput, setTaskInput] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [atmosphere, setAtmosphere] = useState<AtmosphereId>("midnight");
  const taskRef = useRef<HTMLInputElement>(null);

  const headingColor = isLight ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.88)";
  const labelColor = isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.45)";
  const bodyColor = isLight ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.88)";
  const placeholderMuted = isLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.35)";
  const borderColor = isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)";
  const inputBg = isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)";
  const handleColor = isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)";
  const pillSelBg = isLight ? "rgba(0,0,0,0.85)" : "#ffffff";
  const pillSelText = isLight ? "#ffffff" : "rgba(0,0,0,0.9)";
  const pillText = isLight ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.55)";
  const modalBg = "var(--sp-surface-modal)";

  const placeholder = useMemo(() => "Give this sprint a title?", []);

  // Seed tasks when the modal opens with an incoming selection.
  const seedKey = seedTasks?.map((t) => t.id).join("|") ?? "";
  useEffect(() => {
    if (!open) return;
    if (seedTasks && seedTasks.length > 0) {
      setTasks(
        seedTasks.slice(0, 5).map((t) => ({
          id: crypto.randomUUID(),
          title: t.title.length > 0 ? t.title[0].toUpperCase() + t.title.slice(1) : t.title,
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seedKey]);

  if (!open) return null;

  const addTask = () => {
    const raw = taskInput.trim();
    if (!raw || tasks.length >= 5) return;
    const cap = raw[0].toUpperCase() + raw.slice(1);
    setTasks((p) => [...p, { id: crypto.randomUUID(), title: cap }]);
    setTaskInput("");
    taskRef.current?.focus();
  };

  const onTaskKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addTask(); }
  };

  const onTaskInputChange = (v: string) => {
    setTaskInput(v.length > 0 ? v[0].toUpperCase() + v.slice(1) : v);
  };

  const canLock = tasks.length > 0 && (noTimer || duration > 0);

  const handleLock = () => {
    if (!canLock) return;
    const finalTitle = title.trim() || generateDefaultTitle();
    onLockIn({ title: finalTitle, duration, tasks, noTimer, atmosphere });
  };

  // Drag reorder
  const onDragStart = (id: string) => (e: React.DragEvent) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragId || dragId === id) return;
    const from = tasks.findIndex((t) => t.id === dragId);
    const to = tasks.findIndex((t) => t.id === id);
    if (from < 0 || to < 0) return;
    const next = [...tasks];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setTasks(next);
  };
  const onDragEnd = () => setDragId(null);

  const Label = ({ children }: { children: React.ReactNode }) => (
    <div
      className="font-mono uppercase"
      style={{ fontSize: 13, letterSpacing: "0.12em", color: labelColor }}
    >
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-up">
      <div className="absolute inset-0" style={{ background: isLight ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.7)" }} onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-xl rounded-3xl p-6 sm:p-9 max-h-[90vh] overflow-y-auto"
        style={{
          background: modalBg,
          border: `0.5px solid ${borderColor}`,
        }}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 transition"
          style={{ color: labelColor }}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Heading */}
        <div className="mb-8">
          <h2
            style={{
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: 300,
              fontSize: 32,
              letterSpacing: "-0.01em",
              color: headingColor,
              lineHeight: 1.2,
            }}
          >
            Let's get started.
          </h2>
        </div>

        {/* Title */}
        <div className="mb-8">
          <input
            value={title}
            onChange={(e) => {
              const v = e.target.value;
              setTitle(v.length > 0 ? v[0].toUpperCase() + v.slice(1) : v);
            }}
            placeholder={placeholder}
            className="w-full bg-transparent outline-none"
            style={{
              fontSize: 18,
              fontWeight: 300,
              color: bodyColor,
              borderBottom: `0.5px solid ${borderColor}`,
              padding: "10px 0",
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            }}
            autoFocus
          />
          <style>{`
            input::placeholder { color: ${placeholderMuted}; }
          `}</style>
        </div>

        {/* Duration */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <Label>Duration</Label>
            <button
              type="button"
              onClick={() => setNoTimer((v) => !v)}
              className="flex items-center gap-2 font-mono transition-colors"
              style={{ fontSize: 12, color: labelColor }}
            >
              <span
                className="inline-flex h-4 w-7 items-center rounded-full transition-colors"
                style={{ background: noTimer ? headingColor : borderColor }}
              >
                <span
                  className="h-3 w-3 rounded-full transition-transform"
                  style={{ background: isLight ? "#fff" : "#000", transform: noTimer ? "translateX(14px)" : "translateX(2px)" }}
                />
              </span>
              No timer
            </button>
          </div>
          {!noTimer && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div
                className="inline-flex rounded-full p-1"
                style={{ border: `0.5px solid ${borderColor}` }}
              >
                {durations.map((d) => {
                  const active = !customMode && duration === d;
                  return (
                    <button
                      key={d}
                      onClick={() => { setCustomMode(false); setDuration(d); }}
                      className="rounded-full transition-colors"
                      style={{
                        padding: "8px 18px",
                        fontSize: 15,
                        fontFamily: "var(--sp-font-mono)",
                        background: active ? pillSelBg : "transparent",
                        color: active ? pillSelText : pillText,
                      }}
                    >
                      {d}m
                    </button>
                  );
                })}
                <button
                  onClick={() => setCustomMode(true)}
                  className="rounded-full transition-colors"
                  style={{
                    padding: "8px 18px",
                    fontSize: 15,
                    fontFamily: "var(--sp-font-mono)",
                    background: customMode ? pillSelBg : "transparent",
                    color: customMode ? pillSelText : pillText,
                  }}
                >
                  Custom
                </button>
              </div>
              {customMode && (
                <div
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2"
                  style={{ border: `0.5px solid ${borderColor}` }}
                >
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={duration}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setDuration(Number.isFinite(v) ? Math.max(1, Math.min(240, v)) : 1);
                    }}
                    className="w-16 bg-transparent outline-none font-mono"
                    style={{ fontSize: 15, color: bodyColor }}
                  />
                  <span className="font-mono" style={{ fontSize: 12, color: labelColor }}>min</span>
                </div>
              )}
            </div>
          )}
        </div>


        {/* Tasks */}
        <div className="mb-9">
          <div className="flex items-center justify-between">
            <Label>Tasks</Label>
            <span className="font-mono" style={{ fontSize: 12, color: labelColor }}>{tasks.length}/5</span>
          </div>
          <div className="mt-4 flex gap-2">
            <input
              ref={taskRef}
              value={taskInput}
              onChange={(e) => onTaskInputChange(e.target.value)}
              onKeyDown={onTaskKey}
              disabled={tasks.length >= 5}
              placeholder={tasks.length >= 5 ? "Max 5 tasks" : "Add a task and press Enter"}
              className="flex-1 rounded-xl outline-none"
              style={{
                fontSize: 15,
                background: inputBg,
                border: `0.5px solid ${borderColor}`,
                padding: "12px 16px",
                color: bodyColor,
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
              }}
            />
            <button
              onClick={addTask}
              disabled={tasks.length >= 5 || !taskInput.trim()}
              className="grid place-items-center rounded-xl px-4 transition disabled:opacity-30"
              style={{ border: `0.5px solid ${borderColor}`, color: bodyColor }}
              aria-label="Add task"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {tasks.map((t, i) => (
              <li
                key={t.id}
                draggable
                onDragStart={onDragStart(t.id)}
                onDragOver={onDragOver(t.id)}
                onDragEnd={onDragEnd}
                onMouseEnter={() => setHoverId(t.id)}
                onMouseLeave={() => setHoverId((h) => (h === t.id ? null : h))}
                className="flex items-center gap-3 rounded-xl"
                style={{
                  border: `0.5px solid ${borderColor}`,
                  padding: "12px 14px",
                  opacity: dragId === t.id ? 0.9 : 1,
                  boxShadow: dragId === t.id ? "0 8px 20px rgba(0,0,0,0.25)" : "none",
                  background: dragId === t.id ? inputBg : "transparent",
                  cursor: dragId === t.id ? "grabbing" : "default",
                  transition: "box-shadow 0.15s, opacity 0.15s",
                }}
              >
                <span
                  className="grid place-items-center shrink-0"
                  style={{ cursor: "grab", width: 16, height: 16 }}
                  aria-label="Drag to reorder"
                >
                  <DragHandleIcon color={handleColor} />
                </span>
                <span className="font-mono" style={{ fontSize: 13, color: labelColor }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="flex-1"
                  style={{
                    fontSize: 15,
                    fontWeight: 300,
                    color: bodyColor,
                    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                  }}
                >
                  {t.title}
                </span>
                <button
                  onClick={() => setTasks((p) => p.filter((x) => x.id !== t.id))}
                  className="transition-opacity"
                  style={{
                    color: labelColor,
                    opacity: hoverId === t.id ? 1 : 0,
                  }}
                  aria-label="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Begin */}
        <button
          onClick={handleLock}
          disabled={!canLock}
          className="w-full rounded-2xl transition disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:opacity-90"
          style={{
            background: isLight ? "rgba(0,0,0,0.85)" : "#ffffff",
            color: isLight ? "#ffffff" : "rgba(0,0,0,0.9)",
            padding: "16px 24px",
            fontSize: 16,
            fontWeight: 400,
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            letterSpacing: "-0.005em",
          }}
        >
          <span className="flex items-center justify-center gap-3">
            Begin
            <span style={{ fontSize: 14, opacity: 0.7 }}>→</span>
          </span>
        </button>
      </div>
    </div>
  );
}
