import { motion } from "framer-motion";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "matrix" | "list";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-secondary">
      <button
        onClick={() => onChange("matrix")}
        className={cn(
          "relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2",
          value === "matrix"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {value === "matrix" && (
          <motion.div
            layoutId="viewToggle"
            className="absolute inset-0 bg-card rounded-lg shadow-sm"
            transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
          />
        )}
        <LayoutGrid className="w-4 h-4 relative z-10" />
        <span className="relative z-10">Matrix</span>
      </button>
      <button
        onClick={() => onChange("list")}
        className={cn(
          "relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2",
          value === "list"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {value === "list" && (
          <motion.div
            layoutId="viewToggle"
            className="absolute inset-0 bg-card rounded-lg shadow-sm"
            transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
          />
        )}
        <List className="w-4 h-4 relative z-10" />
        <span className="relative z-10">List</span>
      </button>
    </div>
  );
}
