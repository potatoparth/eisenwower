export type Quadrant = 
  | "important-urgent" 
  | "important-not-urgent" 
  | "not-important-urgent" 
  | "not-important-not-urgent";

export type TaskStatus = "open" | "done";

export interface Task {
  id: string;
  name: string;
  description?: string;
  category: string;
  quadrant: Quadrant;
  dueDate?: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  deadlineThresholdOverride?: number; // per-task override for deadline warning days
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
    subtitle: "Important & Urgent",
    color: 1,
  },
  {
    id: "important-not-urgent",
    title: "Schedule",
    subtitle: "Important & Not Urgent",
    color: 2,
  },
  {
    id: "not-important-urgent",
    title: "Delegate",
    subtitle: "Not Important & Urgent",
    color: 3,
  },
  {
    id: "not-important-not-urgent",
    title: "Eliminate",
    subtitle: "Not Important & Not Urgent",
    color: 4,
  },
];

export const QUADRANT_MAP: Record<Quadrant, QuadrantInfo> = QUADRANTS.reduce(
  (acc, q) => ({ ...acc, [q.id]: q }),
  {} as Record<Quadrant, QuadrantInfo>
);
