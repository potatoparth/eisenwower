import { useEffect, useState } from "react";

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
}

export function useSprints() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  useEffect(() => {
    setSprints(loadSprints());
  }, []);
  const update = (next: Sprint[]) => {
    setSprints(next);
    saveSprints(next);
  };
  return [sprints, update] as const;
}

export function elapsedMs(s: Sprint, now = Date.now()) {
  const ref = s.pausedAt ?? now;
  return Math.max(0, ref - s.startTime - s.pauseOffset);
}
