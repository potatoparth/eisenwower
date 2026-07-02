import { useState, useEffect } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Save, X, LayoutTemplate, Target, Tag, CalendarClock, FileText, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ProjectTemplatePreset, PresetTask } from "@/types/project";
import { QUADRANTS, Quadrant } from "@/types/task";
import { DateTimePicker } from "@/components/DateTimePicker";
import { format, parseISO } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presets: ProjectTemplatePreset[];
  categories?: string[];
  onAdd: (name: string, description?: string, tasks?: PresetTask[]) => Promise<ProjectTemplatePreset | null> | ProjectTemplatePreset | null;
  onUpdate: (id: string, updates: Partial<Omit<ProjectTemplatePreset, "id" | "createdAt">>) => void;
  onDelete: (id: string) => void;
}

const emptyTask = (): PresetTask => ({
  id: crypto.randomUUID(),
  name: "",
  dependencyType: "async",
  dependsOn: [],
  durationDays: 1,
});

export function ProjectTemplatesDialog({ open, onOpenChange, presets, categories = [], onAdd, onUpdate, onDelete }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftTasks, setDraftTasks] = useState<PresetTask[]>([]);
  const [dirty, setDirty] = useState(false);

  const selected = presets.find(p => p.id === selectedId) || null;

  useEffect(() => {
    if (!open) return;
    if (selected) {
      setDraftName(selected.name);
      setDraftDesc(selected.description || "");
      setDraftTasks(selected.tasks.map(t => ({ ...t })));
      setDirty(false);
    } else {
      setDraftName(""); setDraftDesc(""); setDraftTasks([]); setDirty(false);
    }
  }, [selectedId, open, selected?.updatedAt]);

  useEffect(() => {
    if (!open) { setSelectedId(null); }
  }, [open]);

  const patchTask = (id: string, updates: Partial<PresetTask>) => {
    setDraftTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    setDirty(true);
  };
  const removeTask = (id: string) => {
    setDraftTasks(prev => prev.filter(t => t.id !== id).map(t => ({ ...t, dependsOn: t.dependsOn.filter(d => d !== id) })));
    setDirty(true);
  };
  const move = (id: string, dir: -1 | 1) => {
    setDraftTasks(prev => {
      const idx = prev.findIndex(t => t.id === id);
      if (idx < 0) return prev;
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy;
    });
    setDirty(true);
  };
  const addTask = () => { setDraftTasks(prev => [...prev, emptyTask()]); setDirty(true); };

  const save = async () => {
    if (!draftName.trim()) return;
    if (selected) {
      onUpdate(selected.id, { name: draftName.trim(), description: draftDesc.trim() || undefined, tasks: draftTasks });
    } else {
      const p = await onAdd(draftName.trim(), draftDesc.trim() || undefined, draftTasks);
      if (p) setSelectedId(p.id);
    }
    setDirty(false);
  };

  const startNew = () => { setSelectedId(null); setDraftName(""); setDraftDesc(""); setDraftTasks([]); setDirty(true); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" /> Project Templates
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[220px_1fr]">
          {/* Sidebar */}
          <aside className="border-r border-border overflow-y-auto p-3 space-y-1 bg-secondary/20">
            <Button size="sm" variant="outline" className="w-full justify-start gap-1 mb-2" onClick={startNew}>
              <Plus className="w-3.5 h-3.5" /> New template
            </Button>
            {presets.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-4 text-center">No templates yet.</p>
            )}
            {presets.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  "w-full text-left px-2.5 py-2 rounded-lg text-sm transition-colors",
                  selectedId === p.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                )}
              >
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-[11px] opacity-70">{p.tasks.length} task{p.tasks.length === 1 ? "" : "s"}</div>
              </button>
            ))}
          </aside>

          {/* Editor */}
          <section className="min-h-0 flex flex-col">
            <div className="p-4 space-y-3 border-b border-border">
              <Input
                placeholder="Template name"
                value={draftName}
                onChange={(e) => { setDraftName(e.target.value); setDirty(true); }}
              />
              <Textarea
                placeholder="Description (optional)"
                value={draftDesc}
                onChange={(e) => { setDraftDesc(e.target.value); setDirty(true); }}
                rows={2}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Tasks · {draftTasks.length}
                </p>
                <Button size="sm" variant="outline" className="gap-1" onClick={addTask}>
                  <Plus className="w-3.5 h-3.5" /> Add task
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {draftTasks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10">
                  No tasks yet. Add the steps this template should prefill.
                </p>
              )}
              {draftTasks.map((t, idx) => (
                <PresetTaskRow
                  key={t.id}
                  task={t}
                  index={idx}
                  total={draftTasks.length}
                  categories={categories}
                  onPatch={(u) => patchTask(t.id, u)}
                  onRemove={() => removeTask(t.id)}
                  onMove={(d) => move(t.id, d)}
                />
              ))}
            </div>

            <div className="border-t border-border p-3 flex items-center justify-between gap-2">
              <div>
                {selected && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => { onDelete(selected.id); setSelectedId(null); }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete template
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
                  <X className="w-3.5 h-3.5 mr-1" /> Close
                </Button>
                <Button size="sm" onClick={save} disabled={!draftName.trim() || !dirty}>
                  <Save className="w-3.5 h-3.5 mr-1" /> {selected ? "Save changes" : "Create template"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}