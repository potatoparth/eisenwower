import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";

export default defineTool({
  name: "list_projects",
  title: "List projects",
  description:
    "List the signed-in user's projects (project templates). Each row includes `parent_id` and a computed breadcrumb `path` (root-first, '/'-joined). Projects form a tree — a project with `parent_id` set is a subproject of that parent.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("project_templates")
      .select("id,name,description,parent_id,sort_order,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 50);
    if (error) return toErr(error.message);
    // Compute breadcrumb path for each row.
    const rows = (data ?? []) as Array<{ id: string; name: string; parent_id: string | null }>;
    const byId = new Map(rows.map((r) => [r.id, r] as const));
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
      return { ...(r as object), path: chain.join(" / ") };
    });
    return {
      content: [{ type: "text", text: JSON.stringify(withPath) }],
      structuredContent: { projects: withPath },
    };
  },
});