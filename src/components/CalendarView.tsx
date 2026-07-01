import { useMemo, useState, useRef } from "react";
import { ChevronRight, GripVertical, Check as CheckIcon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DateTimePicker } from "@/components/DateTimePicker";
import { Task } from "@/types/task";
import { cn } from "@/lib/utils";
import { useSelectionOptional } from "@/hooks/useSelection";

interface CalendarViewProps {
  tasks: Task[];
  allTasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Omit<Task, "id" | "createdAt">>) => void;
  onToggleStatus?: (id: string) => void;
  onTaskClick: (task: Task) => void;
  getCategoryColor?: (name: string) => string | undefined;
}

const UNSCHEDULED = "__unscheduled__";
const MIN_GAP = 0.0001;

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(base: Date, n: number) {
  const d = new Date(base); d.setDate(d.getDate() + n); d.setHours(0, 0, 0, 0); return d;
}
function orderOf(t: Task) {
  return typeof t.sortOrder === "number" ? t.sortOrder : 0;
}

export function CalendarView({
  tasks, onUpdateTask, onToggleStatus, onTaskClick, getCategoryColor,
}: CalendarViewProps) {
  const sel = useSelectionOptional();
  const isSelectMode = !!sel?.selectMode;
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const dayDates = useMemo(() => [today, addDays(today, 1), addDays(today, 2)], [today]);

  // Category filter (multi-select)
  const allCategories = useMemo(() => {
    const s = new Set<string>();
    tasks.forEach((t) => { if (t.category?.trim()) s.add(t.category.trim()); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [tasks]);
  const [checkedCats, setCheckedCats] = useState<Set<string> | null>(null); // null = all
  const activeCats = checkedCats ?? new Set(allCategories);
  const visibleTasks = useMemo(
    () => tasks.filter((t) => activeCats.has(t.category)),
    [tasks, activeCats]
  );

  // Collapsed state per section (unscheduled lives in a separate dialog now)
  const sectionKeys = useMemo(
    () => [UNSCHEDULED, ...dayDates.map(fmtDate)],
    [dayDates]
  );
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const dayKeys = useMemo(() => sectionKeys.filter((k) => k !== UNSCHEDULED), [sectionKeys]);
  const toggleCollapse = (k: string) => setCollapsed((prev) => {
    const next = new Set(prev);
    next.has(k) ? next.delete(k) : next.add(k);
    return next;
  });
  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(dayKeys));

  // Unscheduled popup state
  const [unschOpen, setUnschOpen] = useState(false);
  const [unschSelected, setUnschSelected] = useState<Set<string>>(new Set());
  const [unschDate, setUnschDate] = useState<string | undefined>(undefined);

  // Bucket tasks
  const buckets = useMemo(() => {
    const map = new Map<string, Task[]>();
    sectionKeys.forEach((k) => map.set(k, []));
    visibleTasks.forEach((t) => {
      const key = t.dueDate ?? UNSCHEDULED;
      if (map.has(key)) map.get(key)!.push(t);
    });
    map.forEach((arr) => arr.sort((a, b) => orderOf(a) - orderOf(b) || a.name.localeCompare(b.name)));
    return map;
  }, [visibleTasks, sectionKeys]);

  const unscheduledTasks = buckets.get(UNSCHEDULED) ?? [];

  const toggleUnschId = (id: string) => setUnschSelected((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const applyUnschReschedule = () => {
    if (!unschDate || unschSelected.size === 0) return;
    // unschDate is ISO like 2026-07-04T10:30:00
    const [datePart, timePart] = unschDate.split("T");
    const timeStr = timePart ? timePart.slice(0, 5) : undefined;
    unschSelected.forEach((id) => {
      onUpdateTask(id, { dueDate: datePart, ...(timeStr ? { dueTime: timeStr } : {}) });
    });
    setUnschSelected(new Set());
    setUnschDate(undefined);
    setUnschOpen(false);
  };

  // Renormalize a bucket's sort orders back to 0,1,2,... in the background.
  const renormalize = (list: Task[]) => {
    list.forEach((t, i) => {
      if (orderOf(t) !== i) onUpdateTask(t.id, { sortOrder: i });
    });
  };

  // ---- Drag & drop ----
  const dragIdRef = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  // Where the drop indicator should show: {sectionKey, index} where index is insertion position
  const [dropTarget, setDropTarget] = useState<{ key: string; index: number } | null>(null);

  const onDragStart = (e: React.DragEvent, id: string) => {
    dragIdRef.current = id;
    setDragging(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/task-id", id);
  };
  const onDragEnd = () => {
    dragIdRef.current = null;
    setDragging(null);
    setDropTarget(null);
  };

  const commitDrop = (sectionKey: string, insertIndex: number) => {
    const id = dragIdRef.current;
    if (!id) return;
    const list = (buckets.get(sectionKey) ?? []).filter((t) => t.id !== id);

    // Compute new sortOrder as midpoint of neighbors.
    // insertIndex is position in `list` (list without the dragged task).
    const before = list[insertIndex - 1];
    const after = list[insertIndex];
    let newOrder: number;
    if (!before && !after) newOrder = 0;
    else if (!before && after) newOrder = orderOf(after) - 1;
    else if (before && !after) newOrder = orderOf(before) + 1;
    else newOrder = (orderOf(before!) + orderOf(after!)) / 2;

    const updates: Partial<Omit<Task, "id" | "createdAt">> = { sortOrder: newOrder };
    if (sectionKey === UNSCHEDULED) {
      updates.dueDate = undefined;
      updates.dueTime = undefined;
    } else {
      updates.dueDate = sectionKey;
      // Preserve the task's existing time-of-day when moving between days.
      const dragged = tasks.find((t) => t.id === id);
      if (dragged?.dueTime) updates.dueTime = dragged.dueTime;
    }
    onUpdateTask(id, updates);

    // If neighbor gap collapsed below threshold, schedule renormalization.
    if (before && after && Math.abs(orderOf(after) - orderOf(before)) < MIN_GAP) {
      const rebuilt = [...list];
      rebuilt.splice(insertIndex, 0, { ...(tasks.find((t) => t.id === id) as Task), sortOrder: newOrder });
      // Defer so state settles.
      setTimeout(() => renormalize(rebuilt), 0);
    }

    setDropTarget(null);
    setDragging(null);
    dragIdRef.current = null;
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll}>Expand all</Button>
          <span className="text-muted-foreground/40">·</span>
          <Button variant="ghost" size="sm" onClick={collapseAll}>Collapse all</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUnschOpen(true)}
            className="gap-1.5"
          >
            <Inbox className="w-3.5 h-3.5" />
            Unscheduled ({unscheduledTasks.length})
          </Button>
          <CategoryFilter
            categories={allCategories}
            checked={activeCats}
            onChange={(next) => setCheckedCats(next)}
            getCategoryColor={getCategoryColor}
          />
        </div>
      </div>

      {/* Sections (unscheduled lives in the popup, not inline) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {(() => {
          const renderSection = (key: string) => {
            const items = buckets.get(key) ?? [];
            const dayIdx = sectionKeys.indexOf(key) - 1;
            const label = dayIdx === 0 ? "Today" : dayIdx === 1 ? "Tomorrow" : dayDates[dayIdx].toLocaleDateString(undefined, { weekday: "long" });
            const dateStr = dayDates[dayIdx].toLocaleDateString(undefined, { month: "short", day: "numeric" });
            const isCollapsed = collapsed.has(key);
            return (
              <DaySection
              key={key}
              sectionKey={key}
              label={label}
              dateStr={dateStr}
              icon={null}
              count={items.length}
              collapsed={isCollapsed}
              onToggleCollapsed={() => toggleCollapse(key)}
              items={items}
              dragging={dragging}
              dropTarget={dropTarget}
              setDropTarget={setDropTarget}
              onCommitDrop={commitDrop}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onTaskClick={onTaskClick}
              onToggleStatus={onToggleStatus}
              getCategoryColor={getCategoryColor}
              />
            );
          };
          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
              {dayKeys.map((k) => renderSection(k))}
            </div>
          );
        })()}
      </div>

      {/* Unscheduled popup */}
      <Dialog open={unschOpen} onOpenChange={(o) => { setUnschOpen(o); if (!o) { setUnschSelected(new Set()); setUnschDate(undefined); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Inbox className="w-4 h-4" /> Unscheduled tasks
            </DialogTitle>
            <DialogDescription>
              Select tasks and pick a deadline to schedule them in bulk.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{unschSelected.size}/{unscheduledTasks.length} selected</span>
            <div className="flex items-center gap-2">
              <button type="button" className="text-primary hover:underline" onClick={() => setUnschSelected(new Set(unscheduledTasks.map((t) => t.id)))}>Select all</button>
              <span className="text-muted-foreground/40">·</span>
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setUnschSelected(new Set())}>Clear</button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-0.5 border-y py-2">
            {unscheduledTasks.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-6">No unscheduled tasks.</div>
            )}
            {unscheduledTasks.map((t) => {
              const active = unschSelected.has(t.id);
              const color = getCategoryColor?.(t.category) || "hsl(var(--muted-foreground))";
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleUnschId(t.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors",
                    active ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/40"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center",
                      active ? "bg-primary border-primary" : "border-muted-foreground/40 bg-transparent"
                    )}
                  >
                    {active && <CheckIcon className="w-2.5 h-2.5 text-primary-foreground" />}
                  </span>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-sm truncate flex-1 min-w-0">{t.name}</span>
                  <span className="text-[11px] text-muted-foreground truncate max-w-[120px] shrink-0">{t.category}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">New deadline</span>
            <DateTimePicker value={unschDate} onChange={setUnschDate} placeholder="Pick deadline…" />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setUnschOpen(false)}>Cancel</Button>
            <Button onClick={applyUnschReschedule} disabled={!unschDate || unschSelected.size === 0}>
              Schedule{unschSelected.size > 0 ? ` (${unschSelected.size})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------- Day Section -------------------- */

interface DaySectionProps {
  sectionKey: string;
  label: string;
  dateStr?: string;
  icon: React.ReactNode;
  count: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  items: Task[];
  dragging: string | null;
  dropTarget: { key: string; index: number } | null;
  setDropTarget: (t: { key: string; index: number } | null) => void;
  onCommitDrop: (key: string, index: number) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onTaskClick: (t: Task) => void;
  onToggleStatus?: (id: string) => void;
  getCategoryColor?: (name: string) => string | undefined;
}

function DaySection({
  sectionKey, label, dateStr, icon, count, collapsed, onToggleCollapsed,
  items, dragging, dropTarget, setDropTarget, onCommitDrop,
  onDragStart, onDragEnd, onTaskClick, onToggleStatus, getCategoryColor,
}: DaySectionProps) {
  const allowDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("text/task-id")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  };

  // Position of drop indicator: line above the row at `dropIdx`.
  const isThisSection = dropTarget?.key === sectionKey;

  return (
    <section className="rounded-lg border border-border bg-background/50 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors"
      >
        <ChevronRight
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            !collapsed && "rotate-90"
          )}
        />
        {icon}
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {dateStr && <span className="text-xs text-muted-foreground">{dateStr}</span>}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{count}</span>
      </button>

      {/* Body */}
      {!collapsed && (
        <div
          className="min-h-[44px]"
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("text/task-id")) return;
            e.preventDefault();
            // Empty section → set drop index 0.
            if (items.length === 0) setDropTarget({ key: sectionKey, index: 0 });
          }}
          onDrop={(e) => {
            if (!isThisSection) return;
            e.preventDefault();
            onCommitDrop(sectionKey, dropTarget!.index);
          }}
        >
          {items.length === 0 && (
            <div
              className={cn(
                "text-xs text-muted-foreground text-center py-4 border-t border-dashed border-border/50",
                isThisSection && "bg-primary/5 text-primary"
              )}
            >
              Drop a task here
            </div>
          )}

          {items.map((t, idx) => {
            const showIndicatorAbove = isThisSection && dropTarget!.index === idx;
            return (
              <div key={t.id}>
                {showIndicatorAbove && <div className="h-0.5 mx-2 bg-primary rounded-full" />}
                <TaskRow
                  task={t}
                  color={getCategoryColor?.(t.category)}
                  isDragging={dragging === t.id}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDragOverRow={(e) => {
                    allowDrop(e);
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const before = e.clientY - rect.top < rect.height / 2;
                    setDropTarget({ key: sectionKey, index: before ? idx : idx + 1 });
                  }}
                  onDropRow={(e) => {
                    if (!isThisSection) return;
                    e.preventDefault();
                    onCommitDrop(sectionKey, dropTarget!.index);
                  }}
                  onToggleStatus={onToggleStatus}
                  onClick={() => onTaskClick(t)}
                />
              </div>
            );
          })}
          {/* Indicator at the end */}
          {isThisSection && dropTarget!.index === items.length && items.length > 0 && (
            <div className="h-0.5 mx-2 bg-primary rounded-full" />
          )}
        </div>
      )}
    </section>
  );
}

/* -------------------- Task Row -------------------- */

function TaskRow({
  task, color, isDragging, onDragStart, onDragEnd, onDragOverRow, onDropRow,
  onToggleStatus, onClick,
}: {
  task: Task; color?: string; isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDragOverRow: (e: React.DragEvent) => void;
  onDropRow: (e: React.DragEvent) => void;
  onToggleStatus?: (id: string) => void;
  onClick: () => void;
}) {
  const sel = useSelectionOptional();
  const isSelectMode = !!sel?.selectMode;
  const isSelected = !!sel?.has(task.id);
  const c = color || "hsl(var(--muted-foreground))";
  const done = task.status === "done";
  return (
    <div
      draggable={!isSelectMode}
      onDragStart={(e) => { if (!isSelectMode) onDragStart(e, task.id); }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOverRow}
      onDrop={onDropRow}
      onClick={(e) => {
        if (isSelectMode) { e.stopPropagation(); sel?.toggle(task.id); return; }
        onClick();
      }}
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 border-t border-border/60 cursor-pointer hover:bg-muted/40 transition-colors",
        isDragging && "opacity-40",
        isSelectMode && isSelected && "bg-primary/10"
      )}
      style={{ borderLeft: `3px solid ${c}` }}
    >
      {isSelectMode ? (
        <span
          aria-hidden
          className={cn(
            "flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
            isSelected ? "bg-primary border-primary" : "border-muted-foreground/50 bg-transparent"
          )}
        >
          {isSelected && <CheckIcon className="w-2.5 h-2.5 text-primary-foreground" />}
        </span>
      ) : (
        <>
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 cursor-grab" />
          <span onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={done}
              onCheckedChange={() => onToggleStatus?.(task.id)}
              className="h-3.5 w-3.5"
            />
          </span>
        </>
      )}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: c }}
        aria-hidden
      />
      <span
        className={cn(
          "text-sm truncate flex-1 min-w-0",
          done && "line-through text-muted-foreground"
        )}
      >
        {task.name}
      </span>
      {task.dueTime && (
        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{task.dueTime}</span>
      )}
      <span className="text-xs text-muted-foreground truncate max-w-[120px] text-right shrink-0">
        {task.category}
      </span>
    </div>
  );
}

/* -------------------- Category filter dropdown -------------------- */

function CategoryFilter({
  categories, checked, onChange, getCategoryColor,
}: {
  categories: string[];
  checked: Set<string>;
  onChange: (next: Set<string> | null) => void;
  getCategoryColor?: (name: string) => string | undefined;
}) {
  const total = categories.length;
  const n = categories.filter((c) => checked.has(c)).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          Categories ({n}/{total})
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="flex items-center justify-between px-1 pb-2 mb-1 border-b border-border">
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => onChange(null)}
          >
            All
          </button>
          <button
            className="text-xs text-muted-foreground hover:underline"
            onClick={() => onChange(new Set())}
          >
            None
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {categories.length === 0 && (
            <div className="text-xs text-muted-foreground px-2 py-1">No categories</div>
          )}
          {categories.map((cat) => {
            const isChecked = checked.has(cat);
            const color = getCategoryColor?.(cat) || "hsl(var(--muted-foreground))";
            return (
              <label
                key={cat}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/40 cursor-pointer text-sm"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(v) => {
                    const next = new Set(checked);
                    v ? next.add(cat) : next.delete(cat);
                    onChange(next);
                  }}
                />
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="truncate">{cat}</span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}