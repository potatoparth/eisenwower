import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Maximize2, ChevronDown, ChevronUp } from "lucide-react";
import { Task, Quadrant, QuadrantInfo } from "@/types/task";
import { ProjectTemplate } from "@/types/project";
import type { TaskAddOptions, TaskInputPickerProps } from "@/components/TaskInput";
import { TaskCard } from "./TaskCard";
import { TaskInput } from "./TaskInput";
import { cn } from "@/lib/utils";
import { SelectionToolbar } from "@/components/SelectionToolbar";

interface QuadrantColumnProps {
  quadrant: QuadrantInfo;
  tasks: Task[];
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
  onAddTask: (name: string, quadrant: Quadrant, options?: TaskAddOptions) => void;
  categories: string[];
  projects: ProjectTemplate[];
  defaultProjectId?: string;
  defaultCategory?: string;
  onCreateCategory?: TaskInputPickerProps["onCreateCategory"];
  onCreateProject?: TaskInputPickerProps["onCreateProject"];
  recentCategories?: TaskInputPickerProps["recentCategories"];
  recentProjectIds?: TaskInputPickerProps["recentProjectIds"];
  onExpand?: () => void;
  onTaskClick?: (task: Task) => void;
  getCategoryColor?: (name: string) => string | undefined;
  deadlineThresholdDays?: number;
}

export function QuadrantColumn({
  quadrant,
  tasks,
  onToggleStatus,
  onDelete,
  onAddTask,
  onExpand,
  onTaskClick,
  getCategoryColor,
  deadlineThresholdDays = 2,
  categories,
  projects,
  defaultProjectId,
  defaultCategory,
  onCreateCategory,
  onCreateProject,
  recentCategories,
  recentProjectIds,
}: QuadrantColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: quadrant.id,
  });
  const [expanded, setExpanded] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const openTasks = tasks.filter((t) => t.status === "open");
  const doneTasks = tasks.filter((t) => t.status === "done");

  const quadClass =
    quadrant.color === 1
      ? "quadrant-1"
      : quadrant.color === 2
      ? "quadrant-2"
      : quadrant.color === 3
      ? "quadrant-3"
      : "quadrant-4";

  const accentVar = `hsl(var(--quadrant-${quadrant.color}))`;
  const accentBadgeBg = `hsl(var(--quadrant-${quadrant.color}) / 0.15)`;

  const addTaskInput = (
    <TaskInput
      onAddTask={onAddTask}
      defaultQuadrant={quadrant.id}
      placeholder={`Add to ${quadrant.title.toLowerCase()}...`}
      compact
      categories={categories}
      projects={projects}
      defaultProjectId={defaultProjectId}
      defaultCategory={defaultCategory}
      onCreateCategory={onCreateCategory}
      onCreateProject={onCreateProject}
      recentCategories={recentCategories}
      recentProjectIds={recentProjectIds}
    />
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex flex-col rounded-xl border transition-all duration-200 overflow-hidden",
        quadClass,
        isOver && "ring-2 ring-primary/30 scale-[1.005]",
        "h-full min-h-[17rem] md:min-h-0"
      )}
      style={{ borderTop: `4px solid ${accentVar}` }}
    >
      {/* Header - click to expand */}
      <div
        className="p-3 sm:p-4 sm:pb-2 flex-shrink-0 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="hidden lg:grid items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)" }}>
          <div className="flex min-w-0 items-center gap-2 justify-self-start">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentVar }} />
            <h3 className="font-semibold text-sm sm:text-base text-foreground tracking-tight truncate">
              {quadrant.title}
            </h3>
            {openTasks.length > 0 && (
              <span
                className="inline-flex items-center justify-center tabular-nums flex-shrink-0"
                style={
                  quadrant.id === "important-urgent" && openTasks.length > 10
                    ? { backgroundColor: "hsl(var(--destructive) / 0.15)", color: "hsl(var(--destructive))", fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "2px 8px" }
                    : { backgroundColor: accentBadgeBg, color: accentVar, fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "2px 8px" }
                }
                aria-label={`${openTasks.length} tasks`}
              >
                {openTasks.length}
              </span>
            )}
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="quadrant-add-pill w-[18rem] xl:w-[22rem] rounded-full justify-self-center bg-card/30"
            style={{
              boxShadow: `inset 0 0 0 1px hsl(var(--quadrant-${quadrant.color}) / 0.28)`,
            }}
          >
            {addTaskInput}
          </div>

          <div className="flex items-center gap-1 justify-self-end">
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/50"
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <span onClick={(e) => e.stopPropagation()} className="inline-flex">
              <SelectionToolbar compact getAllIds={() => tasks.map((t) => t.id)} />
            </span>
            {onExpand && (
              <button
                onClick={(e) => { e.stopPropagation(); onExpand(); }}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all"
                title="Focus mode"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile / tablet header */}
        <div className="flex lg:hidden items-center gap-2">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentVar }} />
            <h3 className="font-semibold text-sm sm:text-base text-foreground tracking-tight truncate">
              {quadrant.title}
            </h3>
            {openTasks.length > 0 && (
              <span
                className="inline-flex items-center justify-center tabular-nums flex-shrink-0"
                style={
                  quadrant.id === "important-urgent" && openTasks.length > 10
                    ? { backgroundColor: "hsl(var(--destructive) / 0.15)", color: "hsl(var(--destructive))", fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "2px 8px" }
                    : { backgroundColor: accentBadgeBg, color: accentVar, fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "2px 8px" }
                }
                aria-label={`${openTasks.length} tasks`}
              >
                {openTasks.length}
              </span>
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/50"
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <span
              onClick={(e) => e.stopPropagation()}
              className="inline-flex"
            >
              <SelectionToolbar compact getAllIds={() => tasks.map((t) => t.id)} />
            </span>
            {onExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all"
              title="Focus mode"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            )}
          </div>
        </div>
      </div>

      {/* Task Input - inline in the header on desktop, below only on smaller screens */}
      <div
        className="px-2 sm:px-3 pb-2 flex-shrink-0 lg:hidden"
      >
        <div
          className="quadrant-add-pill rounded-full bg-card/30"
          style={{
            boxShadow: `inset 0 0 0 1px hsl(var(--quadrant-${quadrant.color}) / 0.28)`,
          }}
        >
          {addTaskInput}
        </div>
      </div>

      {/* Tasks */}
      <div
        className={cn(
          "flex-1 px-2 sm:px-3 pb-3 space-y-1 min-h-0 overflow-y-auto scrollbar-none"
        )}
        onClick={(e) => {
          // Click on empty body area toggles expand
          if (e.target === e.currentTarget) setExpanded((v) => !v);
        }}
      >
        <SortableContext items={openTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {(expanded ? openTasks : openTasks.slice(0, 6)).map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
              onTaskClick={onTaskClick}
              getCategoryColor={getCategoryColor}
              deadlineThresholdDays={deadlineThresholdDays}
            />
          ))}
        </SortableContext>
        {!expanded && openTasks.length > 6 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full text-[11px] text-muted-foreground hover:text-foreground py-1.5"
          >
            +{openTasks.length - 6} more — click to expand
          </button>
        )}

        {doneTasks.length > 0 && (
          <div className="pt-2 mt-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCompleted((v) => !v);
              }}
              className="text-[11px] px-2 py-1 rounded-full bg-secondary text-muted-foreground hover:text-foreground"
            >
              {doneTasks.length} completed {showCompleted ? "▴" : "▾"}
            </button>
            {showCompleted && (
              <div className="mt-1 space-y-1">
                <SortableContext items={doneTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {doneTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleStatus={onToggleStatus}
                      onDelete={onDelete}
                      onTaskClick={onTaskClick}
                      getCategoryColor={getCategoryColor}
                      deadlineThresholdDays={deadlineThresholdDays}
                    />
                  ))}
                </SortableContext>
              </div>
            )}
          </div>
        )}

        {openTasks.length === 0 && doneTasks.length === 0 && (
          <div className="flex items-center justify-center h-16 text-xs text-muted-foreground/60 pointer-events-none">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}
