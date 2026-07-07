import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";
import { resolveProjectPath } from "../projectResolver";

export default defineTool({
  name: "create_note",
  title: "Create note",
  description: "Create a note for the signed-in user.",
  inputSchema: {
    title: z.string().trim().min(1).describe("Note title."),
    content: z.string().optional().describe("Markdown / plain text body."),
    category: z.string().optional().describe("DEPRECATED. Treated as subproject-name under `project_path`/`project_id`."),
    project_id: z.string().uuid().optional().describe("Attach to a specific project id."),
    project_path: z.string().optional().describe("Alternative to project_id: '/'-separated project path; missing nodes are created."),
    pinned: z.boolean().optional().describe("Pin to the top."),
  },
  annotations: { readOnlyHint: false },
  handler: async ({ title, content, category, project_id, project_path, pinned }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    let effectiveProjectId: string | null = project_id ?? null;
    if (!effectiveProjectId && project_path) {
      const { projectId } = await resolveProjectPath(sb, ctx.getUserId(), project_path, true);
      effectiveProjectId = projectId;
    }
    if (category && category !== "General") {
      const cur = effectiveProjectId;
      const { data: all } = await sb
        .from("project_templates")
        .select("id,name,parent_id")
        .eq("user_id", ctx.getUserId());
      const existing = (all ?? []).find(
        (p) => (p.parent_id ?? null) === cur && (p.name as string).toLowerCase() === category.toLowerCase(),
      );
      if (existing) effectiveProjectId = existing.id as string;
      else {
        const { data: created, error: cErr } = await sb
          .from("project_templates")
          .insert({ user_id: ctx.getUserId(), name: category, parent_id: cur })
          .select("id").single();
        if (cErr) return toErr(cErr.message);
        effectiveProjectId = created.id as string;
      }
    }
    const { data, error } = await sb
      .from("notes")
      .insert({
        user_id: ctx.getUserId(),
        title,
        content: content ?? "",
        project_id: effectiveProjectId,
        pinned: pinned ?? false,
      })
      .select()
      .single();
    if (error) return toErr(error.message);
    return {
      content: [{ type: "text", text: `Created note ${data.id}` }],
      structuredContent: { note: data },
    };
  },
});