import { useState, useMemo } from "react";
import {
  DndContext, DragEndEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter, useDroppable, DragOverlay,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, X, Edit2, Check, Maximize2, Trash2 } from "lucide-react";
import { parseISO, isPast, isToday } from "date-fns";
import { Task } from "@/types/task";
import {
  KanbanBoard, KanbanColumn, KanbanBoardItem,
  DEFAULT_BOARD_ID, DEFAULT_BOARD_COLUMNS,
  MAX_KANBAN_BOARDS, MAX_KANBAN_COLUMNS_PER_BOARD,
} from "@/types/project";
import { TaskCard } from "./TaskCard";
import { TaskInput, type TaskInputPickerProps, type TaskAddOptions } from "@/components/TaskInput";
import { Quadrant } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { SelectionToolbar } from "@/components/SelectionToolbar";

interface KanbanViewProps {
  tasks: Task[];
  boards: KanbanBoard[];
  columnsByBoard: Record<string, KanbanColumn[]>;
  itemsByBoard: Record<string, KanbanBoardItem[]>;
  onCreateBoard: (name: string, columnTitles: string[]) => Promise<{ boardId: string; columnKeys: string[] } | undefined>;
  onRenameBoard: (boardId: string, name: string) => void;
  onDeleteBoard: (boardId: string) => void;
  onAddColumn: (boardId: string, title: string) => void;
  onRemoveColumn: (boardId: string, columnKey: string) => void;
  onRenameColumn: (boardId: string, columnKey: string, title: string) => void;
  onMoveItem: (boardId: string, taskId: string, columnKey: string) => void;
  onRemoveItem: (boardId: string, taskId: string) => void;
  onToggleStatus: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onTaskClick?: (task: Task) => void;
  onQuickAdd?: (
    name: string,
    boardId: string,
    columnKey: string,
    isDefault: boolean,
    quadrant: Quadrant,
    options?: TaskAddOptions,
  ) => void;
  taskInputProps?: TaskInputPickerProps;
  getCategoryColor?: (name: string) => string | undefined;
  deadlineThresholdDays?: number;
  getProjectName?: (id: string) => string | undefined;
  getAssigneeName?: (id: string) => string | undefined;
}

/** Which Default-board column a task belongs to, derived from status/due date. */
function defaultColumnForTask(t: Task): string {
  if (t.status === "done") return "done";
  if (t.dueDate) {
    const d = parseISO(t.dueDate);
    if (isPast(d) && !isToday(d)) return "overdue";
    if (isToday(d)) return "todo";
    return "upcoming";
  }
  return "upcoming";
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
  tasks, boards, columnsByBoard, itemsByBoard,
  onCreateBoard, onRenameBoard, onDeleteBoard,
  onAddColumn, onRemoveColumn, onRenameColumn,
  onMoveItem, onRemoveItem,
  onToggleStatus, onDeleteTask, onTaskClick,
  onQuickAdd,
  taskInputProps,
  getCategoryColor, deadlineThresholdDays = 2,
  getProjectName, getAssigneeName,
}: KanbanViewProps) {
  const [activeBoardId, setActiveBoardId] = useState<string>(DEFAULT_BOARD_ID);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editingBoard, setEditingBoard] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardCols, setNewBoardCols] = useState<string[]>(["To Do", "Doing", "Done"]);
  const [expandedColumnKey, setExpandedColumnKey] = useState<string | null>(null);
  const [deleteBoardConfirm, setDeleteBoardConfirm] = useState(false);
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const isDefault = activeBoardId === DEFAULT_BOARD_ID;
  const activeBoard = boards.find(b => b.id === activeBoardId);

  const columns = useMemo<KanbanColumn[]>(() => {
    if (isDefault) return DEFAULT_BOARD_COLUMNS;
    return columnsByBoard[activeBoardId] || [];
  }, [isDefault, activeBoardId, columnsByBoard]);

  // Task lists per column, differ by board type.
  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    columns.forEach(c => { map[c.id] = []; });
    if (isDefault) {
      tasks.forEach(t => {
        const key = defaultColumnForTask(t);
        (map[key] ||= []).push(t);
      });
    } else {
      const items = itemsByBoard[activeBoardId] || [];
      const byTaskId = new Map(tasks.map(t => [t.id, t] as const));
      items.forEach(it => {
        const t = byTaskId.get(it.taskId);
        if (!t) return;
        if (!map[it.columnKey]) return; // column may have been removed
        map[it.columnKey].push(t);
      });
    }
    return map;
  }, [columns, isDefault, tasks, itemsByBoard, activeBoardId]);

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const taskId = active.id as string;
    const overId = over.id as string;
    let targetCol: string | null = null;
    if (overId.startsWith("column-")) targetCol = overId.replace("column-", "");
    else {
      const t = tasks.find(t => t.id === overId);
      if (t) {
        if (isDefault) targetCol = defaultColumnForTask(t);
        else {
          const it = (itemsByBoard[activeBoardId] || []).find(i => i.taskId === t.id);
          targetCol = it?.columnKey || null;
        }
      }
    }
    if (!targetCol) return;

    if (isDefault) {
      // Only Done ↔ Todo mapping is meaningful via toggleStatus.
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const current = defaultColumnForTask(task);
      if (current === targetCol) return;
      if (targetCol === "done" && task.status !== "done") onToggleStatus(taskId);
      else if (current === "done" && targetCol !== "done") onToggleStatus(taskId);
      // Overdue is due-date-derived — dragging into/out of it isn't supported.
    } else {
      onMoveItem(activeBoardId, taskId, targetCol);
    }
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim() || isDefault) return;
    onAddColumn(activeBoardId, newColumnName.trim());
    setNewColumnName("");
    setShowAddColumn(false);
  };

  const handleCreateBoard = async () => {
    const cols = newBoardCols.map(c => c.trim()).filter(Boolean);
    if (!cols.length) return;
    const res = await onCreateBoard(newBoardName.trim() || "Untitled board", cols);
    if (res) setActiveBoardId(res.boardId);
    setShowNewBoard(false);
    setNewBoardName("");
    setNewBoardCols(["To Do", "Doing", "Done"]);
  };

  const canAddBoard = boards.length < MAX_KANBAN_BOARDS;
  const canAddColumn = !isDefault && columns.length < MAX_KANBAN_COLUMNS_PER_BOARD;

  const renderColumn = (column: KanbanColumn, colTasks: Task[], expanded?: boolean) => (
    <>
      <div className="p-3 flex items-center justify-between border-b border-border">
        {editingColumn === column.id && !isDefault ? (
          <div className="flex items-center gap-1 flex-1">
            <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-sm" autoFocus
              onKeyDown={e => { if (e.key === "Enter") { onRenameColumn(activeBoardId, column.id, editName); setEditingColumn(null); } }} />
            <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => { onRenameColumn(activeBoardId, column.id, editName); setEditingColumn(null); }}>
              <Check className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <>
            <button
              className="flex items-center gap-2 min-w-0 text-left"
              onClick={() => !expanded && setExpandedColumnKey(column.id)}
              title="Expand column"
            >
              <h3 className="font-semibold text-sm truncate">{column.title}</h3>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
            </button>
            <div className="flex items-center gap-0.5">
              <SelectionToolbar
                compact
                className="mr-0.5"
                getAllIds={() => colTasks.map((t) => t.id)}
              />
              {onQuickAdd && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-6 h-6"
                  onClick={() => setAddingToColumn(column.id)}
                  title="Add task to this column"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              )}
              {!expanded && (
                <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => setExpandedColumnKey(column.id)} title="Expand">
                  <Maximize2 className="w-3 h-3" />
                </Button>
              )}
              {!isDefault && (
                <>
                  <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => { setEditingColumn(column.id); setEditName(column.title); }} title="Rename">
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  {columns.length > 1 && (
                    <Button size="icon" variant="ghost" className="w-6 h-6 text-muted-foreground hover:text-destructive" onClick={() => onRemoveColumn(activeBoardId, column.id)} title="Remove column">
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
      {addingToColumn === column.id && onQuickAdd && (
        <div className="p-2 border-b border-border bg-secondary/30">
          <TaskInput
            compact
            placeholder="Task name…"
            onAddTask={(name, quadrant, options) => {
              onQuickAdd(name, activeBoardId, column.id, isDefault, quadrant, options);
              setAddingToColumn(null);
            }}
            {...taskInputProps}
          />
        </div>
      )}
      <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 space-y-1.5 overflow-y-auto min-h-[100px]">
          {colTasks.map(task => (
            <div key={task.id} className="relative group/kanban-card">
              <TaskCard
                task={task}
                onToggleStatus={onToggleStatus}
                onDelete={isDefault ? onDeleteTask : (id) => onRemoveItem(activeBoardId, id)}
                onTaskClick={onTaskClick}
                getCategoryColor={getCategoryColor}
                deadlineThresholdDays={deadlineThresholdDays}
                variant="stacked"
                getProjectName={getProjectName}
                getAssigneeName={getAssigneeName}
              />
            </div>
          ))}
          {colTasks.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8">
              {isDefault ? "No tasks here" : "Drop tasks here"}
            </div>
          )}
        </div>
      </SortableContext>
    </>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Board switcher */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto flex-shrink-0 pb-1">
        <BoardChip
          label="Default"
          active={isDefault}
          onClick={() => setActiveBoardId(DEFAULT_BOARD_ID)}
        />
        {boards.map(b => (
          <div key={b.id} className="flex items-center gap-1">
            {editingBoard && activeBoardId === b.id ? (
              <Input
                autoFocus
                value={boardName}
                onChange={e => setBoardName(e.target.value)}
                onBlur={() => { onRenameBoard(b.id, boardName || b.name); setEditingBoard(false); }}
                onKeyDown={e => { if (e.key === "Enter") { onRenameBoard(b.id, boardName || b.name); setEditingBoard(false); } }}
                className="h-7 w-32 text-xs"
              />
            ) : (
              <BoardChip
                label={b.name}
                active={activeBoardId === b.id}
                onClick={() => setActiveBoardId(b.id)}
                onDoubleClick={() => { setBoardName(b.name); setEditingBoard(true); setActiveBoardId(b.id); }}
              />
            )}
          </div>
        ))}
        <Button
          size="sm" variant="outline" className="h-7 rounded-full text-xs gap-1 shrink-0"
          onClick={() => setShowNewBoard(true)}
          disabled={!canAddBoard}
          title={canAddBoard ? "New board" : `Max ${MAX_KANBAN_BOARDS} boards`}
        >
          <Plus className="w-3 h-3" /> New board
        </Button>
        {!isDefault && activeBoard && (
          <>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 shrink-0"
              onClick={() => { setBoardName(activeBoard.name); setEditingBoard(true); }}>
              <Edit2 className="w-3 h-3" /> Rename
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteBoardConfirm(true)}>
              <Trash2 className="w-3 h-3" /> Delete board
            </Button>
          </>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto flex-1 pb-4">
          {columns.map(column => {
            const colTasks = tasksByColumn[column.id] || [];
            return (
              <DroppableColumn key={column.id} column={column} taskCount={colTasks.length}>
                {renderColumn(column, colTasks)}
              </DroppableColumn>
            );
          })}

          {/* Add column (custom boards only) */}
          {!isDefault && (
            showAddColumn ? (
              <div className="min-w-[280px] max-w-[360px] flex flex-col gap-2 p-3 bg-secondary/30 rounded-2xl border border-dashed border-border">
                <Input value={newColumnName} onChange={e => setNewColumnName(e.target.value)} placeholder="Column name..." autoFocus
                  onKeyDown={e => { if (e.key === "Enter") handleAddColumn(); if (e.key === "Escape") setShowAddColumn(false); }} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddColumn} className="flex-1" disabled={!canAddColumn}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddColumn(false)}>Cancel</Button>
                </div>
                {!canAddColumn && <div className="text-[11px] text-muted-foreground">Max {MAX_KANBAN_COLUMNS_PER_BOARD} columns</div>}
              </div>
            ) : canAddColumn ? (
              <button onClick={() => setShowAddColumn(true)}
                className="min-w-[280px] max-w-[360px] flex items-center justify-center gap-2 p-6 rounded-2xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                <Plus className="w-4 h-4" /> Add Column
              </button>
            ) : null
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

      {/* Expanded column focus dialog */}
      <Dialog open={!!expandedColumnKey} onOpenChange={(o) => !o && setExpandedColumnKey(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col">
          {expandedColumnKey && (() => {
            const col = columns.find(c => c.id === expandedColumnKey);
            if (!col) return null;
            const colTasks = tasksByColumn[col.id] || [];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {col.title}
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                    <span className="ml-auto">
                      <SelectionToolbar compact getAllIds={() => colTasks.map((t) => t.id)} />
                    </span>
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto space-y-2 mt-2">
                  {colTasks.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">No tasks in this column</div>}
                  {colTasks.map(task => (
                    <TaskCard key={task.id} task={task}
                      onToggleStatus={onToggleStatus}
                      onDelete={isDefault ? onDeleteTask : (id) => onRemoveItem(activeBoardId, id)}
                      onTaskClick={(t) => { setExpandedColumnKey(null); onTaskClick?.(t); }}
                      showQuadrantBadge
                      getCategoryColor={getCategoryColor}
                      deadlineThresholdDays={deadlineThresholdDays}
                    />
                  ))}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* New board dialog */}
      <Dialog open={showNewBoard} onOpenChange={setShowNewBoard}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Kanban board</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Board name</label>
              <Input value={newBoardName} onChange={e => setNewBoardName(e.target.value)} placeholder="e.g. Q3 launch" autoFocus />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Columns (1–{MAX_KANBAN_COLUMNS_PER_BOARD})</label>
              <div className="space-y-2">
                {newBoardCols.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={c}
                      placeholder={`Column ${idx + 1}`}
                      onChange={e => setNewBoardCols(prev => prev.map((v, i) => i === idx ? e.target.value : v))}
                    />
                    {newBoardCols.length > 1 && (
                      <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => setNewBoardCols(prev => prev.filter((_, i) => i !== idx))}>
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
                {newBoardCols.length < MAX_KANBAN_COLUMNS_PER_BOARD && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setNewBoardCols(prev => [...prev, ""])}>
                    <Plus className="w-3 h-3" /> Add column
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewBoard(false)}>Cancel</Button>
            <Button onClick={handleCreateBoard}>Create board</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteBoardConfirm} onOpenChange={setDeleteBoardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete board "{activeBoard?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              The board and its columns are removed. Your tasks are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (activeBoard) onDeleteBoard(activeBoard.id);
              setActiveBoardId(DEFAULT_BOARD_ID);
              setDeleteBoardConfirm(false);
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BoardChip({ label, active, onClick, onDoubleClick }: {
  label: string; active: boolean; onClick: () => void; onDoubleClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        "h-7 px-3 rounded-full text-xs font-medium border transition-colors shrink-0",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-secondary/60 text-foreground border-border hover:border-primary/40"
      )}
    >
      {label}
    </button>
  );
}
