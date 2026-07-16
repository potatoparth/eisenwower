import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTasksTool from "./tools/list-tasks";
import createTaskTool from "./tools/create-task";
import updateTaskTool from "./tools/update-task";
import completeTaskTool from "./tools/complete-task";
import deleteTaskTool from "./tools/delete-task";
import listNotesTool from "./tools/list-notes";
import createNoteTool from "./tools/create-note";
import listProjectsTool from "./tools/list-projects";
import createProjectTool from "./tools/create-project";
import listProjectPresetsTool from "./tools/list-project-presets";
import createProjectPresetTool from "./tools/create-project-preset";
import listKanbanBoardsTool from "./tools/list-kanban-boards";
import createKanbanBoardTool from "./tools/create-kanban-board";
import addTaskToKanbanTool from "./tools/add-task-to-kanban";
import archiveTaskTool from "./tools/archive-task";
import listProjectCollaboratorsTool from "./tools/list-project-collaborators";

// The OAuth issuer MUST be the direct Supabase host. Build it from the project
// ref (Vite inlines this literal at build time so this stays import-safe).
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "weizen-mcp",
  title: "Weizen",
  version: "0.1.0",
  instructions:
    "Tools for the Weizen productivity app. Tasks live in an Eisenhower Matrix (four quadrants) and can be organized under a hierarchical project tree (projects have optional parent_ids and can be shared with collaborators as viewer/editor). Every task and note carries authorship metadata: created_by, updated_by, and assigned_to. Tasks also have an archived_at timestamp — completed tasks are archived rather than deleted, and list_tasks hides archived rows by default. Use list_projects to see owned + shared projects, list_project_collaborators to discover assignable users, list_tasks / create_task / update_task / complete_task / archive_task / delete_task for tasks, list_notes / create_note for notes, and list_kanban_boards / create_kanban_board / add_task_to_kanban for the user's custom kanban boards.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listTasksTool,
    createTaskTool,
    updateTaskTool,
    completeTaskTool,
    deleteTaskTool,
    listNotesTool,
    createNoteTool,
    listProjectsTool,
    createProjectTool,
    listProjectPresetsTool,
    createProjectPresetTool,
    listKanbanBoardsTool,
    createKanbanBoardTool,
    addTaskToKanbanTool,
    archiveTaskTool,
    listProjectCollaboratorsTool,
  ],
});