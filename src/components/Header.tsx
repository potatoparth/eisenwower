import { motion } from "framer-motion";
import { LayoutGrid, Moon, Sun, Settings } from "lucide-react";
import { ViewToggle, ViewMode } from "./ViewToggle";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  taskCount: number;
  onSettingsClick?: () => void;
  username?: string;
}

export function Header({ viewMode, onViewModeChange, taskCount, onSettingsClick, username }: HeaderProps) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") ||
        localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between py-3 px-4 md:px-6 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <LayoutGrid className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="font-bold text-base text-foreground leading-tight">Eisenhower</h1>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {taskCount} open{username && <span> · {username}</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ViewToggle value={viewMode} onChange={onViewModeChange} />
        <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className="rounded-xl w-8 h-8">
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        {onSettingsClick && (
          <Button variant="ghost" size="icon" onClick={onSettingsClick} className="rounded-xl w-8 h-8">
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.header>
  );
}
