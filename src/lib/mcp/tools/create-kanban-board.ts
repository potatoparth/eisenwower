import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";

export default defineTool({
  name: "create_kanban_board",
  title: "Create kanban board",
  description:
    "Create a new kanban board with optional starter columns. Column keys are stable ids used when adding tasks.",
  inputSchema: {
    name: z.string().trim().min(1),
    columns: z
      .array(
        z.object({
          title: z.string().min(1),
          column_key: z.string().min(1).describe("Stable key (e.g. 'todo')."),
        })
      )
      .optional()
      .describe("Optional initial columns. Defaults to To Do / Doing / Done."),
  },
  annotations: { readOnlyHint: false },
  handler: async ({ name, columns }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const { data: board, error } = await sb
      .from("kanban_boards")
      .insert({ user_id: uid, name, sort_order: 0 })
      .select()
      .single();
    if (error) return toErr(error.message);
    const cols =
      columns && columns.length > 0
        ? columns
        : [
            { title: "To Do", column_key: "todo" },
            { title: "Doing", column_key: "doing" },
            { title: "Done", column_key: "done" },
          ];
    const { data: inserted, error: colErr } = await sb
      .from("kanban_columns")
      .insert(
        cols.map((c, i) => ({
          user_id: uid,
          board_id: board.id,
          title: c.title,
          column_key: c.column_key,
          sort_order: i,
        }))
      )
      .select();
    if (colErr) return toErr(colErr.message);
    return {
      content: [{ type: "text", text: `Created board ${board.id}` }],
      structuredContent: { board, columns: inserted ?? [] },
    };
  },
});