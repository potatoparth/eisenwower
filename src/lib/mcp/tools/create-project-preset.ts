import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";

export default defineTool({
  name: "create_project_template_preset",
  title: "Create project template preset",
  description:
    "Create a reusable project template preset with a list of preset tasks.",
  inputSchema: {
    name: z.string().trim().min(1),
    description: z.string().optional(),
    tasks: z
      .array(z.record(z.string(), z.unknown()))
      .optional()
      .describe(
        "Array of preset task objects (name, description, dependencyType 'sync'|'async', dependsOn[], durationDays, etc.)."
      ),
  },
  annotations: { readOnlyHint: false },
  handler: async ({ name, description, tasks }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("project_template_presets")
      .insert({
        user_id: ctx.getUserId(),
        name,
        description: description ?? null,
        tasks: tasks ?? [],
      })
      .select()
      .single();
    if (error) return toErr(error.message);
    return {
      content: [{ type: "text", text: `Created preset ${data.id}` }],
      structuredContent: { preset: data },
    };
  },
});