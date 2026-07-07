import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";
import { descendantProjectIds, resolveProjectPath } from "../projectResolver";

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
    project_id: z.string().uuid().optional().describe("Filter to tasks under this project id (includes tasks on all descendant subprojects)."),
    project_path: z.string().optional().describe("Alternative to project_id: '/'-separated project path."),
    category: z
      .string()
      .optional()
      .describe("DEPRECATED. Filters tasks whose immediate project has this leaf name."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, quadrant, project_id, project_path, category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("tasks")
      .select(
        "id,name,description,quadrant,due_date,due_time,status,project_id,attachments,kanban_column,recurrence,recurrence_days,recurrence_time,is_recurring_instance,recurring_template_id,deadline_threshold_override,sort_order,created_at,updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (status) q = q.eq("status", status);
    if (quadrant) q = q.eq("quadrant", quadrant);
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
    let rows = data ?? [];
    if (category) {
      // Filter to tasks whose leaf project name matches (case-insensitive).
      const { data: projs } = await sb
        .from("project_templates")
        .select("id,name")
        .eq("user_id", ctx.getUserId());
      const nameById = new Map((projs ?? []).map((p) => [p.id, (p.name as string).toLowerCase()] as const));
      const wanted = category.toLowerCase();
      rows = rows.filter((t) => t.project_id && nameById.get(t.project_id as string) === wanted);
    }
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { tasks: rows },
    };
  },
});