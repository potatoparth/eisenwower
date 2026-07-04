import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";

export default defineTool({
  name: "create_task",
  title: "Create task",
  description:
    "Create a task for the signed-in user in a specific Eisenhower quadrant.",
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
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  handler: async ({ name, description, quadrant, category, due_date, due_time }, ctx) => {
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
        status: "open",
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