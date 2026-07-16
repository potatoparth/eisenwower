import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";
import { resolveProjectPath } from "../projectResolver";

export default defineTool({
  name: "create_note",
  title: "Create note",
  description: "Create a note. Notes can live inside a project (including shared projects the user can edit) and be assigned to a collaborator.",
  inputSchema: {
    title: z.string().trim().min(1).describe("Note title."),
    content: z.string().optional().describe("Markdown / plain text body."),
    project_id: z.string().uuid().optional().describe("Attach to a specific project id."),
    project_path: z.string().optional().describe("Alternative to project_id: '/'-separated project path; missing nodes are created."),
    pinned: z.boolean().optional().describe("Pin to the top."),
    assigned_to: z.string().uuid().optional().describe("Assign the note to a user id (owner or collaborator on the project). Defaults to the caller."),
  },
  annotations: { readOnlyHint: false },
  handler: async ({ title, content, project_id, project_path, pinned, assigned_to }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    let effectiveProjectId: string | null = project_id ?? null;
    if (!effectiveProjectId && project_path) {
      const { projectId } = await resolveProjectPath(sb, ctx.getUserId(), project_path, true);
      effectiveProjectId = projectId;
    }
    const { data, error } = await sb
      .from("notes")
      .insert({
        user_id: ctx.getUserId(),
        title,
        content: content ?? "",
        project_id: effectiveProjectId,
        pinned: pinned ?? false,
        assigned_to: assigned_to ?? ctx.getUserId(),
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