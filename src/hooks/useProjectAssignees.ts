import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectAssignee {
  userId: string;
  displayName: string;
  email: string | null;
  role: string;
}

/**
 * Lists people who can be assigned within a project (owner + collaborators).
 * Callable by any collaborator via the `list_project_assignees` RPC.
 */
export function useProjectAssignees(projectId?: string | null) {
  const [assignees, setAssignees] = useState<ProjectAssignee[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (!projectId) { setAssignees([]); return; }
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("list_project_assignees", { _project_id: projectId });
      if (cancelled || error || !data) { if (!cancelled) setAssignees([]); return; }
      setAssignees(
        (data as Array<{ user_id: string; display_name: string; email: string | null; role: string }>).map((r) => ({
          userId: r.user_id, displayName: r.display_name, email: r.email, role: r.role,
        })),
      );
    })();
    return () => { cancelled = true; };
  }, [projectId]);
  return assignees;
}

/** Convenience: build a lookup map from user id → display name. */
export function assigneeMap(list: ProjectAssignee[]): Map<string, string> {
  const m = new Map<string, string>();
  list.forEach((a) => m.set(a.userId, a.displayName));
  return m;
}