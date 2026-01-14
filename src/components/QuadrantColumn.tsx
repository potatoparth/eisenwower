import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
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
}

export function QuadrantColumn({
  quadrant,
  tasks,
  onToggleStatus,
  onDelete,
  onAddTask,
}: QuadrantColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: quadrant.id,
  });

  const openTasks = tasks.filter((t) => t.status === "open");
  const doneTasks = tasks.filter((t) => t.status === "done");

  const getHeaderGradient = () => {
    const gradients = {
      1: "from-quadrant-1/20 to-transparent",
      2: "from-quadrant-2/20 to-transparent",
      3: "from-quadrant-3/20 to-transparent",
      4: "from-quadrant-4/20 to-transparent",
    };
    return gradients[quadrant.color];
  };

  const getDotClass = () => {
    const dots = {
      1: "bg-quadrant-1",
      2: "bg-quadrant-2",
      3: "bg-quadrant-3",
      4: "bg-quadrant-4",
    };
    return dots[quadrant.color];
  };

  const getBorderClass = () => {
    const borders = {
      1: "border-quadrant-1-border",
      2: "border-quadrant-2-border",
      3: "border-quadrant-3-border",
      4: "border-quadrant-4-border",
    };
    return borders[quadrant.color];
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-2xl border-2 transition-all duration-200 overflow-hidden h-full",
        getBorderClass(),
        isOver && "ring-2 ring-primary/30 scale-[1.01]"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "p-4 bg-gradient-to-b",
          getHeaderGradient()
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn("w-2.5 h-2.5 rounded-full", getDotClass())} />
          <h3 className="font-semibold text-foreground">{quadrant.title}</h3>
          <span className="text-xs text-muted-foreground ml-auto">
            {openTasks.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 ml-[18px]">
          {quadrant.subtitle}
        </p>
      </div>

      {/* Task Input */}
      <div className="px-3 py-2">
        <TaskInput
          onAddTask={onAddTask}
          defaultQuadrant={quadrant.id}
          placeholder={`Add to ${quadrant.title.toLowerCase()}...`}
        />
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto p-3 pt-0 space-y-2">
        <SortableContext
          items={openTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <AnimatePresence mode="popLayout">
            {openTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleStatus={onToggleStatus}
                onDelete={onDelete}
              />
            ))}
          </AnimatePresence>
        </SortableContext>

        {/* Done tasks (collapsed) */}
        {doneTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-2"
          >
            <p className="text-xs text-muted-foreground font-medium mb-2 px-1">
              Completed ({doneTasks.length})
            </p>
            <SortableContext
              items={doneTasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <AnimatePresence mode="popLayout">
                {doneTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleStatus={onToggleStatus}
                    onDelete={onDelete}
                  />
                ))}
              </AnimatePresence>
            </SortableContext>
          </motion.div>
        )}

        {/* Empty state */}
        {tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center h-24 text-sm text-muted-foreground/60"
          >
            Drop tasks here
          </motion.div>
        )}
      </div>
    </div>
  );
}
