import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  KanbanBoard, KanbanColumn, KanbanBoardItem,
  MAX_KANBAN_BOARDS, MAX_KANBAN_COLUMNS_PER_BOARD,
} from "@/types/project";
import { toast } from "@/hooks/use-toast";

export function useKanbanBoards(userId?: string) {
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [columnsByBoard, setColumnsByBoard] = useState<Record<string, KanbanColumn[]>>({});
  const [itemsByBoard, setItemsByBoard] = useState<Record<string, KanbanBoardItem[]>>({});

  const load = useCallback(async () => {
    if (!userId) { setBoards([]); setColumnsByBoard({}); setItemsByBoard({}); return; }
    const [{ data: b }, { data: c }, { data: i }] = await Promise.all([
      supabase.from("kanban_boards").select("id,name,sort_order").eq("user_id", userId).order("sort_order"),
      supabase.from("kanban_columns").select("board_id,column_key,title,sort_order").order("sort_order"),
      supabase.from("kanban_board_items").select("id,board_id,task_id,column_key,sort_order").eq("user_id", userId),
    ]);
    setBoards((b || []).map(r => ({ id: r.id, name: r.name, order: r.sort_order })));
    const cMap: Record<string, KanbanColumn[]> = {};
    (c || []).forEach(r => {
      (cMap[r.board_id] ||= []).push({ id: r.column_key, title: r.title, order: r.sort_order });
    });
    setColumnsByBoard(cMap);
    const iMap: Record<string, KanbanBoardItem[]> = {};
    (i || []).forEach(r => {
      (iMap[r.board_id] ||= []).push({
        id: r.id, boardId: r.board_id, taskId: r.task_id,
        columnKey: r.column_key, sortOrder: r.sort_order,
      });
    });
    setItemsByBoard(iMap);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel(`kanban-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "kanban_boards" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "kanban_columns" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "kanban_board_items" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, load]);

  const createBoard = useCallback(async (name: string, columnTitles: string[]): Promise<string | undefined> => {
    if (!userId) return;
    if (boards.length >= MAX_KANBAN_BOARDS) {
      toast({ title: `Max ${MAX_KANBAN_BOARDS} kanban boards reached` });
      return;
    }
    const titles = columnTitles.map(t => t.trim()).filter(Boolean).slice(0, MAX_KANBAN_COLUMNS_PER_BOARD);
    if (!titles.length) return;
    const { data, error } = await supabase.from("kanban_boards")
      .insert({ user_id: userId, name: name.trim() || "Untitled board", sort_order: boards.length })
      .select("id").single();
    if (error || !data) { toast({ title: "Couldn't create board" }); return; }
    const boardId = data.id;
    const cols = titles.map((t, idx) => ({
      board_id: boardId, column_key: crypto.randomUUID(), title: t, sort_order: idx,
    }));
    await supabase.from("kanban_columns").insert(cols);
    await load();
    return boardId;
  }, [boards.length, userId, load]);

  const renameBoard = useCallback(async (boardId: string, name: string) => {
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, name } : b));
    if (userId) await supabase.from("kanban_boards").update({ name }).eq("id", boardId);
  }, [userId]);

  const deleteBoard = useCallback(async (boardId: string) => {
    setBoards(prev => prev.filter(b => b.id !== boardId));
    if (userId) await supabase.from("kanban_boards").delete().eq("id", boardId);
  }, [userId]);

  const addColumn = useCallback(async (boardId: string, title: string) => {
    const cols = columnsByBoard[boardId] || [];
    if (cols.length >= MAX_KANBAN_COLUMNS_PER_BOARD) {
      toast({ title: `Max ${MAX_KANBAN_COLUMNS_PER_BOARD} columns per board` });
      return;
    }
    await supabase.from("kanban_columns").insert({
      board_id: boardId, column_key: crypto.randomUUID(), title: title.trim() || "Untitled",
      sort_order: cols.length,
    });
    await load();
  }, [columnsByBoard, load]);

  const renameColumn = useCallback(async (boardId: string, columnKey: string, title: string) => {
    setColumnsByBoard(prev => ({
      ...prev,
      [boardId]: (prev[boardId] || []).map(c => c.id === columnKey ? { ...c, title } : c),
    }));
    await supabase.from("kanban_columns").update({ title }).eq("board_id", boardId).eq("column_key", columnKey);
  }, []);

  const removeColumn = useCallback(async (boardId: string, columnKey: string) => {
    setColumnsByBoard(prev => ({
      ...prev,
      [boardId]: (prev[boardId] || []).filter(c => c.id !== columnKey),
    }));
    setItemsByBoard(prev => ({
      ...prev,
      [boardId]: (prev[boardId] || []).filter(i => i.columnKey !== columnKey),
    }));
    await supabase.from("kanban_board_items").delete().eq("board_id", boardId).eq("column_key", columnKey);
    await supabase.from("kanban_columns").delete().eq("board_id", boardId).eq("column_key", columnKey);
  }, []);

  const assignTasks = useCallback(async (boardId: string, columnKey: string, taskIds: string[]) => {
    if (!userId || !taskIds.length) return;
    const rows = taskIds.map((tid, idx) => ({
      user_id: userId, board_id: boardId, task_id: tid, column_key: columnKey, sort_order: idx,
    }));
    // Delete existing entries first (a task can only sit in one column per board).
    await supabase.from("kanban_board_items").delete().eq("board_id", boardId).in("task_id", taskIds);
    await supabase.from("kanban_board_items").insert(rows);
    await load();
  }, [userId, load]);

  const moveItem = useCallback(async (boardId: string, taskId: string, columnKey: string) => {
    setItemsByBoard(prev => ({
      ...prev,
      [boardId]: (prev[boardId] || []).map(i => i.taskId === taskId ? { ...i, columnKey } : i),
    }));
    await supabase.from("kanban_board_items").update({ column_key: columnKey })
      .eq("board_id", boardId).eq("task_id", taskId);
  }, []);

  const removeItem = useCallback(async (boardId: string, taskId: string) => {
    setItemsByBoard(prev => ({
      ...prev,
      [boardId]: (prev[boardId] || []).filter(i => i.taskId !== taskId),
    }));
    await supabase.from("kanban_board_items").delete().eq("board_id", boardId).eq("task_id", taskId);
  }, []);

  return {
    boards, columnsByBoard, itemsByBoard,
    createBoard, renameBoard, deleteBoard,
    addColumn, renameColumn, removeColumn,
    assignTasks, moveItem, removeItem,
  };
}