import { useState, useEffect } from "react";
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
import { Task } from "@/types/task";

const Index = () => {
  const {
    currentUser, users, isInitialized, needsSetup, isAdmin,
    signup, login, loginWithGoogle, logout, deleteUser,
  } = useAuth();

  const {
    settings, updateSettings, updateQuadrantColor,
    addCategoryColor, removeCategoryColor, getCategoryColor, resetToDefaults,
  } = useSettings(currentUser?.id);

  const [viewMode, setViewMode] = useState<ViewMode>(settings.defaultView as ViewMode);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
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
  const handleAddTask: typeof addTask = (name, quadrant, options) => {
    const projectId = options?.projectId ?? (activeProjectId && activeProjectId !== "__none__" ? activeProjectId : undefined);
    return addTask(name, quadrant, { ...options, projectId });
  };

  const useSidebarDetail = settings.taskDetailView === "sidebar";
  const displayUsername = settings.localUsername || currentUser.username;

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

      <main className="flex-1 min-h-0 p-3 sm:p-4 md:p-5 lg:p-6 overflow-y-auto md:overflow-hidden">
        {(viewMode === "matrix" || viewMode === "list" || viewMode === "kanban") && (
          <FilterBar
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            overdueMode={overdueMode}
            onOverdueModeChange={setOverdueMode}
            noDatePosition={settings.noDateTasksPosition}
            onNoDatePositionChange={(v) => updateSettings({ noDateTasksPosition: v })}
            categories={getCategories()}
            selectedCategories={selectedCategories}
            onSelectedCategoriesChange={setSelectedCategories}
            getCategoryColor={getCategoryColor}
            projects={projects}
            activeProjectId={activeProjectId}
            onActiveProjectChange={setActiveProjectId}
            compactMode={compactMode}
            onCompactModeChange={viewMode === "matrix" ? setCompactMode : undefined}
          />
        )}
        <AnimatePresence mode="wait">
          {viewMode === "matrix" && (
            <motion.div key="matrix" {...viewAnimation} className="h-full">
              <MatrixView
                tasks={filteredTasks} categories={getCategories()} onMoveTask={moveTask}
                onToggleStatus={toggleStatus} onDeleteTask={deleteTask} onAddTask={handleAddTask}
                onReorderTasks={setTasks} onTaskClick={setSelectedTask}
                getCategoryColor={getCategoryColor} deadlineThresholdDays={settings.deadlineThresholdDays}
                dateFilter={dateFilter}
                overdueMode={overdueMode}
                selectedCategories={selectedCategories}
                noDatePosition={settings.noDateTasksPosition}
                compactMode={compactMode}
              />
            </motion.div>
          )}
          {viewMode === "list" && (
            <motion.div key="list" {...viewAnimation} className="h-full max-w-4xl mx-auto">
              <ListView
                tasks={filteredTasks} categories={getCategories()} onToggleStatus={toggleStatus}
                onDeleteTask={deleteTask} onAddTask={handleAddTask} onTaskClick={setSelectedTask}
                getCategoryColor={getCategoryColor} deadlineThresholdDays={settings.deadlineThresholdDays}
              />
            </motion.div>
          )}
          {viewMode === "kanban" && (
            <motion.div key="kanban" {...viewAnimation} className="h-full">
              <KanbanView
                tasks={filteredTasks} columns={columns} onAddColumn={addColumn}
                onRemoveColumn={removeColumn} onRenameColumn={renameColumn}
                onToggleStatus={toggleStatus} onDeleteTask={deleteTask}
                onUpdateTask={updateTask} onAddTask={handleAddTask}
                onTaskClick={setSelectedTask} getCategoryColor={getCategoryColor}
                deadlineThresholdDays={settings.deadlineThresholdDays}
              />
            </motion.div>
          )}
          {viewMode === "gantt" && (
            <motion.div key="gantt" {...viewAnimation} className="h-full">
              <GanttView tasks={filteredTasks} onTaskClick={setSelectedTask} getCategoryColor={getCategoryColor} />
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
        />
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings} onUpdateSettings={updateSettings}
          onUpdateQuadrantColor={updateQuadrantColor} onAddCategoryColor={addCategoryColor}
          onRemoveCategoryColor={removeCategoryColor} onResetToDefaults={resetToDefaults}
          onClose={() => setShowSettings(false)} currentUser={currentUser}
          users={users} isAdmin={isAdmin} onLogout={logout} onDeleteUser={deleteUser}
        />
      )}
    </div>
  );
};

export default Index;
