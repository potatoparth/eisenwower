import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Note } from "@/types/note";
import { TaskAttachment } from "@/types/task";
import { toast } from "@/hooks/use-toast";

type NoteRow = {
  id: string; user_id: string; title: string; content: string;
  project_id: string | null; color: string | null; pinned: boolean; sort_order: number;
  created_at: string; updated_at: string; attachments: unknown;
  created_by?: string | null; updated_by?: string | null; assigned_to?: string | null;
};

const fromRow = (r: NoteRow): Note => ({
  id: r.id,
  title: r.title,
  content: r.content,
  // Derived (leaf project name) — enriched in the page.
  category: "",
  projectId: r.project_id || undefined,
  color: r.color || undefined,
  pinned: r.pinned,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  userId: r.user_id,
  attachments: Array.isArray(r.attachments) ? (r.attachments as TaskAttachment[]) : [],
  createdBy: r.created_by || undefined,
  updatedBy: r.updated_by || undefined,
  assignedTo: r.assigned_to || undefined,
});

export function useNotes(userId?: string) {
  const [notes, setNotes] = useState<Note[]>([]);

  const load = useCallback(async () => {
    if (!userId) { setNotes([]); return; }
    // RLS returns own notes + notes on projects shared with the user.
    const { data } = await supabase
      .from("notes").select("*")
      .order("pinned", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false });
    setNotes(((data || []) as unknown as NoteRow[]).map(fromRow));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    // No user_id filter — collaborators receive events for shared notes too.
    // RLS restricts what a subsequent load returns.
    const channel = supabase
      .channel(`notes-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, load]);

  const addNote = useCallback((options?: Partial<Omit<Note, "createdAt" | "updatedAt">>) => {
    if (!userId) return null;
    const now = new Date().toISOString();
    const optimistic: Note = {
      id: options?.id ?? crypto.randomUUID(),
      title: options?.title ?? "",
      content: options?.content ?? "",
      category: options?.category || "General",
      projectId: options?.projectId,
      color: options?.color,
      pinned: options?.pinned ?? false,
      sortOrder: options?.sortOrder ?? 0,
      attachments: options?.attachments ?? [],
      createdAt: now,
      updatedAt: now,
      userId: userId,
    };
    setNotes((prev) => [optimistic, ...prev]);
    supabase.from("notes").insert({
      id: optimistic.id,
      user_id: userId,
      title: optimistic.title,
      content: optimistic.content,
      project_id: optimistic.projectId || null,
      color: optimistic.color || null,
      pinned: optimistic.pinned,
      sort_order: optimistic.sortOrder,
      attachments: (optimistic.attachments ?? []) as never,
    }).then(({ error }) => {
      if (error) {
        toast({ title: "Couldn't save note", description: error.message, variant: "destructive" });
        load();
      }
    });
    return optimistic;
  }, [userId, load]);

  const updateNote = useCallback((id: string, updates: Partial<Omit<Note, "id" | "createdAt">>) => {
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
    if (!userId) return;
    const payload: Partial<{
      title: string; content: string;
      project_id: string | null; color: string | null;
      pinned: boolean; sort_order: number;
      attachments: Json;
    }> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.content !== undefined) payload.content = updates.content;
    if (updates.projectId !== undefined) payload.project_id = updates.projectId || null;
    if (updates.color !== undefined) payload.color = updates.color || null;
    if (updates.pinned !== undefined) payload.pinned = updates.pinned;
    if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;
    if (updates.attachments !== undefined) payload.attachments = JSON.parse(JSON.stringify(updates.attachments)) as Json;
    if (updates.assignedTo !== undefined) (payload as Record<string, unknown>).assigned_to = updates.assignedTo || null;
    supabase.from("notes").update(payload).eq("id", id).then(({ error }) => {
      if (error) {
        toast({ title: "Couldn't update note", description: error.message, variant: "destructive" });
        load();
      }
    });
  }, [userId, load]);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (userId) supabase.from("notes").delete().eq("id", id).then(({ error }) => {
      if (error) {
        toast({ title: "Couldn't delete note", description: error.message, variant: "destructive" });
        load();
      }
    });
  }, [userId, load]);

  return { notes, addNote, updateNote, deleteNote };
}