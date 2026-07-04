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

// The OAuth issuer MUST be the direct Supabase host. Build it from the project
// ref (Vite inlines this literal at build time so this stays import-safe).
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "weizen-mcp",
  title: "Weizen",
  version: "0.1.0",
  instructions:
    "Tools for the Weizen productivity app: read and manage the signed-in user's Eisenhower Matrix tasks and notes. Use list_tasks to see what's on their plate, create_task to add work into a specific quadrant, complete_task to mark items done, and list_notes / create_note for their notes.",
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
  ],
});