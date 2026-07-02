import { useState, useRef, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { Calendar, Tag, CornerDownLeft, FolderKanban, Zap } from "lucide-react";
import { Quadrant, QUADRANTS, QuadrantInfo, Recurrence } from "@/types/task";
import { ProjectTemplate } from "@/types/project";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SelectorWithCreate } from "@/components/SelectorWithCreate";
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

export interface TaskAddOptions {
  description?: string;
  category?: string;
  dueDate?: string;
  projectId?: string;
  recurrence?: Recurrence;
  recurrenceDays?: number[];
  recurrenceTime?: string;
}

export type TaskInputPickerProps = Pick<
  TaskInputProps,
  "categories" | "projects" | "defaultProjectId" | "defaultCategory" | "onCreateCategory" | "onCreateProject"
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
  onCreateProject?: (name: string) => string;
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
}: TaskInputProps) {
  const [step, setStep] = useState<InputStep>("name");
  const [name, setName] = useState("");
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant | null>(
    defaultQuadrant || null
  );
  const [category, setCategory] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const categoryOptions = useMemo(() => {
    const names = new Set(categories);
    names.add("General");
    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((c) => ({ value: c, label: c }));
  }, [categories]);

  const projectOptions = useMemo(
    () => [
      { value: NO_PROJECT, label: "No project" },
      ...projects.map((p) => ({ value: p.id, label: p.name })),
    ],
    [projects]
  );

  const canComplete =
    Boolean(name.trim()) && Boolean(selectedQuadrant || defaultQuadrant);

  const reset = () => {
    setStep("name");
    setName("");
    setSelectedQuadrant(defaultQuadrant || null);
    setCategory("");
    setProjectId("");
    setDueDate("");
    setDescription("");
    setIsFocused(false);
    setDescOpen(false);
    setRecurrence("none");
    setRecurrenceDays([]);
  };

  const beginDetails = () => {
    setProjectId(
      defaultProjectId && projects.some((p) => p.id === defaultProjectId)
        ? defaultProjectId
        : NO_PROJECT
    );
    setCategory(defaultCategory || "General");
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
      category: category || defaultCategory || "General",
      dueDate: finalDueDate || undefined,
      projectId:
        !projectId || projectId === NO_PROJECT ? undefined : projectId,
      recurrence,
      recurrenceDays,
    });
    setStep("name");
    setName("");
    setSelectedQuadrant(defaultQuadrant || null);
    setCategory("");
    setProjectId("");
    setDueDate("");
    setDescription("");
    setIsFocused(false);
    setRecurrence("none");
    setRecurrenceDays([]);
    inputRef.current?.focus();
  }, [name, selectedQuadrant, defaultQuadrant, category, projectId, description, dueDate, defaultCategory, onAddTask, recurrence, recurrenceDays]);

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
          if (!o) {
            if (step === "details" && canComplete) handleComplete();
            else reset();
          }
        }}
      >
        <DialogContent className="p-0 gap-0 border border-border/60 bg-card rounded-2xl max-w-lg overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>New task</DialogTitle>
          </VisuallyHidden>
          {/* Task name preview + Quick add shortcut */}
          <div className="flex items-start gap-2 px-4 pt-4 pb-2 pr-14">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">
                New task
              </p>
              <p className="text-sm font-medium truncate">{name || "Untitled"}</p>
            </div>
            {step === "details" && (
              <Button
                size="sm"
                onClick={handleComplete}
                disabled={!canComplete}
                className="h-7 rounded-full text-xs gap-1 flex-shrink-0"
                title="Add task now with current details (⏎)"
              >
                <Zap className="w-3 h-3" /> Quick add
              </Button>
            )}
          </div>

          {step === "quadrant" && (
            <div className="px-3 pb-3 space-y-2">
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
            <div className="px-3 pb-3 space-y-2">
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
                  {/* Deadline */}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
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
                  <SelectorWithCreate
                    icon={<Tag className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                    options={categoryOptions}
                    value={category}
                    onChange={setCategory}
                    onCreate={onCreateCategory}
                    placeholder="Select category"
                    searchPlaceholder="Search categories…"
                    createPlaceholder="New category name…"
                    compact
                  />
                  <SelectorWithCreate
                    icon={<FolderKanban className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                    options={projectOptions}
                    value={projectId}
                    onChange={setProjectId}
                    onCreate={onCreateProject}
                    placeholder="Select project"
                    searchPlaceholder="Search projects…"
                    createPlaceholder="New project name…"
                    compact
                  />
                </div>
                <div className="flex justify-end gap-1.5 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={reset}
                    className="rounded-lg h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleComplete}
                    disabled={!canComplete}
                    className="rounded-lg h-7 text-xs"
                  >
                    Add
                  </Button>
                </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
