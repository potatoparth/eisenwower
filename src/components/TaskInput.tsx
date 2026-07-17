import { useState, useRef, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { Calendar, CornerDownLeft, FolderKanban, UserCircle2, Zap } from "lucide-react";
import { Quadrant, QUADRANTS, QuadrantInfo, Recurrence } from "@/types/task";
import { ProjectTemplate } from "@/types/project";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProjectTreePicker } from "@/components/ProjectTreePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from "@/components/DateTimePicker";
import { RecurrenceField } from "@/components/RecurrenceField";
import { TaskDescription } from "@/components/TaskDescription";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { cn } from "@/lib/utils";
import { RecentChipStrip as ChipStrip } from "@/components/RecentChipStrip";
import { useProjectAssignees } from "@/hooks/useProjectAssignees";
import { TaskAttachments } from "@/components/TaskAttachments";
import { TaskAttachment } from "@/types/task";

export interface TaskAddOptions {
  description?: string;
  category?: string;
  dueDate?: string;
  projectId?: string;
  recurrence?: Recurrence;
  recurrenceDays?: number[];
  recurrenceTime?: string;
  assignedTo?: string;
  attachments?: TaskAttachment[];
}

export type TaskInputPickerProps = Pick<
  TaskInputProps,
  | "categories"
  | "projects"
  | "defaultProjectId"
  | "defaultCategory"
  | "onCreateCategory"
  | "onCreateProject"
  | "recentCategories"
  | "recentProjectIds"
>;

interface TaskInputProps {
  onAddTask: (name: string, quadrant: Quadrant, options?: TaskAddOptions) => void;
  defaultQuadrant?: Quadrant;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  leadingElement?: ReactNode;
  trailingElement?: ReactNode;
  quadrants?: QuadrantInfo[];
  categories?: string[];
  projects?: ProjectTemplate[];
  defaultProjectId?: string;
  defaultCategory?: string;
  onCreateCategory?: (name: string) => string;
  onCreateProject?: (name: string, parentId?: string | null) => string;
  /** Category names ordered most-recent first; rendered as a scrollable chip strip. */
  recentCategories?: string[];
  /** Project ids ordered most-recent first; rendered as a scrollable chip strip. */
  recentProjectIds?: string[];
  /** Prefill the deadline (yyyy-mm-dd) when the details step opens. */
  defaultDueDate?: string;
}

type InputStep = "name" | "quadrant" | "details";

const NO_PROJECT = "__none__";

export function TaskInput({
  onAddTask,
  defaultQuadrant,
  placeholder = "Add a new task...",
  className,
  compact = false,
  leadingElement,
  trailingElement,
  quadrants = QUADRANTS,
  categories = [],
  projects = [],
  defaultProjectId,
  defaultCategory,
  onCreateCategory,
  onCreateProject,
  recentCategories = [],
  recentProjectIds = [],
  defaultDueDate,
}: TaskInputProps) {
  const [step, setStep] = useState<InputStep>("name");
  const [name, setName] = useState("");
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant | null>(
    defaultQuadrant || null
  );
  const [projectId, setProjectId] = useState<string>("");
  const [dueDate, setDueDate] = useState(defaultDueDate ?? "");
  const [description, setDescription] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [assignedTo, setAssignedTo] = useState("");
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  // Stable id used as the storage folder for attachments uploaded before the
  // task row exists. Regenerated after each successful add so a new task gets
  // its own folder.
  const [draftTaskId, setDraftTaskId] = useState<string>(() => crypto.randomUUID());

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedProjectForAssignees = projectId && projectId !== NO_PROJECT ? projectId : null;
  const assignees = useProjectAssignees(selectedProjectForAssignees);

  useEffect(() => {
    if (!selectedProjectForAssignees) {
      setAssignedTo("");
      return;
    }
    if (assignedTo && assignees.length > 0 && !assignees.some((a) => a.userId === assignedTo)) {
      setAssignedTo("");
    }
  }, [selectedProjectForAssignees, assignedTo, assignees]);

  const canComplete =
    Boolean(name.trim()) && Boolean(selectedQuadrant || defaultQuadrant);

  const reset = () => {
    setStep("name");
    setName("");
    setSelectedQuadrant(defaultQuadrant || null);
    setProjectId("");
    setDueDate("");
    setDescription("");
    setIsFocused(false);
    setDescOpen(false);
    setRecurrence("none");
    setRecurrenceDays([]);
    setAssignedTo("");
    setAttachments([]);
    setDraftTaskId(crypto.randomUUID());
  };

  const beginDetails = () => {
    setProjectId(
      defaultProjectId && projects.some((p) => p.id === defaultProjectId)
        ? defaultProjectId
        : NO_PROJECT
    );
    if (defaultDueDate && !dueDate) setDueDate(defaultDueDate);
    setStep("details");
  };

  const handleNameSubmit = () => {
    if (!name.trim()) return;

    if (defaultQuadrant) {
      beginDetails();
    } else {
      setStep("quadrant");
    }
  };

  const handleQuadrantSelect = (quadrant: Quadrant) => {
    setSelectedQuadrant(quadrant);
    beginDetails();
  };

  const handleComplete = useCallback(() => {
    const q = selectedQuadrant || defaultQuadrant;
    if (!name.trim() || !q) return;

    // If recurrence set and no deadline, default to today.
    let finalDueDate = dueDate;
    if (recurrence !== "none" && !finalDueDate) {
      const d = new Date();
      finalDueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    onAddTask(name, q, {
      description: description || undefined,
      dueDate: finalDueDate || undefined,
      projectId:
        !projectId || projectId === NO_PROJECT ? undefined : projectId,
      recurrence,
      recurrenceDays,
      assignedTo: assignedTo || undefined,
      attachments: attachments.length ? attachments : undefined,
    });
    setStep("name");
    setName("");
    setSelectedQuadrant(defaultQuadrant || null);
    setProjectId("");
    setDueDate("");
    setDescription("");
    setIsFocused(false);
    setRecurrence("none");
    setRecurrenceDays([]);
    setAssignedTo("");
    setAttachments([]);
    setDraftTaskId(crypto.randomUUID());
    inputRef.current?.focus();
  }, [name, selectedQuadrant, defaultQuadrant, projectId, description, dueDate, onAddTask, recurrence, recurrenceDays, assignedTo, attachments]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (step === "name") {
        handleNameSubmit();
      } else if (step === "details" && canComplete) {
        handleComplete();
      }
    } else if (e.key === "Escape") {
      reset();
      inputRef.current?.blur();
    }
  };

  useEffect(() => {
    const hasOpenFloatingLayer = () =>
      Boolean(
        document.querySelector("[data-radix-popper-content-wrapper]") ||
          document.querySelector("[data-radix-select-content][data-state='open']") ||
          document.querySelector("[data-radix-popover-content][data-state='open']") ||
          document.querySelector("[role='listbox'][data-state='open']") ||
          document.querySelector("[cmdk-root]")
      );

    const handleClickOutside = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;

      if (
        target.closest("[data-radix-popper-content-wrapper]") ||
        target.closest("[data-radix-select-content]") ||
        target.closest("[data-radix-popover-content]") ||
        target.closest("[role='listbox']") ||
        target.closest("[cmdk-root]") ||
        target.closest("[role='dialog']") ||
        target.closest("[data-radix-dialog-content]") ||
        target.closest("[data-radix-dialog-overlay]")
      ) {
        return;
      }

      // Run in capture phase before Radix closes portaled menus. If a picker is
      // open, the first outside click should only dismiss it, not save the task.
      if (hasOpenFloatingLayer()) {
        return;
      }

      if (containerRef.current && !containerRef.current.contains(target)) {
        if (step === "details" && canComplete) {
          handleComplete();
        } else if (step !== "name") {
          reset();
        }
      }
    };

    document.addEventListener("pointerdown", handleClickOutside, true);
    return () => document.removeEventListener("pointerdown", handleClickOutside, true);
  }, [step, canComplete, handleComplete]);

  const getQuadrantButtonClass = (q: QuadrantInfo) => {
    const baseClass = "flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 border";
    const colorClasses = {
      1: "border-quadrant-1-border bg-quadrant-1-light text-quadrant-1-foreground hover:bg-quadrant-1 hover:text-primary-foreground",
      2: "border-quadrant-2-border bg-quadrant-2-light text-quadrant-2-foreground hover:bg-quadrant-2 hover:text-primary-foreground",
      3: "border-quadrant-3-border bg-quadrant-3-light text-quadrant-3-foreground hover:bg-quadrant-3 hover:text-primary-foreground",
      4: "border-quadrant-4-border bg-quadrant-4-light text-quadrant-4-foreground hover:bg-quadrant-4 hover:text-primary-foreground",
    };
    return cn(baseClass, colorClasses[q.color]);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "transition-colors duration-200 border bg-secondary/40 border-border/60",
          compact
            ? "rounded-full w-full"
            : "rounded-full mx-auto w-full max-w-2xl"
        )}
      >
        {/* Name Input */}
        <div
          className={cn(
            "flex items-center",
            compact ? "h-10 px-3 py-0" : "h-12 px-5 py-0"
          )}
        >
          {leadingElement && (
            <div className={cn("flex h-full flex-shrink-0 items-center", compact ? "mr-1 -ml-1" : "mr-2 -ml-2")}>
              {leadingElement}
            </div>
          )}
          <Input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            placeholder={placeholder}
            className={cn(
              "min-w-0 flex-1 border-0 bg-transparent shadow-none p-0 h-full placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none",
              // When the Enter chip is visible (name has content), reserve
              // wide padding for it; when hidden, only reserve room for the
              // trailing icon so the placeholder isn't truncated on mobile.
              name.trim()
                ? (trailingElement
                    ? (compact ? "pr-16" : "pr-20")
                    : (compact ? "pr-9" : "pr-10"))
                : (trailingElement
                    ? (compact ? "pr-9" : "pr-10")
                    : "pr-1"),
              compact ? "text-sm" : "text-base"
            )}
          />
          <button
            type="button"
            onClick={handleNameSubmit}
            aria-label="Press Enter to continue"
            aria-disabled={!name.trim()}
            tabIndex={name.trim() ? 0 : -1}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 flex-shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded-md border border-border/70 bg-secondary/70 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:border-border transition-opacity",
              trailingElement
                ? (compact ? "right-11" : "right-14")
                : (compact ? "right-3" : "right-5"),
              !name.trim() && "pointer-events-none opacity-0"
            )}
          >
            <CornerDownLeft className="w-3 h-3" />
            <span className="tracking-wide">Enter</span>
          </button>
          {trailingElement && (
            <div className={cn("flex h-full flex-shrink-0 items-center", compact ? "ml-1 -mr-1" : "ml-2 -mr-2")}>
              {trailingElement}
            </div>
          )}
        </div>
      </div>

      {/* Quadrant + Details rendered in a portalled Dialog so surrounding
          layout (e.g. matrix quadrants) does not shift when the panel opens. */}
      <Dialog
        open={step === "quadrant" || step === "details"}
        onOpenChange={(o) => {
          // Closing the dialog (X button, overlay click, Esc) should always
          // cancel — never silently save. Use the explicit "Add task" button.
          if (!o) reset();
        }}
      >
        <DialogContent className="p-0 gap-0 border border-border/60 bg-card rounded-2xl w-[calc(100vw-1.5rem)] max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <VisuallyHidden>
            <DialogTitle>New task</DialogTitle>
          </VisuallyHidden>
          {/* Task name preview + Quick add shortcut */}
          <div className="flex items-start gap-2 px-4 pt-4 pb-2 pr-14 flex-shrink-0 border-b border-border/40">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">
                New task
              </p>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Task name"
                className="h-8 border-0 bg-transparent shadow-none p-0 text-sm font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && step === "details" && canComplete) {
                    e.preventDefault();
                    handleComplete();
                  }
                }}
              />
            </div>
            {step === "details" && (
              <Button
                size="sm"
                onClick={handleComplete}
                disabled={!canComplete}
                className="h-8 rounded-full text-xs gap-1.5 flex-shrink-0 px-3"
                title="Add task now with current details (⏎)"
              >
                <Zap className="w-3.5 h-3.5" /> Add task
              </Button>
            )}
          </div>

          {step === "quadrant" && (
            <div className="px-3 py-3 space-y-2 overflow-y-auto">
                <p className="text-xs text-muted-foreground font-medium">
                  Select quadrant
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {quadrants.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => handleQuadrantSelect(q.id)}
                      className={getQuadrantButtonClass(q)}
                    >
                      <span className="block font-semibold text-xs">{q.title}</span>
                      {q.subtitle && (
                        <span className="block text-[10px] opacity-75">{q.subtitle}</span>
                      )}
                    </button>
                  ))}
                </div>
            </div>
          )}

          {step === "details" && (
            <>
              <div className="px-3 py-3 space-y-2 overflow-y-auto flex-1 min-h-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">Details</span>
                  <span className="text-[10px] opacity-60">optional</span>
                </div>
                <div className="space-y-2">
                  {/* Description (collapsed by default) */}
                  <TaskDescription
                    value={description}
                    onChange={setDescription}
                    placeholder="Description (optional)"
                  />
                  {/* Attachments */}
                  <TaskAttachments
                    taskId={draftTaskId}
                    value={attachments}
                    onChange={setAttachments}
                  />
                  {/* Deadline */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <DateTimePicker
                        value={dueDate || undefined}
                        onChange={(v) => setDueDate(v ?? "")}
                        accentColor={
                          selectedQuadrant
                            ? `hsl(var(--quadrant-${
                                quadrants.find((q) => q.id === selectedQuadrant)?.color ?? 1
                              }))`
                            : undefined
                        }
                      />
                    </div>
                  </div>
                  <RecurrenceField
                    recurrence={recurrence}
                    recurrenceDays={recurrenceDays}
                    onChange={({ recurrence: r, recurrenceDays: d }) => {
                      setRecurrence(r);
                      setRecurrenceDays(d);
                    }}
                    compact
                  />
                  <div className="flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <ProjectTreePicker
                      projects={projects}
                      value={projectId && projectId !== NO_PROJECT ? projectId : null}
                      onChange={(id) => {
                        setProjectId(id ?? NO_PROJECT);
                        setAssignedTo("");
                      }}
                      onCreate={onCreateProject}
                      placeholder="No project"
                      compact
                      showIcon={false}
                      className="flex-1 min-w-0"
                    />
                  </div>
                  {recentProjectIds.length > 0 && (
                    <div className="relative -mx-1">
                      <ChipStrip
                        items={recentProjectIds
                          .map((id) => {
                            const p = projects.find((x) => x.id === id);
                            return p ? { value: p.id, label: p.name } : null;
                          })
                          .filter((x): x is { value: string; label: string } => !!x)}
                        value={projectId}
                        onSelect={(id) => {
                          setProjectId(id);
                          setAssignedTo("");
                        }}
                        ariaLabel="Recent projects"
                      />
                      {/* Fade edge so users see the row is horizontally scrollable */}
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent" />
                    </div>
                  )}
                  {selectedProjectForAssignees && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <UserCircle2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <Select value={assignedTo || "__default__"} onValueChange={(v) => setAssignedTo(v === "__default__" ? "" : v)}>
                        <SelectTrigger className="h-9 flex-1 min-w-0 rounded-xl bg-secondary/40 border-border/60 text-xs">
                          <SelectValue placeholder="Assign" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__default__">Assign to creator</SelectItem>
                          {assignees.map((a) => (
                            <SelectItem key={a.userId} value={a.userId}>
                              {a.displayName}{a.role === "owner" ? " (owner)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-1.5 px-3 py-2.5 border-t border-border/40 bg-card flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="rounded-lg h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleComplete}
                  disabled={!canComplete}
                  className="rounded-lg h-8 text-xs gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" /> Add task
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
