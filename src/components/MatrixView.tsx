import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Task, Quadrant, QUADRANTS } from "@/types/task";
import { QuadrantColumn } from "./QuadrantColumn";
import { TaskCard } from "./TaskCard";
import { TaskInput } from "./TaskInput";
import { QuadrantExpandDialog } from "./QuadrantExpandDialog";
import { cn } from "@/lib/utils";
import type { QuadrantInfo } from "@/types/task";
import { sortTasks, isOverdue } from "@/lib/sort";
import { isToday, isWithinInterval, parseISO, addDays, startOfDay } from "date-fns";

interface MatrixViewProps {
  tasks: Task[];
  categories: string[];
  onMoveTask: (id: string, quadrant: Quadrant) => void;
  onToggleStatus: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (
    name: string,
    quadrant: Quadrant,
    options?: { description?: string; category?: string; dueDate?: string }
  ) => void;
  onReorderTasks?: (reorderedTasks: Task[]) => void;
  onTaskClick?: (task: Task) => void;
  getCategoryColor?: (name: string) => string | undefined;
  deadlineThresholdDays?: number;
  dateFilter?: "all" | "today" | "week";
  overdueMode?: "all" | "only" | "hide";
  selectedCategories?: string[];
  noDatePosition?: "top" | "bottom";
  compactMode?: boolean;
}

export function MatrixView({
  tasks,
  categories,
  onMoveTask,
  onToggleStatus,
  onDeleteTask,
  onAddTask,
  onReorderTasks,
  onTaskClick,
  getCategoryColor,
  deadlineThresholdDays = 2,
  dateFilter = "all",
  overdueMode = "all",
  selectedCategories = [],
  noDatePosition = "bottom",
  compactMode = false,
}: MatrixViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedQuadrant, setExpandedQuadrant] = useState<QuadrantInfo | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const filteredTasks = useMemo(() => {
    let out = tasks;
    if (selectedCategories.length > 0) out = out.filter((t) => selectedCategories.includes(t.category));
    if (overdueMode === "only") out = out.filter((t) => isOverdue(t));
    if (overdueMode === "hide") out = out.filter((t) => !isOverdue(t));
    if (dateFilter !== "all") {
      const today = startOfDay(new Date());
      const end = dateFilter === "today" ? today : addDays(today, 7);
      out = out.filter((t) => {
        if (isOverdue(t)) return true;
        if (!t.dueDate) return false;
        const d = parseISO(t.dueDate);
        return dateFilter === "today" ? isToday(d) : isWithinInterval(d, { start: today, end });
      });
    }
    return out;
  }, [tasks, selectedCategories, overdueMode, dateFilter]);

  const tasksByQuadrant = useMemo(() => {
    return QUADRANTS.reduce((acc, q) => {
      const list = filteredTasks.filter((t) => t.quadrant === q.id);
      acc[q.id] = sortTasks(list, { noDatePosition });
      return acc;
    }, {} as Record<Quadrant, Task[]>);
  }, [filteredTasks, noDatePosition]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a quadrant
    const isQuadrant = QUADRANTS.some((q) => q.id === overId);
    if (isQuadrant) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.quadrant !== overId) {
        onMoveTask(taskId, overId as Quadrant);
      }
      return;
    }

    // Dropped on another task
    const targetTask = tasks.find((t) => t.id === overId);
    const sourceTask = tasks.find((t) => t.id === taskId);
    if (targetTask && sourceTask) {
      if (sourceTask.quadrant !== targetTask.quadrant) {
        // Move to different quadrant
        onMoveTask(taskId, targetTask.quadrant);
      } else if (onReorderTasks && taskId !== overId) {
        // Reorder within same quadrant
        const quadrantTasks = tasks.filter(t => t.quadrant === sourceTask.quadrant);
        const oldIndex = quadrantTasks.findIndex(t => t.id === taskId);
        const newIndex = quadrantTasks.findIndex(t => t.id === overId);
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(quadrantTasks, oldIndex, newIndex);
          // Rebuild full task list with reordered quadrant
          const otherTasks = tasks.filter(t => t.quadrant !== sourceTask.quadrant);
          onReorderTasks([...otherTasks, ...reordered]);
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Global Task Input */}
      <div className="mb-3 max-w-2xl mx-auto w-full flex-shrink-0">
        <TaskInput onAddTask={onAddTask} placeholder="Add a new task..." />
      </div>

      {/* Matrix Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid flex-1 grid-cols-1 gap-3 min-h-0 auto-rows-[minmax(17rem,auto)] md:grid-cols-2 md:grid-rows-2 md:auto-rows-fr md:gap-4">
          {QUADRANTS.map((quadrant) => (
            <QuadrantColumn
              key={quadrant.id}
              quadrant={quadrant}
              tasks={tasksByQuadrant[quadrant.id] || []}
              onToggleStatus={onToggleStatus}
              onDelete={onDeleteTask}
              onAddTask={onAddTask}
              onExpand={() => setExpandedQuadrant(quadrant)}
              onTaskClick={onTaskClick}
              getCategoryColor={getCategoryColor}
              deadlineThresholdDays={deadlineThresholdDays}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="w-72">
              <TaskCard
                task={activeTask}
                onToggleStatus={() => {}}
                onDelete={() => {}}
                isDragging
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Expanded Quadrant Dialog */}
      {expandedQuadrant && (
        <QuadrantExpandDialog
          quadrant={expandedQuadrant}
          tasks={tasksByQuadrant[expandedQuadrant.id] || []}
          onToggleStatus={onToggleStatus}
          onDelete={onDeleteTask}
          onAddTask={onAddTask}
          onClose={() => setExpandedQuadrant(null)}
          onTaskClick={(task) => { setExpandedQuadrant(null); onTaskClick?.(task); }}
          getCategoryColor={getCategoryColor}
          deadlineThresholdDays={deadlineThresholdDays}
        />
      )}
    </div>
  );
}
