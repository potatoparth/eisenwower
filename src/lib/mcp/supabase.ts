import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

/** Schema for a single task attachment (link or already-uploaded file). */
export const attachmentSchema = z.object({
  id: z.string().optional().describe("Stable id; auto-generated if omitted."),
  name: z.string().min(1).describe("Display label."),
  kind: z.enum(["file", "link"]).describe("'link' for URLs, 'file' for objects already in the task-attachments bucket."),
  path: z
    .string()
    .min(1)
    .describe("For links: full URL. For files: storage object path inside the task-attachments bucket."),
  size: z.number().int().nonnegative().optional(),
  contentType: z.string().optional(),
  addedAt: z.string().optional(),
});

export type AttachmentInput = z.infer<typeof attachmentSchema>;

export function normalizeAttachments(list: AttachmentInput[]): AttachmentInput[] {
  const now = new Date().toISOString();
  return list.map((a) => ({
    ...a,
    id: a.id ?? (globalThis.crypto?.randomUUID?.() ?? `${now}-${Math.random().toString(36).slice(2)}`),
    addedAt: a.addedAt ?? now,
  }));
}

/** Per-request Supabase client that runs under the calling MCP user's RLS. */
export function supabaseForUser(ctx: ToolContext) {
  const url = process.env.SUPABASE_URL!;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function unauthenticated() {
  return {
    content: [{ type: "text" as const, text: "Not authenticated" }],
    isError: true,
  };
}

export function toErr(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}