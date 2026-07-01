import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Note } from "@/types/note";
import { TaskAttachment } from "@/types/task";

type NoteRow = {
  id: string; user_id: string; title: string; content: string; category: string;
  project_id: string | null; color: string | null; pinned: boolean; sort_order: number;
  created_at: string; updated_at: string; attachments: unknown;
};

const fromRow = (r: NoteRow): Note => ({
  id: r.id,
  title: r.title,
  content: r.content,
  category: r.category,
  projectId: r.project_id || undefined,
  color: r.color || undefined,
  pinned: r.pinned,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  attachments: Array.isArray(r.attachments) ? (r.attachments as TaskAttachment[]) : [],
});

export function useNotes(userId?: string) {
  const [notes, setNotes] = useState<Note[]>([]);

  const load = useCallback(async () => {
    if (!userId) { setNotes([]); return; }
    const { data } = await supabase
      .from("notes").select("*").eq("user_id", userId)
      .order("pinned", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false });
    setNotes(((data || []) as NoteRow[]).map(fromRow));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notes-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, load]);

  const addNote = useCallback((options?: Partial<Omit<Note, "id" | "createdAt" | "updatedAt">>) => {
    if (!userId) return null;
    const now = new Date().toISOString();
    const optimistic: Note = {
      id: crypto.randomUUID(),
      title: options?.title ?? "",
      content: options?.content ?? "",
      category: options?.category || "General",
      projectId: options?.projectId,
      color: options?.color,
      pinned: options?.pinned ?? false,
      sortOrder: options?.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [optimistic, ...prev]);
    supabase.from("notes").insert({
      id: optimistic.id,
      user_id: userId,
      title: optimistic.title,
      content: optimistic.content,
      category: optimistic.category,
      project_id: optimistic.projectId || null,
      color: optimistic.color || null,
      pinned: optimistic.pinned,
      sort_order: optimistic.sortOrder,
      attachments: (optimistic.attachments ?? []) as never,
    }).then(({ error }) => { if (error) load(); });
    return optimistic;
  }, [userId, load]);

  const updateNote = useCallback((id: string, updates: Partial<Omit<Note, "id" | "createdAt">>) => {
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
    if (!userId) return;
    const payload: Partial<{
      title: string; content: string; category: string;
      project_id: string | null; color: string | null;
      pinned: boolean; sort_order: number;
      attachments: Json;
    }> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.content !== undefined) payload.content = updates.content;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.projectId !== undefined) payload.project_id = updates.projectId || null;
    if (updates.color !== undefined) payload.color = updates.color || null;
    if (updates.pinned !== undefined) payload.pinned = updates.pinned;
    if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;
    if (updates.attachments !== undefined) payload.attachments = JSON.parse(JSON.stringify(updates.attachments)) as Json;
    supabase.from("notes").update(payload).eq("id", id).eq("user_id", userId).then(({ error }) => { if (error) load(); });
  }, [userId, load]);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (userId) supabase.from("notes").delete().eq("id", id).eq("user_id", userId).then(({ error }) => { if (error) load(); });
  }, [userId, load]);

  return { notes, addNote, updateNote, deleteNote };
}