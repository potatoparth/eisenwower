import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProjectTemplate, ProjectTask } from "@/types/project";

export type ProjectRole = "owner" | "editor" | "viewer";

type ProjectRow = { id: string; user_id: string; name: string; description: string | null; created_at: string; updated_at: string };
type ProjectTaskRow = {
  id: string; project_id: string; name: string; description: string | null; dependency_type: string; depends_on: string[];
  duration_days: number; start_date: string | null; end_date: string | null; status: string; sort_order: number;
};

const taskFromRow = (row: ProjectTaskRow): ProjectTask => ({
  id: row.id,
  name: row.name,
  description: row.description || undefined,
  dependencyType: row.dependency_type as ProjectTask["dependencyType"],
  dependsOn: row.depends_on,
  durationDays: row.duration_days,
  startDate: row.start_date || undefined,
  endDate: row.end_date || undefined,
  status: row.status as ProjectTask["status"],
  order: row.sort_order,
});

export function useProjects(userId?: string) {
  const [projects, setProjects] = useState<ProjectTemplate[]>([]);
  const [roles, setRoles] = useState<Record<string, ProjectRole>>({});

  const loadProjects = useCallback(async () => {
    if (!userId) { setProjects([]); setRoles({}); return; }
    // RLS returns owned + shared rows.
    const [{ data: projectRows }, { data: taskRows }, { data: collabRows }] = await Promise.all([
      supabase.from("project_templates").select("*").order("created_at", { ascending: false }),
      supabase.from("project_tasks").select("*").order("sort_order", { ascending: true }),
      supabase.from("project_collaborators").select("project_id, role").eq("user_id", userId),
    ]);
    const roleByProject: Record<string, ProjectRole> = {};
    ((collabRows || []) as Array<{ project_id: string; role: string }>).forEach((r) => {
      roleByProject[r.project_id] = r.role as ProjectRole;
    });
    ((projectRows || []) as ProjectRow[]).forEach((row) => {
      if (row.user_id === userId) roleByProject[row.id] = "owner";
    });
    setRoles(roleByProject);
    const tasksByProject = new Map<string, ProjectTask[]>();
    ((taskRows || []) as ProjectTaskRow[]).forEach(row => tasksByProject.set(row.project_id, [...(tasksByProject.get(row.project_id) || []), taskFromRow(row)]));
    setProjects(((projectRows || []) as ProjectRow[]).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      tasks: tasksByProject.get(row.id) || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userId: row.user_id,
    })));
  }, [userId]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // Realtime: refetch on any change to projects/tasks/collaborators/shared_items.
  // RLS filters the refetched rows.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`projects-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_templates" }, loadProjects)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_tasks" }, loadProjects)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_collaborators" }, loadProjects)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_shared_items" }, loadProjects)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, loadProjects]);

  const addProject = useCallback((name: string, description?: string): ProjectTemplate => {
    const now = new Date().toISOString();
    const project: ProjectTemplate = { id: crypto.randomUUID(), name, description, tasks: [], createdAt: now, updatedAt: now, userId };
    setProjects(prev => [project, ...prev]);
    if (userId) supabase.from("project_templates").insert({ id: project.id, user_id: userId, name, description: description || null }).then(({ error }) => { if (error) loadProjects(); });
    return project;
  }, [userId, loadProjects]);

  const updateProject = useCallback((id: string, updates: Partial<Omit<ProjectTemplate, "id" | "createdAt">>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
    if (userId) supabase.from("project_templates").update({ name: updates.name, description: updates.description || null }).eq("id", id).then(({ error }) => { if (error) loadProjects(); });
  }, [userId, loadProjects]);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (userId) supabase.from("project_templates").delete().eq("id", id).then(({ error }) => { if (error) loadProjects(); });
  }, [userId, loadProjects]);

  const addTaskToProject = useCallback((projectId: string, task: Omit<ProjectTask, "id" | "order">) => {
    const id = crypto.randomUUID();
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, tasks: [...p.tasks, { ...task, id, order: p.tasks.length }], updatedAt: new Date().toISOString() } : p));
    if (userId) supabase.from("project_tasks").insert({ id, project_id: projectId, user_id: userId, name: task.name, description: task.description || null, dependency_type: task.dependencyType, depends_on: task.dependsOn, duration_days: task.durationDays, start_date: task.startDate || null, end_date: task.endDate || null, status: task.status }).then(({ error }) => { if (error) loadProjects(); });
  }, [userId, loadProjects]);

  const updateProjectTask = useCallback((projectId: string, taskId: string, updates: Partial<ProjectTask>) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t), updatedAt: new Date().toISOString() } : p));
    if (userId) supabase.from("project_tasks").update({ status: updates.status, name: updates.name, description: updates.description || null, dependency_type: updates.dependencyType, depends_on: updates.dependsOn, duration_days: updates.durationDays, start_date: updates.startDate || null, end_date: updates.endDate || null, sort_order: updates.order }).eq("id", taskId).then(({ error }) => { if (error) loadProjects(); });
  }, [userId, loadProjects]);

  const deleteProjectTask = useCallback((projectId: string, taskId: string) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId), updatedAt: new Date().toISOString() } : p));
    if (userId) supabase.from("project_tasks").delete().eq("id", taskId).then(({ error }) => { if (error) loadProjects(); });
  }, [userId, loadProjects]);

  const getProjectRole = useCallback((projectId: string): ProjectRole | undefined => roles[projectId], [roles]);

  return { projects, roles, getProjectRole, addProject, updateProject, deleteProject, addTaskToProject, updateProjectTask, deleteProjectTask };
}