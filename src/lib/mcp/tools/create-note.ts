import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, toErr } from "../supabase";

export default defineTool({
  name: "create_note",
  title: "Create note",
  description: "Create a note for the signed-in user.",
  inputSchema: {
    title: z.string().trim().min(1).describe("Note title."),
    content: z.string().optional().describe("Markdown / plain text body."),
    category: z.string().optional().describe("Category (default 'General')."),
    pinned: z.boolean().optional().describe("Pin to the top."),
  },
  annotations: { readOnlyHint: false },
  handler: async ({ title, content, category, pinned }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("notes")
      .insert({
        user_id: ctx.getUserId(),
        title,
        content: content ?? "",
        category: category ?? "General",
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