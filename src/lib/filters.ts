import { Task } from "@/types/task";
import { isOverdue } from "@/lib/sort";
import { addDays, isToday, isWithinInterval, parseISO, startOfDay } from "date-fns";

export type DateFilter = "all" | "today" | "week";
export type OverdueMode = "all" | "only" | "hide";

export interface TaskFilters {
  dateFilter?: DateFilter;
  overdueMode?: OverdueMode;
  selectedCategories?: string[];
  /** Empty = all projects. Entries can be a project id or "__none__" for "no project". */
  activeProjectIds?: string[];
}

function passDate(t: Task, dateFilter: DateFilter): boolean {
  if (dateFilter === "all") return true;
  if (isOverdue(t)) return true;
  if (!t.dueDate) return false;
  const today = startOfDay(new Date());
  const end = dateFilter === "today" ? today : addDays(today, 7);
  const d = parseISO(t.dueDate);
  return dateFilter === "today" ? isToday(d) : isWithinInterval(d, { start: today, end });
}

function passOverdue(t: Task, mode: OverdueMode): boolean {
  if (mode === "only") return isOverdue(t);
  if (mode === "hide") return !isOverdue(t);
  return true;
}

function passCategory(t: Task, selected: string[]): boolean {
  if (!selected.length) return true;
  return !!t.category && selected.includes(t.category);
}

function passProject(t: Task, ids: string[], allowedIds?: Set<string>): boolean {
  if (!ids.length) return true;
  if (!t.projectId) return ids.includes("__none__");
  if (allowedIds) return allowedIds.has(t.projectId);
  return ids.includes(t.projectId);
}

export interface TaskFilterContext {
  /** Optional expander: given a selected project id, return its own id + all descendants. */
  expandProjectIds?: (ids: string[]) => string[];
}

export function applyTaskFilters(tasks: Task[], f: TaskFilters, ctx?: TaskFilterContext): Task[] {
  const dateFilter = f.dateFilter ?? "all";
  const overdueMode = f.overdueMode ?? "all";
  const selectedCategories = f.selectedCategories ?? [];
  const activeProjectIds = f.activeProjectIds ?? [];
  const expanded = ctx?.expandProjectIds
    ? new Set(ctx.expandProjectIds(activeProjectIds.filter((id) => id !== "__none__")))
    : undefined;
  if (expanded && activeProjectIds.includes("__none__")) expanded.add("__none__");
  return tasks.filter(
    (t) =>
      passDate(t, dateFilter) &&
      passOverdue(t, overdueMode) &&
      passCategory(t, selectedCategories) &&
      passProject(t, activeProjectIds, expanded)
  );
}