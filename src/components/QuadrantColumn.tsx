import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Maximize2 } from "lucide-react";
import { Task, Quadrant, QuadrantInfo } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { TaskInput } from "./TaskInput";
import { cn } from "@/lib/utils";

interface QuadrantColumnProps {
  quadrant: QuadrantInfo;
  tasks: Task[];
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
  onAddTask: (
    name: string,
    quadrant: Quadrant,
    options?: { description?: string; category?: string; dueDate?: string }
  ) => void;
  onExpand?: () => void;
  onTaskClick?: (task: Task) => void;
  getCategoryColor?: (name: string) => string | undefined;
  deadlineThresholdDays?: number;
}

export function QuadrantColumn({
  quadrant,
  tasks,
  onToggleStatus,
  onDelete,
  onAddTask,
  onExpand,
  onTaskClick,
  getCategoryColor,
  deadlineThresholdDays = 2,
}: QuadrantColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: quadrant.id,
  });

  const openTasks = tasks.filter((t) => t.status === "open");
  const doneTasks = tasks.filter((t) => t.status === "done");

  const getHeaderBg = () => {
    const bgs = { 1: "bg-quadrant-1-light", 2: "bg-quadrant-2-light", 3: "bg-quadrant-3-light", 4: "bg-quadrant-4-light" };
    return bgs[quadrant.color];
  };

  const getDotClass = () => {
    const dots = { 1: "bg-quadrant-1", 2: "bg-quadrant-2", 3: "bg-quadrant-3", 4: "bg-quadrant-4" };
    return dots[quadrant.color];
  };

  const getBorderClass = () => {
    const borders = { 1: "border-quadrant-1-border", 2: "border-quadrant-2-border", 3: "border-quadrant-3-border", 4: "border-quadrant-4-border" };
    return borders[quadrant.color];
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden",
        getBorderClass(),
        getHeaderBg(),
        isOver && "ring-2 ring-primary/30 scale-[1.005]",
        "h-full min-h-0"
      )}
    >
      {/* Header */}
      <div className="p-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", getDotClass())} />
          <h3 className="font-semibold text-sm text-foreground">{quadrant.title}</h3>
          <span className="text-xs text-muted-foreground ml-auto">{openTasks.length}</span>
          {onExpand && (
            <button
              onClick={onExpand}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 ml-[16px]">{quadrant.subtitle}</p>
      </div>

      {/* Task Input */}
      <div className="px-2 pb-1 flex-shrink-0">
        <TaskInput onAddTask={onAddTask} defaultQuadrant={quadrant.id} placeholder={`Add to ${quadrant.title.toLowerCase()}...`} compact />
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5 min-h-0">
        <SortableContext items={openTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {openTasks.map((task) => (
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
        </SortableContext>

        {doneTasks.length > 0 && (
          <div className="pt-1">
            <p className="text-[10px] text-muted-foreground font-medium mb-1 px-1">Done ({doneTasks.length})</p>
            <SortableContext items={doneTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {doneTasks.map((task) => (
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
            </SortableContext>
          </div>
        )}

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-16 text-xs text-muted-foreground/60">Drop tasks here</div>
        )}
      </div>
    </div>
  );
}
