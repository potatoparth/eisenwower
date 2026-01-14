import { useState } from "react";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Calendar, Tag, Trash2, GripVertical } from "lucide-react";
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

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ 
        opacity: isSortableDragging ? 0.5 : 1, 
        y: 0,
        scale: isDragging ? 1.02 : 1,
      }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "task-card p-4 group cursor-grab active:cursor-grabbing",
        isDone && "opacity-60"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity cursor-grab"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Checkbox */}
        <button
          onClick={() => onToggleStatus(task.id)}
          className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 mt-0.5",
            isDone
              ? "bg-primary border-primary"
              : "border-muted-foreground/30 hover:border-primary"
          )}
        >
          {isDone && <Check className="w-3 h-3 text-primary-foreground" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium leading-snug transition-all duration-200",
              isDone && "line-through text-muted-foreground"
            )}
          >
            {task.name}
          </p>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {showQuadrantBadge && (
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full",
                  getBadgeClass()
                )}
              >
                {quadrantInfo.title}
              </span>
            )}
            
            {task.category !== "General" && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Tag className="w-3 h-3" />
                {task.category}
              </span>
            )}

            {task.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs",
                  isDueDateOverdue && !isDone
                    ? "text-destructive font-medium"
                    : "text-muted-foreground"
                )}
              >
                <Calendar className="w-3 h-3" />
                {formatDueDate(task.dueDate)}
              </span>
            )}
          </div>
        </div>

        {/* Delete Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
          onClick={() => onDelete(task.id)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}
