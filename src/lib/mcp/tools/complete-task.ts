import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";

export default defineTool({
  name: "complete_task",
  title: "Complete task",
  description: "Mark a task as done (or reopen it).",
  inputSchema: {
    task_id: z.string().uuid().describe("Task id."),
    done: z.boolean().optional().describe("true to mark done (default), false to reopen."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true },
  handler: async ({ task_id, done }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const status = done === false ? "open" : "done";
    const { data, error } = await supabaseForUser(ctx)
      .from("tasks")
      .update({ status })
      .eq("id", task_id)
      .select()
      .single();
    if (error) return toErr(error.message);
    return {
      content: [{ type: "text", text: `Task ${task_id} → ${status}` }],
      structuredContent: { task: data },
    };
  },
});