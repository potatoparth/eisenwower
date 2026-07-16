import React, { createContext, useContext, useMemo } from "react";

interface TaskActionsCtx {
  archiveTask?: (id: string) => void;
}

const Ctx = createContext<TaskActionsCtx | null>(null);

export function TaskActionsProvider({
  archiveTask,
  children,
}: {
  archiveTask?: (id: string) => void;
  children: React.ReactNode;
}) {
  const value = useMemo<TaskActionsCtx>(() => ({ archiveTask }), [archiveTask]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTaskActionsOptional() {
  return useContext(Ctx);
}