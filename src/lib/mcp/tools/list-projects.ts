import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";

export default defineTool({
  name: "list_projects",
  title: "List projects",
  description:
    "List projects the signed-in user owns AND projects shared with them. Each row includes `parent_id`, a computed breadcrumb `path`, and `access` = 'owner' | 'editor' | 'viewer'. Projects form a tree — a project with `parent_id` set is a subproject of that parent.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const { data, error } = await sb
      .from("project_templates")
      .select("id,user_id,name,description,parent_id,sort_order,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 50);
    if (error) return toErr(error.message);
    const rows = (data ?? []) as Array<{ id: string; user_id: string; name: string; parent_id: string | null }>;
    const { data: collabs } = await sb
      .from("project_collaborators")
      .select("project_id,role")
      .eq("user_id", uid);
    const collaboratorRoleByProject = new Map((collabs ?? []).map((c) => [c.project_id as string, c.role as string]));
    const byId = new Map(rows.map((r) => [r.id, r] as const));
    const rootOf = (id: string): string => {
      let cur: string | null | undefined = id;
      const seen = new Set<string>();
      while (cur && byId.get(cur)?.parent_id && !seen.has(cur)) {
        seen.add(cur);
        cur = byId.get(cur)?.parent_id;
      }
      return cur ?? id;
    };
    const ancestorsOf = (id: string): string[] => {
      const chain: string[] = [];
      let cur: string | null | undefined = id;
      const seen = new Set<string>();
      while (cur && !seen.has(cur)) {
        seen.add(cur);
        chain.push(cur);
        cur = byId.get(cur)?.parent_id;
      }
      return chain;
    };
    const withPath = rows.map((r) => {
      const chain: string[] = [];
      let cur: string | null | undefined = r.id;
      const seen = new Set<string>();
      while (cur && !seen.has(cur)) {
        seen.add(cur);
        const row = byId.get(cur);
        if (!row) break;
        chain.unshift(row.name);
        cur = row.parent_id;
      }
      const root = byId.get(rootOf(r.id));
      const access = root?.user_id === uid || r.user_id === uid
        ? "owner"
        : (ancestorsOf(r.id).map((id) => collaboratorRoleByProject.get(id)).find(Boolean) ?? "viewer");
      return { ...(r as object), path: chain.join(" / "), access };
    });
    return {
      content: [{ type: "text", text: JSON.stringify(withPath) }],
      structuredContent: { projects: withPath },
    };
  },
});