import { useState, useEffect, useCallback } from "react";
import { KanbanColumn, DEFAULT_KANBAN_COLUMNS } from "@/types/project";

const KEY = "eisenhower-kanban-columns";

const getKey = (userId?: string) => userId ? `${KEY}-${userId}` : KEY;

export function useKanbanColumns(userId?: string) {
  const [columns, setColumns] = useState<KanbanColumn[]>(() => {
    try {
      const stored = localStorage.getItem(getKey(userId));
      return stored ? JSON.parse(stored) : DEFAULT_KANBAN_COLUMNS;
    } catch { return DEFAULT_KANBAN_COLUMNS; }
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(getKey(userId));
      setColumns(stored ? JSON.parse(stored) : DEFAULT_KANBAN_COLUMNS);
    } catch { setColumns(DEFAULT_KANBAN_COLUMNS); }
  }, [userId]);

  useEffect(() => {
    localStorage.setItem(getKey(userId), JSON.stringify(columns));
  }, [columns, userId]);

  const addColumn = useCallback((title: string) => {
    setColumns(prev => [...prev, { id: crypto.randomUUID(), title, order: prev.length }]);
  }, []);

  const removeColumn = useCallback((id: string) => {
    setColumns(prev => prev.filter(c => c.id !== id).map((c, i) => ({ ...c, order: i })));
  }, []);

  const renameColumn = useCallback((id: string, title: string) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, title } : c));
  }, []);

  const resetColumns = useCallback(() => {
    setColumns(DEFAULT_KANBAN_COLUMNS);
  }, []);

  return { columns, addColumn, removeColumn, renameColumn, resetColumns };
}
