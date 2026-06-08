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
import { ProjectBuilder } from "@/components/ProjectBuilder";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { FilterBar, DateFilter, OverdueMode } from "@/components/FilterBar";
import { SettingsPanel } from "@/components/SettingsPanel";
import { LoginPage } from "@/components/LoginPage";
import { ViewMode } from "@/components/ViewToggle";
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
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
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

  useEffect(() => {
    setViewMode(settings.defaultView as ViewMode);
  }, [settings.defaultView]);

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

  if (!isInitialized) return null;

  if (needsSetup || !currentUser) {
    return <LoginPage needsSetup={needsSetup} onLogin={login} onSignup={signup} onGoogleLogin={loginWithGoogle} />;
  }

  const fontSizeClass = settings.fontSize === "small" ? "text-xs" : settings.fontSize === "large" ? "text-base" : "text-sm";

  const viewAnimation = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.2 } };

  // Filter tasks by active project. null = all, "__none__" handled via activeProjectId === "__none__".
  const filteredTasks = activeProjectId === null
    ? tasks
    : activeProjectId === "__none__"
      ? tasks.filter(t => !t.projectId)
      : tasks.filter(t => t.projectId === activeProjectId);

  // Wrap addTask so new tasks inherit the active project (when a real project is selected).
  const defaultProjectId =
    activeProjectId && activeProjectId !== "__none__" ? activeProjectId : undefined;

  const defaultCategory =
    selectedCategories.length === 1 ? selectedCategories[0] : undefined;

  const handleAddTask: typeof addTask = (name, quadrant, options) => {
    // TaskInput always passes category when the user completed the details step.
    const projectId = options?.category
      ? options.projectId
      : options?.projectId ??
        (activeProjectId && activeProjectId !== "__none__" ? activeProjectId : undefined);
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

  const handleCreateCategory = (name: string) => {
    addCategoryColor(name, "#7a8599");
    return name;
  };

  const handleCreateProject = (name: string) => addProject(name).id;

  const useSidebarDetail = settings.taskDetailView === "sidebar";
  const displayUsername = currentUser.username;

  return (
    <div className={`h-screen bg-background flex flex-col overflow-hidden ${fontSizeClass}`}>
      <Header
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        taskCount={filteredTasks.filter((t) => t.status === "open").length}
        onSettingsClick={() => setShowSettings(true)}
        onLogout={logout}
        username={displayUsername}
      />

      <main className="flex-1 min-h-0 p-3 sm:p-4 md:p-5 lg:p-6 overflow-y-auto">
        {(viewMode === "matrix" || viewMode === "list" || viewMode === "kanban") && (
          <div className="mb-4">
          <FilterBar
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            overdueMode={overdueMode}
            onOverdueModeChange={setOverdueMode}
            noDatePosition={settings.noDateTasksPosition}
            onNoDatePositionChange={(v) => updateSettings({ noDateTasksPosition: v })}
            categories={taskCategories}
            selectedCategories={selectedCategories}
            onSelectedCategoriesChange={setSelectedCategories}
            getCategoryColor={getCategoryColor}
            projects={projects}
            activeProjectId={activeProjectId}
            onActiveProjectChange={setActiveProjectId}
            compactMode={compactMode}
            onCompactModeChange={viewMode === "matrix" ? setCompactMode : undefined}
          />
          </div>
        )}
        <AnimatePresence mode="wait">
          {viewMode === "matrix" && (
            <motion.div key="matrix" {...viewAnimation} className="h-full">
              <MatrixView
                tasks={filteredTasks} categories={taskCategories} onMoveTask={moveTask}
                onToggleStatus={toggleStatus} onDeleteTask={handleDeleteTask} onAddTask={handleAddTask}
                onReorderTasks={setTasks} onTaskClick={setSelectedTask}
                getCategoryColor={getCategoryColor} deadlineThresholdDays={settings.deadlineThresholdDays}
                dateFilter={dateFilter}
                overdueMode={overdueMode}
                selectedCategories={selectedCategories}
                noDatePosition={settings.noDateTasksPosition}
                compactMode={compactMode}
                quadrants={quadrants}
                quadrantMap={quadrantMap}
                projects={projects}
                defaultProjectId={defaultProjectId}
                defaultCategory={defaultCategory}
                onCreateCategory={handleCreateCategory}
                onCreateProject={handleCreateProject}
              />
            </motion.div>
          )}
          {viewMode === "list" && (
            <motion.div key="list" {...viewAnimation} className="h-full max-w-4xl mx-auto">
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
              />
            </motion.div>
          )}
          {viewMode === "kanban" && (
            <motion.div key="kanban" {...viewAnimation} className="h-full">
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
            <motion.div key="gantt" {...viewAnimation} className="h-full">
              <GanttView tasks={filteredTasks} onTaskClick={setSelectedTask} getCategoryColor={getCategoryColor} quadrantMap={quadrantMap} />
            </motion.div>
          )}
          {viewMode === "projects" && (
            <motion.div key="projects" {...viewAnimation} className="h-full max-w-5xl mx-auto">
              <ProjectBuilder
                projects={projects} allTasks={tasks} onAddProject={addProject} onUpdateProject={updateProject}
                onDeleteProject={deleteProject} onAddTask={addTaskToProject}
                onUpdateTask={updateProjectTask} onDeleteTask={deleteProjectTask}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="flex-shrink-0 h-10 border-t border-border/50" aria-hidden />

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
          categories={taskCategories}
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
