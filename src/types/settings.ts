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
  /** Per-theme user accent overrides (main hex per quadrant). */
  quadrantAccents?: {
    light: { 1: string; 2: string; 3: string; 4: string };
    dark: { 1: string; 2: string; 3: string; 4: string };
  };
  /** Global primary/brand color (hex). Applied to buttons, links, focus rings. */
  primaryColor?: string;
  /** Which views are visible in the app. Off just hides UI; data is preserved. */
  enabledViews?: { matrix: boolean; list: boolean; kanban: boolean; gantt: boolean; projects: boolean; calendar: boolean; notes: boolean };
  fontSize: "small" | "medium" | "large";
  defaultView: "matrix" | "list" | "kanban" | "gantt" | "projects" | "calendar" | "notes";
  deadlineThresholdDays: number; // days before due date to show red warning
  categoryColors: CategoryColor[];
  colorCodingEnabled: boolean;
  quadrantTintIntensity: number; // 0..30 percent
  taskDetailView: "popup" | "sidebar";
  showOverdue: boolean;
  noDateTasksPosition: "top" | "bottom";
  /** How filters render on desktop. Mobile is always "button". Default: "pills". */
  filterBarDisplay?: "pills" | "button";
  localUsername?: string;
  quadrantLabels: QuadrantLabels;
}

export const DEFAULT_QUADRANT_ACCENTS = {
  light: { 1: "#6D28D9", 2: "#2563EB", 3: "#D97706", 4: "#9CA3AF" },
  dark:  { 1: "#A78BFA", 2: "#4FC3F7", 3: "#FFB300", 4: "#6B7280" },
} as const;

export const QUADRANT_COLOR_PRESETS = {
  light: [
    "#6D28D9", "#2563EB", "#D97706", "#9CA3AF",
    "#DC2626", "#059669", "#DB2777", "#0891B2",
    "#7C3AED", "#EA580C", "#0D9488", "#475569",
  ],
  dark: [
    "#A78BFA", "#4FC3F7", "#FFB300", "#6B7280",
    "#F87171", "#34D399", "#F472B6", "#22D3EE",
    "#C4B5FD", "#FB923C", "#5EEAD4", "#94A3B8",
  ],
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  quadrantColors: {
    1: { main: "#e8563a", light: "#fde8e4", border: "#e8a99a", foreground: "#6b1a0e" },
    2: { main: "#2a9d8f", light: "#ddf0ed", border: "#94c9c1", foreground: "#14453e" },
    3: { main: "#e9a320", light: "#f5eacc", border: "#d4b87a", foreground: "#5c3a06" },
    4: { main: "#7a8599", light: "#e7e9ed", border: "#b8bdc8", foreground: "#3a4255" },
  },
  quadrantAccents: {
    light: { ...DEFAULT_QUADRANT_ACCENTS.light },
    dark: { ...DEFAULT_QUADRANT_ACCENTS.dark },
  },
  primaryColor: "#6D28D9",
  enabledViews: { matrix: true, list: true, kanban: true, gantt: true, projects: true, calendar: true, notes: true },
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
  filterBarDisplay: "pills",
  quadrantLabels: DEFAULT_QUADRANT_LABELS,
};

export interface UserAccount {
  id: string;
  email: string;
  username: string;
  role: "admin" | "user";
  createdAt: string;
}
