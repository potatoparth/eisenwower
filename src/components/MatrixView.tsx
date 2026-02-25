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
import { Task, Quadrant, QUADRANTS } from "@/types/task";
import { QuadrantColumn } from "./QuadrantColumn";
import { TaskCard } from "./TaskCard";
import { TaskInput } from "./TaskInput";
import { cn } from "@/lib/utils";

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
}

export function MatrixView({
  tasks,
  categories,
  onMoveTask,
  onToggleStatus,
  onDeleteTask,
  onAddTask,
}: MatrixViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
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

    const isQuadrant = QUADRANTS.some((q) => q.id === overId);
    if (isQuadrant) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.quadrant !== overId) {
        onMoveTask(taskId, overId as Quadrant);
      }
      return;
    }

    const targetTask = tasks.find((t) => t.id === overId);
    if (targetTask) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.quadrant !== targetTask.quadrant) {
        onMoveTask(taskId, targetTask.quadrant);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Global Task Input */}
      <div className="mb-4 max-w-2xl mx-auto w-full">
        <TaskInput onAddTask={onAddTask} placeholder="Add a new task..." />
      </div>

      {/* Category Filter Toggle */}
      {categories.length > 1 && (
        <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Matrix Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0">
          {QUADRANTS.map((quadrant) => (
            <QuadrantColumn
              key={quadrant.id}
              quadrant={quadrant}
              tasks={tasksByQuadrant[quadrant.id] || []}
              onToggleStatus={onToggleStatus}
              onDelete={onDeleteTask}
              onAddTask={onAddTask}
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
    </div>
  );
}
