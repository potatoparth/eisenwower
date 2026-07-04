import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";

export default defineTool({
  name: "list_tasks",
  title: "List tasks",
  description:
    "List the signed-in user's Eisenhower Matrix tasks. Optionally filter by status, quadrant, or category.",
  inputSchema: {
    status: z.enum(["open", "done"]).optional().describe("Filter by status."),
    quadrant: z
      .enum([
        "important-urgent",
        "important-not-urgent",
        "not-important-urgent",
        "not-important-not-urgent",
      ])
      .optional()
      .describe("Filter by Eisenhower quadrant."),
    category: z.string().optional().describe("Filter by category name."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, quadrant, category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let q = supabaseForUser(ctx)
      .from("tasks")
      .select("id,name,description,category,quadrant,due_date,due_time,status,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (status) q = q.eq("status", status);
    if (quadrant) q = q.eq("quadrant", quadrant);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) return toErr(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { tasks: data ?? [] },
    };
  },
});