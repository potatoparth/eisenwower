import { useMemo, useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Task } from "@/types/task";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  tasks: Task[];
  allTasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Omit<Task, "id" | "createdAt">>) => void;
  onTaskClick: (task: Task) => void;
  getCategoryColor?: (name: string) => string | undefined;
}

const HOUR_HEIGHT = 48; // px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtTime(hh: number, mm: number) {
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function parseTime(t?: string): { h: number; m: number } | undefined {
  if (!t) return undefined;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return undefined;
  return { h, m: m || 0 };
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function CalendarView({ tasks, onUpdateTask, onTaskClick, getCategoryColor }: CalendarViewProps) {
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to 7am on mount / week change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
  }, []);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor); d.setDate(anchor.getDate() + i); return d;
  }), [anchor]);

  const weekLabel = useMemo(() => {
    const end = days[6];
    const sameMonth = anchor.getMonth() === end.getMonth();
    const monthFmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short" });
    return sameMonth
      ? `${monthFmt(anchor)} ${anchor.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
      : `${monthFmt(anchor)} ${anchor.getDate()} – ${monthFmt(end)} ${end.getDate()}, ${end.getFullYear()}`;
  }, [anchor, days]);

  const unscheduled = useMemo(
    () => tasks.filter((t) => !t.dueDate && t.status !== "done"),
    [tasks]
  );

  // Bucket tasks by day
  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    days.forEach((d) => map.set(fmtDate(d), []));
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const key = t.dueDate;
      if (map.has(key)) map.get(key)!.push(t);
    });
    return map;
  }, [tasks, days]);

  const today = new Date();

  // ---- Drag handlers ----
  const onDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/task-id", taskId);
    e.dataTransfer.effectAllowed = "move";
  };
  const allowDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("text/task-id")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  };
  const dropToSlot = (e: React.DragEvent, date: Date, hour: number) => {
    const id = e.dataTransfer.getData("text/task-id");
    if (!id) return;
    e.preventDefault();
    // Snap to 30-min based on drop y within the slot
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offset = e.clientY - rect.top;
    const minute = offset > rect.height / 2 ? 30 : 0;
    onUpdateTask(id, { dueDate: fmtDate(date), dueTime: fmtTime(hour, minute) });
  };
  const dropToAllDay = (e: React.DragEvent, date: Date) => {
    const id = e.dataTransfer.getData("text/task-id");
    if (!id) return;
    e.preventDefault();
    onUpdateTask(id, { dueDate: fmtDate(date), dueTime: undefined });
  };
  const dropToUnscheduled = (e: React.DragEvent) => {
    const id = e.dataTransfer.getData("text/task-id");
    if (!id) return;
    e.preventDefault();
    onUpdateTask(id, { dueDate: undefined, dueTime: undefined });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAnchor(startOfWeek(new Date()))}>
            Today
          </Button>
          <div className="flex">
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => { const d = new Date(anchor); d.setDate(d.getDate() - 7); setAnchor(d); }}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => { const d = new Date(anchor); d.setDate(d.getDate() + 7); setAnchor(d); }}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-sm font-semibold text-foreground pl-1">{weekLabel}</div>
        </div>
        <Button variant="outline" size="sm" disabled title="Coming soon — will sync deadlines to your Google Calendar.">
          <CalendarDays className="w-4 h-4 mr-1.5" />
          Sync Google Calendar (soon)
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Unscheduled sidebar */}
        <aside
          className="w-[220px] flex-shrink-0 border-r border-border flex flex-col bg-secondary/30"
          onDragOver={allowDrop}
          onDrop={dropToUnscheduled}
        >
          <div className="px-3 py-2 border-b border-border flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Inbox className="w-3.5 h-3.5" />
            Unscheduled
            <span className="ml-auto text-[10px] font-medium text-muted-foreground/70">{unscheduled.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {unscheduled.length === 0 && (
              <div className="text-[11px] text-muted-foreground text-center py-6 leading-relaxed px-2">
                Drop tasks here to remove their deadline. Drag from here onto a day to schedule.
              </div>
            )}
            {unscheduled.map((t) => (
              <UnscheduledCard key={t.id} task={t} onDragStart={onDragStart} onClick={() => onTaskClick(t)} color={getCategoryColor?.(t.category)} />
            ))}
          </div>
        </aside>

        {/* Week grid */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Day headers */}
          <div className="grid border-b border-border" style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}>
            <div />
            {days.map((d) => {
              const isToday = sameDay(d, today);
              return (
                <div key={d.toISOString()} className="px-2 py-2 text-center border-l border-border">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{DAY_NAMES[d.getDay()]}</div>
                  <div className={cn(
                    "text-lg font-semibold tabular-nums",
                    isToday ? "text-primary" : "text-foreground"
                  )}>{d.getDate()}</div>
                </div>
              );
            })}
          </div>

          {/* All-day row */}
          <div className="grid border-b border-border bg-muted/20" style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}>
            <div className="text-[10px] text-muted-foreground px-1 py-1 text-right pr-2">all-day</div>
            {days.map((d) => {
              const key = fmtDate(d);
              const items = (byDay.get(key) ?? []).filter((t) => !t.dueTime);
              return (
                <div key={key} className="border-l border-border min-h-[36px] p-1 flex flex-wrap gap-1 content-start"
                  onDragOver={allowDrop} onDrop={(e) => dropToAllDay(e, d)}>
                  {items.map((t) => (
                    <AllDayChip key={t.id} task={t} onDragStart={onDragStart} onClick={() => onTaskClick(t)} color={getCategoryColor?.(t.category)} />
                  ))}
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
            <div className="grid relative" style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}>
              {/* Hours column */}
              <div>
                {HOURS.map((h) => (
                  <div key={h} style={{ height: HOUR_HEIGHT }} className="text-[10px] text-muted-foreground pr-2 pt-1 text-right border-t border-border">
                    {h === 0 ? "" : `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {days.map((d) => {
                const key = fmtDate(d);
                const items = (byDay.get(key) ?? []).filter((t) => !!t.dueTime);
                // Group by hour for side-by-side layout
                const byHour = new Map<number, Task[]>();
                items.forEach((t) => {
                  const p = parseTime(t.dueTime)!;
                  const arr = byHour.get(p.h) ?? [];
                  arr.push(t);
                  byHour.set(p.h, arr);
                });
                const isToday = sameDay(d, today);
                return (
                  <div key={key} className="relative border-l border-border">
                    {HOURS.map((h) => (
                      <div key={h}
                        style={{ height: HOUR_HEIGHT }}
                        className="border-t border-border hover:bg-muted/30 transition-colors"
                        onDragOver={allowDrop}
                        onDrop={(e) => dropToSlot(e, d, h)}
                      />
                    ))}
                    {/* Now indicator */}
                    {isToday && (
                      <div
                        className="absolute left-0 right-0 pointer-events-none z-10"
                        style={{ top: (today.getHours() + today.getMinutes() / 60) * HOUR_HEIGHT }}
                      >
                        <div className="h-[2px] bg-primary/80" />
                      </div>
                    )}
                    {/* Events */}
                    {Array.from(byHour.entries()).map(([hour, hourTasks]) =>
                      hourTasks.map((t, idx) => {
                        const p = parseTime(t.dueTime)!;
                        const top = (hour + p.m / 60) * HOUR_HEIGHT;
                        const widthPct = 100 / hourTasks.length;
                        const color = getCategoryColor?.(t.category) || "hsl(var(--primary))";
                        return (
                          <button
                            key={t.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, t.id)}
                            onClick={() => onTaskClick(t)}
                            className="absolute rounded-md px-1.5 py-1 text-[11px] font-medium text-left overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                            style={{
                              top,
                              height: HOUR_HEIGHT - 2,
                              left: `calc(${idx * widthPct}% + 2px)`,
                              width: `calc(${widthPct}% - 4px)`,
                              backgroundColor: `color-mix(in oklab, ${color} 22%, transparent)`,
                              borderLeft: `3px solid ${color}`,
                              color: "hsl(var(--foreground))",
                              textDecoration: t.status === "done" ? "line-through" : undefined,
                              opacity: t.status === "done" ? 0.6 : 1,
                            }}
                            title={`${t.name} · ${t.category} · ${t.dueTime}`}
                          >
                            <div className="truncate">{t.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{t.dueTime}</div>
                          </button>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UnscheduledCard({ task, onDragStart, onClick, color }: {
  task: Task; onDragStart: (e: React.DragEvent, id: string) => void; onClick: () => void; color?: string;
}) {
  const c = color || "hsl(var(--muted-foreground))";
  return (
    <button
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={onClick}
      className="w-full text-left rounded-md p-2 bg-card border border-border hover:border-primary/50 hover:shadow-sm transition-all"
      style={{ borderLeft: `3px solid ${c}` }}
    >
      <div className="text-[12px] font-medium text-foreground truncate">{task.name}</div>
      <div className="text-[10px] text-muted-foreground truncate">{task.category}</div>
    </button>
  );
}

function AllDayChip({ task, onDragStart, onClick, color }: {
  task: Task; onDragStart: (e: React.DragEvent, id: string) => void; onClick: () => void; color?: string;
}) {
  const c = color || "hsl(var(--primary))";
  return (
    <button
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={onClick}
      className="max-w-full rounded px-1.5 py-0.5 text-[10px] font-medium truncate hover:brightness-110 transition"
      style={{
        backgroundColor: `color-mix(in oklab, ${c} 22%, transparent)`,
        borderLeft: `2px solid ${c}`,
        color: "hsl(var(--foreground))",
        textDecoration: task.status === "done" ? "line-through" : undefined,
        opacity: task.status === "done" ? 0.6 : 1,
      }}
      title={task.name}
    >
      {task.name}
    </button>
  );
}