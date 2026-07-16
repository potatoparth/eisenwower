import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Resolve display names for a set of user ids via the profiles table. */
export function useUserNames(userIds: string[]): Map<string, string> {
  const [map, setMap] = useState<Map<string, string>>(new Map());
  const key = userIds.slice().sort().join(",");
  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (!ids.length) { setMap(new Map()); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles_public")
        .select("user_id,display_name")
        .in("user_id", ids);
      if (cancelled) return;
      const m = new Map<string, string>();
      (data || []).forEach((r: { user_id: string; display_name: string | null }) => {
        m.set(r.user_id, r.display_name || "User");
      });
      setMap(m);
    })();
    return () => { cancelled = true; };
  }, [key]);
  return map;
}