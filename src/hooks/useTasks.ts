import { useState, useEffect, useCallback } from "react";
import { Task, Quadrant, TaskStatus } from "@/types/task";

const STORAGE_KEY = "eisenhower-tasks";

const generateId = () => crypto.randomUUID();

const getStorageKey = (userId?: string) => userId ? `${STORAGE_KEY}-${userId}` : STORAGE_KEY;

const loadTasks = (userId?: string): Task[] => {
  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveTasks = (tasks: Task[], userId?: string) => {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(tasks));
};

export function useTasks(userId?: string) {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks(userId));

  // Reload tasks when userId changes
  useEffect(() => {
    setTasks(loadTasks(userId));
  }, [userId]);

  useEffect(() => {
    saveTasks(tasks, userId);
  }, [tasks, userId]);

  const addTask = useCallback((
    name: string,
    quadrant: Quadrant,
    options?: { description?: string; category?: string; dueDate?: string }
  ): Task => {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: generateId(),
      name: name.trim(),
      description: options?.description,
      category: options?.category || "General",
      quadrant,
      dueDate: options?.dueDate,
      status: "open",
      createdAt: now,
      updatedAt: now,
    };

    setTasks((prev) => [newTask, ...prev]);
    return newTask;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Omit<Task, "id" | "createdAt">>) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, ...updates, updatedAt: new Date().toISOString() }
          : task
      )
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const moveTask = useCallback((id: string, quadrant: Quadrant) => {
    updateTask(id, { quadrant });
  }, [updateTask]);

  const toggleStatus = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              status: task.status === "open" ? "done" : "open",
              updatedAt: new Date().toISOString(),
            }
          : task
      )
    );
  }, []);

  const getCategories = useCallback(() => {
    const categories = new Set(tasks.map((t) => t.category));
    return Array.from(categories).sort();
  }, [tasks]);

  const filterTasks = useCallback(
    (filters: { category?: string; status?: TaskStatus }) => {
      return tasks.filter((task) => {
        if (filters.category && task.category !== filters.category) return false;
        if (filters.status && task.status !== filters.status) return false;
        return true;
      });
    },
    [tasks]
  );

  return {
    tasks,
    setTasks,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    toggleStatus,
    getCategories,
    filterTasks,
  };
}
