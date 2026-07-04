import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Compact inline "quick add task" input. Enter commits, Escape/blur cancels.
 * Used in Kanban columns and Calendar day sections.
 */
export function QuickAddInput({
  onCommit,
  onCancel,
  placeholder = "New task…",
  className,
}: {
  onCommit: (name: string) => void;
  onCancel: () => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <Input
      ref={ref}
      placeholder={placeholder}
      className={cn("h-8 text-sm rounded-lg", className)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const v = (e.target as HTMLInputElement).value.trim();
          if (v) onCommit(v);
          else onCancel();
        } else if (e.key === "Escape") {
          onCancel();
        }
      }}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (v) onCommit(v);
        else onCancel();
      }}
    />
  );
}