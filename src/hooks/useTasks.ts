import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Task, Quadrant, TaskStatus } from "@/types/task";

type TaskRow = {
  id: string; name: string; description: string | null; category: string; quadrant: string; due_date: string | null;
  status: string; created_at: string; updated_at: string; deadline_threshold_override: number | null; kanban_column: string | null; sort_order: number;
  project_id: string | null;
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

  const addTask = useCallback((name: string, quadrant: Quadrant, options?: { description?: string; category?: string; dueDate?: string; projectId?: string }): Task => {
    const now = new Date().toISOString();
    const optimistic: Task = { id: crypto.randomUUID(), name: name.trim(), description: options?.description, category: options?.category || "General", quadrant, dueDate: options?.dueDate, status: "open", createdAt: now, updatedAt: now, kanbanColumn: "todo", projectId: options?.projectId };
    setTasksState(prev => [optimistic, ...prev]);
    if (userId) {
      supabase.from("tasks").insert({ id: optimistic.id, user_id: userId, name: optimistic.name, description: optimistic.description || null, category: optimistic.category, quadrant, due_date: optimistic.dueDate || null, status: optimistic.status, kanban_column: optimistic.kanbanColumn, sort_order: 0, project_id: optimistic.projectId || null }).then(({ error }) => { if (error) loadTasks(); });
    }
    return optimistic;
  }, [userId, loadTasks]);

  const updateTask = useCallback((id: string, updates: Partial<Omit<Task, "id" | "createdAt">>) => {
    setTasksState(prev => prev.map(task => task.id === id ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task));
    if (userId) supabase.from("tasks").update(toUpdate(updates)).eq("id", id).eq("user_id", userId).then(({ error }) => { if (error) loadTasks(); });
  }, [userId, loadTasks]);

  const deleteTask = useCallback((id: string) => {
    setTasksState(prev => prev.filter(task => task.id !== id));
    if (userId) supabase.from("tasks").delete().eq("id", id).eq("user_id", userId).then(({ error }) => { if (error) loadTasks(); });
  }, [userId, loadTasks]);

  const setTasks = useCallback((reordered: Task[]) => {
    setTasksState(reordered);
    if (userId) reordered.forEach((task, index) => supabase.from("tasks").update({ sort_order: index }).eq("id", task.id).eq("user_id", userId));
  }, [userId]);

  const moveTask = useCallback((id: string, quadrant: Quadrant) => updateTask(id, { quadrant }), [updateTask]);
  const toggleStatus = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) updateTask(id, { status: task.status === "open" ? "done" : "open" });
  }, [tasks, updateTask]);
  const getCategories = useCallback(() => Array.from(new Set(tasks.map(t => t.category))).sort(), [tasks]);
  const filterTasks = useCallback((filters: { category?: string; status?: TaskStatus }) => tasks.filter(task => (!filters.category || task.category === filters.category) && (!filters.status || task.status === filters.status)), [tasks]);

  return { tasks, setTasks, addTask, updateTask, deleteTask, moveTask, toggleStatus, getCategories, filterTasks };
}