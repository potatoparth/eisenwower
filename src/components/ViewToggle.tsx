import { motion } from "framer-motion";
import { LayoutGrid, List, Columns3, GanttChart, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "matrix" | "list" | "kanban" | "gantt" | "projects";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

const views: { id: ViewMode; label: string; icon: React.ElementType }[] = [
  { id: "matrix", label: "Matrix", icon: LayoutGrid },
  { id: "list", label: "List", icon: List },
  { id: "kanban", label: "Kanban", icon: Columns3 },
  { id: "gantt", label: "Gantt", icon: GanttChart },
  { id: "projects", label: "Projects", icon: FolderKanban },
];

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-secondary">
      {views.map((view) => {
        const Icon = view.icon;
        return (
          <button
            key={view.id}
            onClick={() => onChange(view.id)}
            className={cn(
              "relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 flex items-center gap-1.5",
              value === view.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {value === view.id && (
              <motion.div
                layoutId="viewToggle"
                className="absolute inset-0 bg-card rounded-lg shadow-sm"
                transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
              />
            )}
            <Icon className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10 hidden sm:inline">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}
