export type Quadrant = 
  | "important-urgent" 
  | "important-not-urgent" 
  | "not-important-urgent" 
  | "not-important-not-urgent";

export type TaskStatus = "open" | "done";

export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export interface TaskAttachment {
  id: string;
  name: string;
  kind: "file" | "link";
  /** For files: storage object path (bucket task-attachments). For links: the URL. */
  path: string;
  size?: number;
  contentType?: string;
  addedAt: string;
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  category: string;
  quadrant: Quadrant;
  dueDate?: string;
  /** Optional time-of-day for the deadline, HH:MM (24h). */
  dueTime?: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  /** Owner of the row. Used to filter "my tasks" vs "all tasks" on shared projects. */
  userId?: string;
  deadlineThresholdOverride?: number; // per-task override for deadline warning days
  kanbanColumn?: string; // which kanban column this task belongs to
  projectId?: string; // optional project association
  recurrence?: Recurrence; // default 'none'
  recurrenceDays?: number[]; // 0..6 (Sun..Sat) for weekly
  recurrenceTime?: string; // HH:MM
  isRecurringInstance?: boolean;
  recurringTemplateId?: string;
  attachments?: TaskAttachment[];
  /** Ordering value used by the agenda/calendar for within-day drag reorder. */
  sortOrder?: number;
  /** When set, the task is archived and hidden from all default views. */
  archivedAt?: string;
}

export interface QuadrantInfo {
  id: Quadrant;
  title: string;
  subtitle: string;
  color: 1 | 2 | 3 | 4;
}

export const QUADRANTS: QuadrantInfo[] = [
  {
    id: "important-urgent",
    title: "Do First",
    subtitle: "Crises, deadlines, and fires",
    color: 1,
  },
  {
    id: "important-not-urgent",
    title: "Schedule",
    subtitle: "Goals, growth, and planning",
    color: 2,
  },
  {
    id: "not-important-urgent",
    title: "Delegate",
    subtitle: "Interruptions and busy work",
    color: 3,
  },
  {
    id: "not-important-not-urgent",
    title: "Eliminate",
    subtitle: "Distractions and time wasters",
    color: 4,
  },
];

export const QUADRANT_MAP: Record<Quadrant, QuadrantInfo> = QUADRANTS.reduce(
  (acc, q) => ({ ...acc, [q.id]: q }),
  {} as Record<Quadrant, QuadrantInfo>
);

export type QuadrantLabel = { title: string; subtitle: string };

export type QuadrantLabels = Record<Quadrant, QuadrantLabel>;

export const DEFAULT_QUADRANT_LABELS: QuadrantLabels = QUADRANTS.reduce(
  (acc, q) => ({ ...acc, [q.id]: { title: q.title, subtitle: q.subtitle } }),
  {} as QuadrantLabels
);

export function getQuadrants(labels?: Partial<QuadrantLabels>): QuadrantInfo[] {
  return QUADRANTS.map((q) => ({
    ...q,
    title: labels?.[q.id]?.title?.trim() || q.title,
    subtitle:
      labels?.[q.id]?.subtitle !== undefined
        ? labels[q.id]!.subtitle.trim()
        : q.subtitle,
  }));
}

export function getQuadrantMap(labels?: Partial<QuadrantLabels>): Record<Quadrant, QuadrantInfo> {
  return getQuadrants(labels).reduce(
    (acc, q) => ({ ...acc, [q.id]: q }),
    {} as Record<Quadrant, QuadrantInfo>
  );
}
