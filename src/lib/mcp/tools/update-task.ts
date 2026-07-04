import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr, attachmentSchema, normalizeAttachments } from "../supabase";

export default defineTool({
  name: "update_task",
  title: "Update task",
  description:
    "Update fields on an existing task: name, description, quadrant (move between Eisenhower quadrants), category, due date/time (reschedule), status (mark done/reopen), project association, or attachments. Cannot change task ownership.",
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
    status: z.enum(["open", "done"]).optional().describe("Set to 'done' to complete, 'open' to reopen."),
    project_id: z.string().uuid().nullable().optional().describe("Associate with a project, or null to detach."),
    attachments: z
      .array(attachmentSchema)
      .optional()
      .describe("Attachments to add or replace. Use kind='link' with URL, or kind='file' with an existing storage path."),
    attachments_mode: z
      .enum(["append", "replace"])
      .optional()
      .describe("How to apply `attachments`: 'append' (default) adds to existing, 'replace' overwrites the full list."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true },
  handler: async ({ task_id, attachments, attachments_mode, ...fields }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) patch[k] = v;
    }
    const sb = supabaseForUser(ctx);
    if (attachments !== undefined) {
      const normalized = normalizeAttachments(attachments);
      if ((attachments_mode ?? "append") === "replace") {
        patch.attachments = normalized;
      } else {
        const { data: existing, error: readErr } = await sb
          .from("tasks")
          .select("attachments")
          .eq("id", task_id)
          .single();
        if (readErr) return toErr(readErr.message);
        const current = Array.isArray(existing?.attachments) ? existing.attachments : [];
        patch.attachments = [...current, ...normalized];
      }
    }
    if (Object.keys(patch).length === 0)
      return toErr("No fields to update.");
    const { data, error } = await sb
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