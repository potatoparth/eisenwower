import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { MatrixView } from "@/components/MatrixView";
import { ListView } from "@/components/ListView";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { LoginPage } from "@/components/LoginPage";
import { ViewMode } from "@/components/ViewToggle";
import { Task } from "@/types/task";

const Index = () => {
  const {
    currentUser,
    users,
    isInitialized,
    needsSetup,
    isAdmin,
    signup,
    login,
    logout,
    deleteUser,
  } = useAuth();

  const {
    settings,
    updateSettings,
    updateQuadrantColor,
    addCategoryColor,
    removeCategoryColor,
    getCategoryColor,
    resetToDefaults,
  } = useSettings();

  const [viewMode, setViewMode] = useState<ViewMode>(settings.defaultView);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    toggleStatus,
    getCategories,
    setTasks,
  } = useTasks(currentUser?.id);

  // Update viewMode when settings change
  useEffect(() => {
    setViewMode(settings.defaultView);
  }, [settings.defaultView]);

  if (!isInitialized) return null;

  if (needsSetup || !currentUser) {
    return <LoginPage needsSetup={needsSetup} onLogin={login} onSignup={signup} />;
  }

  const fontSizeClass = settings.fontSize === "small" ? "text-xs" : settings.fontSize === "large" ? "text-base" : "text-sm";

  return (
    <div className={`min-h-screen bg-background flex flex-col ${fontSizeClass}`}>
      <Header
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        taskCount={tasks.filter((t) => t.status === "open").length}
        onSettingsClick={() => setShowSettings(true)}
        username={currentUser.username}
      />

      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === "matrix" ? (
            <motion.div
              key="matrix"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <MatrixView
                tasks={tasks}
                categories={getCategories()}
                onMoveTask={moveTask}
                onToggleStatus={toggleStatus}
                onDeleteTask={deleteTask}
                onAddTask={addTask}
                onReorderTasks={setTasks}
                onTaskClick={setSelectedTask}
                getCategoryColor={getCategoryColor}
                deadlineThresholdDays={settings.deadlineThresholdDays}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full max-w-4xl mx-auto"
            >
              <ListView
                tasks={tasks}
                categories={getCategories()}
                onToggleStatus={toggleStatus}
                onDeleteTask={deleteTask}
                onAddTask={addTask}
                onTaskClick={setSelectedTask}
                getCategoryColor={getCategoryColor}
                deadlineThresholdDays={settings.deadlineThresholdDays}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Task Detail Panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          deadlineThresholdDays={settings.deadlineThresholdDays}
          onUpdate={(id, updates) => {
            updateTask(id, updates);
            // Update selectedTask with new data
            setSelectedTask(prev => prev ? { ...prev, ...updates, updatedAt: new Date().toISOString() } : null);
          }}
          onClose={() => setSelectedTask(null)}
          getCategoryColor={getCategoryColor}
        />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdateSettings={updateSettings}
          onUpdateQuadrantColor={updateQuadrantColor}
          onAddCategoryColor={addCategoryColor}
          onRemoveCategoryColor={removeCategoryColor}
          onResetToDefaults={resetToDefaults}
          onClose={() => setShowSettings(false)}
          currentUser={currentUser}
          users={users}
          isAdmin={isAdmin}
          onLogout={logout}
          onDeleteUser={deleteUser}
        />
      )}
    </div>
  );
};

export default Index;
