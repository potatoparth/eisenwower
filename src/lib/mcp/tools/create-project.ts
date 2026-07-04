import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";

export default defineTool({
  name: "create_project",
  title: "Create project",
  description: "Create a new project for the signed-in user.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Project name."),
    description: z.string().optional(),
  },
  annotations: { readOnlyHint: false },
  handler: async ({ name, description }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("project_templates")
      .insert({
        user_id: ctx.getUserId(),
        name,
        description: description ?? null,
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