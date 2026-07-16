import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProjectTemplate, ProjectTask } from "@/types/project";

export type ProjectRole = "owner" | "editor" | "viewer";

type ProjectRow = {
  id: string; user_id: string; name: string; description: string | null;
  parent_id: string | null; sort_order: number;
  created_at: string; updated_at: string;
};
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
    const rows = (projectRows || []) as ProjectRow[];
    // Build parent map for tree walks.
    const parentOf = new Map<string, string | null>();
    rows.forEach((r) => parentOf.set(r.id, r.parent_id));
    const rootOf = (id: string): string => {
      let cur: string | null = id;
      const seen = new Set<string>();
      while (cur && parentOf.get(cur) && !seen.has(cur)) {
        seen.add(cur);
        cur = parentOf.get(cur) ?? null;
      }
      return cur ?? id;
    };
    // Determine role at each root: owner (row.user_id) wins, else collaborator role.
    const rootRole: Record<string, ProjectRole> = {};
    rows.forEach((row) => {
      if (row.parent_id === null && row.user_id === userId) rootRole[row.id] = "owner";
    });
    ((collabRows || []) as Array<{ project_id: string; role: string }>).forEach((r) => {
      if (!rootRole[r.project_id]) rootRole[r.project_id] = r.role as ProjectRole;
    });
    // Propagate root role to every descendant in the tree.
    const roleByProject: Record<string, ProjectRole> = {};
    rows.forEach((row) => {
      const role = rootRole[rootOf(row.id)];
      if (role) roleByProject[row.id] = role;
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
      parentId: row.parent_id || null,
      sortOrder: row.sort_order ?? 0,
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

  const addProject = useCallback((name: string, description?: string, parentId?: string | null): ProjectTemplate => {
    const now = new Date().toISOString();
    const project: ProjectTemplate = { id: crypto.randomUUID(), name, description, tasks: [], createdAt: now, updatedAt: now, userId, parentId: parentId ?? null, sortOrder: 0 };
    setProjects(prev => [project, ...prev]);
    if (userId) supabase.from("project_templates").insert({ id: project.id, user_id: userId, name, description: description || null, parent_id: parentId ?? null }).then(({ error }) => { if (error) loadProjects(); });
    return project;
  }, [userId, loadProjects]);

  const updateProject = useCallback((id: string, updates: Partial<Omit<ProjectTemplate, "id" | "createdAt">>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
    if (userId) {
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description || null;
      if (updates.parentId !== undefined) payload.parent_id = updates.parentId ?? null;
      if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.from("project_templates").update(payload as any).eq("id", id).then(({ error }) => { if (error) loadProjects(); });
    }
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

  const reparentProject = useCallback((id: string, newParentId: string | null) => {
    updateProject(id, { parentId: newParentId });
  }, [updateProject]);

  return { projects, roles, getProjectRole, addProject, updateProject, deleteProject, addTaskToProject, updateProjectTask, deleteProjectTask, reparentProject };
}