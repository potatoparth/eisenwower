import { useState, useEffect } from "react";
import { Calendar, FolderKanban, PanelRightOpen, AlertCircle, ChevronLeft, ChevronRight, Check, X, UserCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Task, Quadrant, QuadrantInfo, Recurrence } from "@/types/task";
import { ProjectTemplate } from "@/types/project";
import { cn } from "@/lib/utils";
import { isOverdue } from "@/lib/sort";
import { format, parseISO } from "date-fns";
import { DateTimePicker } from "@/components/DateTimePicker";
import { RecurrenceField } from "@/components/RecurrenceField";
import { TaskDescription } from "@/components/TaskDescription";
import { TaskAttachments } from "@/components/TaskAttachments";
import { ProjectTreePicker } from "@/components/ProjectTreePicker";
import { RecentChipStrip } from "@/components/RecentChipStrip";
import { useProjectAssignees, assigneeMap } from "@/hooks/useProjectAssignees";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  navTasks?: Task[];
  onNavigate?: (task: Task) => void;
  onToggleStatus?: (id: string) => void;
  onCreateCategory?: (name: string) => string;
  onCreateProject?: (name: string, parentId?: string | null) => string;
  recentCategories?: string[];
  recentProjectIds?: string[];
  getUserName?: (id: string) => string | undefined;
  currentUserId?: string;
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
  navTasks = [],
  onNavigate,
  onToggleStatus,
  onCreateCategory,
  onCreateProject,
  recentCategories = [],
  recentProjectIds = [],
  getUserName,
  currentUserId,
}: TaskDetailDialogProps) {
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [quadrant, setQuadrant] = useState<Quadrant>(task.quadrant);
  const [projectId, setProjectId] = useState<string | undefined>(task.projectId);
  const [recurrence, setRecurrence] = useState<Recurrence>(task.recurrence ?? "none");
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(task.recurrenceDays ?? []);

  const assignees = useProjectAssignees(task.projectId);
  const nameMap = assigneeMap(assignees);
  const displayFor = (uid?: string) => {
    if (!uid) return "—";
    if (uid === currentUserId) return "you";
    return nameMap.get(uid) || getUserName?.(uid) || "Someone";
  };

  useEffect(() => {
    setName(task.name);
    setDescription(task.description || "");
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
      dueDate: dueDate || undefined,
      quadrant,
      projectId,
    });

  const overdue = isOverdue(task);
  const qInfo = quadrantMap[quadrant];
  const doFirstLabel = quadrantMap["important-urgent"].title;
  const idx = navTasks.findIndex((t) => t.id === task.id);
  const prevTask = idx > 0 ? navTasks[idx - 1] : null;
  const nextTask = idx >= 0 && idx < navTasks.length - 1 ? navTasks[idx + 1] : null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[640px] rounded-2xl p-0 overflow-hidden backdrop-blur-xl">
        <DialogHeader className="px-3 pt-3 pb-2 flex flex-row items-center justify-between space-y-0 gap-2">
          <DialogTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(var(--quadrant-${qInfo.color}))` }} />
            {qInfo.title}
          </DialogTitle>
          <div className="flex items-center gap-1 mr-8">
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
            <Button variant="ghost" size="sm" onClick={onSwitchToSidebar} className="h-8 text-xs gap-1.5 rounded-lg" title="Open as sidebar">
              <PanelRightOpen className="w-3.5 h-3.5" /> Sidebar
            </Button>
          </div>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => prevTask && onNavigate?.(prevTask)} disabled={!prevTask} className="h-8 w-8 p-0 rounded-lg flex-shrink-0" title="Previous task">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={save}
              className="text-[18px] font-medium border-0 px-0 h-auto focus-visible:ring-1 focus-visible:ring-ring shadow-none bg-transparent text-center flex-1"
              placeholder="Task name"
            />
            <Button variant="ghost" size="sm" onClick={() => nextTask && onNavigate?.(nextTask)} disabled={!nextTask} className="h-8 w-8 p-0 rounded-lg flex-shrink-0" title="Next task">
              <ChevronRight className="w-4 h-4" />
            </Button>
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
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                )}
                style={
                  quadrant === q.id
                    ? {
                        background: `hsl(var(--quadrant-${q.color}) / 0.18)`,
                        color: `hsl(var(--quadrant-${q.color}-foreground))`,
                      }
                    : undefined
                }
              >
                {q.title}
              </button>
            ))}
          </div>

          <TaskDescription
            value={description}
            onChange={setDescription}
            onCommit={save}
            placeholder="Add a description…"
          />

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Attachments</label>
            <TaskAttachments
              taskId={task.id}
              value={task.attachments ?? []}
              onChange={(next) => onUpdate(task.id, { attachments: next })}
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

          {/* Project */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <FolderKanban className="w-3 h-3" /> Project
            </label>
            <ProjectTreePicker
              projects={projects}
              value={projectId ?? null}
              onChange={(id) => {
                const next = id ?? undefined;
                setProjectId(next);
                onUpdate(task.id, { projectId: next });
              }}
              onCreate={onCreateProject}
              placeholder="No project"
              compact
            />
            {recentProjectIds.length > 0 && (
              <RecentChipStrip
                items={recentProjectIds
                  .map((id) => {
                    const p = projects.find((x) => x.id === id);
                    return p ? { value: p.id, label: p.name } : null;
                  })
                  .filter((x): x is { value: string; label: string } => !!x)}
                value={projectId ?? ""}
                onSelect={(v) => { setProjectId(v); onUpdate(task.id, { projectId: v }); }}
                ariaLabel="Recent projects"
              />
            )}
          </div>

          <div className="pt-2 border-t space-y-1">
            <div className="pb-2 space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                <UserCircle2 className="w-3.5 h-3.5" /> Assigned to
              </label>
              <Select
                value={task.assignedTo ?? "__none__"}
                onValueChange={(v) => onUpdate(task.id, { assignedTo: v === "__none__" ? undefined : v })}
              >
                <SelectTrigger className="h-8 rounded-lg bg-secondary/40 border-0 text-xs">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {assignees.map((a) => (
                    <SelectItem key={a.userId} value={a.userId}>
                      {a.displayName}{a.role === "owner" ? " (owner)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!task.projectId && (
                <p className="text-[11px] text-muted-foreground">Add this task to a project to assign it.</p>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Created: {format(parseISO(task.createdAt), "MMM d, yyyy 'at' h:mm a")}
              {task.createdBy && <> · by {displayFor(task.createdBy)}</>}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Updated: {format(parseISO(task.updatedAt), "MMM d, yyyy 'at' h:mm a")}
              {task.updatedBy && <> · by {displayFor(task.updatedBy)}</>}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Status: {task.status === "done" ? "Done" : "Open"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}