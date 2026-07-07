import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";
import { resolveProjectPath } from "../projectResolver";

export default defineTool({
  name: "create_project",
  title: "Create project",
  description: "Create a new project for the signed-in user.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Project name."),
    description: z.string().optional(),
    parent_id: z.string().uuid().nullable().optional().describe("Parent project id — creates a subproject under it. Omit for a top-level project."),
    parent_path: z.string().optional().describe("Alternative to parent_id: '/'-separated path to the parent project; missing nodes are auto-created."),
  },
  annotations: { readOnlyHint: false },
  handler: async ({ name, description, parent_id, parent_path }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    let effectiveParentId: string | null = parent_id ?? null;
    if (!effectiveParentId && parent_path) {
      const { projectId } = await resolveProjectPath(sb, ctx.getUserId(), parent_path, true);
      effectiveParentId = projectId;
    }
    const { data, error } = await sb
      .from("project_templates")
      .insert({
        user_id: ctx.getUserId(),
        name,
        description: description ?? null,
        parent_id: effectiveParentId,
      })
      .select()
      .single();
    if (error) return toErr(error.message);
    return {
      content: [{ type: "text", text: `Created project ${data.id}` }],
      structuredContent: { project: data },
    };
  },
});