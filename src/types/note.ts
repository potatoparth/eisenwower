import { TaskAttachment } from "@/types/task";

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  projectId?: string;
  color?: string;
  pinned: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  attachments?: TaskAttachment[];
}

/** Google-Keep-ish palette. First value is "default" (no tint). */
export const NOTE_COLORS: { id: string; light: string; dark: string; label: string }[] = [
  { id: "default", light: "hsl(var(--card))", dark: "hsl(var(--card))", label: "Default" },
  { id: "red",     light: "#fecaca", dark: "#5b2222", label: "Coral" },
  { id: "orange",  light: "#fed7aa", dark: "#5a3312", label: "Peach" },
  { id: "yellow",  light: "#fef3c7", dark: "#544418", label: "Sand" },
  { id: "green",   light: "#bbf7d0", dark: "#1e4934", label: "Sage" },
  { id: "teal",    light: "#a5f3fc", dark: "#134e4a", label: "Mist" },
  { id: "blue",    light: "#bfdbfe", dark: "#1e3a5f", label: "Fog" },
  { id: "purple",  light: "#ddd6fe", dark: "#3b2a5c", label: "Dusk" },
  { id: "pink",    light: "#fbcfe8", dark: "#5b1e3d", label: "Rose" },
  { id: "gray",    light: "#e5e7eb", dark: "#2b2f36", label: "Stone" },
];

export function noteColorFor(id: string | undefined, mode: "light" | "dark"): string {
  const c = NOTE_COLORS.find((x) => x.id === (id || "default")) ?? NOTE_COLORS[0];
  return mode === "dark" ? c.dark : c.light;
}