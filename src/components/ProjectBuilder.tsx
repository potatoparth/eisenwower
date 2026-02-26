import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChevronRight, ArrowRight, ArrowDown, FolderOpen, Save, Edit2, Check, X, Link, Unlink } from "lucide-react";
import { ProjectTemplate, ProjectTask, TaskDependencyType } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectBuilderProps {
  projects: ProjectTemplate[];
  onAddProject: (name: string, description?: string) => ProjectTemplate;
  onUpdateProject: (id: string, updates: Partial<Omit<ProjectTemplate, "id" | "createdAt">>) => void;
  onDeleteProject: (id: string) => void;
  onAddTask: (projectId: string, task: Omit<ProjectTask, "id" | "order">) => void;
  onUpdateTask: (projectId: string, taskId: string, updates: Partial<ProjectTask>) => void;
  onDeleteTask: (projectId: string, taskId: string) => void;
}

export function ProjectBuilder({
  projects, onAddProject, onUpdateProject, onDeleteProject,
  onAddTask, onUpdateTask, onDeleteTask,
}: ProjectBuilderProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState("1");
  const [newTaskType, setNewTaskType] = useState<TaskDependencyType>("async");
  const [newTaskDependsOn, setNewTaskDependsOn] = useState<string>("");

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const p = onAddProject(newProjectName.trim(), newProjectDesc.trim() || undefined);
    setSelectedProjectId(p.id);
    setNewProjectName("");
    setNewProjectDesc("");
    setShowNewProject(false);
  };

  const handleAddTask = () => {
    if (!newTaskName.trim() || !selectedProjectId) return;
    onAddTask(selectedProjectId, {
      name: newTaskName.trim(),
      dependencyType: newTaskType,
      dependsOn: newTaskDependsOn ? [newTaskDependsOn] : [],
      durationDays: parseInt(newTaskDuration) || 1,
      status: "pending",
    });
    setNewTaskName("");
    setNewTaskDuration("1");
    setNewTaskType("async");
    setNewTaskDependsOn("");
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
            <span className="ml-1.5 text-xs opacity-70">{p.tasks.length}</span>
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

            {selectedProject.tasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No tasks yet. Add your first task below.</p>
              </div>
            )}
          </div>

          {/* Add task form */}
          <div className="bg-card rounded-2xl border border-border p-3 space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Task name" value={newTaskName} onChange={e => setNewTaskName(e.target.value)} className="flex-1" onKeyDown={e => { if (e.key === "Enter") handleAddTask(); }} />
              <Input type="number" min="1" value={newTaskDuration} onChange={e => setNewTaskDuration(e.target.value)} className="w-16" placeholder="Days" />
            </div>
            <div className="flex gap-2 items-center">
              <Select value={newTaskType} onValueChange={(v) => setNewTaskType(v as TaskDependencyType)}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="async">Async (parallel)</SelectItem>
                  <SelectItem value="sync">Sync (sequential)</SelectItem>
                </SelectContent>
              </Select>
              {newTaskType === "sync" && selectedProject.tasks.length > 0 && (
                <Select value={newTaskDependsOn} onValueChange={setNewTaskDependsOn}>
                  <SelectTrigger className="flex-1 h-8 text-xs">
                    <SelectValue placeholder="Depends on..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProject.tasks.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button size="sm" onClick={handleAddTask} className="ml-auto">
                <Plus className="w-3 h-3 mr-1" /> Add Task
              </Button>
            </div>
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
