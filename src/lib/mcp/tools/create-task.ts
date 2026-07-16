import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr, attachmentSchema, normalizeAttachments } from "../supabase";
import { resolveProjectPath } from "../projectResolver";

export default defineTool({
  name: "create_task",
  title: "Create task",
  description:
    "Create a task in a specific Eisenhower quadrant. Supports description, project association (own or shared projects), status, attachments, and assigning to a collaborator on a shared project.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Task name."),
    description: z.string().optional().describe("Optional longer description."),
    quadrant: z
      .enum([
        "important-urgent",
        "important-not-urgent",
        "not-important-urgent",
        "not-important-not-urgent",
      ])
      .describe("Eisenhower quadrant."),
    due_date: z.string().optional().describe("Due date YYYY-MM-DD."),
    due_time: z.string().optional().describe("Due time HH:MM (24h)."),
    project_id: z.string().uuid().optional().describe("Associate the task with a specific project id (project_templates.id). Projects are hierarchical — a project's parent_id makes it a subproject."),
    project_path: z
      .string()
      .optional()
      .describe(
        "Alternative to project_id: '/'-separated project path like 'Work/Q4/Launch'. Any missing intermediate projects are auto-created for the user.",
      ),
    status: z.enum(["open", "done"]).optional().describe("Initial status (default 'open')."),
    assigned_to: z
      .string()
      .uuid()
      .optional()
      .describe("User id to assign this task to (must be the owner or a collaborator on the task's project). Defaults to the caller."),
    attachments: z
      .array(attachmentSchema)
      .optional()
      .describe("Attachments to add. Use kind='link' with a URL, or kind='file' with an existing storage path in the task-attachments bucket."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  handler: async ({ name, description, quadrant, due_date, due_time, project_id, project_path, status, assigned_to, attachments }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    let effectiveProjectId: string | null = project_id ?? null;
    if (!effectiveProjectId && project_path) {
      const { projectId } = await resolveProjectPath(sb, ctx.getUserId(), project_path, true);
      effectiveProjectId = projectId;
    }
    const { data, error } = await sb
      .from("tasks")
      .insert({
        user_id: ctx.getUserId(),
        name,
        description: description ?? null,
        quadrant,
        due_date: due_date ?? null,
        due_time: due_time ?? null,
        status: status ?? "open",
        project_id: effectiveProjectId,
        assigned_to: assigned_to ?? ctx.getUserId(),
        attachments: attachments ? normalizeAttachments(attachments) : [],
      })
      .select()
      .single();
    if (error) return toErr(error.message);
    return {
      content: [{ type: "text", text: `Created task ${data.id}` }],
      structuredContent: { task: data },
    };
  },
});