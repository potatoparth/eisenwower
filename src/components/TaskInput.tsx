import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Calendar, Tag, ChevronRight } from "lucide-react";
import { Quadrant, QUADRANTS, QuadrantInfo } from "@/types/task";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TaskInputProps {
  onAddTask: (
    name: string,
    quadrant: Quadrant,
    options?: { description?: string; category?: string; dueDate?: string }
  ) => void;
  defaultQuadrant?: Quadrant;
  placeholder?: string;
  className?: string;
}

type InputStep = "name" | "quadrant" | "details";

export function TaskInput({
  onAddTask,
  defaultQuadrant,
  placeholder = "Add a new task...",
  className,
}: TaskInputProps) {
  const [step, setStep] = useState<InputStep>("name");
  const [name, setName] = useState("");
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant | null>(
    defaultQuadrant || null
  );
  const [category, setCategory] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const reset = () => {
    setStep("name");
    setName("");
    setSelectedQuadrant(defaultQuadrant || null);
    setCategory("");
    setDueDate("");
    setIsFocused(false);
  };

  const handleNameSubmit = () => {
    if (!name.trim()) return;
    
    if (defaultQuadrant) {
      // If we have a default quadrant, skip quadrant selection
      onAddTask(name, defaultQuadrant, {
        category: category || undefined,
        dueDate: dueDate || undefined,
      });
      reset();
    } else {
      setStep("quadrant");
    }
  };

  const handleQuadrantSelect = (quadrant: Quadrant) => {
    setSelectedQuadrant(quadrant);
    setStep("details");
  };

  const handleComplete = () => {
    if (!name.trim() || !selectedQuadrant) return;
    
    onAddTask(name, selectedQuadrant, {
      category: category || undefined,
      dueDate: dueDate || undefined,
    });
    reset();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (step === "name") {
        handleNameSubmit();
      } else if (step === "details") {
        handleComplete();
      }
    } else if (e.key === "Escape") {
      reset();
      inputRef.current?.blur();
    }
  };

  // Click outside to close expanded state
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (step !== "name" && name.trim() && selectedQuadrant) {
          handleComplete();
        } else if (step !== "name") {
          reset();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [step, name, selectedQuadrant]);

  const getQuadrantButtonClass = (q: QuadrantInfo) => {
    const baseClass = "flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 border-2";
    const colorClasses = {
      1: "border-quadrant-1 bg-quadrant-1-light text-quadrant-1-foreground hover:bg-quadrant-1 hover:text-white",
      2: "border-quadrant-2 bg-quadrant-2-light text-quadrant-2-foreground hover:bg-quadrant-2 hover:text-white",
      3: "border-quadrant-3 bg-quadrant-3-light text-quadrant-3-foreground hover:bg-quadrant-3 hover:text-white",
      4: "border-quadrant-4 bg-quadrant-4-light text-quadrant-4-foreground hover:bg-quadrant-4 hover:text-white",
    };
    return cn(baseClass, colorClasses[q.color]);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <motion.div
        layout
        className={cn(
          "bg-card rounded-2xl border transition-all duration-200",
          isFocused || step !== "name"
            ? "border-primary/20 shadow-medium"
            : "border-border shadow-soft"
        )}
      >
        {/* Name Input */}
        <div className="flex items-center gap-3 p-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Plus className="w-4 h-4 text-primary" />
          </div>
          <Input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            placeholder={placeholder}
            className="border-0 shadow-none p-0 h-auto text-base placeholder:text-muted-foreground/60 focus-visible:ring-0"
          />
          {name.trim() && step === "name" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Button
                size="sm"
                onClick={handleNameSubmit}
                className="rounded-xl"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </motion.div>
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
              <div className="px-4 pb-4 space-y-3">
                <p className="text-sm text-muted-foreground font-medium">
                  Select priority quadrant
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {QUADRANTS.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => handleQuadrantSelect(q.id)}
                      className={getQuadrantButtonClass(q)}
                    >
                      <span className="block font-semibold">{q.title}</span>
                      <span className="block text-xs opacity-75 mt-0.5">
                        {q.subtitle}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Optional Details */}
        <AnimatePresence>
          {step === "details" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium">Optional details</span>
                  <span className="text-xs opacity-60">Press Enter to save</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                    <Tag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Category"
                      className="border-0 bg-secondary/50 h-9 text-sm rounded-lg"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                    <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="border-0 bg-secondary/50 h-9 text-sm rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={reset}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleComplete}
                    className="rounded-xl"
                  >
                    Add Task
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
