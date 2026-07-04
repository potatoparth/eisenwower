import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";

export default defineTool({
  name: "list_notes",
  title: "List notes",
  description: "List the signed-in user's notes.",
  inputSchema: {
    category: z.string().optional().describe("Filter by category."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let q = supabaseForUser(ctx)
      .from("notes")
      .select("id,title,content,category,pinned,color,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 50);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) return toErr(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { notes: data ?? [] },
    };
  },
});