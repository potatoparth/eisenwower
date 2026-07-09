import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, ChevronDown } from "lucide-react";
import { Task, Quadrant, TaskStatus, QuadrantInfo } from "@/types/task";
import { ProjectTemplate } from "@/types/project";
import type { TaskAddOptions, TaskInputPickerProps } from "@/components/TaskInput";
import { TaskCard } from "./TaskCard";
import { TaskActionBar } from "./TaskActionBar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ListViewProps {
  tasks: Task[];
  categories: string[];
  onToggleStatus: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (name: string, quadrant: Quadrant, options?: TaskAddOptions) => void;
  projects: ProjectTemplate[];
  defaultProjectId?: string;
  defaultCategory?: string;
  onCreateCategory?: TaskInputPickerProps["onCreateCategory"];
  onCreateProject?: TaskInputPickerProps["onCreateProject"];
  recentCategories?: TaskInputPickerProps["recentCategories"];
  recentProjectIds?: TaskInputPickerProps["recentProjectIds"];
  onTaskClick?: (task: Task) => void;
  getCategoryColor?: (name: string) => string | undefined;
  deadlineThresholdDays?: number;
  quadrants: QuadrantInfo[];
  quadrantMap: Record<Quadrant, QuadrantInfo>;
  allTasks: Task[];
  onSelectTask: (task: Task) => void;
  onArchiveAllDone: () => void;
  onRescheduleTasks?: (ids: string[], newDueDate: string) => void;
  archivedTasks?: Task[];
  onUnarchiveTask?: (id: string) => void;
  onDeleteArchivedTask?: (id: string) => void;
}

export function ListView({
  tasks,
  categories,
  onToggleStatus,
  onDeleteTask,
  onAddTask,
  onTaskClick,
  getCategoryColor,
  deadlineThresholdDays = 2,
  quadrants,
  quadrantMap,
  projects,
  defaultProjectId,
  defaultCategory,
  onCreateCategory,
  onCreateProject,
  recentCategories,
  recentProjectIds,
  allTasks,
  onSelectTask,
  onArchiveAllDone,
  onRescheduleTasks,
  archivedTasks,
  onUnarchiveTask,
  onDeleteArchivedTask,
}: ListViewProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      return true;
    });
  }, [tasks, statusFilter]);

  const groupedTasks = useMemo(() => {
    const groups: Record<Quadrant, Task[]> = {
      "important-urgent": [],
      "important-not-urgent": [],
      "not-important-urgent": [],
      "not-important-not-urgent": [],
    };
    filteredTasks.forEach((task) => { groups[task.quadrant].push(task); });
    return groups;
  }, [filteredTasks]);

  const activeFilters = [
    statusFilter !== "all" ? (statusFilter === "open" ? "Open" : "Done") : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 max-w-2xl mx-auto w-full">
        <TaskActionBar
          tasks={allTasks}
          onSelectTask={onSelectTask}
          onArchiveAllDone={onArchiveAllDone}
          onRescheduleTasks={onRescheduleTasks}
          archivedTasks={archivedTasks}
          onUnarchiveTask={onUnarchiveTask}
          onDeleteArchivedTask={onDeleteArchivedTask}
          onAddTask={onAddTask}
          quadrants={quadrants}
          categories={categories}
          projects={projects}
          defaultProjectId={defaultProjectId}
          defaultCategory={defaultCategory}
          onCreateCategory={onCreateCategory}
          onCreateProject={onCreateProject}
          recentCategories={recentCategories}
          recentProjectIds={recentProjectIds}
        />
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-xl gap-2">Status<ChevronDown className="w-3 h-3" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
              <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="open">Open</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="done">Done</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 ml-2">
            {activeFilters.map((filter) => (
              <span key={filter} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">{filter}</span>
            ))}
            <button onClick={() => { setStatusFilter("all"); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clear</button>
          </div>
        )}
        <span className="text-sm text-muted-foreground ml-auto">{filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8">
        {Object.entries(groupedTasks).map(([quadrantId, quadrantTasks]) => {
          if (quadrantTasks.length === 0) return null;
          const info = quadrantMap[quadrantId as Quadrant];
          return (
            <motion.div key={quadrantId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <span className={cn("w-2 h-2 rounded-full", info.color === 1 && "bg-quadrant-1", info.color === 2 && "bg-quadrant-2", info.color === 3 && "bg-quadrant-3", info.color === 4 && "bg-quadrant-4")} />
                <h3 className="font-medium text-sm">{info.title}</h3>
                {info.subtitle && (
                  <span className="text-xs text-muted-foreground">{info.subtitle}</span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">{quadrantTasks.length}</span>
              </div>
              <div className="space-y-1">
                {quadrantTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleStatus={onToggleStatus}
                    onDelete={onDeleteTask}
                    onTaskClick={onTaskClick}
                    showQuadrantBadge={false}
                    getCategoryColor={getCategoryColor}
                    deadlineThresholdDays={deadlineThresholdDays}
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
        {filteredTasks.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Filter className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No tasks found</p>
            <p className="text-sm text-muted-foreground/60 mt-1">{tasks.length === 0 ? "Add your first task above" : "Try adjusting your filters"}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
