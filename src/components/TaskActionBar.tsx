import { useMemo, useRef, useState, useEffect } from "react";
import { SquarePen, Search, Recycle, X, CalendarClock, AlertCircle, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TaskInput } from "./TaskInput";
import { Quadrant, QuadrantInfo, Task } from "@/types/task";
import { ProjectTemplate } from "@/types/project";
import type { TaskAddOptions, TaskInputPickerProps } from "@/components/TaskInput";
import { isOverdue } from "@/lib/sort";
import { DateTimePicker } from "@/components/DateTimePicker";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { useSelectionOptional } from "@/hooks/useSelection";

interface Props {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onDeleteAllDone: () => void;
  onRescheduleTasks?: (ids: string[], newDueDate: string) => void;
  // TaskInput passthrough
  onAddTask: (name: string, quadrant: Quadrant, options?: TaskAddOptions) => void;
  quadrants: QuadrantInfo[];
  categories: string[];
  projects: ProjectTemplate[];
  defaultProjectId?: string;
  defaultCategory?: string;
  onCreateCategory?: TaskInputPickerProps["onCreateCategory"];
  onCreateProject?: TaskInputPickerProps["onCreateProject"];
}

export function TaskActionBar({
  tasks, onSelectTask, onDeleteAllDone, onRescheduleTasks,
  onAddTask, quadrants, categories, projects,
  defaultProjectId, defaultCategory, onCreateCategory, onCreateProject,
}: Props) {
  const [searchMode, setSearchMode] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newDate, setNewDate] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const selection = useSelectionOptional();

  useEffect(() => {
    if (searchMode) inputRef.current?.focus();
  }, [searchMode]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tasks
      .filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [tasks, query]);

  const doneCount = tasks.filter(t => t.status === "done").length;
  const overdueTasks = useMemo(
    () => tasks.filter((t) => t.status !== "done" && isOverdue(t)),
    [tasks]
  );
  const overdueCount = overdueTasks.length;

  useEffect(() => {
    if (!rescheduleOpen) {
      setSelectedIds(new Set());
      setNewDate(undefined);
    } else {
      // Preselect all overdue by default — the common intent.
      setSelectedIds(new Set(overdueTasks.map((t) => t.id)));
    }
  }, [rescheduleOpen, overdueTasks]);

  const toggleId = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const applyReschedule = () => {
    if (!newDate || selectedIds.size === 0) return;
    onRescheduleTasks?.(Array.from(selectedIds), newDate);
    setRescheduleOpen(false);
  };

  const exitSearch = () => {
    setSearchMode(false);
    setQuery("");
    setOpen(false);
  };

  const searchToggle = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => (searchMode ? exitSearch() : setSearchMode(true))}
      className="h-8 w-8 rounded-full"
      title={searchMode ? "Close search" : "Search tasks"}
      aria-pressed={searchMode}
    >
      {searchMode ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
    </Button>
  );

  // Decorative "compose" glyph — signals task entry without looking like a button.
  const plusIndicator = (
    <span
      aria-hidden
      className="flex h-8 w-8 items-center justify-center text-muted-foreground/60"
    >
      <SquarePen className="w-4 h-4" strokeWidth={1.75} />
    </span>
  );

  return (
    <div className="grid w-full grid-cols-[2.5rem_minmax(0,1fr)_2.5rem_2.5rem] items-center gap-2">
      {selection ? (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full",
            selection.selectMode && "text-primary bg-primary/10 hover:text-primary"
          )}
          onClick={() => selection.toggleSelectMode()}
          title={selection.selectMode ? "Exit select mode" : "Select tasks"}
          aria-pressed={selection.selectMode}
        >
          <CheckSquare className="w-4 h-4" />
        </Button>
      ) : (
        <span />
      )}
      <div className="min-w-0">
        {searchMode ? (
          <Popover open={open && matches.length > 0} onOpenChange={setOpen}>
            <PopoverAnchor asChild>
              <div className="relative flex h-[50px] w-full items-center rounded-full border border-border/60 bg-secondary/40 px-5">
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                  onFocus={() => setOpen(true)}
                  onKeyDown={(e) => { if (e.key === "Escape") exitSearch(); }}
                  placeholder="Search tasks..."
                  className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <div className="ml-2 -mr-2 flex h-full flex-shrink-0 items-center">
                  {searchToggle}
                </div>
              </div>
            </PopoverAnchor>
            <PopoverContent
              align="start"
              className="p-1 w-[min(32rem,90vw)] max-h-80 overflow-y-auto"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              {matches.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { onSelectTask(t); exitSearch(); }}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-accent flex flex-col gap-0.5"
                >
                  <span className="text-sm font-medium truncate">{t.name}</span>
                  {t.description && (
                    <span className="text-xs text-muted-foreground truncate">{t.description}</span>
                  )}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        ) : (
          <TaskInput
            onAddTask={onAddTask}
            placeholder="Add a new task..."
            leadingElement={plusIndicator}
            trailingElement={searchToggle}
            quadrants={quadrants}
            categories={categories}
            projects={projects}
            defaultProjectId={defaultProjectId}
            defaultCategory={defaultCategory}
            onCreateCategory={onCreateCategory}
            onCreateProject={onCreateProject}
          />
        )}
      </div>

      {/* Reschedule overdue */}
      <Popover open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <PopoverAnchor asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 rounded-full relative",
              overdueCount > 0 && "text-destructive hover:text-destructive"
            )}
            title={
              overdueCount === 0
                ? "No overdue tasks"
                : `Reschedule ${overdueCount} overdue ${overdueCount === 1 ? "task" : "tasks"}`
            }
            disabled={overdueCount === 0 || !onRescheduleTasks}
            onClick={() => setRescheduleOpen(true)}
          >
            <CalendarClock className="w-4 h-4" />
            {overdueCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-destructive text-[9px] font-semibold text-destructive-foreground flex items-center justify-center">
                {overdueCount > 99 ? "99+" : overdueCount}
              </span>
            )}
          </Button>
        </PopoverAnchor>
        <PopoverContent align="end" className="w-[min(24rem,92vw)] p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              Reschedule overdue
            </div>
            <span className="text-[11px] text-muted-foreground">
              {selectedIds.size}/{overdueCount} selected
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() =>
                setSelectedIds(new Set(overdueTasks.map((t) => t.id)))
              }
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Select all
            </button>
            <span className="text-[11px] text-muted-foreground/50">·</span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto -mx-1 px-1 space-y-1">
            {overdueTasks.map((t) => {
              const active = selectedIds.has(t.id);
              const due = t.dueDate ? parseISO(t.dueDate) : null;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleId(t.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors",
                    active
                      ? "bg-destructive/10 hover:bg-destructive/15"
                      : "hover:bg-secondary"
                  )}
                >
                  {/* Reschedule-select indicator — distinct from the round "done" checkbox */}
                  <span
                    aria-hidden
                    className={cn(
                      "flex-shrink-0 w-3.5 h-3.5 rounded-[3px] border-2 flex items-center justify-center transition-colors",
                      active
                        ? "border-destructive bg-destructive"
                        : "border-muted-foreground/40 bg-transparent"
                    )}
                  >
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-[1px] bg-destructive-foreground" />
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium truncate">
                      {t.name}
                    </span>
                    {due && (
                      <span className="block text-[10px] text-destructive/80">
                        was due {format(due, "d MMM")}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t space-y-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              New deadline
            </span>
            <DateTimePicker
              value={newDate}
              onChange={(v) => setNewDate(v)}
              placeholder="Pick new deadline…"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRescheduleOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={applyReschedule}
                disabled={!newDate || selectedIds.size === 0}
                className="h-8 text-xs"
              >
                Reschedule {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            title="Delete all completed tasks"
            disabled={doneCount === 0}
          >
            <Recycle className="w-4 h-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all completed tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {doneCount} completed {doneCount === 1 ? "task" : "tasks"}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteAllDone}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}