import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChevronRight, ArrowRight, ArrowDown, FolderOpen, Save, Edit2, Check, X, Link, Unlink, SquarePen, StickyNote, Search, Share2, Eye } from "lucide-react";
import { ProjectTemplate, ProjectTask } from "@/types/project";
import { ShareProjectDialog } from "@/components/ShareProjectDialog";
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
  onAddProject: (name: string, description?: string) => ProjectTemplate;
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
  onSelectTask?: (task: Task) => void;
  onDeleteAllDone?: () => void;
  onRescheduleTasks?: (ids: string[], newDueDate: string) => void;
}

export function ProjectBuilder({
  projects, allTasks = [], allNotes = [], onAddNote, onUpdateNote, onDeleteNote,
  onAddProject, onUpdateProject, onDeleteProject,
  onAddTask, onUpdateTask, onDeleteTask,
  onAddMatrixTask, quadrants, categories = [], onCreateCategory, onCreateProject,
  onSelectTask, onDeleteAllDone, onRescheduleTasks,
  getProjectRole,
}: ProjectBuilderProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"create" | "edit">("create");
  const [noteSearchMode, setNoteSearchMode] = useState(false);
  const [noteQuery, setNoteQuery] = useState("");
  const [notePopoverOpen, setNotePopoverOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedRole = selectedProject ? (getProjectRole?.(selectedProject.id) ?? "owner") : undefined;
  const isOwner = selectedRole === "owner";
  const canEdit = selectedRole === "owner" || selectedRole === "editor";
  const mappedTasks = selectedProject ? allTasks.filter(t => t.projectId === selectedProject.id) : [];
  const mappedNotes = selectedProject ? allNotes.filter(n => n.projectId === selectedProject.id) : [];
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

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const p = onAddProject(newProjectName.trim(), newProjectDesc.trim() || undefined);
    setSelectedProjectId(p.id);
    setNewProjectName("");
    setNewProjectDesc("");
    setShowNewProject(false);
  };

  const handleAddMatrixTask = (name: string, quadrant: Quadrant, options?: TaskAddOptions) => {
    if (!selectedProjectId || !onAddMatrixTask) return;
    onAddMatrixTask(name, quadrant, { ...options, projectId: selectedProjectId });
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Project list & selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-bold">Projects</h2>
        {projects.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedProjectId(p.id)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-sm font-medium transition-all",
              selectedProjectId === p.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {p.name}
            <span className="ml-1.5 text-xs opacity-70">
              {p.tasks.length + allTasks.filter(t => t.projectId === p.id).length + allNotes.filter(n => n.projectId === p.id).length}
            </span>
          </button>
        ))}
        {!showNewProject && (
          <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => setShowNewProject(true)}>
            <Plus className="w-3 h-3" /> New Project
          </Button>
        )}
      </div>

      {/* New project form */}
      <AnimatePresence>
        {showNewProject && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="bg-card rounded-2xl border border-border p-4 space-y-3"
          >
            <Input placeholder="Project name" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
            <Textarea placeholder="Description (optional)" value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateProject}>Create Project</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewProject(false)}>Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected project */}
      {selectedProject ? (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">{selectedProject.name}</h3>
                {!isOwner && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary text-muted-foreground flex items-center gap-1">
                    {selectedRole === "viewer" ? <><Eye className="w-2.5 h-2.5" /> viewer</> : <>shared · editor</>}
                  </span>
                )}
              </div>
              {selectedProject.description && <p className="text-sm text-muted-foreground">{selectedProject.description}</p>}
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
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
            {/* Tasks column */}
            <div className="min-h-0 flex flex-col">
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
                  />
                </div>
              )}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
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
            <div className="min-h-0 flex flex-col">
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
              <div className="flex-1 overflow-y-auto pr-1">
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
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">{projects.length === 0 ? "Create your first project to get started" : "Select a project to manage tasks"}</p>
        </div>
      )}

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
