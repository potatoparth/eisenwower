import type { SupabaseClient } from "@supabase/supabase-js";

type ProjectRow = { id: string; name: string; parent_id: string | null };

/**
 * Resolve a "/"-separated project path into a project id. If create=true, any
 * missing intermediate nodes are created (as top-level roots or subprojects of
 * the last matching ancestor). Returns null when the path is empty.
 * Matching is case-insensitive; exact-name matches win over case-insensitive.
 */
export async function resolveProjectPath(
  sb: SupabaseClient,
  userId: string,
  path: string | undefined | null,
  create = false,
): Promise<{ projectId: string | null; created: string[] }> {
  if (!path?.trim()) return { projectId: null, created: [] };
  const parts = path.split("/").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return { projectId: null, created: [] };
  const { data, error } = await sb
    .from("project_templates")
    .select("id,name,parent_id");
  if (error) throw new Error(error.message);
  const all = (data ?? []) as ProjectRow[];
  const created: string[] = [];
  let currentParent: string | null = null;
  let currentId: string | null = null;
  for (const part of parts) {
    const match = all.find(
      (p) => (p.parent_id ?? null) === currentParent && p.name.toLowerCase() === part.toLowerCase(),
    );
    if (match) {
      currentId = match.id;
      currentParent = match.id;
      continue;
    }
    if (!create) return { projectId: null, created };
    const { data: inserted, error: insErr } = await sb
      .from("project_templates")
      .insert({ user_id: userId, name: part, parent_id: currentParent })
      .select("id,name,parent_id")
      .single();
    if (insErr) throw new Error(insErr.message);
    all.push(inserted as ProjectRow);
    created.push(inserted.id);
    currentId = inserted.id;
    currentParent = inserted.id;
  }
  return { projectId: currentId, created };
}

/** Fetch the given project id and all of its descendants (as ids). */
export async function descendantProjectIds(
  sb: SupabaseClient,
  userId: string,
  rootId: string,
): Promise<string[]> {
  const { data, error } = await sb
    .from("project_templates")
    .select("id,parent_id");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { id: string; parent_id: string | null }[];
  const childrenBy = new Map<string | null, string[]>();
  rows.forEach((r) => {
    const k = r.parent_id ?? null;
    if (!childrenBy.has(k)) childrenBy.set(k, []);
    childrenBy.get(k)!.push(r.id);
  });
  const out: string[] = [];
  const walk = (id: string) => {
    out.push(id);
    (childrenBy.get(id) ?? []).forEach(walk);
  };
  walk(rootId);
  return out;
}

/** Human breadcrumb like "Work / Q4 / Launch" for a project id. */
export async function projectPathString(
  sb: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<string> {
  const { data } = await sb
    .from("project_templates")
    .select("id,name,parent_id");
  const rows = (data ?? []) as ProjectRow[];
  const byId = new Map(rows.map((r) => [r.id, r] as const));
  const chain: string[] = [];
  let cursor: string | null = projectId;
  const guard = new Set<string>();
  while (cursor && !guard.has(cursor)) {
    guard.add(cursor);
    const row = byId.get(cursor);
    if (!row) break;
    chain.unshift(row.name);
    cursor = row.parent_id;
  }
  return chain.join(" / ");
}