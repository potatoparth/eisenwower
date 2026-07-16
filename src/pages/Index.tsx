import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useProjectTemplatePresets } from "@/hooks/useProjectTemplatePresets";
import { useKanbanBoards } from "@/hooks/useKanbanBoards";
import { Header } from "@/components/Header";
import { MatrixView } from "@/components/MatrixView";
import { ListView } from "@/components/ListView";
import { KanbanView } from "@/components/KanbanView";
import { CalendarView } from "@/components/CalendarView";
import { ProjectBuilder } from "@/components/ProjectBuilder";
import { NotesView } from "@/components/NotesView";
import { SprintView, type SprintSeedTask } from "@/components/SprintView";
import { useNotes } from "@/hooks/useNotes";
import { Note } from "@/types/note";
import { toast } from "@/hooks/use-toast";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { FilterBar, DateFilter, OverdueMode } from "@/components/FilterBar";
import { LayoutGrid } from "lucide-react";
import { applyTaskFilters } from "@/lib/filters";
import { SettingsPanel } from "@/components/SettingsPanel";
import { LoginPage } from "@/components/LoginPage";
import { ViewMode } from "@/components/ViewToggle";
import { BulkActionBar } from "@/components/BulkActionBar";
import { Task, getQuadrants, getQuadrantMap } from "@/types/task";
import {
  buildProjectTree,
  indexProjectNodes,
  getDescendantIds,
  getProjectLeafName,
  getProjectPath,
} from "@/lib/projectTree";
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

  // Selection → Sprint bridge: BulkActionBar pushes selected task ids here,
  // then we flip to the Sprint view where SprintView consumes them once.
  const [sprintSeed, setSprintSeed] = useState<SprintSeedTask[] | undefined>(undefined);

  useEffect(() => { localStorage.setItem("overdueMode", overdueMode); }, [overdueMode]);
  useEffect(() => { localStorage.setItem("compactMode", compactMode ? "1" : "0"); }, [compactMode]);

  const {
    tasks: rawTasks, archivedTasks: rawArchivedTasks, addTask, updateTask: rawUpdateTask,
    deleteTask, archiveTask, archiveDoneTasks, unarchiveTask, moveTask, toggleStatus, getCategories, setTasks,
  } = useTasks(currentUser?.id);

  const kanban = useKanbanBoards(currentUser?.id);

  const {
    projects, addProject, updateProject, deleteProject,
    addTaskToProject, updateProjectTask, deleteProjectTask, getProjectRole, reparentProject,
  } = useProjects(currentUser?.id);

  const {
    presets: templatePresets, addPreset, updatePreset, deletePreset,
  } = useProjectTemplatePresets(currentUser?.id);

  const { notes: rawNotes, addNote, updateNote: rawUpdateNote, deleteNote } = useNotes(currentUser?.id);

  // Project tree — used everywhere for breadcrumbs, filtering, derived category.
  const projectTree = useMemo(() => buildProjectTree(projects), [projects]);
  const projectNodeIndex = useMemo(() => indexProjectNodes(projectTree), [projectTree]);

  // Enrich raw hook data: category = leaf project name (fallback "General").
  const enrichedTasks = useMemo(() => rawTasks.map((t) => ({
    ...t,
    category: t.projectId ? getProjectLeafName(projectNodeIndex, t.projectId) || "General" : "General",
  })), [rawTasks, projectNodeIndex]);
  const archivedTasks = useMemo(() => (rawArchivedTasks || []).map((t) => ({
    ...t,
    category: t.projectId ? getProjectLeafName(projectNodeIndex, t.projectId) || "General" : "General",
  })), [rawArchivedTasks, projectNodeIndex]);
  const notes = useMemo(() => rawNotes.map((n) => ({
    ...n,
    category: n.projectId ? getProjectLeafName(projectNodeIndex, n.projectId) || "General" : "General",
  })), [rawNotes, projectNodeIndex]);

  // Expose enriched tasks under the `tasks` name so downstream code keeps working.
  const tasks = enrichedTasks;

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(n.category)) return false;
      if (activeProjectIds.length > 0) {
        const wantsNone = activeProjectIds.includes("__none__");
        const real = activeProjectIds.filter((id) => id !== "__none__");
        const allowedIds = new Set<string>();
        real.forEach((id) => getDescendantIds(projectNodeIndex, id).forEach((d) => allowedIds.add(d)));
        const isNone = !n.projectId;
        const matches = (isNone && wantsNone) || (n.projectId && allowedIds.has(n.projectId));
        if (!matches) return false;
      }
      return true;
    });
  }, [notes, selectedCategories, activeProjectIds, projectNodeIndex]);

  useEffect(() => {
    setViewMode(settings.defaultView as ViewMode);
  }, [settings.defaultView]);

  // If the active view was disabled in settings, fall back to the first enabled one.
  useEffect(() => {
    const enabled = settings.enabledViews;
    if (!enabled) return;
    if (enabled[viewMode] === false) {
        const fallback = (["matrix", "list", "kanban", "calendar", "projects", "notes", "sprint"] as ViewMode[])
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

  // Most-recent-first ordered lists for the "recent chip strips" in TaskInput
  // (categories & projects). Derived from task creation order.
  const recentCategories = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    [...tasks]
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .forEach((t) => {
        const c = t.category?.trim();
        if (c && !seen.has(c)) {
          seen.add(c);
          out.push(c);
        }
      });
    return out;
  }, [tasks]);
  const recentProjectIds = useMemo(() => {
    const validIds = new Set(projects.map((p) => p.id));
    const seen = new Set<string>();
    const out: string[] = [];
    [...tasks]
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .forEach((t) => {
        if (t.projectId && validIds.has(t.projectId) && !seen.has(t.projectId)) {
          seen.add(t.projectId);
          out.push(t.projectId);
        }
      });
    return out;
  }, [tasks, projects]);

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
  // Project filter expands to include descendants — filtering by a parent shows all children too.
  const expandProjectIds = useCallback(
    (ids: string[]) => ids.flatMap((id) => getDescendantIds(projectNodeIndex, id)),
    [projectNodeIndex],
  );
  const filters = { dateFilter, overdueMode, selectedCategories, activeProjectIds };
  const filteredTasks = useMemo(
    () => applyTaskFilters(tasks, filters, { expandProjectIds }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, dateFilter, overdueMode, selectedCategories, activeProjectIds, expandProjectIds]
  );
  const cascadedCategoryOptions = useMemo(() => {
    const pool = applyTaskFilters(tasks, { dateFilter, overdueMode, activeProjectIds }, { expandProjectIds });
    const names = new Set<string>();
    pool.forEach((t) => { if (t.category?.trim()) names.add(t.category.trim()); });
    // Always keep the user's current selections visible even if they no longer match.
    selectedCategories.forEach((c) => names.add(c));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [tasks, dateFilter, overdueMode, activeProjectIds, selectedCategories, expandProjectIds]);
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

  // "View scope" toggle from Settings: default "mine" hides rows owned by other
  // collaborators from every view EXCEPT the Projects view (which always shows
  // everything the user can see). Rows without userId (legacy/optimistic) pass through.
  const viewScope = settings.viewScope ?? "mine";
  const scopedTasks = useMemo(() => {
    if (viewScope === "all" || !currentUser) return filteredTasks;
    return filteredTasks.filter((t) => !t.userId || t.userId === currentUser.id);
  }, [filteredTasks, viewScope, currentUser]);
  const scopedNotes = useMemo(() => {
    if (viewScope === "all" || !currentUser) return filteredNotes;
    return filteredNotes.filter((n) => !n.userId || n.userId === currentUser.id);
  }, [filteredNotes, viewScope, currentUser]);

  if (!isInitialized) return null;

  if (needsSetup || !currentUser) {
    return <LoginPage needsSetup={needsSetup} onLogin={login} onSignup={signup} onGoogleLogin={loginWithGoogle} />;
  }

  // After sign-in, honor any pending join-project redirect saved on the join page.
  const pendingJoin = typeof window !== "undefined" ? sessionStorage.getItem("post_login_redirect") : null;
  if (pendingJoin) {
    sessionStorage.removeItem("post_login_redirect");
    window.location.replace(pendingJoin);
    return null;
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

  // Translate `category` into a subproject id. Category is derived from leaf project name;
  // supplying one on a task means "put this task in a subproject with that name under the
  // chosen parent (or as a new top-level project)".
  const resolveCategoryToProject = (
    providedProjectId: string | undefined,
    category: string | undefined,
  ): string | undefined => {
    const parentId = providedProjectId ?? singleActiveProjectId ?? undefined;
    const trimmed = category?.trim();
    if (!trimmed || trimmed === "General") return parentId;
    // If the parent already IS a project with this leaf name, keep as-is.
    if (parentId) {
      const parentName = getProjectLeafName(projectNodeIndex, parentId);
      if (parentName.toLowerCase() === trimmed.toLowerCase()) return parentId;
    }
    // Find or create a sibling subproject under parentId (or top-level if none).
    const siblings = projects.filter((p) => (p.parentId || null) === (parentId ?? null));
    const existing = siblings.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const created = addProject(trimmed, undefined, parentId ?? null);
    return created.id;
  };

  const handleAddTask: typeof addTask = (name, quadrant, options) => {
    const effectiveProjectId = resolveCategoryToProject(options?.projectId, options?.category);
    return addTask(name, quadrant, { ...options, projectId: effectiveProjectId, category: undefined });
  };

  // Wrapped updateTask: translates any `category` update into a projectId change.
  const updateTask: typeof rawUpdateTask = (id, updates) => {
    if (updates.category !== undefined) {
      const current = tasks.find((t) => t.id === id);
      // "General" (or empty) means: clear categorization but keep the parent project.
      const currentParent = current?.projectId
        ? projects.find((p) => p.id === current.projectId)?.parentId ?? null
        : null;
      const trimmed = updates.category?.trim();
      let nextProjectId: string | undefined;
      if (!trimmed || trimmed === "General") {
        nextProjectId = currentParent ?? undefined;
      } else {
        nextProjectId = resolveCategoryToProject(currentParent ?? undefined, trimmed);
      }
      const { category: _c, ...rest } = updates;
      return rawUpdateTask(id, { ...rest, projectId: nextProjectId });
    }
    return rawUpdateTask(id, updates);
  };

  const updateNote: typeof rawUpdateNote = (id, updates) => {
    if (updates.category !== undefined) {
      const current = notes.find((n) => n.id === id);
      const currentParent = current?.projectId
        ? projects.find((p) => p.id === current.projectId)?.parentId ?? null
        : null;
      const trimmed = updates.category?.trim();
      let nextProjectId: string | undefined;
      if (!trimmed || trimmed === "General") {
        nextProjectId = currentParent ?? undefined;
      } else {
        nextProjectId = resolveCategoryToProject(currentParent ?? undefined, trimmed);
      }
      const { category: _c, ...rest } = updates;
      return rawUpdateNote(id, { ...rest, projectId: nextProjectId });
    }
    return rawUpdateNote(id, updates);
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

  const handleCreateProject = (name: string, parentId?: string | null) => addProject(name, undefined, parentId ?? null).id;

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
        username={currentUser?.username}
      />

      <main className="flex-1 min-h-0 p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col overflow-hidden">
        {viewMode !== "sprint" && (
          <div className="mb-4 flex-shrink-0 flex items-center gap-2">
          <div className="min-w-0 flex-1">
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
            notesMode={viewMode === "notes"}
            displayMode={settings.filterBarDisplay ?? "pills"}
          />
          </div>
          {viewMode === "matrix" && (
            <button
              type="button"
              onClick={() => setCompactMode(!compactMode)}
              title="Toggle compact grid"
              aria-pressed={compactMode}
              className={`h-[30px] shrink-0 hidden md:inline-flex items-center gap-1.5 px-2.5 rounded-[20px] text-[12px] font-medium border transition-colors ${
                compactMode
                  ? "bg-[#1A1A1A] text-white border-[#1A1A1A] dark:bg-white dark:text-[#0a0a0a] dark:border-white"
                  : "bg-white dark:bg-[#1F1F1F] text-[#374151] dark:text-[#D1D5DB] border-[#E5E7EB] dark:border-white/10 hover:border-[#D1D5DB]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          )}
          </div>
        )}
        <AnimatePresence mode="wait">
          {viewMode === "matrix" && (
            <motion.div key="matrix" {...viewAnimation} className="flex-1 min-h-0 flex flex-col">
              <MatrixView
                tasks={scopedTasks} categories={taskCategories} onMoveTask={moveTask}
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
                onArchiveAllDone={archiveDoneTasks} archivedTasks={archivedTasks} onUnarchiveTask={unarchiveTask} onDeleteArchivedTask={(id) => deleteTask(id)}
                onRescheduleTasks={handleRescheduleTasks}
                allTasks={tasks}
                recentCategories={recentCategories}
                recentProjectIds={recentProjectIds}
              />
            </motion.div>
          )}
          {viewMode === "list" && (
            <motion.div key="list" {...viewAnimation} className="flex-1 min-h-0 w-full max-w-4xl mx-auto overflow-y-auto">
              <ListView
                tasks={scopedTasks} categories={taskCategories} onToggleStatus={toggleStatus}
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
                onArchiveAllDone={archiveDoneTasks} archivedTasks={archivedTasks} onUnarchiveTask={unarchiveTask} onDeleteArchivedTask={(id) => deleteTask(id)}
                onRescheduleTasks={handleRescheduleTasks}
                allTasks={tasks}
                recentCategories={recentCategories}
                recentProjectIds={recentProjectIds}
              />
            </motion.div>
          )}
          {viewMode === "kanban" && (
            <motion.div key="kanban" {...viewAnimation} className="flex-1 min-h-0 flex flex-col">
              <KanbanView
                tasks={scopedTasks}
                boards={kanban.boards}
                columnsByBoard={kanban.columnsByBoard}
                itemsByBoard={kanban.itemsByBoard}
                onCreateBoard={kanban.createBoard}
                onRenameBoard={kanban.renameBoard}
                onDeleteBoard={kanban.deleteBoard}
                onAddColumn={kanban.addColumn}
                onRemoveColumn={kanban.removeColumn}
                onRenameColumn={kanban.renameColumn}
                onMoveItem={kanban.moveItem}
                onRemoveItem={kanban.removeItem}
                onToggleStatus={toggleStatus}
                onDeleteTask={handleDeleteTask}
                onTaskClick={setSelectedTask}
                onQuickAdd={(name, boardId, columnKey, isDefault, quadrant, options) => {
                  // Default board: derive quadrant/status/due from column.
                  if (isDefault) {
                    if (columnKey === "overdue") {
                      const y = new Date(); y.setDate(y.getDate() - 1);
                      const due = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
                      handleAddTask(name, "important-urgent", { ...options, dueDate: options?.dueDate || due });
                    } else if (columnKey === "done") {
                      const t = handleAddTask(name, quadrant, options);
                      toggleStatus(t.id);
                    } else {
                      handleAddTask(name, quadrant, options);
                    }
                    return;
                  }
                  // Custom board: create the task, then assign it to the target column.
                  const created = handleAddTask(name, quadrant, options);
                  kanban.assignTasks(boardId, columnKey, [created.id]);
                }}
                taskInputProps={{
                  categories: taskCategories,
                  projects,
                  defaultProjectId,
                  defaultCategory,
                  onCreateCategory: handleCreateCategory,
                  onCreateProject: handleCreateProject,
                  recentCategories,
                  recentProjectIds,
                }}
                getCategoryColor={getCategoryColor}
                deadlineThresholdDays={settings.deadlineThresholdDays}
              />
            </motion.div>
          )}
          {viewMode === "calendar" && (
            <motion.div key="calendar" {...viewAnimation} className="flex-1 min-h-0 flex flex-col">
              <CalendarView
                tasks={scopedTasks}
                allTasks={tasks}
                onUpdateTask={updateTask}
                onToggleStatus={toggleStatus}
                onTaskClick={setSelectedTask}
                onAddTask={(name, quadrant, options) => handleAddTask(name, quadrant, options)}
                taskInputProps={{
                  categories: taskCategories,
                  projects,
                  defaultProjectId,
                  defaultCategory,
                  onCreateCategory: handleCreateCategory,
                  onCreateProject: handleCreateProject,
                  recentCategories,
                  recentProjectIds,
                }}
                getCategoryColor={getCategoryColor}
              />
            </motion.div>
          )}
          {viewMode === "projects" && (
            <motion.div key="projects" {...viewAnimation} className="flex-1 min-h-0 w-full max-w-[1400px] mx-auto flex flex-col overflow-y-auto lg:overflow-hidden">
              <ProjectBuilder
                projects={projects} allTasks={filteredTasks} allNotes={filteredNotes} onAddProject={addProject} onUpdateProject={updateProject}
                onDeleteProject={deleteProject} onAddTask={addTaskToProject}
                onUpdateTask={updateProjectTask} onDeleteTask={deleteProjectTask}
                onAddMatrixTask={handleAddTask}
                onToggleMatrixTask={toggleStatus}
                onDeleteMatrixTask={(id) => deleteTask(id)}
                quadrants={quadrants}
                categories={taskCategories}
                onCreateCategory={handleCreateCategory}
                onCreateProject={handleCreateProject}
                onSelectTask={setSelectedTask}
                onAddNote={(opts) => addNote(opts)}
                onUpdateNote={updateNote}
                onDeleteNote={deleteNote}
                onArchiveAllDone={archiveDoneTasks} archivedTasks={archivedTasks} onUnarchiveTask={unarchiveTask} onDeleteArchivedTask={(id) => deleteTask(id)}
                onRescheduleTasks={handleRescheduleTasks}
                getProjectRole={getProjectRole}
                templatePresets={templatePresets}
                onAddPreset={addPreset}
                onUpdatePreset={updatePreset}
                onDeletePreset={deletePreset}
                recentCategories={recentCategories}
                recentProjectIds={recentProjectIds}
              />
            </motion.div>
          )}
          {viewMode === "notes" && (
            <motion.div key="notes" {...viewAnimation} className="flex-1 min-h-0 flex flex-col">
              <NotesView
                notes={scopedNotes}
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
          {viewMode === "sprint" && (
            <motion.div key="sprint" {...viewAnimation} className="flex-1 min-h-0 flex flex-col">
              <SprintView
                seedTasks={sprintSeed}
                onSeedConsumed={() => setSprintSeed(undefined)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="flex-shrink-0 h-10 border-t border-border/50" aria-hidden />

      {viewMode !== "notes" && <BulkActionBar
        onBulkReschedule={handleBulkReschedule}
        onBulkDelete={(ids) => ids.forEach((id) => deleteTask(id))}
        onBulkSetCategory={(ids, category) =>
          ids.forEach((id) => updateTask(id, { category }))
        }
        onBulkSetProject={(ids, projectId) =>
          ids.forEach((id) => updateTask(id, { projectId: projectId ?? undefined }))
        }
        categories={taskCategories}
        projects={projects}
        onCreateCategory={handleCreateCategory}
        onCreateProject={handleCreateProject}
        onAddToSprint={(ids) => {
          const map = new Map(tasks.map((t) => [t.id, t] as const));
          const seeds: SprintSeedTask[] = ids
            .map((id) => map.get(id))
            .filter((t): t is typeof tasks[number] => !!t)
            .map((t) => ({ id: t.id, title: t.name }));
          if (seeds.length === 0) return;
          setSprintSeed(seeds);
          setViewMode("sprint");
        }}
        boards={kanban.boards}
        columnsByBoard={kanban.columnsByBoard}
        onAddToNewKanban={async (ids, name, columnTitles) => {
          const res = await kanban.createBoard(name, columnTitles);
          if (!res) return;
          if (res.columnKeys[0]) {
            await kanban.assignTasks(res.boardId, res.columnKeys[0], ids);
          }
          setViewMode("kanban");
        }}
        onAddToExistingKanban={async (ids, boardId, columnKey) => {
          await kanban.assignTasks(boardId, columnKey, ids);
          setViewMode("kanban");
        }}
      />}

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
