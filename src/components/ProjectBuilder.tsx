import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChevronRight, ChevronDown, ArrowRight, ArrowDown, FolderOpen, Save, Edit2, Check, X, Link, Unlink, SquarePen, StickyNote, Search, Share2, Eye, LayoutTemplate, ChevronsDownUp, ChevronsUpDown, PanelLeft } from "lucide-react";
import { ProjectTemplate, ProjectTask, ProjectTemplatePreset, PresetTask } from "@/types/project";
import { buildProjectTree, flattenProjectTree, indexProjectNodes, getDescendantIds, wouldCreateCycle, searchProjectTree } from "@/lib/projectTree";
import { ShareProjectDialog } from "@/components/ShareProjectDialog";
import { ProjectTemplatesDialog } from "@/components/ProjectTemplatesDialog";
import { Task, Quadrant, QuadrantInfo } from "@/types/task";
import { Note, noteColorFor } from "@/types/note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type TaskAddOptions, type TaskInputPickerProps } from "@/components/TaskInput";
import { TaskActionBar } from "@/components/TaskActionBar";
import { NoteComposer } from "@/components/NotesView";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectBuilderProps {
  projects: ProjectTemplate[];
  allTasks?: Task[];
  allNotes?: Note[];
  getProjectRole?: (projectId: string) => "owner" | "editor" | "viewer" | undefined;
  onAddNote?: (options?: Partial<Note>) => Note | null;
  onUpdateNote?: (id: string, updates: Partial<Note>) => void;
  onDeleteNote?: (id: string) => void;
  onAddProject: (name: string, description?: string, parentId?: string | null) => ProjectTemplate;
  onUpdateProject: (id: string, updates: Partial<Omit<ProjectTemplate, "id" | "createdAt">>) => void;
  onDeleteProject: (id: string) => void;
  onAddTask: (projectId: string, task: Omit<ProjectTask, "id" | "order">) => void;
  onUpdateTask: (projectId: string, taskId: string, updates: Partial<ProjectTask>) => void;
  onDeleteTask: (projectId: string, taskId: string) => void;
  // Matrix-style task creation (creates a real Task tied to this project).
  onAddMatrixTask?: (name: string, quadrant: Quadrant, options?: TaskAddOptions) => void;
  quadrants?: QuadrantInfo[];
  categories?: string[];
  onCreateCategory?: TaskInputPickerProps["onCreateCategory"];
  onCreateProject?: TaskInputPickerProps["onCreateProject"];
  recentCategories?: TaskInputPickerProps["recentCategories"];
  recentProjectIds?: TaskInputPickerProps["recentProjectIds"];
  onSelectTask?: (task: Task) => void;
  onDeleteAllDone?: () => void;
  onRescheduleTasks?: (ids: string[], newDueDate: string) => void;
  templatePresets?: ProjectTemplatePreset[];
  onAddPreset?: (name: string, description?: string, tasks?: PresetTask[]) => Promise<ProjectTemplatePreset | null> | ProjectTemplatePreset | null;
  onUpdatePreset?: (id: string, updates: Partial<Omit<ProjectTemplatePreset, "id" | "createdAt">>) => void;
  onDeletePreset?: (id: string) => void;
}

export function ProjectBuilder({
  projects, allTasks = [], allNotes = [], onAddNote, onUpdateNote, onDeleteNote,
  onAddProject, onUpdateProject, onDeleteProject,
  onAddTask, onUpdateTask, onDeleteTask,
  onAddMatrixTask, quadrants, categories = [], onCreateCategory, onCreateProject,
  recentCategories, recentProjectIds,
  onSelectTask, onDeleteAllDone, onRescheduleTasks,
  getProjectRole,
  templatePresets = [], onAddPreset, onUpdatePreset, onDeletePreset,
}: ProjectBuilderProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectPresetId, setNewProjectPresetId] = useState<string>("__none__");
  const [showNewProject, setShowNewProject] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"create" | "edit">("create");
  const [noteSearchMode, setNoteSearchMode] = useState(false);
  const [noteQuery, setNoteQuery] = useState("");
  const [notePopoverOpen, setNotePopoverOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [collapsedProjectIds, setCollapsedProjectIds] = useState<Set<string>>(new Set());
  const [dragProjectId, setDragProjectId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | "__root__" | null>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedRole = selectedProject ? (getProjectRole?.(selectedProject.id) ?? "owner") : undefined;
  const isOwner = selectedRole === "owner";
  const canEdit = selectedRole === "owner" || selectedRole === "editor";
  // Descendants roll up to their ancestor: viewing a parent project shows tasks/notes
  // from every subproject too.
  const projectTree = useMemo(() => buildProjectTree(projects), [projects]);
  const projectNodeIndex = useMemo(() => indexProjectNodes(projectTree), [projectTree]);
  const allParentIds = useMemo(
    () => flattenProjectTree(projectTree).filter((n) => n.children.length > 0).map((n) => n.project.id),
    [projectTree],
  );
  const toggleCollapseProject = (id: string) =>
    setCollapsedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const collapseAllProjects = () => setCollapsedProjectIds(new Set(allParentIds));
  const expandAllProjects = () => setCollapsedProjectIds(new Set());
  const descendantIds = useMemo(
    () => selectedProject ? new Set(getDescendantIds(projectNodeIndex, selectedProject.id)) : new Set<string>(),
    [projectNodeIndex, selectedProject],
  );
  const mappedTasks = selectedProject ? allTasks.filter(t => t.projectId && descendantIds.has(t.projectId)) : [];
  const mappedNotes = selectedProject ? allNotes.filter(n => n.projectId && descendantIds.has(n.projectId)) : [];
  const filteredMappedNotes = useMemo(() => {
    const q = noteQuery.trim().toLowerCase();
    if (!q) return mappedNotes;
    return mappedNotes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      (n.category || "").toLowerCase().includes(q)
    );
  }, [mappedNotes, noteQuery]);
  const editingNote = editingNoteId ? mappedNotes.find(n => n.id === editingNoteId) ?? null : null;

  const openCreateNote = () => { setEditingNoteId(null); setComposerMode("create"); setComposerOpen(true); };
  const openEditNote = (n: Note) => { setEditingNoteId(n.id); setComposerMode("edit"); setComposerOpen(true); };
  const closeComposer = () => { setComposerOpen(false); setEditingNoteId(null); };

  const [newProjectParentId, setNewProjectParentId] = useState<string | null>(null);
  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const p = onAddProject(newProjectName.trim(), newProjectDesc.trim() || undefined, newProjectParentId);
    // If a template was selected, prefill tasks (preserving dependsOn wiring via id remap).
    const preset = templatePresets.find(tp => tp.id === newProjectPresetId);
    if (preset && preset.tasks.length > 0) {
      const idMap = new Map<string, string>();
      preset.tasks.forEach(t => idMap.set(t.id, crypto.randomUUID()));
      preset.tasks.forEach(t => {
        onAddTask(p.id, {
          name: t.name,
          description: t.description,
          dependencyType: t.dependencyType,
          dependsOn: t.dependsOn.map(id => idMap.get(id)).filter(Boolean) as string[],
          durationDays: t.durationDays,
          status: "pending",
        });
      });
    }
    setSelectedProjectId(p.id);
    setNewProjectName("");
    setNewProjectDesc("");
    setNewProjectPresetId("__none__");
    setShowNewProject(false);
  };

  const handleAddMatrixTask = (name: string, quadrant: Quadrant, options?: TaskAddOptions) => {
    if (!selectedProjectId || !onAddMatrixTask) return;
    onAddMatrixTask(name, quadrant, { ...options, projectId: selectedProjectId });
  };

  const renderProjectTreeNode = (n: ReturnType<typeof buildProjectTree>[number]): JSX.Element => {
    const p = n.project;
    const active = selectedProjectId === p.id;
    const hasChildren = n.children.length > 0;
    const isCollapsed = collapsedProjectIds.has(p.id);
    const count =
      p.tasks.length +
      allTasks.filter((t) => t.projectId === p.id).length +
      allNotes.filter((n2) => n2.projectId === p.id).length;
    const canEditThis = (getProjectRole?.(p.id) ?? "owner") !== "viewer";
    const isDragTarget = dropTargetId === p.id;
    const invalidDrop =
      dragProjectId != null &&
      isDragTarget &&
      (dragProjectId === p.id || wouldCreateCycle(projectNodeIndex, dragProjectId, p.id));
    return (
      <div key={p.id} className="relative">
        <div
          draggable={canEditThis}
          onDragStart={(e) => {
            setDragProjectId(p.id);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", p.id);
          }}
          onDragEnd={() => { setDragProjectId(null); setDropTargetId(null); }}
          onDragOver={(e) => {
            if (!dragProjectId || dragProjectId === p.id) return;
            if (wouldCreateCycle(projectNodeIndex, dragProjectId, p.id)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (dropTargetId !== p.id) setDropTargetId(p.id);
          }}
          onDragLeave={(e) => {
            // Only clear if leaving the row itself (not entering a child).
            const related = e.relatedTarget as Node | null;
            if (!related || !(e.currentTarget as Node).contains(related)) {
              if (dropTargetId === p.id) setDropTargetId(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            const id = dragProjectId ?? e.dataTransfer.getData("text/plain");
            setDragProjectId(null); setDropTargetId(null);
            if (!id || id === p.id) return;
            if (wouldCreateCycle(projectNodeIndex, id, p.id)) return;
            const moving = projectNodeIndex.get(id)?.project;
            if (!moving || moving.parentId === p.id) return;
            onUpdateProject(id, { parentId: p.id });
            // Auto-expand the new parent so the moved node is visible.
            setCollapsedProjectIds((prev) => {
              const next = new Set(prev);
              next.delete(p.id);
              return next;
            });
          }}
          className={cn(
            "group flex items-center gap-1 rounded-lg pr-1 py-1 text-sm transition-colors cursor-grab active:cursor-grabbing",
            active ? "bg-primary/15 text-foreground" : "hover:bg-secondary/60 text-muted-foreground",
            isDragTarget && !invalidDrop && "ring-2 ring-primary/60 bg-primary/10",
            dragProjectId === p.id && "opacity-50",
          )}
          style={{ paddingLeft: n.depth * 16 + 4 }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleCollapseProject(p.id)}
              className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/70 hover:text-foreground hover:bg-secondary/70 flex-shrink-0"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", !isCollapsed && "rotate-90")} />
            </button>
          ) : (
            <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            </span>
          )}
          <button
            type="button"
            onClick={() => setSelectedProjectId(p.id)}
            className={cn(
              "flex-1 min-w-0 text-left truncate px-1.5 py-0.5 rounded-md",
              active && "font-semibold text-foreground",
            )}
            title={n.path.join(" / ")}
          >
            {p.name}
          </button>
          <span
            className={cn(
              "text-[11px] tabular-nums px-1.5 py-0.5 rounded-md flex-shrink-0",
              active ? "bg-primary/25 text-foreground" : "bg-secondary/60 text-muted-foreground",
            )}
          >
            {count}
          </span>
          <button
            title="Add subproject"
            onClick={() => { setNewProjectParentId(p.id); setNewProjectName(""); setNewProjectDesc(""); setShowNewProject(true); }}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {hasChildren && !isCollapsed && (
          <div
            className="relative"
            // guide line for the subtree
            style={{ marginLeft: n.depth * 16 + 12 }}
          >
            <div className="absolute top-0 bottom-1 left-0 w-px bg-border/60" />
            <div className="pl-0">
              {n.children.map((c) => (
                <div key={c.project.id} style={{ marginLeft: -(n.depth * 16 + 12) }}>
                  {renderProjectTreeNode(c)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[320px_1fr] gap-4 lg:h-full lg:min-h-0 pb-24 lg:pb-0">
      {/* Left rail: project directory */}
      <aside className="flex flex-col lg:min-h-0 gap-3 rounded-2xl border border-border/60 bg-card/30 p-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Projects</h2>
          {onAddPreset && onUpdatePreset && onDeletePreset && (
            <Button
              variant="ghost" size="sm"
              className="h-7 px-2 rounded-lg gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => setTemplatesOpen(true)}
            >
              <LayoutTemplate className="w-3.5 h-3.5" /> Templates
            </Button>
          )}
        </div>

        {!showNewProject && (
          <Button
            size="sm"
            className="w-full h-9 rounded-xl gap-1.5 font-semibold"
            onClick={() => { setNewProjectParentId(null); setShowNewProject(true); }}
          >
            <Plus className="w-4 h-4" /> New project
          </Button>
        )}

        {allParentIds.length > 0 && (
          <div className="flex items-center gap-1 px-1">
            <Button
              variant="ghost" size="sm"
              className="h-6 px-1.5 rounded-md gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={expandAllProjects}
              title="Expand all"
            >
              <ChevronsUpDown className="w-3 h-3" /> Expand
            </Button>
            <Button
              variant="ghost" size="sm"
              className="h-6 px-1.5 rounded-md gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={collapseAllProjects}
              title="Collapse all"
            >
              <ChevronsDownUp className="w-3 h-3" /> Collapse
            </Button>
          </div>
        )}

        {projectTree.length > 0 ? (
          <div className="lg:flex-1 lg:min-h-0 flex flex-col">
            <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto max-h-[50vh] overflow-y-auto space-y-0.5 pr-1">
              {projectTree.map((n) => renderProjectTreeNode(n))}
            </div>
            <div
              onDragOver={(e) => {
                if (!dragProjectId) return;
                const moving = projectNodeIndex.get(dragProjectId)?.project;
                if (!moving) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dropTargetId !== "__root__") setDropTargetId("__root__");
              }}
              onDragLeave={() => { if (dropTargetId === "__root__") setDropTargetId(null); }}
              onDrop={(e) => {
                e.preventDefault();
                const id = dragProjectId ?? e.dataTransfer.getData("text/plain");
                setDragProjectId(null); setDropTargetId(null);
                if (!id) return;
                const moving = projectNodeIndex.get(id)?.project;
                if (!moving || moving.parentId == null) return;
                onUpdateProject(id, { parentId: null });
              }}
              className={cn(
                "mt-2 rounded-lg border border-dashed text-[11px] text-muted-foreground py-3 px-3 text-center transition-colors",
                dropTargetId === "__root__"
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : dragProjectId
                    ? "border-primary/40 bg-primary/5 opacity-100"
                    : "border-transparent opacity-0 h-0 py-0 overflow-hidden",
              )}
            >
              ⤴ Drop here to make top-level
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center px-4">
            <p className="text-xs text-muted-foreground">No projects yet.<br/>Create one to get started.</p>
          </div>
        )}
      </aside>

      {/* Right pane: detail workspace */}
      <section className="flex flex-col lg:min-h-0 gap-4">
      {/* New project form */}
      <AnimatePresence>
        {showNewProject && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="bg-card rounded-2xl border border-border p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Input placeholder={newProjectParentId ? "Subproject name" : "Project name"} value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
              {newProjectParentId && (
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  under {projectNodeIndex.get(newProjectParentId)?.path.join(" / ")}
                </span>
              )}
            </div>
            <Textarea placeholder="Description (optional)" value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} rows={2} />
            {templatePresets.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Start from template:</span>
                <Select value={newProjectPresetId} onValueChange={setNewProjectPresetId}>
                  <SelectTrigger className="h-9 w-[240px]">
                    <SelectValue placeholder="None (blank)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (blank)</SelectItem>
                    {templatePresets.map(tp => (
                      <SelectItem key={tp.id} value={tp.id}>
                        {tp.name} · {tp.tasks.length} task{tp.tasks.length === 1 ? "" : "s"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateProject}>Create Project</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowNewProject(false); setNewProjectParentId(null); }}>Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected project */}
      {selectedProject ? (
        <div className="lg:flex-1 flex flex-col gap-4 lg:overflow-hidden rounded-2xl border border-border/60 bg-card/30 p-4 lg:p-5">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-border/50">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xl tracking-tight">{selectedProject.name}</h3>
                {!isOwner && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary text-muted-foreground flex items-center gap-1">
                    {selectedRole === "viewer" ? <><Eye className="w-2.5 h-2.5" /> viewer</> : <>shared · editor</>}
                  </span>
                )}
              </div>
              {selectedProject.description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{selectedProject.description}</p>}
            </div>
            {isOwner && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setShareOpen(true)}>
                  <Share2 className="w-4 h-4 mr-1" /> Share
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { onDeleteProject(selectedProject.id); setSelectedProjectId(null); }}>
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>
            )}
          </div>

          {/* Tasks + Notes side-by-side */}
          <div className="lg:flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:overflow-hidden">
            {/* Tasks column */}
            <div className="lg:min-h-0 flex flex-col">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">
                Tasks · {selectedProject.tasks.length + mappedTasks.length}
              </h4>
              {onAddMatrixTask && canEdit && (
                <div className="mb-3">
                  <TaskActionBar
                    tasks={mappedTasks}
                    onSelectTask={(t) => onSelectTask?.(t)}
                    onDeleteAllDone={() => onDeleteAllDone?.()}
                    onRescheduleTasks={onRescheduleTasks}
                    onAddTask={handleAddMatrixTask}
                    quadrants={quadrants ?? []}
                    categories={categories}
                    projects={projects}
                    defaultProjectId={selectedProject.id}
                    onCreateCategory={onCreateCategory}
                    onCreateProject={onCreateProject}
                    recentCategories={recentCategories}
                    recentProjectIds={recentProjectIds}
                  />
                </div>
              )}
              <div className="lg:flex-1 lg:overflow-y-auto space-y-2 pr-1">
                {selectedProject.tasks.sort((a, b) => a.order - b.order).map((task, idx) => {
              const dependsOnTask = task.dependsOn.length > 0 ? selectedProject.tasks.find(t => t.id === task.dependsOn[0]) : null;
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 bg-card rounded-xl border border-border p-3"
                >
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground font-mono w-5">{idx + 1}</span>
                    {task.dependencyType === "sync" ? (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                        <Link className="w-2.5 h-2.5" /> Sync
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold uppercase bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded">
                        <Unlink className="w-2.5 h-2.5" /> Async
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{task.durationDays}d</span>
                      {dependsOnTask && (
                        <span className="flex items-center gap-0.5">
                          <ArrowRight className="w-3 h-3" /> After: {dependsOnTask.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <Select
                    value={task.status}
                    onValueChange={(v) => onUpdateTask(selectedProject.id, task.id, { status: v as ProjectTask["status"] })}
                  >
                    <SelectTrigger className="w-[110px] h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  {canEdit && (
                    <Button size="icon" variant="ghost" className="w-6 h-6 text-muted-foreground hover:text-destructive" onClick={() => onDeleteTask(selectedProject.id, task.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </motion.div>
              );
                })}

                {mappedTasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => onSelectTask?.(t)}
                    className="w-full text-left flex items-center gap-3 bg-card rounded-xl border border-border p-3 hover:border-primary/50 transition-colors"
                  >
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", t.status === "done" ? "bg-emerald-500" : "bg-primary")} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate", t.status === "done" && "line-through text-muted-foreground")}>{t.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{t.quadrant.replace(/-/g, " ")}</span>
                        {t.category && <span>• {t.category}</span>}
                        {t.dueDate && <span>• due {t.dueDate}</span>}
                      </div>
                    </div>
                  </button>
                ))}

                {selectedProject.tasks.length === 0 && mappedTasks.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No tasks yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes column */}
            <div className="lg:min-h-0 flex flex-col">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">
                Notes · {mappedNotes.length}
              </h4>
              {onAddNote && canEdit && (
                <div className="mb-3 grid w-full grid-cols-[minmax(0,1fr)_2.5rem_2.5rem] items-center gap-2">
                  <div className="min-w-0">
                    <div className="relative mx-auto flex h-12 w-full max-w-2xl items-center rounded-full border border-border/60 bg-secondary/40 px-5">
                      {noteSearchMode ? (
                        <NoteSearchInput
                          value={noteQuery}
                          onChange={setNoteQuery}
                          onEscape={() => { setNoteSearchMode(false); setNoteQuery(""); }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={openCreateNote}
                          className="flex h-full min-w-0 flex-1 items-center text-left text-sm text-muted-foreground/80"
                        >
                          <span aria-hidden className="flex h-8 w-8 items-center justify-center text-muted-foreground/60 -ml-2 mr-1">
                            <StickyNote className="w-4 h-4" strokeWidth={1.75} />
                          </span>
                          <span className="flex-1 truncate">Add a new note...</span>
                        </button>
                      )}
                      <div className="ml-2 -mr-2 flex h-full flex-shrink-0 items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => (noteSearchMode ? (setNoteSearchMode(false), setNoteQuery("")) : setNoteSearchMode(true))}
                          className="h-8 w-8 rounded-full"
                          title={noteSearchMode ? "Close search" : "Search notes"}
                          aria-pressed={noteSearchMode}
                        >
                          {noteSearchMode ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div aria-hidden />
                  <div aria-hidden />
                </div>
              )}
              <div className="lg:flex-1 lg:overflow-y-auto pr-1">
                {filteredMappedNotes.length > 0 ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                    {filteredMappedNotes.map(n => (
                    <button
                      key={n.id}
                      onClick={() => openEditNote(n)}
                      className="text-left rounded-xl border border-border p-3 hover:border-primary/50 transition-colors"
                      style={{ backgroundColor: noteColorFor(n.color, "dark") }}
                    >
                      {n.title && <p className="text-sm font-semibold truncate mb-1">{n.title}</p>}
                      {n.content && (
                        <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                          {n.content}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-2">
                        {n.category && <span>{n.category}</span>}
                        {n.pinned && <span>• pinned</span>}
                      </div>
                    </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <p className="text-xs">{noteQuery ? "No notes match your search." : "No notes for this project."}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-border/60 bg-card/20 p-10">
          <FolderOpen className="w-10 h-10 mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {projects.length === 0 ? "Create your first project to get started" : "Select a project from the left to manage tasks & notes"}
          </p>
        </div>
      )}
      </section>

      {/* Note create/edit dialog */}
      {onAddNote && onUpdateNote && (
        <Dialog open={composerOpen} onOpenChange={(o) => { if (!o) closeComposer(); }}>
          <DialogContent className="max-w-2xl p-0 bg-transparent border-0 shadow-none">
            <DialogTitle className="sr-only">{composerMode === "edit" ? "Edit note" : "New note"}</DialogTitle>
            <NoteComposer
              categories={categories}
              projects={projects}
              defaultCategory={categories[0]}
              defaultProjectId={selectedProjectId ?? undefined}
              onCreateCategory={onCreateCategory}
              onCreateProject={onCreateProject}
              autoOpen
              onAddNote={(opts) => {
                const n = onAddNote({ ...opts, projectId: opts?.projectId ?? selectedProjectId ?? undefined });
                closeComposer();
                return n;
              }}
              onUpdateNote={(id, updates) => { onUpdateNote(id, updates); closeComposer(); }}
              editingNote={composerMode === "edit" ? editingNote : null}
              onCancelEdit={closeComposer}
              dark
            />
          </DialogContent>
        </Dialog>
      )}

      {selectedProject && isOwner && (
        <ShareProjectDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          project={selectedProject}
          projectTasks={selectedProject.tasks}
          matrixTasks={mappedTasks}
          notes={mappedNotes}
        />
      )}

      {onAddPreset && onUpdatePreset && onDeletePreset && (
        <ProjectTemplatesDialog
          open={templatesOpen}
          onOpenChange={setTemplatesOpen}
          presets={templatePresets}
          categories={categories}
          recentCategories={recentCategories}
          onAdd={onAddPreset}
          onUpdate={onUpdatePreset}
          onDelete={onDeletePreset}
        />
      )}
    </div>
  );
}

function NoteSearchInput({
  value, onChange, onEscape,
}: { value: string; onChange: (v: string) => void; onEscape: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <Input
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Escape") onEscape(); }}
      placeholder="Search notes..."
      className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
    />
  );
}
