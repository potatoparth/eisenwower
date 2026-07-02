import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProjectTemplatePreset, PresetTask } from "@/types/project";

type Row = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  tasks: unknown;
  created_at: string;
  updated_at: string;
};

const fromRow = (row: Row): ProjectTemplatePreset => ({
  id: row.id,
  name: row.name,
  description: row.description || undefined,
  tasks: Array.isArray(row.tasks) ? (row.tasks as PresetTask[]) : [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function useProjectTemplatePresets(userId?: string) {
  const [presets, setPresets] = useState<ProjectTemplatePreset[]>([]);

  const load = useCallback(async () => {
    if (!userId) { setPresets([]); return; }
    const { data } = await supabase
      .from("project_template_presets")
      .select("*")
      .order("created_at", { ascending: false });
    setPresets(((data || []) as Row[]).map(fromRow));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`template-presets-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_template_presets" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, load]);

  const addPreset = useCallback(async (name: string, description?: string, tasks: PresetTask[] = []) => {
    if (!userId) return null;
    const id = crypto.randomUUID();
    const preset: ProjectTemplatePreset = {
      id, name, description, tasks,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    setPresets(prev => [preset, ...prev]);
    const { error } = await supabase.from("project_template_presets").insert({
      id, user_id: userId, name, description: description || null, tasks: tasks as unknown as never,
    });
    if (error) load();
    return preset;
  }, [userId, load]);

  const updatePreset = useCallback(async (id: string, updates: Partial<Omit<ProjectTemplatePreset, "id" | "createdAt">>) => {
    setPresets(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
    if (!userId) return;
    const patch: { name?: string; description?: string | null; tasks?: unknown } = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.description !== undefined) patch.description = updates.description || null;
    if (updates.tasks !== undefined) patch.tasks = updates.tasks;
    const { error } = await supabase.from("project_template_presets").update(patch as never).eq("id", id);
    if (error) load();
  }, [userId, load]);

  const deletePreset = useCallback(async (id: string) => {
    setPresets(prev => prev.filter(p => p.id !== id));
    if (!userId) return;
    const { error } = await supabase.from("project_template_presets").delete().eq("id", id);
    if (error) load();
  }, [userId, load]);

  return { presets, addPreset, updatePreset, deletePreset };
}