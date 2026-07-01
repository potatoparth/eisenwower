import { useMemo, useRef, useState, useEffect } from "react";
import { SquarePen, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TaskInput } from "./TaskInput";
import { Quadrant, QuadrantInfo, Task } from "@/types/task";
import { ProjectTemplate } from "@/types/project";
import type { TaskAddOptions, TaskInputPickerProps } from "@/components/TaskInput";

interface Props {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onDeleteAllDone: () => void;
  // TaskInput passthrough
  onAddTask: (name: string, quadrant: Quadrant, options?: TaskAddOptions) => void;
  quadrants: QuadrantInfo[];
  categories: string[];
  projects: ProjectTemplate[];
  defaultProjectId?: string;
  defaultCategory?: string;
  onCreateCategory?: TaskInputPickerProps["onCreateCategory"];
  onCreateProject?: TaskInputPickerProps["onCreateProject"];
}

export function TaskActionBar({
  tasks, onSelectTask, onDeleteAllDone,
  onAddTask, quadrants, categories, projects,
  defaultProjectId, defaultCategory, onCreateCategory, onCreateProject,
}: Props) {
  const [searchMode, setSearchMode] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchMode) inputRef.current?.focus();
  }, [searchMode]);

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

  const exitSearch = () => {
    setSearchMode(false);
    setQuery("");
    setOpen(false);
  };

  const searchToggle = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => (searchMode ? exitSearch() : setSearchMode(true))}
      className="h-8 w-8 rounded-full"
      title={searchMode ? "Close search" : "Search tasks"}
      aria-pressed={searchMode}
    >
      {searchMode ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
    </Button>
  );

  // Decorative "compose" glyph — signals task entry without looking like a button.
  const plusIndicator = (
    <span
      aria-hidden
      className="flex h-8 w-8 items-center justify-center text-muted-foreground/60"
    >
      <SquarePen className="w-4 h-4" strokeWidth={1.75} />
    </span>
  );

  return (
    <div className="grid w-full grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-2">
      <div className="min-w-0">
        {searchMode ? (
          <Popover open={open && matches.length > 0} onOpenChange={setOpen}>
            <PopoverAnchor asChild>
              <div className="relative flex h-[50px] w-full items-center rounded-full border border-border/60 bg-secondary/40 px-5">
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                  onFocus={() => setOpen(true)}
                  onKeyDown={(e) => { if (e.key === "Escape") exitSearch(); }}
                  placeholder="Search tasks..."
                  className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <div className="ml-2 -mr-2 flex h-full flex-shrink-0 items-center">
                  {searchToggle}
                </div>
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
                  onClick={() => { onSelectTask(t); exitSearch(); }}
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
        ) : (
          <TaskInput
            onAddTask={onAddTask}
            placeholder="Add a new task..."
            leadingElement={plusIndicator}
            trailingElement={searchToggle}
            quadrants={quadrants}
            categories={categories}
            projects={projects}
            defaultProjectId={defaultProjectId}
            defaultCategory={defaultCategory}
            onCreateCategory={onCreateCategory}
            onCreateProject={onCreateProject}
          />
        )}
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
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
    </div>
  );
}