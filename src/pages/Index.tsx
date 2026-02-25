import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";
import { Header } from "@/components/Header";
import { MatrixView } from "@/components/MatrixView";
import { ListView } from "@/components/ListView";
import { ViewMode } from "@/components/ViewToggle";

const Index = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("matrix");
  
  const {
    tasks,
    addTask,
    deleteTask,
    moveTask,
    toggleStatus,
    getCategories,
  } = useTasks();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        taskCount={tasks.filter((t) => t.status === "open").length}
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
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;
