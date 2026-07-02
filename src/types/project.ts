export type TaskDependencyType = "sync" | "async"; // sync = sequential (blocked), async = parallel

export interface ProjectTask {
  id: string;
  name: string;
  description?: string;
  dependencyType: TaskDependencyType;
  dependsOn: string[]; // IDs of tasks this depends on (for sync tasks)
  durationDays: number;
  startDate?: string;
  endDate?: string;
  status: "pending" | "in-progress" | "done";
  order: number;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  tasks: ProjectTask[];
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

/** A reusable, prefilled set of tasks that can seed a new project. */
export interface PresetTask {
  id: string;
  name: string;
  description?: string;
  dependencyType: TaskDependencyType;
  dependsOn: string[];
  durationDays: number;
  quadrant?: string;
  category?: string;
  dueDate?: string;
  dueTime?: string;
}

export interface ProjectTemplatePreset {
  id: string;
  name: string;
  description?: string;
  tasks: PresetTask[];
  createdAt: string;
  updatedAt: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  order: number;
}

export interface KanbanBoard {
  id: string;
  name: string;
  order: number;
  isDefault?: boolean;
}

export interface KanbanBoardItem {
  id: string;
  boardId: string;
  taskId: string;
  columnKey: string;
  sortOrder: number;
}

/** The Default board is derived from task state, not stored. */
export const DEFAULT_BOARD_ID = "__default__";
export const DEFAULT_BOARD_COLUMNS: KanbanColumn[] = [
  { id: "todo", title: "To Do", order: 0 },
  { id: "overdue", title: "Overdue", order: 1 },
  { id: "done", title: "Done", order: 2 },
];
export const MAX_KANBAN_BOARDS = 10;
export const MAX_KANBAN_COLUMNS_PER_BOARD = 6;
