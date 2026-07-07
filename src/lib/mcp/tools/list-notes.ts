import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";
import { descendantProjectIds, resolveProjectPath } from "../projectResolver";

export default defineTool({
  name: "list_notes",
  title: "List notes",
  description: "List the signed-in user's notes.",
  inputSchema: {
    project_id: z.string().uuid().optional().describe("Filter by project id (includes descendants)."),
    project_path: z.string().optional().describe("Alternative to project_id: '/'-separated project path."),
    category: z.string().optional().describe("DEPRECATED. Filters notes whose immediate project leaf name matches."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_id, project_path, category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("notes")
      .select("id,title,content,project_id,pinned,color,created_at,updated_at")
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
    const { data, error } = await q;
    if (error) return toErr(error.message);
    let rows = data ?? [];
    if (category) {
      const { data: projs } = await sb
        .from("project_templates")
        .select("id,name")
        .eq("user_id", ctx.getUserId());
      const nameById = new Map((projs ?? []).map((p) => [p.id, (p.name as string).toLowerCase()] as const));
      const wanted = category.toLowerCase();
      rows = rows.filter((n) => n.project_id && nameById.get(n.project_id as string) === wanted);
    }
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { notes: rows },
    };
  },
});