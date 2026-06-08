import { useState, useEffect } from "react";
import { Calendar, Tag, FolderKanban, PanelRightOpen, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Task, Quadrant, QuadrantInfo, Recurrence } from "@/types/task";
import { ProjectTemplate } from "@/types/project";
import { cn } from "@/lib/utils";
import { isOverdue } from "@/lib/sort";
import { format, parseISO } from "date-fns";
import { DateTimePicker } from "@/components/DateTimePicker";
import { RecurrenceField } from "@/components/RecurrenceField";

interface TaskDetailDialogProps {
  task: Task;
  onUpdate: (id: string, updates: Partial<Omit<Task, "id" | "createdAt">>) => void;
  onClose: () => void;
  onSwitchToSidebar: () => void;
  getCategoryColor?: (name: string) => string | undefined;
  projects?: ProjectTemplate[];
  quadrants: QuadrantInfo[];
  quadrantMap: Record<Quadrant, QuadrantInfo>;
  categories?: string[];
}

export function TaskDetailDialog({
  task,
  onUpdate,
  onClose,
  onSwitchToSidebar,
  getCategoryColor,
  projects = [],
  quadrants,
  quadrantMap,
  categories = [],
}: TaskDetailDialogProps) {
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

  const save = () =>
    onUpdate(task.id, {
      name: name.trim() || task.name,
      description: description || undefined,
      category,
      dueDate: dueDate || undefined,
      quadrant,
      projectId,
    });

  const overdue = isOverdue(task);
  const qInfo = quadrantMap[quadrant];
  const doFirstLabel = quadrantMap["important-urgent"].title;

  const applyFormat = (kind: "bold" | "italic" | "bullet" | "check") => {
    const map = {
      bold: "**bold**",
      italic: "*italic*",
      bullet: "\n- ",
      check: "\n- [ ] ",
    };
    setDescription((d) => d + map[kind]);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[640px] rounded-2xl p-0 overflow-hidden backdrop-blur-xl">
        <DialogHeader className="px-5 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: `hsl(var(--quadrant-${qInfo.color}))` }}
            />
            {qInfo.title}
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSwitchToSidebar}
            className="h-7 text-xs gap-1.5 rounded-lg"
            title="Open as sidebar"
          >
            <PanelRightOpen className="w-3.5 h-3.5" /> Sidebar view
          </Button>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={save}
            className="text-[18px] font-medium border-0 px-0 h-auto focus-visible:ring-1 focus-visible:ring-ring shadow-none bg-transparent"
            placeholder="Task name"
          />

          {overdue && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-destructive font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Overdue
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const el = document.getElementById(`tdd-date-${task.id}`) as HTMLInputElement | null;
                  el?.focus();
                  el?.showPicker?.();
                }}
                className="h-7 text-xs rounded-lg"
              >
                Reschedule
              </Button>
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

          {/* Quadrant picker */}
          <div className="grid grid-cols-4 gap-1.5">
            {quadrants.map((q) => (
              <button
                key={q.id}
                onClick={() => {
                  setQuadrant(q.id);
                  onUpdate(task.id, { quadrant: q.id });
                }}
                className={cn(
                  "py-2 px-2 rounded-lg text-[11px] font-medium border transition-all",
                  quadrant === q.id
                    ? "border-foreground/40"
                    : "border-border opacity-60 hover:opacity-100"
                )}
                style={{
                  background: `hsl(var(--quadrant-${q.color}) / 0.10)`,
                  color: `hsl(var(--quadrant-${q.color}-foreground))`,
                }}
              >
                {q.title}
              </button>
            ))}
          </div>

          {/* Description with simple format buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => applyFormat("bold")}
                className="px-2 h-6 text-xs rounded-md hover:bg-secondary font-bold"
              >
                B
              </button>
              <button
                onClick={() => applyFormat("italic")}
                className="px-2 h-6 text-xs rounded-md hover:bg-secondary italic"
              >
                I
              </button>
              <button
                onClick={() => applyFormat("bullet")}
                className="px-2 h-6 text-xs rounded-md hover:bg-secondary"
              >
                • List
              </button>
              <button
                onClick={() => applyFormat("check")}
                className="px-2 h-6 text-xs rounded-md hover:bg-secondary"
              >
                ☐ Check
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={save}
              placeholder="Add a description..."
              className="w-full min-h-[160px] p-3 text-sm bg-secondary/60 rounded-lg border-0 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Deadline */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Deadline
            </label>
            <DateTimePicker
              id={`tdd-date-${task.id}`}
              value={dueDate || undefined}
              onChange={(v) => {
                const next = v ?? "";
                setDueDate(next);
                onUpdate(task.id, { dueDate: next || undefined });
              }}
              accentColor={`hsl(var(--quadrant-${qInfo.color}))`}
              className={cn(overdue && "text-destructive")}
            />
          </div>

          {/* Repeat */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Repeat</label>
            <RecurrenceField
              recurrence={recurrence}
              recurrenceDays={recurrenceDays}
              onChange={({ recurrence: r, recurrenceDays: d }) => {
                setRecurrence(r);
                setRecurrenceDays(d);
                // If recurrence set with no deadline, default to today.
                let nextDue = dueDate;
                if (r !== "none" && !nextDue) {
                  const t = new Date();
                  nextDue = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
                  setDueDate(nextDue);
                }
                onUpdate(task.id, { recurrence: r, recurrenceDays: d, dueDate: nextDue || undefined });
              }}
              compact
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <Tag className="w-3 h-3" /> Category
            </label>
            <div className="flex items-center gap-2">
              {getCategoryColor?.(category) && (
                <span
                  className="w-2.5 h-2.5 rounded-full"
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
                <SelectTrigger className="rounded-lg bg-secondary/60 border-0">
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
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <FolderKanban className="w-3 h-3" /> Project
            </label>
            <Select
              value={projectId ?? "__none__"}
              onValueChange={(v) => {
                const next = v === "__none__" ? undefined : v;
                setProjectId(next);
                onUpdate(task.id, { projectId: next });
              }}
            >
              <SelectTrigger className="rounded-lg bg-secondary/60 border-0">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-[10px] text-muted-foreground pt-1">
            Created {format(parseISO(task.createdAt), "MMM d, yyyy")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}