import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";

export default defineTool({
  name: "delete_task",
  title: "Delete task",
  description: "Permanently delete a task.",
  inputSchema: { task_id: z.string().uuid().describe("Task id.") },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  handler: async ({ task_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { error } = await supabaseForUser(ctx)
      .from("tasks")
      .delete()
      .eq("id", task_id);
    if (error) return toErr(error.message);
    return { content: [{ type: "text", text: `Deleted task ${task_id}` }] };
  },
});