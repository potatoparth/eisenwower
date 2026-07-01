import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import type { AtmosphereId } from "./atmospheres";

export interface SprintTask {
  id: string;
  title: string;
  done: boolean;
}

export interface Sprint {
  id: string;
  title: string;
  duration: number; // minutes (planned)
  tasks: SprintTask[];
  startTime: number; // Date.now() anchor
  pauseOffset: number; // total ms paused
  pausedAt?: number | null;
  completedAt?: number;
  endedEarly?: boolean;
  actualMinutes?: number;
  noTimer?: boolean;
  atmosphere?: AtmosphereId;
}

const KEY = "lockin.sprints.v1";
const ACTIVE_KEY = "lockin.active.v2";
const CHANGE_EVENT = "lockin.sprints.change";

function emitChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function loadSprints(): Sprint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Sprint[]) : [];
  } catch {
    return [];
  }
}

export function saveSprints(sprints: Sprint[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(sprints));
  emitChange();
}

export function loadActiveSprint(): Sprint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    return raw ? (JSON.parse(raw) as Sprint) : null;
  } catch {
    return null;
  }
}

export function saveActiveSprint(s: Sprint | null) {
  if (typeof window === "undefined") return;
  if (s) localStorage.setItem(ACTIVE_KEY, JSON.stringify(s));
  else localStorage.removeItem(ACTIVE_KEY);
  emitChange();
  // Fire and forget cloud sync.
  void syncActiveToCloud(s);
}

export function useSprints() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  useEffect(() => {
    setSprints(loadSprints());
    // Hydrate from cloud (authoritative when signed in).
    void hydrateFromCloud().then((rows) => {
      if (rows) setSprints(rows.completed);
    });
    const onChange = () => setSprints(loadSprints());
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);
  const update = (next: Sprint[]) => {
    setSprints(next);
    saveSprints(next);
    void syncCompletedListToCloud(next);
  };
  return [sprints, update] as const;
}

/** Reactive active sprint. Reflects cloud + local changes. */
export function useActiveSprint() {
  const [active, setActive] = useState<Sprint | null>(() => loadActiveSprint());
  useEffect(() => {
    setActive(loadActiveSprint());
    const onChange = () => setActive(loadActiveSprint());
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);
  return active;
}

export function elapsedMs(s: Sprint, now = Date.now()) {
  const ref = s.pausedAt ?? now;
  return Math.max(0, ref - s.startTime - s.pauseOffset);
}

/* ---------------- Cloud sync (Supabase) ---------------- */

interface SprintRow {
  id: string;
  title: string;
  duration: number;
  tasks: SprintTask[] | unknown;
  start_time: number | string;
  pause_offset: number | string;
  paused_at: number | string | null;
  completed_at: number | string | null;
  ended_early: boolean | null;
  actual_minutes: number | null;
  no_timer: boolean | null;
  atmosphere: string | null;
  is_active: boolean;
}

const num = (v: number | string | null | undefined) =>
  v == null ? null : typeof v === "number" ? v : Number(v);

function rowToSprint(row: SprintRow): Sprint {
  return {
    id: row.id,
    title: row.title,
    duration: row.duration,
    tasks: Array.isArray(row.tasks) ? (row.tasks as SprintTask[]) : [],
    startTime: num(row.start_time) ?? Date.now(),
    pauseOffset: num(row.pause_offset) ?? 0,
    pausedAt: num(row.paused_at),
    completedAt: num(row.completed_at) ?? undefined,
    endedEarly: row.ended_early ?? undefined,
    actualMinutes: row.actual_minutes ?? undefined,
    noTimer: row.no_timer ?? undefined,
    atmosphere: (row.atmosphere as AtmosphereId | null) ?? undefined,
  };
}

function sprintToRow(s: Sprint, userId: string, isActive: boolean) {
  return {
    id: s.id,
    user_id: userId,
    title: s.title,
    duration: s.duration,
    tasks: s.tasks as unknown as never,
    start_time: s.startTime,
    pause_offset: s.pauseOffset,
    paused_at: s.pausedAt ?? null,
    completed_at: s.completedAt ?? null,
    ended_early: s.endedEarly ?? null,
    actual_minutes: s.actualMinutes ?? null,
    no_timer: !!s.noTimer,
    atmosphere: s.atmosphere ?? null,
    is_active: isActive,
  };
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function hydrateFromCloud(): Promise<{ completed: Sprint[]; active: Sprint | null } | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from("sprints")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return null;
  const rows = data as unknown as SprintRow[];
  const active = rows.find((r) => r.is_active);
  const completed = rows
    .filter((r) => !r.is_active)
    .map(rowToSprint)
    .slice(0, 50);
  saveSprints(completed);
  if (active) {
    if (typeof window !== "undefined") {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(rowToSprint(active)));
    }
  } else if (typeof window !== "undefined") {
    localStorage.removeItem(ACTIVE_KEY);
  }
  emitChange();
  return {
    completed,
    active: active ? rowToSprint(active) : null,
  };
}

async function syncActiveToCloud(s: Sprint | null) {
  const userId = await getUserId();
  if (!userId) return;
  // Clear any existing active row for this user (unique index enforces one).
  await supabase.from("sprints").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);
  if (!s) return;
  await supabase.from("sprints").upsert(sprintToRow(s, userId, true), { onConflict: "id" });
}

async function syncCompletedListToCloud(list: Sprint[]) {
  const userId = await getUserId();
  if (!userId) return;
  // Fetch existing non-active ids, compute diff, delete removed, upsert current.
  const { data } = await supabase
    .from("sprints")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", false);
  const existingIds = new Set(((data as { id: string }[] | null) ?? []).map((r) => r.id));
  const nextIds = new Set(list.map((s) => s.id));
  const toDelete = [...existingIds].filter((id) => !nextIds.has(id));
  if (toDelete.length) {
    await supabase.from("sprints").delete().in("id", toDelete);
  }
  if (list.length) {
    await supabase
      .from("sprints")
      .upsert(list.map((s) => sprintToRow(s, userId, false)), { onConflict: "id" });
  }
}
