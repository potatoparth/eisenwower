import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";
import { descendantProjectIds, resolveProjectPath } from "../projectResolver";

export default defineTool({
  name: "list_notes",
  title: "List notes",
  description: "List notes the signed-in user owns or has access to via shared projects. Results include authorship metadata (created_by, updated_by, assigned_to).",
  inputSchema: {
    project_id: z.string().uuid().optional().describe("Filter by project id (includes descendants)."),
    project_path: z.string().optional().describe("Alternative to project_id: '/'-separated project path."),
    assigned_to: z.string().uuid().optional().describe("Filter to notes assigned to this user id."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_id, project_path, assigned_to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("notes")
      .select("id,user_id,title,content,project_id,pinned,color,attachments,assigned_to,created_by,updated_by,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 50);
    let filterProjectId: string | null = project_id ?? null;
    if (!filterProjectId && project_path) {
      const { projectId } = await resolveProjectPath(sb, ctx.getUserId(), project_path, false);
      filterProjectId = projectId;
    }
    if (filterProjectId) {
      const ids = await descendantProjectIds(sb, ctx.getUserId(), filterProjectId);
      q = q.in("project_id", ids);
    }
    if (assigned_to) q = q.eq("assigned_to", assigned_to);
    const { data, error } = await q;
    if (error) return toErr(error.message);
    const rows = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { notes: rows },
    };
  },
});