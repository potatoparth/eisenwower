import { motion } from "framer-motion";
import { Moon, Sun, Settings, LogOut, Search, Trash2, LayoutGrid, List, Columns3, GanttChart, FolderKanban } from "lucide-react";
import { ViewMode } from "./ViewToggle";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Task } from "@/types/task";

interface HeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSettingsClick?: () => void;
  onLogout?: () => void;
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onDeleteAllDone: () => void;
}

const VIEW_OPTIONS: { id: ViewMode; label: string; icon: React.ElementType }[] = [
  { id: "matrix", label: "Matrix", icon: LayoutGrid },
  { id: "list", label: "List", icon: List },
  { id: "kanban", label: "Kanban", icon: Columns3 },
  { id: "gantt", label: "Gantt", icon: GanttChart },
  { id: "projects", label: "Projects", icon: FolderKanban },
];

export function Header({ viewMode, onViewModeChange, onSettingsClick, onLogout, tasks, onSelectTask, onDeleteAllDone }: HeaderProps) {
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

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tasks
      .filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [tasks, query]);

  const doneCount = tasks.filter(t => t.status === "done").length;
  const currentView = VIEW_OPTIONS.find(v => v.id === viewMode) ?? VIEW_OPTIONS[0];
  const CurrentIcon = currentView.icon;

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 py-3 px-4 md:px-6 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40"
    >
      <div className="flex-1 max-w-xl">
        <Popover open={open && matches.length > 0} onOpenChange={setOpen}>
          <PopoverAnchor asChild>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder="Search tasks..."
                className="pl-9 h-9 rounded-full bg-secondary/60 border-border/60 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
              />
            </div>
          </PopoverAnchor>
          <PopoverContent
            align="start"
            className="p-1 w-[min(32rem,90vw)] max-h-80 overflow-y-auto"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {matches.map((t) => (
              <button
                key={t.id}
                onClick={() => { onSelectTask(t); setOpen(false); setQuery(""); }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-accent flex flex-col gap-0.5"
              >
                <span className="text-sm font-medium truncate">{t.name}</span>
                {t.description && (
                  <span className="text-xs text-muted-foreground truncate">{t.description}</span>
                )}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-1">
        <Select value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
          <SelectTrigger className="h-9 rounded-xl w-[140px]">
            <div className="flex items-center gap-2">
              <CurrentIcon className="w-4 h-4" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent align="end">
            {VIEW_OPTIONS.map((v) => {
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

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl w-10 h-10 min-w-[40px] min-h-[40px]"
              title="Delete all completed tasks"
              disabled={doneCount === 0}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete all completed tasks?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove {doneCount} completed {doneCount === 1 ? "task" : "tasks"}. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDeleteAllDone}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className="rounded-xl w-10 h-10 min-w-[40px] min-h-[40px]">
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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
