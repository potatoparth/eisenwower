import type { QuadrantLabels } from "@/types/task";
import { DEFAULT_QUADRANT_LABELS } from "@/types/task";

export interface QuadrantColors {
  main: string; // hex
  light: string;
  border: string;
  foreground: string;
}

export interface CategoryColor {
  name: string;
  color: string; // hex
}

export interface AppSettings {
  quadrantColors: {
    1: QuadrantColors;
    2: QuadrantColors;
    3: QuadrantColors;
    4: QuadrantColors;
  };
  fontSize: "small" | "medium" | "large";
  defaultView: "matrix" | "list" | "kanban" | "gantt" | "projects";
  deadlineThresholdDays: number; // days before due date to show red warning
  categoryColors: CategoryColor[];
  colorCodingEnabled: boolean;
  quadrantTintIntensity: number; // 0..30 percent
  taskDetailView: "popup" | "sidebar";
  showOverdue: boolean;
  noDateTasksPosition: "top" | "bottom";
  localUsername?: string;
  quadrantLabels: QuadrantLabels;
}

export const DEFAULT_SETTINGS: AppSettings = {
  quadrantColors: {
    1: { main: "#e8563a", light: "#fde8e4", border: "#e8a99a", foreground: "#6b1a0e" },
    2: { main: "#2a9d8f", light: "#ddf0ed", border: "#94c9c1", foreground: "#14453e" },
    3: { main: "#e9a320", light: "#f5eacc", border: "#d4b87a", foreground: "#5c3a06" },
    4: { main: "#7a8599", light: "#e7e9ed", border: "#b8bdc8", foreground: "#3a4255" },
  },
  fontSize: "medium",
  defaultView: "matrix",
  deadlineThresholdDays: 2,
  categoryColors: [
    { name: "General", color: "#7a8599" },
  ],
  colorCodingEnabled: true,
  quadrantTintIntensity: 10,
  taskDetailView: "popup",
  showOverdue: true,
  noDateTasksPosition: "bottom",
  quadrantLabels: DEFAULT_QUADRANT_LABELS,
};

export interface UserAccount {
  id: string;
  email: string;
  username: string;
  role: "admin" | "user";
  createdAt: string;
}
