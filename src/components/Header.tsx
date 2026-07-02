import { motion } from "framer-motion";
import { Moon, Sun, Settings, LogOut, LayoutGrid, List, Columns3, GanttChart, FolderKanban, CalendarDays, CheckSquare, StickyNote, Timer } from "lucide-react";
import { ViewMode } from "./ViewToggle";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSelection } from "@/hooks/useSelection";
import { cn } from "@/lib/utils";

interface HeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSettingsClick?: () => void;
  onLogout?: () => void;
  enabledViews?: Partial<Record<ViewMode, boolean>>;
  username?: string;
}

const VIEW_OPTIONS: { id: ViewMode; label: string; icon: React.ElementType }[] = [
  { id: "matrix", label: "Matrix", icon: LayoutGrid },
  { id: "list", label: "List", icon: List },
  { id: "kanban", label: "Kanban", icon: Columns3 },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "gantt", label: "Gantt", icon: GanttChart },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "sprint", label: "Sprint", icon: Timer },
];

export function Header({ viewMode, onViewModeChange, onSettingsClick, onLogout, enabledViews, username }: HeaderProps) {
  const { selectMode, toggleSelectMode, count } = useSelection();
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

  const visibleViews = VIEW_OPTIONS.filter(v => enabledViews?.[v.id] !== false);
  const currentView = visibleViews.find(v => v.id === viewMode) ?? visibleViews[0] ?? VIEW_OPTIONS[0];
  const CurrentIcon = currentView.icon;

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-3 py-3 px-4 md:px-6 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="text-lg md:text-xl font-semibold tracking-tight text-foreground select-none"
          style={{ fontFamily: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif', letterSpacing: "-0.02em" }}
        >
          Weizen
        </span>
        {username && (
          <>
            <span className="text-muted-foreground/60 text-lg">|</span>
            <span className="text-sm text-muted-foreground truncate max-w-[180px]">{username}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Select value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
          <SelectTrigger className="h-9 rounded-xl w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {visibleViews.map((v) => {
              const Icon = v.icon;
              return (
                <SelectItem key={v.id} value={v.id}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{v.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className="rounded-xl w-10 h-10 min-w-[40px] min-h-[40px]">
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        <Button
          variant={selectMode ? "default" : "ghost"}
          size="icon"
          onClick={toggleSelectMode}
          className={cn(
            "rounded-xl w-10 h-10 min-w-[40px] min-h-[40px] relative",
          )}
          title={selectMode ? "Exit select mode" : "Select tasks"}
          aria-pressed={selectMode}
        >
          <CheckSquare className="w-4 h-4" />
          {selectMode && count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-[10px] font-semibold text-primary-foreground flex items-center justify-center border border-background">
              {count}
            </span>
          )}
        </Button>
        {onSettingsClick && (
          <Button variant="ghost" size="icon" onClick={onSettingsClick} className="rounded-xl w-10 h-10 min-w-[40px] min-h-[40px]">
            <Settings className="w-4 h-4" />
          </Button>
        )}
        {onLogout && (
          <Button variant="ghost" size="icon" onClick={onLogout} className="rounded-xl w-10 h-10 min-w-[40px] min-h-[40px]" title="Sign Out">
            <LogOut className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.header>
  );
}
