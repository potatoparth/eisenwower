import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";

export default defineTool({
  name: "list_project_collaborators",
  title: "List project collaborators",
  description:
    "List everyone who can act on a given project (owner plus invited collaborators) with their role. Use the returned user ids as `assigned_to` when creating or updating tasks and notes.",
  inputSchema: {
    project_id: z.string().uuid().describe("Project id (project_templates.id)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx).rpc("list_project_assignees", {
      _project_id: project_id,
    });
    if (error) return toErr(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { members: data ?? [] },
    };
  },
});