import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChevronRight, ArrowRight, ArrowDown, FolderOpen, Save, Edit2, Check, X, Link, Unlink } from "lucide-react";
import { ProjectTemplate, ProjectTask } from "@/types/project";
import { Task, Quadrant, QuadrantInfo } from "@/types/task";
import { Note, noteColorFor } from "@/types/note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type TaskAddOptions, type TaskInputPickerProps } from "@/components/TaskInput";
import { TaskActionBar } from "@/components/TaskActionBar";
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
  onSelectNote?: (note: Note) => void;
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
  projects, allTasks = [], allNotes = [], onAddProject, onUpdateProject, onDeleteProject,
  onAddTask, onUpdateTask, onDeleteTask,
  onAddMatrixTask, quadrants, categories = [], onCreateCategory, onCreateProject,
  onSelectTask, onSelectNote, onDeleteAllDone, onRescheduleTasks,
}: ProjectBuilderProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const mappedTasks = selectedProject ? allTasks.filter(t => t.projectId === selectedProject.id) : [];
  const mappedNotes = selectedProject ? allNotes.filter(n => n.projectId === selectedProject.id) : [];

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
              <h3 className="font-bold text-base">{selectedProject.name}</h3>
              {selectedProject.description && <p className="text-sm text-muted-foreground">{selectedProject.description}</p>}
            </div>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { onDeleteProject(selectedProject.id); setSelectedProjectId(null); }}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </div>

          {/* Matrix-style action bar: add task + search + clear-done. */}
          {onAddMatrixTask && (
            <div className="max-w-2xl w-full mx-auto flex-shrink-0">
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

          {/* Task list with dependency visualization */}
          <div className="flex-1 overflow-y-auto space-y-2">
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
                  <Button size="icon" variant="ghost" className="w-6 h-6 text-muted-foreground hover:text-destructive" onClick={() => onDeleteTask(selectedProject.id, task.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </motion.div>
              );
            })}

            {selectedProject.tasks.length === 0 && mappedTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No project tasks yet. Add your first task below.</p>
              </div>
            )}

            {mappedTasks.length > 0 && (
              <div className="space-y-2">
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
              </div>
            )}

            {mappedNotes.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">
                  Notes · {mappedNotes.length}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {mappedNotes.map(n => (
                    <button
                      key={n.id}
                      onClick={() => onSelectNote?.(n)}
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
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">{projects.length === 0 ? "Create your first project to get started" : "Select a project to manage tasks"}</p>
        </div>
      )}
    </div>
  );
}
