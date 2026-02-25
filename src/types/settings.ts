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
  defaultView: "matrix" | "list";
  deadlineThresholdDays: number; // days before due date to show red warning
  categoryColors: CategoryColor[];
  colorCodingEnabled: boolean;
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
};

export interface UserAccount {
  id: string;
  username: string;
  password: string; // In real app, this would be hashed
  role: "admin" | "user";
  createdAt: string;
}
