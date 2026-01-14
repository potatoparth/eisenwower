import { useMemo } from "react";
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
import { useState } from "react";
import { Task, Quadrant, QUADRANTS } from "@/types/task";
import { QuadrantColumn } from "./QuadrantColumn";
import { TaskCard } from "./TaskCard";
import { TaskInput } from "./TaskInput";

interface MatrixViewProps {
  tasks: Task[];
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
  onMoveTask,
  onToggleStatus,
  onDeleteTask,
  onAddTask,
}: MatrixViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const tasksByQuadrant = useMemo(() => {
    return QUADRANTS.reduce((acc, q) => {
      acc[q.id] = tasks.filter((t) => t.quadrant === q.id);
      return acc;
    }, {} as Record<Quadrant, Task[]>);
  }, [tasks]);

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

    // Check if dropped on another task (move to that task's quadrant)
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
      <div className="mb-6 max-w-2xl mx-auto w-full">
        <TaskInput onAddTask={onAddTask} placeholder="Add a new task..." />
      </div>

      {/* Matrix Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
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
            <div className="w-80">
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
