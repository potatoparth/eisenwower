import { Task } from "@/types/task";
import { parseISO, isPast, isToday, startOfDay } from "date-fns";

export function isOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  const d = parseISO(task.dueDate);
  return isPast(d) && !isToday(d);
}

/**
 * Sort tasks within a quadrant per spec:
 * 1. Overdue pinned top
 * 2. Has-deadline ascending
 * 3. Same date -> category alpha
 * 4. Same category -> sort_order
 * 5. No-date controlled by noDatePosition
 */
export function sortTasks(
  tasks: Task[],
  opts: { noDatePosition: "top" | "bottom" }
): Task[] {
  const today = startOfDay(new Date()).getTime();
  return [...tasks].sort((a, b) => {
    const aOver = isOverdue(a);
    const bOver = isOverdue(b);
    if (aOver !== bOver) return aOver ? -1 : 1;

    const aHas = !!a.dueDate;
    const bHas = !!b.dueDate;
    if (aHas !== bHas) {
      if (opts.noDatePosition === "top") return aHas ? 1 : -1;
      return aHas ? -1 : 1;
    }
    if (aHas && bHas) {
      const ad = parseISO(a.dueDate!).getTime();
      const bd = parseISO(b.dueDate!).getTime();
      if (ad !== bd) return ad - bd;
    }

    // Same date bucket — category then manual order
    const cat = (a.category || "").localeCompare(b.category || "");
    if (cat !== 0) return cat;

    // Manual order from drag (stored as updatedAt fallback)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}