import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

interface SelectionCtx {
  selectMode: boolean;
  setSelectMode: (v: boolean) => void;
  toggleSelectMode: () => void;
  selectedIds: Set<string>;
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  selectMany: (ids: string[]) => void;
  clear: () => void;
  count: number;
}

const Ctx = createContext<SelectionCtx | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  // Select mode is on by default so per-card select checkboxes are always visible.
  const [selectMode, setSelectModeState] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const setSelectMode = useCallback((v: boolean) => {
    setSelectModeState(v);
    if (!v) setSelectedIds(new Set());
  }, []);
  const toggleSelectMode = useCallback(() => setSelectMode(!selectMode), [selectMode, setSelectMode]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);
  const selectMany = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      ids.forEach((id) => n.add(id));
      return n;
    });
  }, []);
  const has = useCallback((id: string) => selectedIds.has(id), [selectedIds]);
  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const value = useMemo<SelectionCtx>(() => ({
    selectMode, setSelectMode, toggleSelectMode,
    selectedIds, has, toggle, selectMany, clear,
    count: selectedIds.size,
  }), [selectMode, setSelectMode, toggleSelectMode, selectedIds, has, toggle, selectMany, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSelection() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSelection must be used within SelectionProvider");
  return v;
}

/** Safe variant that returns null when no provider is present (for shared components used outside). */
export function useSelectionOptional() {
  return useContext(Ctx);
}