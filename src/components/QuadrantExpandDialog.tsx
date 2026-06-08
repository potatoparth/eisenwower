import { X } from "lucide-react";
import { Task, QuadrantInfo, Quadrant } from "@/types/task";
import { ProjectTemplate } from "@/types/project";
import type { TaskAddOptions, TaskInputPickerProps } from "@/components/TaskInput";
import { TaskCard } from "./TaskCard";
import { TaskInput } from "./TaskInput";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuadrantExpandDialogProps {
  quadrant: QuadrantInfo;
  tasks: Task[];
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
  onAddTask: (name: string, quadrant: Quadrant, options?: TaskAddOptions) => void;
  categories: string[];
  projects: ProjectTemplate[];
  defaultProjectId?: string;
  defaultCategory?: string;
  onCreateCategory?: TaskInputPickerProps["onCreateCategory"];
  onCreateProject?: TaskInputPickerProps["onCreateProject"];
  onClose: () => void;
  onTaskClick: (task: Task) => void;
  getCategoryColor?: (name: string) => string | undefined;
  deadlineThresholdDays: number;
  bottomSheet?: boolean;
}

export function QuadrantExpandDialog({
  quadrant,
  tasks,
  onToggleStatus,
  onDelete,
  onAddTask,
  onClose,
  onTaskClick,
  getCategoryColor,
  deadlineThresholdDays,
  bottomSheet = false,
  categories,
  projects,
  defaultProjectId,
  defaultCategory,
  onCreateCategory,
  onCreateProject,
}: QuadrantExpandDialogProps) {
  const openTasks = tasks.filter(t => t.status === "open");
  const doneTasks = tasks.filter(t => t.status === "done");

  const getDotClass = () => {
    const dots = { 1: "bg-quadrant-1", 2: "bg-quadrant-2", 3: "bg-quadrant-3", 4: "bg-quadrant-4" };
    return dots[quadrant.color];
  };

  const accentVar = `hsl(var(--quadrant-${quadrant.color}))`;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex",
        bottomSheet ? "items-end justify-center" : "items-center justify-center p-4"
      )}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full bg-card border flex flex-col animate-in",
          bottomSheet
            ? "max-w-full rounded-t-2xl h-[92vh] slide-in-from-bottom"
            : "max-w-2xl max-h-[85vh] rounded-2xl shadow-medium"
        )}
        style={bottomSheet ? { borderTop: `3px solid ${accentVar}` } : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <span className={cn("w-3 h-3 rounded-full", getDotClass())} />
            <h2 className="font-semibold text-lg text-foreground">{quadrant.title}</h2>
            {quadrant.subtitle && (
              <span className="text-sm text-muted-foreground">— {quadrant.subtitle}</span>
            )}
            <span className="text-xs text-muted-foreground ml-2">{openTasks.length} open</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-lg">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Input */}
        <div className="p-3">
          <TaskInput
            onAddTask={onAddTask}
            defaultQuadrant={quadrant.id}
            placeholder={`Add to ${quadrant.title.toLowerCase()}...`}
            compact
            categories={categories}
            projects={projects}
            defaultProjectId={defaultProjectId}
            defaultCategory={defaultCategory}
            onCreateCategory={onCreateCategory}
            onCreateProject={onCreateProject}
          />
        </div>

        {/* Tasks */}
        <div className="flex-1 overflow-y-auto scrollbar-none p-3 space-y-1">
          {openTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
              onTaskClick={onTaskClick}
              getCategoryColor={getCategoryColor}
              deadlineThresholdDays={deadlineThresholdDays}
            />
          ))}
          {doneTasks.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] text-muted-foreground font-medium mb-1 px-1">Done ({doneTasks.length})</p>
              {doneTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleStatus={onToggleStatus}
                  onDelete={onDelete}
                  onTaskClick={onTaskClick}
                  getCategoryColor={getCategoryColor}
                  deadlineThresholdDays={deadlineThresholdDays}
                />
              ))}
            </div>
          )}
          {tasks.length === 0 && (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground/60">No tasks yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
