import { useState, useEffect, useCallback } from "react";
import { KanbanColumn, DEFAULT_KANBAN_COLUMNS } from "@/types/project";
import { supabase } from "@/integrations/supabase/client";

export function useKanbanColumns(userId?: string) {
  const [columns, setColumns] = useState<KanbanColumn[]>(DEFAULT_KANBAN_COLUMNS);

  const loadColumns = useCallback(async () => {
    if (!userId) { setColumns(DEFAULT_KANBAN_COLUMNS); return; }
    const { data } = await supabase.from("kanban_columns").select("column_key,title,sort_order").eq("user_id", userId).order("sort_order");
    if (!data?.length) {
      setColumns(DEFAULT_KANBAN_COLUMNS);
      await supabase.from("kanban_columns").upsert(DEFAULT_KANBAN_COLUMNS.map(c => ({ user_id: userId, column_key: c.id, title: c.title, sort_order: c.order })), { onConflict: "user_id,column_key" });
      return;
    }
    setColumns(data.map(c => ({ id: c.column_key, title: c.title, order: c.sort_order })));
  }, [userId]);

  useEffect(() => {
    loadColumns();
  }, [loadColumns]);

  const addColumn = useCallback((title: string) => {
    const column = { id: crypto.randomUUID(), title, order: columns.length };
    setColumns(prev => [...prev, column]);
    if (userId) supabase.from("kanban_columns").insert({ user_id: userId, column_key: column.id, title, sort_order: column.order }).then(({ error }) => { if (error) loadColumns(); });
  }, [columns.length, userId, loadColumns]);

  const removeColumn = useCallback((id: string) => {
    setColumns(prev => prev.filter(c => c.id !== id).map((c, i) => ({ ...c, order: i })));
    if (userId) supabase.from("kanban_columns").delete().eq("user_id", userId).eq("column_key", id).then(({ error }) => { if (error) loadColumns(); });
  }, [userId, loadColumns]);

  const renameColumn = useCallback((id: string, title: string) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, title } : c));
    if (userId) supabase.from("kanban_columns").update({ title }).eq("user_id", userId).eq("column_key", id).then(({ error }) => { if (error) loadColumns(); });
  }, [userId, loadColumns]);

  const resetColumns = useCallback(() => {
    setColumns(DEFAULT_KANBAN_COLUMNS);
    if (userId) supabase.from("kanban_columns").delete().eq("user_id", userId).then(() => loadColumns());
  }, [userId, loadColumns]);

  return { columns, addColumn, removeColumn, renameColumn, resetColumns };
}
