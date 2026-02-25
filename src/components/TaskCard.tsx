import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Trash2, ChevronDown } from "lucide-react";
import { Task, QUADRANT_MAP } from "@/types/task";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, isPast, parseISO, differenceInDays } from "date-fns";

interface TaskCardProps {
  task: Task;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
  onTaskClick?: (task: Task) => void;
  showQuadrantBadge?: boolean;
  isDragging?: boolean;
  getCategoryColor?: (name: string) => string | undefined;
  deadlineThresholdDays?: number;
}

export function TaskCard({
  task,
  onToggleStatus,
  onDelete,
  onTaskClick,
  showQuadrantBadge = false,
  isDragging = false,
  getCategoryColor,
  deadlineThresholdDays = 2,
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const quadrantInfo = QUADRANT_MAP[task.quadrant];
  const isDone = task.status === "done";

  const effectiveThreshold = task.deadlineThresholdOverride ?? deadlineThresholdDays;

  const formatDueDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d");
  };

  const isDueDateWarning = task.dueDate && (() => {
    const date = parseISO(task.dueDate!);
    if (isPast(date) && !isToday(date)) return true;
    const daysLeft = differenceInDays(date, new Date());
    return daysLeft <= effectiveThreshold;
  })();

  const categoryColor = getCategoryColor?.(task.category);

  const getBadgeClass = () => {
    const colorMap = { 1: "quadrant-badge-1", 2: "quadrant-badge-2", 3: "quadrant-badge-3", 4: "quadrant-badge-4" };
    return colorMap[quadrantInfo.color];
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "task-card px-3 py-1.5 group cursor-grab active:cursor-grabbing select-none",
        isDone && "opacity-60",
        isSortableDragging && "opacity-50",
        isDragging && "shadow-medium"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        // Don't open detail panel if clicking checkbox or delete
        if ((e.target as HTMLElement).closest("button")) return;
        onTaskClick?.(task);
      }}
    >
      <div className="flex items-center gap-2">
        {/* Category color dot */}
        {categoryColor && (
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColor }} />
        )}

        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleStatus(task.id); }}
          className={cn(
            "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0",
            isDone
              ? "bg-primary border-primary"
              : "border-muted-foreground/30 hover:border-primary"
          )}
        >
          {isDone && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
        </button>

        {/* Task name */}
        <span
          className={cn(
            "leading-tight flex-1 min-w-0 truncate text-sm",
            isDone && "line-through text-muted-foreground"
          )}
        >
          {task.name}
        </span>

        {/* Inline meta indicators */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {task.dueDate && (
            <span
              className={cn(
                "text-[10px]",
                isDueDateWarning && !isDone
                  ? "text-destructive font-semibold"
                  : "text-muted-foreground"
              )}
            >
              {formatDueDate(task.dueDate)}
            </span>
          )}

          {showQuadrantBadge && (
            <span className={cn("text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full", getBadgeClass())}>
              {quadrantInfo.title}
            </span>
          )}

          {/* Delete Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className={cn(
              "p-0.5 rounded text-muted-foreground hover:text-destructive transition-all",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
