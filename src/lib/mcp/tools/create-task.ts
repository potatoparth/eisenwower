import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr, attachmentSchema, normalizeAttachments } from "../supabase";
import { resolveProjectPath } from "../projectResolver";

export default defineTool({
  name: "create_task",
  title: "Create task",
  description:
    "Create a task for the signed-in user in a specific Eisenhower quadrant. Supports description, project association, status, and attachments (links or already-uploaded files).",
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
    category: z
      .string()
      .optional()
      .describe(
        "DEPRECATED. Treated as a leaf subproject under `project_id` (or as a new top-level project if none). Prefer `project_path`.",
      ),
    due_date: z.string().optional().describe("Due date YYYY-MM-DD."),
    due_time: z.string().optional().describe("Due time HH:MM (24h)."),
    project_id: z.string().uuid().optional().describe("Associate the task with a specific project id (project_templates.id)."),
    project_path: z
      .string()
      .optional()
      .describe(
        "Alternative to project_id: '/'-separated project path like 'Work/Q4/Launch'. Any missing intermediate projects are auto-created for the user.",
      ),
    status: z.enum(["open", "done"]).optional().describe("Initial status (default 'open'). Pass 'done' to create it already completed."),
    attachments: z
      .array(attachmentSchema)
      .optional()
      .describe("Attachments to add. Use kind='link' with a URL, or kind='file' with an existing storage path in the task-attachments bucket."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  handler: async ({ name, description, quadrant, category, due_date, due_time, project_id, project_path, status, attachments }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    let effectiveProjectId: string | null = project_id ?? null;
    if (!effectiveProjectId && project_path) {
      const { projectId } = await resolveProjectPath(sb, ctx.getUserId(), project_path, true);
      effectiveProjectId = projectId;
    }
    if (category && category !== "General") {
      // Route category into a subproject under whatever parent we have (or a new root).
      const cur = effectiveProjectId;
      const { data: allProjects } = await sb
        .from("project_templates")
        .select("id,name,parent_id")
        .eq("user_id", ctx.getUserId());
      const existing = (allProjects ?? []).find(
        (p) => (p.parent_id ?? null) === cur && (p.name as string).toLowerCase() === category.toLowerCase(),
      );
      if (existing) {
        effectiveProjectId = existing.id as string;
      } else {
        const { data: created, error: cErr } = await sb
          .from("project_templates")
          .insert({ user_id: ctx.getUserId(), name: category, parent_id: cur })
          .select("id")
          .single();
        if (cErr) return toErr(cErr.message);
        effectiveProjectId = created.id as string;
      }
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