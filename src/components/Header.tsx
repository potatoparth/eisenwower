import { motion } from "framer-motion";
import { LayoutGrid, Moon, Sun, Settings, LogOut, FolderKanban } from "lucide-react";
import { ViewToggle, ViewMode } from "./ViewToggle";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectTemplate } from "@/types/project";

interface HeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  taskCount: number;
  onSettingsClick?: () => void;
  onLogout?: () => void;
  username?: string;
  projects?: ProjectTemplate[];
  activeProjectId?: string | null;
  onActiveProjectChange?: (id: string | null) => void;
}

export function Header({ viewMode, onViewModeChange, taskCount, onSettingsClick, onLogout, username, projects, activeProjectId, onActiveProjectChange }: HeaderProps) {
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
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <LayoutGrid className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1
            className="font-semibold text-[15px] text-foreground leading-tight"
            style={{ letterSpacing: "-0.03em" }}
          >
            Eisenhower
          </h1>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {taskCount} open{username && <span> · {username}</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {projects !== undefined && onActiveProjectChange && (
          <Select
            value={activeProjectId ?? "__all__"}
            onValueChange={(v) => onActiveProjectChange(v === "__all__" ? null : v)}
          >
            <SelectTrigger className="h-8 w-[160px] rounded-xl text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <FolderKanban className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <SelectValue placeholder="All projects" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All projects</SelectItem>
              <SelectItem value="__none__">No project</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <ViewToggle value={viewMode} onChange={onViewModeChange} />
        <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className="rounded-xl w-8 h-8">
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        {onSettingsClick && (
          <Button variant="ghost" size="icon" onClick={onSettingsClick} className="rounded-xl w-8 h-8">
            <Settings className="w-4 h-4" />
          </Button>
        )}
        {onLogout && (
          <Button variant="ghost" size="icon" onClick={onLogout} className="rounded-xl w-8 h-8" title="Sign Out">
            <LogOut className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.header>
  );
}
