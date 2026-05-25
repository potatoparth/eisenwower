import { useState, useEffect } from "react";
import { X, Calendar, Tag, AlertCircle, FolderKanban } from "lucide-react";
import { Task, Quadrant, QUADRANTS, QUADRANT_MAP } from "@/types/task";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectTemplate } from "@/types/project";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays, isPast, isToday } from "date-fns";

interface TaskDetailPanelProps {
  task: Task;
  deadlineThresholdDays: number;
  onUpdate: (id: string, updates: Partial<Omit<Task, "id" | "createdAt">>) => void;
  onClose: () => void;
  getCategoryColor?: (name: string) => string | undefined;
  projects?: ProjectTemplate[];
}

export function TaskDetailPanel({ task, deadlineThresholdDays, onUpdate, onClose, getCategoryColor, projects = [] }: TaskDetailPanelProps) {
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description || "");
  const [category, setCategory] = useState(task.category);
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [quadrant, setQuadrant] = useState<Quadrant>(task.quadrant);
  const [deadlineThreshold, setDeadlineThreshold] = useState<number | undefined>(task.deadlineThresholdOverride);
  const [projectId, setProjectId] = useState<string | undefined>(task.projectId);

  useEffect(() => {
    setName(task.name);
    setDescription(task.description || "");
    setCategory(task.category);
    setDueDate(task.dueDate || "");
    setQuadrant(task.quadrant);
    setDeadlineThreshold(task.deadlineThresholdOverride);
    setProjectId(task.projectId);
  }, [task]);

  const handleSave = () => {
    onUpdate(task.id, {
      name: name.trim() || task.name,
      description: description || undefined,
      category,
      dueDate: dueDate || undefined,
      quadrant,
      deadlineThresholdOverride: deadlineThreshold,
    });
  };

  // Auto-save on blur
  const handleBlur = () => handleSave();

  const quadrantInfo = QUADRANT_MAP[task.quadrant];
  const effectiveThreshold = deadlineThreshold ?? deadlineThresholdDays;
  
  const isDeadlineWarning = task.dueDate && (() => {
    const date = parseISO(task.dueDate!);
    const daysLeft = differenceInDays(date, new Date());
    return (daysLeft <= effectiveThreshold && !isPast(date)) || (isPast(date) && !isToday(date));
  })();

  return (
    <div className="fixed inset-y-0 left-0 w-full max-w-md bg-card border-r shadow-medium z-50 flex flex-col animate-slide-in-left">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold text-foreground">Task Details</h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-lg">
          <X className="w-4 h-4" />
        </Button>
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

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={handleBlur}
            placeholder="Add a description..."
            className="w-full min-h-[80px] p-3 text-sm bg-secondary/50 rounded-xl border-0 resize-none focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Quadrant */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Quadrant</label>
          <div className="grid grid-cols-2 gap-1.5">
            {QUADRANTS.map(q => (
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
          <Input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            onBlur={handleBlur}
            className="border-0 bg-secondary/50 rounded-xl"
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
            <Input
              value={category}
              onChange={e => setCategory(e.target.value)}
              onBlur={handleBlur}
              className="border-0 bg-secondary/50 rounded-xl"
            />
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

        {/* Per-task deadline threshold override */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Deadline Warning (days before due)
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              value={deadlineThreshold ?? ""}
              onChange={e => setDeadlineThreshold(e.target.value ? parseInt(e.target.value) : undefined)}
              onBlur={handleBlur}
              placeholder={`Global: ${deadlineThresholdDays}`}
              className="border-0 bg-secondary/50 rounded-xl w-32"
            />
            <span className="text-xs text-muted-foreground">
              {deadlineThreshold !== undefined ? "Custom" : "Using global"}
            </span>
          </div>
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
