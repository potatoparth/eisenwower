import { useState } from "react";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Calendar, Tag, Trash2, GripVertical, ChevronDown } from "lucide-react";
import { Task, QUADRANT_MAP } from "@/types/task";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";

interface TaskCardProps {
  task: Task;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
  showQuadrantBadge?: boolean;
  isDragging?: boolean;
}

export function TaskCard({
  task,
  onToggleStatus,
  onDelete,
  showQuadrantBadge = false,
  isDragging = false,
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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

  const formatDueDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d");
  };

  const isDueDateOverdue = task.dueDate && isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate));

  const getBadgeClass = () => {
    const colorMap = {
      1: "quadrant-badge-1",
      2: "quadrant-badge-2",
      3: "quadrant-badge-3",
      4: "quadrant-badge-4",
    };
    return colorMap[quadrantInfo.color];
  };

  const hasMeta = (task.category !== "General") || task.dueDate || showQuadrantBadge || task.description;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "task-card px-3 py-2 group cursor-grab active:cursor-grabbing",
        isDone && "opacity-60",
        isSortableDragging && "opacity-50",
        isDragging && "shadow-medium"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-2">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity cursor-grab flex-shrink-0"
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
        </div>

        {/* Checkbox */}
        <button
          onClick={() => onToggleStatus(task.id)}
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
            "text-sm leading-tight flex-1 min-w-0 truncate",
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
                isDueDateOverdue && !isDone
                  ? "text-destructive font-medium"
                  : "text-muted-foreground"
              )}
            >
              {formatDueDate(task.dueDate)}
            </span>
          )}

          {showQuadrantBadge && (
            <span
              className={cn(
                "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full",
                getBadgeClass()
              )}
            >
              {quadrantInfo.title}
            </span>
          )}

          {task.description && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
            </button>
          )}

          {/* Delete Button */}
          <button
            onClick={() => onDelete(task.id)}
            className={cn(
              "p-0.5 rounded text-muted-foreground hover:text-destructive transition-all",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Expanded description */}
      {isExpanded && task.description && (
        <div className="mt-1.5 ml-[52px] text-xs text-muted-foreground leading-relaxed">
          {task.description}
        </div>
      )}
    </div>
  );
}
