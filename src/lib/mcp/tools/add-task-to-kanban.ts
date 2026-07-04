import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";

export default defineTool({
  name: "add_task_to_kanban",
  title: "Add task to kanban",
  description:
    "Place an existing task on a kanban board in a specific column. Uses the column's stable key.",
  inputSchema: {
    board_id: z.string().uuid(),
    task_id: z.string().uuid(),
    column_key: z.string().min(1).describe("Stable column key from list_kanban_boards."),
    sort_order: z.number().int().optional(),
  },
  annotations: { readOnlyHint: false },
  handler: async ({ board_id, task_id, column_key, sort_order }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("kanban_board_items")
      .insert({
        user_id: ctx.getUserId(),
        board_id,
        task_id,
        column_key,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();
    if (error) return toErr(error.message);
    return {
      content: [{ type: "text", text: `Added task to board` }],
      structuredContent: { item: data },
    };
  },
});