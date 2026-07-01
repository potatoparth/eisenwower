import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useKanbanColumns } from "@/hooks/useKanbanColumns";
import { Header } from "@/components/Header";
import { MatrixView } from "@/components/MatrixView";
import { ListView } from "@/components/ListView";
import { KanbanView } from "@/components/KanbanView";
import { GanttView } from "@/components/GanttView";
import { CalendarView } from "@/components/CalendarView";
import { ProjectBuilder } from "@/components/ProjectBuilder";
import { NotesView } from "@/components/NotesView";
import { useNotes } from "@/hooks/useNotes";
import { Note } from "@/types/note";
import { toast } from "@/hooks/use-toast";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { FilterBar, DateFilter, OverdueMode } from "@/components/FilterBar";
import { applyTaskFilters } from "@/lib/filters";
import { SettingsPanel } from "@/components/SettingsPanel";
import { LoginPage } from "@/components/LoginPage";
import { ViewMode } from "@/components/ViewToggle";
import { BulkActionBar } from "@/components/BulkActionBar";
import { Task, getQuadrants, getQuadrantMap } from "@/types/task";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Index = () => {
  const {
    currentUser, users, isInitialized, needsSetup, isAdmin,
    signup, login, loginWithGoogle, logout, deleteUser, updateDisplayName,
  } = useAuth();

  const {
    settings, updateSettings, updateQuadrantAccent, updateQuadrantLabel,
    addCategoryColor, removeCategoryColor, getCategoryColor, resetToDefaults,
  } = useSettings(currentUser?.id);

  const quadrants = useMemo(() => getQuadrants(settings.quadrantLabels), [settings.quadrantLabels]);
  const quadrantMap = useMemo(() => getQuadrantMap(settings.quadrantLabels), [settings.quadrantLabels]);

  const [viewMode, setViewMode] = useState<ViewMode>(settings.defaultView as ViewMode);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeProjectIds, setActiveProjectIds] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [recurringDeleteTask, setRecurringDeleteTask] = useState<Task | null>(null);
  const [overdueMode, setOverdueMode] = useState<OverdueMode>(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("overdueMode") : null;
    return (stored as OverdueMode) || "all";
  });
  const [compactMode, setCompactMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("compactMode") === "1";
  });

  useEffect(() => { localStorage.setItem("overdueMode", overdueMode); }, [overdueMode]);
  useEffect(() => { localStorage.setItem("compactMode", compactMode ? "1" : "0"); }, [compactMode]);

  const {
    tasks, addTask, updateTask, deleteTask, moveTask, toggleStatus, getCategories, setTasks,
  } = useTasks(currentUser?.id);

  const { columns, addColumn, removeColumn, renameColumn } = useKanbanColumns(currentUser?.id);

  const {
    projects, addProject, updateProject, deleteProject,
    addTaskToProject, updateProjectTask, deleteProjectTask,
  } = useProjects(currentUser?.id);

  const { notes, addNote, updateNote, deleteNote } = useNotes(currentUser?.id);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(n.category)) return false;
      if (activeProjectIds.length > 0) {
        const wantsNone = activeProjectIds.includes("__none__");
        const real = activeProjectIds.filter((id) => id !== "__none__");
        const isNone = !n.projectId;
        const matches = (isNone && wantsNone) || (n.projectId && real.includes(n.projectId));
        if (!matches) return false;
      }
      return true;
    });
  }, [notes, selectedCategories, activeProjectIds]);

  useEffect(() => {
    setViewMode(settings.defaultView as ViewMode);
  }, [settings.defaultView]);

  // If the active view was disabled in settings, fall back to the first enabled one.
  useEffect(() => {
    const enabled = settings.enabledViews;
    if (!enabled) return;
    if (enabled[viewMode] === false) {
        const fallback = (["matrix", "list", "kanban", "calendar", "gantt", "projects", "notes"] as ViewMode[])
        .find((v) => enabled[v] !== false);
      if (fallback) setViewMode(fallback);
    }
  }, [settings.enabledViews, viewMode]);

  const taskCategories = useMemo(() => {
    const names = new Set<string>();
    tasks.forEach((t) => {
      if (t.category?.trim()) names.add(t.category.trim());
    });
    settings.categoryColors.forEach((c) => {
      if (c.name?.trim()) names.add(c.name.trim());
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [tasks, settings.categoryColors]);

  // Auto-assign a random color to any newly-seen category that doesn't have one yet.
  useEffect(() => {
    const palette = [
      "#e05a5a", "#e08a3c", "#e0b93c", "#7fbf5a", "#3cbfa8",
      "#3c9fe0", "#5a6fe0", "#8a5ae0", "#c65ae0", "#e05a9f",
      "#5aa9e0", "#8fb95a", "#b98f5a", "#5ab98f", "#b95a8f",
    ];
    const known = new Set(settings.categoryColors.map((c) => c.name));
    const used = new Set(settings.categoryColors.map((c) => c.color.toLowerCase()));
    taskCategories.forEach((name) => {
      if (known.has(name)) return;
      const available = palette.filter((c) => !used.has(c.toLowerCase()));
      const pool = available.length ? available : palette;
      const color = pool[Math.floor(Math.random() * pool.length)];
      used.add(color.toLowerCase());
      addCategoryColor(name, color);
    });
  }, [taskCategories, settings.categoryColors, addCategoryColor]);

  // Cascade: each filter's option list is computed against tasks that pass all OTHER active filters.
  const filters = { dateFilter, overdueMode, selectedCategories, activeProjectIds };
  const filteredTasks = useMemo(
    () => applyTaskFilters(tasks, filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, dateFilter, overdueMode, selectedCategories, activeProjectIds]
  );
  const cascadedCategoryOptions = useMemo(() => {
    const pool = applyTaskFilters(tasks, { dateFilter, overdueMode, activeProjectIds });
    const names = new Set<string>();
    pool.forEach((t) => { if (t.category?.trim()) names.add(t.category.trim()); });
    // Always keep the user's current selections visible even if they no longer match.
    selectedCategories.forEach((c) => names.add(c));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [tasks, dateFilter, overdueMode, activeProjectIds, selectedCategories]);
  const cascadedProjectContext = useMemo(() => {
    const pool = applyTaskFilters(tasks, { dateFilter, overdueMode, selectedCategories });
    const ids = new Set<string>();
    let hasNone = false;
    pool.forEach((t) => {
      if (t.projectId) ids.add(t.projectId);
      else hasNone = true;
    });
    // Preserve current selections in the dropdown.
    activeProjectIds.forEach((id) => { if (id !== "__none__") ids.add(id); });
    return { availableProjectIds: Array.from(ids), hasNoProjectOption: hasNone || activeProjectIds.includes("__none__") };
  }, [tasks, dateFilter, overdueMode, selectedCategories, activeProjectIds]);

  if (!isInitialized) return null;

  if (needsSetup || !currentUser) {
    return <LoginPage needsSetup={needsSetup} onLogin={login} onSignup={signup} onGoogleLogin={loginWithGoogle} />;
  }

  const fontSizeClass = settings.fontSize === "small" ? "text-xs" : settings.fontSize === "large" ? "text-base" : "text-sm";

  const viewAnimation = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.2 } };

  // When exactly one real project is selected, treat it as the default for new tasks.
  const singleActiveProjectId = (() => {
    const real = activeProjectIds.filter((id) => id !== "__none__");
    return real.length === 1 ? real[0] : undefined;
  })();
  const defaultProjectId = singleActiveProjectId;

  const defaultCategory =
    selectedCategories.length === 1 ? selectedCategories[0] : undefined;

  const handleAddTask: typeof addTask = (name, quadrant, options) => {
    // TaskInput always passes category when the user completed the details step.
    const projectId = options?.category
      ? options.projectId
      : options?.projectId ?? singleActiveProjectId;
    return addTask(name, quadrant, { ...options, projectId });
  };

  const handleDeleteTask = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    const isTemplate = t && (t.recurrence ?? "none") !== "none" && !t.isRecurringInstance;
    if (isTemplate) {
      setRecurringDeleteTask(t!);
      return;
    }
    deleteTask(id);
  };

  const CATEGORY_PALETTE = [
    "#e05a5a", "#e08a3c", "#e0b93c", "#7fbf5a", "#3cbfa8",
    "#3c9fe0", "#5a6fe0", "#8a5ae0", "#c65ae0", "#e05a9f",
    "#5aa9e0", "#8fb95a", "#b98f5a", "#5ab98f", "#b95a8f",
  ];
  const handleCreateCategory = (name: string) => {
    const used = new Set(settings.categoryColors.map((c) => c.color.toLowerCase()));
    const available = CATEGORY_PALETTE.filter((c) => !used.has(c.toLowerCase()));
    const pool = available.length ? available : CATEGORY_PALETTE;
    const color = pool[Math.floor(Math.random() * pool.length)];
    addCategoryColor(name, color);
    return name;
  };

  const handleCreateProject = (name: string) => addProject(name).id;

  const handleRescheduleTasks = (ids: string[], newDueDate: string) => {
    ids.forEach((id) => updateTask(id, { dueDate: newDueDate }));
  };

  // Bulk reschedule for the global Select mode — DateTimePicker returns a full
  // ISO like "2026-07-04T10:30:00", so split into date + optional time.
  const handleBulkReschedule = (ids: string[], iso: string) => {
    const [datePart, timePart] = iso.split("T");
    const timeStr = timePart ? timePart.slice(0, 5) : undefined;
    ids.forEach((id) => updateTask(id, { dueDate: datePart, ...(timeStr ? { dueTime: timeStr } : {}) }));
  };

  const handleConvertNoteToTask = (note: Note) => {
    // Title comes from note title; if empty, use first non-empty line of content;
    // remainder of content becomes the task description.
    let title = note.title.trim();
    let description = note.content;
    if (!title) {
      const lines = note.content.split("\n");
      const firstIdx = lines.findIndex((l) => l.trim().length > 0);
      if (firstIdx >= 0) {
        title = lines[firstIdx].trim();
        description = lines.slice(firstIdx + 1).join("\n").replace(/^\n+/, "");
      }
    }
    if (!title) { toast({ title: "Add a title or note content first" }); return; }
    handleAddTask(title, "important-not-urgent", {
      description: description.trim() || undefined,
      category: note.category,
      projectId: note.projectId,
    });
    toast({ title: "Task created", description: title });
  };

  const useSidebarDetail = settings.taskDetailView === "sidebar";
  const displayUsername = currentUser.username;

  return (
    <div className={`h-screen bg-background flex flex-col overflow-hidden ${fontSizeClass}`}>
      <Header
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onSettingsClick={() => setShowSettings(true)}
        onLogout={logout}
        enabledViews={settings.enabledViews}
      />

      <main className="flex-1 min-h-0 p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col overflow-hidden">
        {(viewMode === "matrix" || viewMode === "list" || viewMode === "kanban" || viewMode === "gantt" || viewMode === "projects" || viewMode === "calendar" || viewMode === "notes") && (
          <div className="mb-4 flex-shrink-0">
          <FilterBar
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            overdueMode={overdueMode}
            onOverdueModeChange={setOverdueMode}
            noDatePosition={settings.noDateTasksPosition}
            onNoDatePositionChange={(v) => updateSettings({ noDateTasksPosition: v })}
            categories={cascadedCategoryOptions}
            selectedCategories={selectedCategories}
            onSelectedCategoriesChange={setSelectedCategories}
            getCategoryColor={getCategoryColor}
            projects={projects}
            activeProjectIds={activeProjectIds}
            onActiveProjectIdsChange={setActiveProjectIds}
            availableProjectIds={cascadedProjectContext.availableProjectIds}
            hasNoProjectOption={cascadedProjectContext.hasNoProjectOption}
            compactMode={compactMode}
            onCompactModeChange={viewMode === "matrix" ? setCompactMode : undefined}
            showProjectsFilter={viewMode !== "projects"}
          />
          </div>
        )}
        <AnimatePresence mode="wait">
          {viewMode === "matrix" && (
            <motion.div key="matrix" {...viewAnimation} className="flex-1 min-h-0 flex flex-col">
              <MatrixView
                tasks={filteredTasks} categories={taskCategories} onMoveTask={moveTask}
                onToggleStatus={toggleStatus} onDeleteTask={handleDeleteTask} onAddTask={handleAddTask}
                onReorderTasks={setTasks} onTaskClick={setSelectedTask}
                getCategoryColor={getCategoryColor} deadlineThresholdDays={settings.deadlineThresholdDays}
                noDatePosition={settings.noDateTasksPosition}
                compactMode={compactMode}
                quadrants={quadrants}
                quadrantMap={quadrantMap}
                projects={projects}
                defaultProjectId={defaultProjectId}
                defaultCategory={defaultCategory}
                onCreateCategory={handleCreateCategory}
                onCreateProject={handleCreateProject}
                onSelectTask={setSelectedTask}
                onDeleteAllDone={() => tasks.filter(t => t.status === "done").forEach(t => deleteTask(t.id))}
                onRescheduleTasks={handleRescheduleTasks}
                allTasks={tasks}
              />
            </motion.div>
          )}
          {viewMode === "list" && (
            <motion.div key="list" {...viewAnimation} className="flex-1 min-h-0 w-full max-w-4xl mx-auto overflow-y-auto">
              <ListView
                tasks={filteredTasks} categories={taskCategories} onToggleStatus={toggleStatus}
                onDeleteTask={handleDeleteTask} onAddTask={handleAddTask} onTaskClick={setSelectedTask}
                getCategoryColor={getCategoryColor} deadlineThresholdDays={settings.deadlineThresholdDays}
                quadrants={quadrants}
                quadrantMap={quadrantMap}
                projects={projects}
                defaultProjectId={defaultProjectId}
                defaultCategory={defaultCategory}
                onCreateCategory={handleCreateCategory}
                onCreateProject={handleCreateProject}
                onSelectTask={setSelectedTask}
                onDeleteAllDone={() => tasks.filter(t => t.status === "done").forEach(t => deleteTask(t.id))}
                onRescheduleTasks={handleRescheduleTasks}
                allTasks={tasks}
              />
            </motion.div>
          )}
          {viewMode === "kanban" && (
            <motion.div key="kanban" {...viewAnimation} className="flex-1 min-h-0 flex flex-col">
              <KanbanView
                tasks={filteredTasks} columns={columns} onAddColumn={addColumn}
                onRemoveColumn={removeColumn} onRenameColumn={renameColumn}
                onToggleStatus={toggleStatus} onDeleteTask={handleDeleteTask}
                onUpdateTask={updateTask} onAddTask={handleAddTask}
                onTaskClick={setSelectedTask} getCategoryColor={getCategoryColor}
                deadlineThresholdDays={settings.deadlineThresholdDays}
              />
            </motion.div>
          )}
          {viewMode === "gantt" && (
            <motion.div key="gantt" {...viewAnimation} className="flex-1 min-h-0 overflow-auto">
              <GanttView tasks={filteredTasks} onTaskClick={setSelectedTask} getCategoryColor={getCategoryColor} quadrantMap={quadrantMap} />
            </motion.div>
          )}
          {viewMode === "calendar" && (
            <motion.div key="calendar" {...viewAnimation} className="flex-1 min-h-0 flex flex-col">
              <CalendarView
                tasks={filteredTasks}
                allTasks={tasks}
                onUpdateTask={updateTask}
                onToggleStatus={toggleStatus}
                onTaskClick={setSelectedTask}
                getCategoryColor={getCategoryColor}
              />
            </motion.div>
          )}
          {viewMode === "projects" && (
            <motion.div key="projects" {...viewAnimation} className="flex-1 min-h-0 w-full max-w-5xl mx-auto overflow-y-auto">
              <ProjectBuilder
                projects={projects} allTasks={filteredTasks} onAddProject={addProject} onUpdateProject={updateProject}
                onDeleteProject={deleteProject} onAddTask={addTaskToProject}
                onUpdateTask={updateProjectTask} onDeleteTask={deleteProjectTask}
                onAddMatrixTask={handleAddTask}
                quadrants={quadrants}
                categories={taskCategories}
                onCreateCategory={handleCreateCategory}
                onCreateProject={handleCreateProject}
                onSelectTask={setSelectedTask}
                onDeleteAllDone={() => tasks.filter(t => t.status === "done").forEach(t => deleteTask(t.id))}
                onRescheduleTasks={handleRescheduleTasks}
              />
            </motion.div>
          )}
          {viewMode === "notes" && (
            <motion.div key="notes" {...viewAnimation} className="flex-1 min-h-0 flex flex-col">
              <NotesView
                notes={filteredNotes}
                categories={taskCategories}
                projects={projects}
                defaultCategory={defaultCategory}
                defaultProjectId={defaultProjectId}
                onCreateCategory={handleCreateCategory}
                onCreateProject={handleCreateProject}
                onAddNote={(opts) => addNote(opts)}
                onUpdateNote={updateNote}
                onDeleteNote={deleteNote}
                onConvertToTask={handleConvertNoteToTask}
                getCategoryColor={getCategoryColor}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="flex-shrink-0 h-10 border-t border-border/50" aria-hidden />

      <BulkActionBar onBulkReschedule={handleBulkReschedule} />

      {selectedTask && useSidebarDetail && (
        <TaskDetailPanel
          task={selectedTask}
          deadlineThresholdDays={settings.deadlineThresholdDays}
          onUpdate={(id, updates) => {
            updateTask(id, updates);
            setSelectedTask(prev => prev ? { ...prev, ...updates, updatedAt: new Date().toISOString() } : null);
          }}
          onClose={() => setSelectedTask(null)}
          getCategoryColor={getCategoryColor}
          projects={projects}
          quadrants={quadrants}
          quadrantMap={quadrantMap}
          categories={taskCategories}
          navTasks={filteredTasks}
          onNavigate={setSelectedTask}
          onToggleStatus={(id) => toggleStatus(id)}
          onSwitchToDialog={() => updateSettings({ taskDetailView: "popup" })}
          onCreateCategory={handleCreateCategory}
          onCreateProject={handleCreateProject}
        />
      )}
      {selectedTask && !useSidebarDetail && (
        <TaskDetailDialog
          task={selectedTask}
          onUpdate={(id, updates) => {
            updateTask(id, updates);
            setSelectedTask(prev => prev ? { ...prev, ...updates, updatedAt: new Date().toISOString() } : null);
          }}
          onClose={() => setSelectedTask(null)}
          onSwitchToSidebar={() => updateSettings({ taskDetailView: "sidebar" })}
          getCategoryColor={getCategoryColor}
          projects={projects}
          quadrants={quadrants}
          quadrantMap={quadrantMap}
          categories={taskCategories}
          navTasks={filteredTasks}
          onNavigate={setSelectedTask}
          onToggleStatus={(id) => toggleStatus(id)}
          onCreateCategory={handleCreateCategory}
          onCreateProject={handleCreateProject}
        />
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings} onUpdateSettings={updateSettings}
          onUpdateQuadrantAccent={updateQuadrantAccent} onUpdateQuadrantLabel={updateQuadrantLabel}
          onAddCategoryColor={addCategoryColor}
          onRemoveCategoryColor={removeCategoryColor} onResetToDefaults={resetToDefaults}
          onClose={() => setShowSettings(false)} currentUser={currentUser}
          users={users} isAdmin={isAdmin} onLogout={logout} onDeleteUser={deleteUser}
          allCategories={getCategories()}
          onUpdateDisplayName={updateDisplayName}
        />
      )}

      <AlertDialog open={!!recurringDeleteTask} onOpenChange={(o) => !o && setRecurringDeleteTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recurring task?</AlertDialogTitle>
            <AlertDialogDescription>
              "{recurringDeleteTask?.name}" repeats. Choose what to delete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (recurringDeleteTask) deleteTask(recurringDeleteTask.id, "single");
                setRecurringDeleteTask(null);
              }}
            >
              Delete this task only
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                if (recurringDeleteTask) deleteTask(recurringDeleteTask.id, "future");
                setRecurringDeleteTask(null);
              }}
            >
              Delete all future repeats
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
