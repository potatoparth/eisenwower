import { motion } from "framer-motion";
import { Crosshair } from "lucide-react";
import { ViewToggle, ViewMode } from "./ViewToggle";

interface HeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  taskCount: number;
}

export function Header({ viewMode, onViewModeChange, taskCount }: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between py-4 px-6 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-quadrant-2 flex items-center justify-center">
          <Crosshair className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-lg text-foreground tracking-tight">
            Focus
          </h1>
          <p className="text-xs text-muted-foreground">
            {taskCount} task{taskCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <ViewToggle value={viewMode} onChange={onViewModeChange} />
    </motion.header>
  );
}
