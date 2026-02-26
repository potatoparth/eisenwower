import { useState, useEffect, useCallback } from "react";
import { ProjectTemplate, ProjectTask } from "@/types/project";

const PROJECTS_KEY = "eisenhower-projects";

const getKey = (userId?: string) => userId ? `${PROJECTS_KEY}-${userId}` : PROJECTS_KEY;

export function useProjects(userId?: string) {
  const [projects, setProjects] = useState<ProjectTemplate[]>(() => {
    try {
      const stored = localStorage.getItem(getKey(userId));
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(getKey(userId));
      setProjects(stored ? JSON.parse(stored) : []);
    } catch { setProjects([]); }
  }, [userId]);

  useEffect(() => {
    localStorage.setItem(getKey(userId), JSON.stringify(projects));
  }, [projects, userId]);

  const addProject = useCallback((name: string, description?: string): ProjectTemplate => {
    const now = new Date().toISOString();
    const project: ProjectTemplate = {
      id: crypto.randomUUID(),
      name,
      description,
      tasks: [],
      createdAt: now,
      updatedAt: now,
      userId,
    };
    setProjects(prev => [project, ...prev]);
    return project;
  }, [userId]);

  const updateProject = useCallback((id: string, updates: Partial<Omit<ProjectTemplate, "id" | "createdAt">>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  const addTaskToProject = useCallback((projectId: string, task: Omit<ProjectTask, "id" | "order">) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const newTask: ProjectTask = { ...task, id: crypto.randomUUID(), order: p.tasks.length };
      return { ...p, tasks: [...p.tasks, newTask], updatedAt: new Date().toISOString() };
    }));
  }, []);

  const updateProjectTask = useCallback((projectId: string, taskId: string, updates: Partial<ProjectTask>) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t), updatedAt: new Date().toISOString() };
    }));
  }, []);

  const deleteProjectTask = useCallback((projectId: string, taskId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, tasks: p.tasks.filter(t => t.id !== taskId), updatedAt: new Date().toISOString() };
    }));
  }, []);

  return { projects, addProject, updateProject, deleteProject, addTaskToProject, updateProjectTask, deleteProjectTask };
}
