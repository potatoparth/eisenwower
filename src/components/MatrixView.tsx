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
}: MatrixViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedQuadrant, setExpandedQuadrant] = useState<QuadrantInfo | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const filteredTasks = useMemo(() => {
    if (selectedCategory === "all") return tasks;
    return tasks.filter((t) => t.category === selectedCategory);
  }, [tasks, selectedCategory]);

  const tasksByQuadrant = useMemo(() => {
    return QUADRANTS.reduce((acc, q) => {
      acc[q.id] = filteredTasks.filter((t) => t.quadrant === q.id);
      return acc;
    }, {} as Record<Quadrant, Task[]>);
  }, [filteredTasks]);

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

      {/* Category Filter Toggle */}
      {categories.length > 1 && (
        <div className="mb-3 flex flex-shrink-0 items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {categories.map((cat) => {
            const catColor = getCategoryColor?.(cat);
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {catColor && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />}
                {cat}
              </button>
            );
          })}
        </div>
      )}

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
