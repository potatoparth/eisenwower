import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Calendar, Tag, ChevronRight, FolderKanban, AlignLeft } from "lucide-react";
import { Quadrant, QUADRANTS, QuadrantInfo } from "@/types/task";
import { ProjectTemplate } from "@/types/project";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SelectorWithCreate } from "@/components/SelectorWithCreate";
import { DateTimePicker } from "@/components/DateTimePicker";
import { cn } from "@/lib/utils";

export interface TaskAddOptions {
  description?: string;
  category?: string;
  dueDate?: string;
  projectId?: string;
}

export type TaskInputPickerProps = Pick<
  TaskInputProps,
  "categories" | "projects" | "defaultProjectId" | "onCreateCategory" | "onCreateProject"
>;

interface TaskInputProps {
  onAddTask: (name: string, quadrant: Quadrant, options?: TaskAddOptions) => void;
  defaultQuadrant?: Quadrant;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  quadrants?: QuadrantInfo[];
  categories?: string[];
  projects?: ProjectTemplate[];
  defaultProjectId?: string;
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
  quadrants = QUADRANTS,
  categories = [],
  projects = [],
  defaultProjectId,
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
    Boolean(name.trim()) &&
    Boolean(selectedQuadrant || defaultQuadrant) &&
    Boolean(category) &&
    Boolean(projectId);

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
  };

  const beginDetails = () => {
    setProjectId(
      defaultProjectId && projects.some((p) => p.id === defaultProjectId)
        ? defaultProjectId
        : ""
    );
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
    if (!name.trim() || !q || !category || !projectId) return;

    onAddTask(name, q, {
      description: description || undefined,
      category,
      dueDate: dueDate || undefined,
      projectId: projectId === NO_PROJECT ? undefined : projectId,
    });
    setStep("name");
    setName("");
    setSelectedQuadrant(defaultQuadrant || null);
    setCategory("");
    setProjectId("");
    setDueDate("");
    setDescription("");
    setIsFocused(false);
    inputRef.current?.focus();
  }, [name, selectedQuadrant, defaultQuadrant, category, projectId, description, dueDate, onAddTask]);

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
          "bg-card rounded-xl border transition-all duration-200",
          isFocused || step !== "name"
            ? "border-primary/20 shadow-medium"
            : "border-border shadow-soft",
          compact && "rounded-lg"
        )}
      >
        {/* Name Input */}
        <div className={cn("flex items-center gap-2", compact ? "p-2" : "p-3")}>
          <div
            className={cn(
              "rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0",
              compact ? "w-6 h-6" : "w-7 h-7"
            )}
          >
            <Plus className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5", "text-primary")} />
          </div>
          <Input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            placeholder={placeholder}
            className={cn(
              "border-0 shadow-none p-0 h-auto placeholder:text-muted-foreground/60 focus-visible:ring-0",
              compact ? "text-sm" : "text-base"
            )}
          />
          {name.trim() && step === "name" && (
            <Button
              size="sm"
              onClick={handleNameSubmit}
              className="rounded-lg h-7 w-7 p-0"
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
                      <span className="block text-[10px] opacity-75">{q.subtitle}</span>
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
                  <span className="font-medium">Category & project</span>
                  <span className="text-[10px] opacity-60">required</span>
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
                      className="border-0 bg-secondary/50 h-8 text-sm rounded-lg"
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
