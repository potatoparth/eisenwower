import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr, attachmentSchema, normalizeAttachments } from "../supabase";

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
    category: z.string().optional().describe("Category name (default 'General')."),
    due_date: z.string().optional().describe("Due date YYYY-MM-DD."),
    due_time: z.string().optional().describe("Due time HH:MM (24h)."),
    project_id: z.string().uuid().optional().describe("Associate the task with a project (project_templates.id)."),
    status: z.enum(["open", "done"]).optional().describe("Initial status (default 'open'). Pass 'done' to create it already completed."),
    attachments: z
      .array(attachmentSchema)
      .optional()
      .describe("Attachments to add. Use kind='link' with a URL, or kind='file' with an existing storage path in the task-attachments bucket."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  handler: async ({ name, description, quadrant, category, due_date, due_time, project_id, status, attachments }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("tasks")
      .insert({
        user_id: ctx.getUserId(),
        name,
        description: description ?? null,
        quadrant,
        category: category ?? "General",
        due_date: due_date ?? null,
        due_time: due_time ?? null,
        status: status ?? "open",
        project_id: project_id ?? null,
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