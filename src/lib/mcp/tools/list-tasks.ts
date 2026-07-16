import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";
import { descendantProjectIds, resolveProjectPath } from "../projectResolver";

export default defineTool({
  name: "list_tasks",
  title: "List tasks",
  description:
    "List Eisenhower Matrix tasks the signed-in user owns or has access to via shared projects. Filter by status, quadrant, project, assignee, or archived state. Results include authorship metadata (created_by, updated_by, assigned_to) and archived_at.",
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
    project_id: z.string().uuid().optional().describe("Filter to tasks under this project id (includes tasks on all descendant subprojects)."),
    project_path: z.string().optional().describe("Alternative to project_id: '/'-separated project path."),
    assigned_to: z.string().uuid().optional().describe("Filter to tasks assigned to this user id."),
    include_archived: z.boolean().optional().describe("Include archived (completed & recycled) tasks. Default false — archived tasks are hidden."),
    only_archived: z.boolean().optional().describe("Return ONLY archived tasks (archived_at is not null)."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, quadrant, project_id, project_path, assigned_to, include_archived, only_archived, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("tasks")
      .select(
        "id,user_id,name,description,quadrant,due_date,due_time,status,project_id,attachments,kanban_column,recurrence,recurrence_days,recurrence_time,is_recurring_instance,recurring_template_id,deadline_threshold_override,sort_order,archived_at,assigned_to,created_by,updated_by,created_at,updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (status) q = q.eq("status", status);
    if (quadrant) q = q.eq("quadrant", quadrant);
    if (assigned_to) q = q.eq("assigned_to", assigned_to);
    if (only_archived) q = q.not("archived_at", "is", null);
    else if (!include_archived) q = q.is("archived_at", null);
    let filterProjectId: string | null = project_id ?? null;
    if (!filterProjectId && project_path) {
      const { projectId } = await resolveProjectPath(sb, ctx.getUserId(), project_path, false);
      filterProjectId = projectId;
    }
    if (filterProjectId) {
      const ids = await descendantProjectIds(sb, ctx.getUserId(), filterProjectId);
      q = q.in("project_id", ids);
    }
    const { data, error } = await q;
    if (error) return toErr(error.message);
    const rows = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { tasks: rows },
    };
  },
});