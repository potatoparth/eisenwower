import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Tag, ChevronRight, FolderKanban, AlignLeft } from "lucide-react";
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
  leadingElement?: React.ReactNode;
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
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (
        target.closest("[data-radix-popper-content-wrapper]") ||
        target.closest("[cmdk-root]")
      ) {
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

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
          step === "name"
            ? compact
              ? "rounded-full w-full"
              : "rounded-full mx-auto w-full max-w-2xl"
            : "rounded-2xl bg-card w-full mx-auto max-w-2xl"
        )}
      >
        {/* Name Input */}
        <div
          className={cn(
            "flex items-center",
            step === "name"
              ? compact
                ? "h-10 px-3 py-0"
                : "h-12 px-5 py-0"
              : compact
              ? "p-2"
              : "p-3"
          )}
        >
          {step === "name" && leadingElement && (
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
              step === "name" && (compact ? "pr-9" : "pr-10"),
              compact ? "text-sm" : "text-base"
            )}
          />
          {step === "name" && (
            <Button
              size="sm"
              onClick={handleNameSubmit}
              aria-disabled={!name.trim()}
              tabIndex={name.trim() ? 0 : -1}
              className={cn(
                "absolute top-1/2 h-7 w-7 -translate-y-1/2 flex-shrink-0 rounded-full p-0 transition-opacity",
                compact ? "right-3" : "right-5",
                !name.trim() && "pointer-events-none opacity-0"
              )}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Quadrant Selection */}
        <AnimatePresence>
          {step === "quadrant" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Details */}
        <AnimatePresence>
          {step === "details" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">Details</span>
                  <span className="text-[10px] opacity-60">optional</span>
                </div>
                <div className="space-y-2">
                  {/* Description (collapsed by default) */}
                  {descOpen ? (
                    <Input
                      autoFocus
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Description (optional)"
                      className="border-0 bg-secondary/50 h-8 text-sm rounded-lg focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDescOpen(true)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <AlignLeft className="w-3 h-3" /> Add description
                    </button>
                  )}
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
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="flex-1 h-8 text-xs bg-secondary/50 border-0 rounded-lg">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
