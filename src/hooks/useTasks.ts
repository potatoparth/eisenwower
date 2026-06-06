import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Task, Quadrant, TaskStatus, Recurrence } from "@/types/task";

function computeNextOccurrence(template: Task): string | undefined {
  const rec = template.recurrence ?? "none";
  if (rec === "none") return undefined;
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (rec === "daily") {
    const d = new Date(base); d.setDate(d.getDate() + 1); return fmt(d);
  }
  if (rec === "weekly") {
    const days = (template.recurrenceDays && template.recurrenceDays.length)
      ? [...template.recurrenceDays].sort((a, b) => a - b)
      : [base.getDay()];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(base); d.setDate(d.getDate() + i);
      if (days.includes(d.getDay())) return fmt(d);
    }
    return undefined;
  }
  if (rec === "monthly") {
    const day = (template.recurrenceDays && template.recurrenceDays[0]) || base.getDate();
    const d = new Date(base.getFullYear(), base.getMonth() + 1, day);
    return fmt(d);
  }
  return undefined;
}

type TaskRow = {
  id: string; name: string; description: string | null; category: string; quadrant: string; due_date: string | null;
  status: string; created_at: string; updated_at: string; deadline_threshold_override: number | null; kanban_column: string | null; sort_order: number;
  project_id: string | null;
  recurrence: string | null;
  recurrence_days: number[] | null;
  recurrence_time: string | null;
  is_recurring_instance: boolean | null;
  recurring_template_id: string | null;
};

const fromRow = (row: TaskRow): Task => ({
  id: row.id,
  name: row.name,
  description: row.description || undefined,
  category: row.category,
  quadrant: row.quadrant as Quadrant,
  dueDate: row.due_date || undefined,
  status: row.status as TaskStatus,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deadlineThresholdOverride: row.deadline_threshold_override ?? undefined,
  kanbanColumn: row.kanban_column || undefined,
  projectId: row.project_id || undefined,
  recurrence: (row.recurrence as Recurrence) || "none",
  recurrenceDays: row.recurrence_days || [],
  recurrenceTime: row.recurrence_time || "22:00",
  isRecurringInstance: !!row.is_recurring_instance,
  recurringTemplateId: row.recurring_template_id || undefined,
});

const toUpdate = (updates: Partial<Omit<Task, "id" | "createdAt">>) => ({
  name: updates.name,
  description: updates.description ?? null,
  category: updates.category,
  quadrant: updates.quadrant,
  due_date: updates.dueDate ?? null,
  status: updates.status,
  deadline_threshold_override: updates.deadlineThresholdOverride ?? null,
  kanban_column: updates.kanbanColumn ?? null,
  project_id: updates.projectId ?? null,
  recurrence: updates.recurrence ?? undefined,
  recurrence_days: updates.recurrenceDays ?? undefined,
  recurrence_time: updates.recurrenceTime ?? undefined,
  is_recurring_instance: updates.isRecurringInstance ?? undefined,
  recurring_template_id: updates.recurringTemplateId ?? undefined,
});

export function useTasks(userId?: string) {
  const [tasks, setTasksState] = useState<Task[]>([]);

  const loadTasks = useCallback(async () => {
    if (!userId) { setTasksState([]); return; }
    const { data } = await supabase.from("tasks").select("*").eq("user_id", userId).order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    setTasksState(((data || []) as TaskRow[]).map(fromRow));
  }, [userId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`tasks-${userId}`).on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` }, loadTasks).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, loadTasks]);

  const addTask = useCallback((name: string, quadrant: Quadrant, options?: {
    description?: string; category?: string; dueDate?: string; projectId?: string;
    recurrence?: Recurrence; recurrenceDays?: number[]; recurrenceTime?: string;
    isRecurringInstance?: boolean; recurringTemplateId?: string;
  }): Task => {
    const now = new Date().toISOString();
    const optimistic: Task = {
      id: crypto.randomUUID(), name: name.trim(), description: options?.description,
      category: options?.category || "General", quadrant, dueDate: options?.dueDate,
      status: "open", createdAt: now, updatedAt: now, kanbanColumn: "todo",
      projectId: options?.projectId,
      recurrence: options?.recurrence ?? "none",
      recurrenceDays: options?.recurrenceDays ?? [],
      recurrenceTime: options?.recurrenceTime ?? "22:00",
      isRecurringInstance: options?.isRecurringInstance ?? false,
      recurringTemplateId: options?.recurringTemplateId,
    };
    setTasksState(prev => [optimistic, ...prev]);
    if (userId) {
      supabase.from("tasks").insert({
        id: optimistic.id, user_id: userId, name: optimistic.name,
        description: optimistic.description || null, category: optimistic.category,
        quadrant, due_date: optimistic.dueDate || null, status: optimistic.status,
        kanban_column: optimistic.kanbanColumn, sort_order: 0,
        project_id: optimistic.projectId || null,
        recurrence: optimistic.recurrence,
        recurrence_days: optimistic.recurrenceDays,
        recurrence_time: optimistic.recurrenceTime,
        is_recurring_instance: optimistic.isRecurringInstance,
        recurring_template_id: optimistic.recurringTemplateId || null,
      }).then(({ error }) => { if (error) loadTasks(); });
    }
    return optimistic;
  }, [userId, loadTasks]);

  const updateTask = useCallback((id: string, updates: Partial<Omit<Task, "id" | "createdAt">>) => {
    let propagateIds: string[] = [];
    setTasksState(prev => {
      const target = prev.find(t => t.id === id);
      // Propagate edits from a recurring template to all future incomplete instances.
      const isTemplate = target && (target.recurrence ?? "none") !== "none" && !target.isRecurringInstance;
      if (isTemplate) {
        propagateIds = prev
          .filter(t => t.recurringTemplateId === id && t.status === "open")
          .map(t => t.id);
      }
      const now = new Date().toISOString();
      const propagated: Partial<Task> = {
        name: updates.name, description: updates.description, category: updates.category,
        quadrant: updates.quadrant, projectId: updates.projectId,
        recurrence: updates.recurrence, recurrenceDays: updates.recurrenceDays,
        recurrenceTime: updates.recurrenceTime,
      };
      return prev.map(task => {
        if (task.id === id) return { ...task, ...updates, updatedAt: now };
        if (propagateIds.includes(task.id)) return { ...task, ...propagated, updatedAt: now };
        return task;
      });
    });
    if (userId) {
      supabase.from("tasks").update(toUpdate(updates)).eq("id", id).eq("user_id", userId).then(({ error }) => { if (error) loadTasks(); });
      if (propagateIds.length) {
        const propagateUpdates: Partial<Omit<Task, "id" | "createdAt">> = {
          name: updates.name, description: updates.description, category: updates.category,
          quadrant: updates.quadrant, projectId: updates.projectId,
          recurrence: updates.recurrence, recurrenceDays: updates.recurrenceDays,
          recurrenceTime: updates.recurrenceTime,
        };
        // Strip undefined keys so we don't overwrite with null.
        const payload = Object.fromEntries(
          Object.entries(toUpdate(propagateUpdates)).filter(([_, v]) => v !== undefined)
        ) as Record<string, unknown>;
        if (Object.keys(payload).length) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabase.from("tasks").update(payload as any).in("id", propagateIds).eq("user_id", userId).then(({ error }) => { if (error) loadTasks(); });
        }
      }
    }
  }, [userId, loadTasks]);

  const deleteTask = useCallback((id: string, mode: "single" | "future" = "single") => {
    const ids = [id];
    if (mode === "future") {
      tasks.forEach(t => {
        if (t.recurringTemplateId === id && t.status === "open") ids.push(t.id);
      });
    }
    setTasksState(prev => prev.filter(task => !ids.includes(task.id)));
    if (userId) supabase.from("tasks").delete().in("id", ids).eq("user_id", userId).then(({ error }) => { if (error) loadTasks(); });
  }, [userId, tasks, loadTasks]);

  const setTasks = useCallback((reordered: Task[]) => {
    setTasksState(reordered);
    if (userId) reordered.forEach((task, index) => supabase.from("tasks").update({ sort_order: index }).eq("id", task.id).eq("user_id", userId));
  }, [userId]);

  const moveTask = useCallback((id: string, quadrant: Quadrant) => updateTask(id, { quadrant }), [updateTask]);
  const toggleStatus = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const nextStatus: TaskStatus = task.status === "open" ? "done" : "open";
    updateTask(id, { status: nextStatus });
    if (nextStatus !== "done") return;

    // Determine recurrence template (the task itself if a template, else the linked template).
    const isTemplate = (task.recurrence ?? "none") !== "none" && !task.isRecurringInstance;
    const template = isTemplate
      ? task
      : (task.recurringTemplateId ? tasks.find(t => t.id === task.recurringTemplateId) : undefined);
    if (!template || (template.recurrence ?? "none") === "none") return;
    const templateId = template.id;

    // Don't spawn another if an incomplete instance already exists.
    const hasOpenInstance = tasks.some(
      t => t.recurringTemplateId === templateId && t.status === "open" && t.id !== id
    );
    if (hasOpenInstance) return;

    const next = computeNextOccurrence(template);
    if (!next) return;

    addTask(template.name, template.quadrant, {
      description: template.description,
      category: template.category,
      dueDate: next,
      projectId: template.projectId,
      recurrence: template.recurrence,
      recurrenceDays: template.recurrenceDays,
      recurrenceTime: template.recurrenceTime,
      isRecurringInstance: true,
      recurringTemplateId: templateId,
    });
  }, [tasks, updateTask, addTask]);
  const getCategories = useCallback(() => Array.from(new Set(tasks.map(t => t.category))).sort(), [tasks]);
  const filterTasks = useCallback((filters: { category?: string; status?: TaskStatus }) => tasks.filter(task => (!filters.category || task.category === filters.category) && (!filters.status || task.status === filters.status)), [tasks]);

  return { tasks, setTasks, addTask, updateTask, deleteTask, moveTask, toggleStatus, getCategories, filterTasks };
}