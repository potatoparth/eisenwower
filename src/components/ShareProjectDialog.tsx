import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Link2, Loader2, Share2, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ProjectTemplate, ProjectTask } from "@/types/project";
import { Task } from "@/types/task";
import { Note } from "@/types/note";

type Role = "editor" | "viewer";
type Scope = "all" | "selected";

interface Collaborator {
  id: string;
  user_id: string;
  role: string;
  scope: string;
  display_name: string | null;
  email: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectTemplate;
  projectTasks: ProjectTask[];
  matrixTasks: Task[];
  notes: Note[];
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function ShareProjectDialog({ open, onOpenChange, project, matrixTasks, notes }: Props) {
  const [role, setRole] = useState<Role>("editor");
  const [scope, setScope] = useState<Scope>("all");
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingCollab, setLoadingCollab] = useState(false);

  const reset = useCallback(() => {
    setRole("editor"); setScope("all"); setSelectedTasks(new Set());
    setSelectedNotes(new Set()); setInviteUrl(null);
  }, []);

  const loadCollaborators = useCallback(async () => {
    setLoadingCollab(true);
    const { data, error } = await supabase.rpc("list_project_collaborators", { _project_id: project.id });
    setLoadingCollab(false);
    if (error) return;
    setCollaborators((data ?? []) as unknown as Collaborator[]);
  }, [project.id]);

  useEffect(() => {
    if (open) { reset(); loadCollaborators(); }
  }, [open, reset, loadCollaborators]);

  // Live updates while the dialog is open.
  useEffect(() => {
    if (!open) return;
    const channel = supabase
      .channel(`share-${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_collaborators", filter: `project_id=eq.${project.id}` }, loadCollaborators)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, project.id, loadCollaborators]);

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  };

  const generate = async () => {
    if (scope === "selected" && selectedTasks.size === 0 && selectedNotes.size === 0) {
      toast({ title: "Pick at least one task or note" }); return;
    }
    setCreating(true);
    const token = randomToken();
    const item_ids = scope === "selected"
      ? [
          ...Array.from(selectedTasks).map((id) => ({ type: "task", id })),
          ...Array.from(selectedNotes).map((id) => ({ type: "note", id })),
        ]
      : [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); toast({ title: "Sign in required" }); return; }
    const { error } = await supabase.from("project_invites").insert({
      token, project_id: project.id, role, scope, item_ids, created_by: user.id,
    });
    setCreating(false);
    if (error) { toast({ title: "Could not create invite", description: error.message }); return; }
    const url = `${window.location.origin}/join/${token}`;
    setInviteUrl(url);
  };

  const copy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(() => toast({ title: "Link copied" }));
  };

  const revoke = async (userId: string) => {
    // Remove collaborator + any shared items
    await Promise.all([
      supabase.from("project_collaborators").delete().eq("project_id", project.id).eq("user_id", userId),
      supabase.from("project_shared_items").delete().eq("project_id", project.id).eq("collaborator_user_id", userId),
    ]);
    toast({ title: "Access revoked" });
    loadCollaborators();
  };

  const changeRole = async (userId: string, next: Role) => {
    await supabase.from("project_collaborators").update({ role: next }).eq("project_id", project.id).eq("user_id", userId);
    loadCollaborators();
  };

  const allItemIds = useMemo(() => ({
    tasks: matrixTasks.map((t) => t.id),
    notes: notes.map((n) => n.id),
  }), [matrixTasks, notes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Share2 className="w-4 h-4" /> Share "{project.name}"</DialogTitle>
          <DialogDescription>Generate an invite link, choose what to share, and manage who has access.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor · can add/edit/remove</SelectItem>
                  <SelectItem value="viewer">Viewer · read only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Scope</label>
              <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tasks &amp; notes</SelectItem>
                  <SelectItem value="selected">Pick specific items</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {scope === "selected" && (
            <div className="rounded-lg border border-border p-3 space-y-3 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tasks · {matrixTasks.length}</span>
                <button className="text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedTasks(selectedTasks.size === allItemIds.tasks.length ? new Set() : new Set(allItemIds.tasks))}>
                  {selectedTasks.size === allItemIds.tasks.length ? "Clear" : "Select all"}
                </button>
              </div>
              <div className="space-y-1">
                {matrixTasks.length === 0 && <p className="text-xs text-muted-foreground italic">No tasks yet.</p>}
                {matrixTasks.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-secondary/50 rounded px-1.5 py-1">
                    <Checkbox checked={selectedTasks.has(t.id)} onCheckedChange={() => setSelectedTasks((s) => toggle(s, t.id))} />
                    <span className="truncate flex-1">{t.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes · {notes.length}</span>
                <button className="text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedNotes(selectedNotes.size === allItemIds.notes.length ? new Set() : new Set(allItemIds.notes))}>
                  {selectedNotes.size === allItemIds.notes.length ? "Clear" : "Select all"}
                </button>
              </div>
              <div className="space-y-1">
                {notes.length === 0 && <p className="text-xs text-muted-foreground italic">No notes yet.</p>}
                {notes.map((n) => (
                  <label key={n.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-secondary/50 rounded px-1.5 py-1">
                    <Checkbox checked={selectedNotes.has(n.id)} onCheckedChange={() => setSelectedNotes((s) => toggle(s, n.id))} />
                    <span className="truncate flex-1">{n.title || n.content.slice(0, 40) || "Untitled note"}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {inviteUrl ? (
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link2 className="w-3 h-3" /> Invite link (expires in 7 days)
              </div>
              <div className="flex gap-2">
                <Input readOnly value={inviteUrl} className="text-xs" />
                <Button size="sm" onClick={copy}><Copy className="w-3.5 h-3.5" /></Button>
              </div>
              <Button size="sm" variant="ghost" onClick={reset}>Create another</Button>
            </div>
          ) : (
            <Button onClick={generate} disabled={creating} className="w-full">
              {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</> : <>Generate invite link</>}
            </Button>
          )}

          <div className="pt-2 border-t border-border">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              People with access {collaborators.length > 0 && `· ${collaborators.length}`}
            </h4>
            {loadingCollab ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : collaborators.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Only you.</p>
            ) : (
              <div className="space-y-1">
                {collaborators.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{c.display_name || c.email || "Unknown"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {c.email} · {c.scope === "all" ? "all items" : "selected items"}
                      </p>
                    </div>
                    <Select value={c.role} onValueChange={(v) => changeRole(c.user_id, v as Role)}>
                      <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => revoke(c.user_id)} title="Revoke access">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}