import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";

export default defineTool({
  name: "update_task",
  title: "Update task",
  description:
    "Update fields on an existing task: name, description, quadrant (move between Eisenhower quadrants), category, due date/time (reschedule), or status.",
  inputSchema: {
    task_id: z.string().uuid().describe("Task id."),
    name: z.string().trim().min(1).optional(),
    description: z.string().nullable().optional(),
    quadrant: z
      .enum([
        "important-urgent",
        "important-not-urgent",
        "not-important-urgent",
        "not-important-not-urgent",
      ])
      .optional()
      .describe("Move task to a different Eisenhower quadrant."),
    category: z.string().optional(),
    due_date: z.string().nullable().optional().describe("YYYY-MM-DD, or null to clear."),
    due_time: z.string().nullable().optional().describe("HH:MM (24h), or null to clear."),
    status: z.enum(["open", "done"]).optional(),
  },
  annotations: { readOnlyHint: false, idempotentHint: true },
  handler: async ({ task_id, ...fields }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) patch[k] = v;
    }
    if (Object.keys(patch).length === 0)
      return toErr("No fields to update.");
    const { data, error } = await supabaseForUser(ctx)
      .from("tasks")
      .update(patch)
      .eq("id", task_id)
      .select()
      .single();
    if (error) return toErr(error.message);
    return {
      content: [{ type: "text", text: `Updated task ${task_id}` }],
      structuredContent: { task: data },
    };
  },
});