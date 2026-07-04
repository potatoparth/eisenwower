import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";

export default defineTool({
  name: "list_kanban_boards",
  title: "List kanban boards",
  description: "List the signed-in user's kanban boards and their columns.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    const { data: boards, error } = await sb
      .from("kanban_boards")
      .select("id,name,sort_order,created_at,updated_at")
      .order("sort_order", { ascending: true })
      .limit(limit ?? 50);
    if (error) return toErr(error.message);
    const { data: columns, error: colErr } = await sb
      .from("kanban_columns")
      .select("id,board_id,title,column_key,sort_order");
    if (colErr) return toErr(colErr.message);
    return {
      content: [{ type: "text", text: JSON.stringify({ boards, columns }) }],
      structuredContent: { boards: boards ?? [], columns: columns ?? [] },
    };
  },
});