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

export interface KanbanColumn {
  id: string;
  title: string;
  order: number;
}

export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "todo", title: "To Do", order: 0 },
  { id: "in-progress", title: "In Progress", order: 1 },
  { id: "done", title: "Done", order: 2 },
];
