import { useState, useEffect } from "react";
import { X, Calendar, Tag, AlertCircle, FolderKanban, ChevronLeft, ChevronRight, Check, PanelRightClose } from "lucide-react";
import { Task, Quadrant, QuadrantInfo, Recurrence } from "@/types/task";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectTemplate } from "@/types/project";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays, isPast, isToday } from "date-fns";
import { isOverdue } from "@/lib/sort";
import { DateTimePicker } from "@/components/DateTimePicker";
import { RecurrenceField } from "@/components/RecurrenceField";
import { TaskDescription } from "@/components/TaskDescription";

interface TaskDetailPanelProps {
  task: Task;
  deadlineThresholdDays: number;
  onUpdate: (id: string, updates: Partial<Omit<Task, "id" | "createdAt">>) => void;
  onClose: () => void;
  getCategoryColor?: (name: string) => string | undefined;
  projects?: ProjectTemplate[];
  quadrants: QuadrantInfo[];
  quadrantMap: Record<Quadrant, QuadrantInfo>;
  categories?: string[];
  navTasks?: Task[];
  onNavigate?: (task: Task) => void;
  onToggleStatus?: (id: string) => void;
  onSwitchToDialog?: () => void;
}

export function TaskDetailPanel({ task, deadlineThresholdDays, onUpdate, onClose, getCategoryColor, projects = [], quadrants, quadrantMap, categories = [], navTasks = [], onNavigate, onToggleStatus, onSwitchToDialog }: TaskDetailPanelProps) {
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description || "");
  const [category, setCategory] = useState(task.category);
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [quadrant, setQuadrant] = useState<Quadrant>(task.quadrant);
  const [projectId, setProjectId] = useState<string | undefined>(task.projectId);
  const [recurrence, setRecurrence] = useState<Recurrence>(task.recurrence ?? "none");
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(task.recurrenceDays ?? []);

  useEffect(() => {
    setName(task.name);
    setDescription(task.description || "");
    setCategory(task.category);
    setDueDate(task.dueDate || "");
    setQuadrant(task.quadrant);
    setProjectId(task.projectId);
    setRecurrence(task.recurrence ?? "none");
    setRecurrenceDays(task.recurrenceDays ?? []);
  }, [task]);

  const handleSave = () => {
    onUpdate(task.id, {
      name: name.trim() || task.name,
      description: description || undefined,
      category,
      dueDate: dueDate || undefined,
      quadrant,
    });
  };

  // Auto-save on blur
  const handleBlur = () => handleSave();

  const effectiveThreshold = task.deadlineThresholdOverride ?? deadlineThresholdDays;

  const isDeadlineWarning = task.dueDate && (() => {
    const date = parseISO(task.dueDate!);
    const daysLeft = differenceInDays(date, new Date());
    return (daysLeft <= effectiveThreshold && !isPast(date)) || (isPast(date) && !isToday(date));
  })();

  const overdue = isOverdue(task);
  const doFirstLabel = quadrantMap["important-urgent"].title;
  const idx = navTasks.findIndex((t) => t.id === task.id);
  const prevTask = idx > 0 ? navTasks[idx - 1] : null;
  const nextTask = idx >= 0 && idx < navTasks.length - 1 ? navTasks[idx + 1] : null;

  return (
    <div className="fixed inset-y-0 left-0 w-full max-w-md bg-card border-r shadow-medium z-50 flex flex-col animate-slide-in-left">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b gap-1">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => prevTask && onNavigate?.(prevTask)} disabled={!prevTask} className="h-8 w-8 p-0 rounded-lg" title="Previous task">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => nextTask && onNavigate?.(nextTask)} disabled={!nextTask} className="h-8 w-8 p-0 rounded-lg" title="Next task">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {onToggleStatus && (
            <Button
              variant={task.status === "done" ? "secondary" : "outline"}
              size="sm"
              onClick={() => onToggleStatus(task.id)}
              className="h-8 text-xs gap-1.5 rounded-lg"
              title={task.status === "done" ? "Mark as open" : "Mark as done"}
            >
              <Check className="w-3.5 h-3.5" />
              {task.status === "done" ? "Done" : "Mark done"}
            </Button>
          )}
          {onSwitchToDialog && (
            <Button variant="ghost" size="sm" onClick={onSwitchToDialog} className="h-8 text-xs gap-1.5 rounded-lg" title="Open as popup">
              <PanelRightClose className="w-3.5 h-3.5" /> Popup
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-lg" title="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Task name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Task Name</label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={handleBlur}
            className="text-base font-medium border-0 bg-secondary/50 rounded-xl"
          />
        </div>

        {overdue && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-destructive font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Overdue
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setQuadrant("important-urgent");
                onUpdate(task.id, { quadrant: "important-urgent" });
              }}
              className="h-7 text-xs rounded-lg"
            >
              Move to {doFirstLabel}
            </Button>
          </div>
        )}

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <TaskDescription
            value={description}
            onChange={setDescription}
            onCommit={handleBlur}
            placeholder="Add a description…"
          />
        </div>

        {/* Quadrant */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Quadrant</label>
          <div className="grid grid-cols-2 gap-1.5">
            {quadrants.map(q => (
              <button
                key={q.id}
                onClick={() => { setQuadrant(q.id); onUpdate(task.id, { quadrant: q.id }); }}
                className={cn(
                  "py-2 px-3 rounded-xl text-xs font-medium transition-all border",
                  quadrant === q.id
                    ? "ring-2 ring-primary"
                    : "opacity-60 hover:opacity-100",
                  q.color === 1 && "border-quadrant-1-border bg-quadrant-1-light text-quadrant-1-foreground",
                  q.color === 2 && "border-quadrant-2-border bg-quadrant-2-light text-quadrant-2-foreground",
                  q.color === 3 && "border-quadrant-3-border bg-quadrant-3-light text-quadrant-3-foreground",
                  q.color === 4 && "border-quadrant-4-border bg-quadrant-4-light text-quadrant-4-foreground",
                )}
              >
                <span className="font-semibold">{q.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Due Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Due Date
            {isDeadlineWarning && (
              <span className="text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Approaching!
              </span>
            )}
          </label>
          <DateTimePicker
            value={dueDate || undefined}
            onChange={(v) => {
              const next = v ?? "";
              setDueDate(next);
              onUpdate(task.id, { dueDate: next || undefined });
            }}
            accentColor={(() => {
              const c = quadrants.find((q) => q.id === quadrant)?.color ?? 1;
              return `hsl(var(--quadrant-${c}))`;
            })()}
          />
        </div>

        {/* Repeat */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Repeat</label>
          <RecurrenceField
            recurrence={recurrence}
            recurrenceDays={recurrenceDays}
            onChange={({ recurrence: r, recurrenceDays: d }) => {
              setRecurrence(r);
              setRecurrenceDays(d);
              let nextDue = dueDate;
              if (r !== "none" && !nextDue) {
                const t = new Date();
                nextDue = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
                setDueDate(nextDue);
              }
              onUpdate(task.id, { recurrence: r, recurrenceDays: d, dueDate: nextDue || undefined });
            }}
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            Category
          </label>
          <div className="flex items-center gap-2">
            {getCategoryColor && getCategoryColor(category) && (
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: getCategoryColor(category) }}
              />
            )}
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                onUpdate(task.id, { category: v });
              }}
            >
              <SelectTrigger className="border-0 bg-secondary/50 rounded-xl">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Array.from(new Set([...categories, "General", category].filter(Boolean))).sort((a, b) => a.localeCompare(b)).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Project */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <FolderKanban className="w-3.5 h-3.5" />
            Project
          </label>
          <Select
            value={projectId ?? "__none__"}
            onValueChange={(v) => {
              const next = v === "__none__" ? undefined : v;
              setProjectId(next);
              onUpdate(task.id, { projectId: next });
            }}
          >
            <SelectTrigger className="border-0 bg-secondary/50 rounded-xl">
              <SelectValue placeholder="No project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No project</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Metadata */}
        <div className="pt-4 border-t space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Created: {format(parseISO(task.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Updated: {format(parseISO(task.updatedAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Status: {task.status === "done" ? "Done" : "Open"}
          </p>
        </div>
      </div>
    </div>
  );
}
