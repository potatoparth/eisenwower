import { useState, useMemo } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, X, Edit2, Check } from "lucide-react";
import { Task, Quadrant } from "@/types/task";
import { KanbanColumn } from "@/types/project";
import { TaskCard } from "./TaskCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";

interface KanbanViewProps {
  tasks: Task[];
  columns: KanbanColumn[];
  onAddColumn: (title: string) => void;
  onRemoveColumn: (id: string) => void;
  onRenameColumn: (id: string, title: string) => void;
  onToggleStatus: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onAddTask: (name: string, quadrant: Quadrant, options?: { description?: string; category?: string; dueDate?: string }) => void;
  onTaskClick?: (task: Task) => void;
  getCategoryColor?: (name: string) => string | undefined;
  deadlineThresholdDays?: number;
}

function DroppableColumn({ column, children, taskCount }: { column: KanbanColumn; children: React.ReactNode; taskCount: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${column.id}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-[280px] max-w-[360px] flex flex-col bg-secondary/50 rounded-2xl border border-border transition-colors",
        isOver && "border-primary/40 bg-accent/30"
      )}
    >
      {children}
    </div>
  );
}

export function KanbanView({
  tasks, columns, onAddColumn, onRemoveColumn, onRenameColumn,
  onToggleStatus, onDeleteTask, onUpdateTask, onAddTask, onTaskClick,
  getCategoryColor, deadlineThresholdDays = 2,
}: KanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Map tasks to columns by kanbanColumn field (default to first column)
  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    columns.forEach(c => { map[c.id] = []; });
    tasks.forEach(t => {
      const col = (t as any).kanbanColumn || columns[0]?.id;
      if (map[col]) map[col].push(t);
      else if (columns[0]) map[columns[0].id].push(t);
    });
    return map;
  }, [tasks, columns]);

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Dropped on a column
    if (overId.startsWith("column-")) {
      const colId = overId.replace("column-", "");
      onUpdateTask(taskId, { kanbanColumn: colId } as any);
      return;
    }

    // Dropped on another task
    const targetTask = tasks.find(t => t.id === overId);
    if (targetTask) {
      const targetCol = (targetTask as any).kanbanColumn || columns[0]?.id;
      onUpdateTask(taskId, { kanbanColumn: targetCol } as any);
    }
  };

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      onAddColumn(newColumnName.trim());
      setNewColumnName("");
      setShowAddColumn(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto flex-1 pb-4">
          {columns.map(column => {
            const colTasks = tasksByColumn[column.id] || [];
            return (
              <DroppableColumn key={column.id} column={column} taskCount={colTasks.length}>
                <div className="p-3 flex items-center justify-between border-b border-border">
                  {editingColumn === column.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={e => { if (e.key === "Enter") { onRenameColumn(column.id, editName); setEditingColumn(null); } }}
                      />
                      <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => { onRenameColumn(column.id, editName); setEditingColumn(null); }}>
                        <Check className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{column.title}</h3>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => { setEditingColumn(column.id); setEditName(column.title); }}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        {columns.length > 1 && (
                          <Button size="icon" variant="ghost" className="w-6 h-6 text-muted-foreground hover:text-destructive" onClick={() => onRemoveColumn(column.id)}>
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex-1 p-2 space-y-1.5 overflow-y-auto min-h-[100px]">
                    {colTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggleStatus={onToggleStatus}
                        onDelete={onDeleteTask}
                        onTaskClick={onTaskClick}
                        showQuadrantBadge
                        getCategoryColor={getCategoryColor}
                        deadlineThresholdDays={deadlineThresholdDays}
                      />
                    ))}
                    {colTasks.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-8">Drop tasks here</div>
                    )}
                  </div>
                </SortableContext>
              </DroppableColumn>
            );
          })}

          {/* Add column */}
          {showAddColumn ? (
            <div className="min-w-[280px] max-w-[360px] flex flex-col gap-2 p-3 bg-secondary/30 rounded-2xl border border-dashed border-border">
              <Input
                value={newColumnName}
                onChange={e => setNewColumnName(e.target.value)}
                placeholder="Column name..."
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleAddColumn(); if (e.key === "Escape") setShowAddColumn(false); }}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddColumn} className="flex-1">Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddColumn(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddColumn(true)}
              className="min-w-[280px] max-w-[360px] flex items-center justify-center gap-2 p-6 rounded-2xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Column
            </button>
          )}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="w-72">
              <TaskCard task={activeTask} onToggleStatus={() => {}} onDelete={() => {}} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
