import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";

export default defineTool({
  name: "archive_task",
  title: "Archive task",
  description:
    "Archive or unarchive a task. Archived tasks are hidden from default lists but kept for history (use list_tasks with only_archived=true to see them).",
  inputSchema: {
    task_id: z.string().uuid().describe("Task id."),
    archived: z
      .boolean()
      .optional()
      .describe("true (default) to archive, false to restore."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true },
  handler: async ({ task_id, archived }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const archived_at = archived === false ? null : new Date().toISOString();
    const { data, error } = await supabaseForUser(ctx)
      .from("tasks")
      .update({ archived_at })
      .eq("id", task_id)
      .select()
      .single();
    if (error) return toErr(error.message);
    return {
      content: [{ type: "text", text: archived_at ? `Archived task ${task_id}` : `Restored task ${task_id}` }],
      structuredContent: { task: data },
    };
  },
});