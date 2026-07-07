import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, LayoutGrid, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ProjectTemplate } from "@/types/project";
import { useIsMobile } from "@/hooks/use-mobile";
import { buildProjectTree, flattenProjectTree, indexProjectNodes, getProjectPath } from "@/lib/projectTree";

export type DateFilter = "all" | "today" | "week";
export type OverdueMode = "all" | "only" | "hide";

interface FilterBarProps {
  dateFilter: DateFilter;
  onDateFilterChange: (f: DateFilter) => void;
  overdueMode: OverdueMode;
  onOverdueModeChange: (m: OverdueMode) => void;
  noDatePosition: "top" | "bottom";
  onNoDatePositionChange: (v: "top" | "bottom") => void;
  categories: string[];
  selectedCategories: string[];
  onSelectedCategoriesChange: (v: string[]) => void;
  getCategoryColor?: (name: string) => string | undefined;
  projects?: ProjectTemplate[];
  /** Empty = all projects. "__none__" represents "No project". */
  activeProjectIds?: string[];
  onActiveProjectIdsChange?: (ids: string[]) => void;
  /** Project ids that survive the current cascade. Empty array means "cascade yields none". */
  availableProjectIds?: string[];
  hasNoProjectOption?: boolean;
  compactMode?: boolean;
  onCompactModeChange?: (v: boolean) => void;
  showProjectsFilter?: boolean;
  /** In notes mode only Project + Category filters are shown. */
  notesMode?: boolean;
  /** Desktop display mode. Mobile always renders as "button". Default "pills". */
  displayMode?: "pills" | "button";
}

/** Spec-locked pill base. Light/dark-aware via CSS vars; falls back to spec hex. */
const pillBase =
  "h-[30px] inline-flex items-center gap-1.5 px-3 rounded-[20px] text-[12px] font-medium border whitespace-nowrap transition-colors";
const pillIdle =
  "bg-white dark:bg-[#1F1F1F] text-[#374151] dark:text-[#D1D5DB] border-[#E5E7EB] dark:border-white/10 hover:border-[#D1D5DB]";
const pillActive =
  "bg-[#1A1A1A] text-white border-[#1A1A1A] dark:bg-white dark:text-[#0a0a0a] dark:border-white";

function Pill({
  active,
  onClick,
  children,
  className,
  style,
  title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={style}
      className={cn(pillBase, active ? pillActive : pillIdle, className)}
    >
      {children}
    </button>
  );
}

function OverdueButton({
  mode,
  onChange,
}: {
  mode: OverdueMode;
  onChange: (m: OverdueMode) => void;
}) {
  const next: Record<OverdueMode, OverdueMode> = { all: "only", only: "hide", hide: "all" };
  const cycle = () => onChange(next[mode]);

  if (mode === "only") {
    return (
      <button
        type="button"
        onClick={cycle}
        className={cn(
          pillBase,
          "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA] hover:opacity-90"
        )}
      >
        Overdue only
      </button>
    );
  }
  if (mode === "hide") {
    return (
      <button
        type="button"
        onClick={cycle}
        className={cn(pillBase, "bg-transparent text-[#6B7280] border-[#E5E7EB] dark:border-white/10")}
      >
        <span className="relative inline-flex items-center">
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          <span className="absolute left-[-2px] right-[-2px] top-1/2 h-px bg-current" />
        </span>
        Hide overdue
      </button>
    );
  }
  return (
    <Pill onClick={cycle}>All tasks</Pill>
  );
}

export function FilterBar(p: FilterBarProps) {
  const [catSearch, setCatSearch] = useState("");
  const [projSearch, setProjSearch] = useState("");
  const [collapsedProjNodes, setCollapsedProjNodes] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();
  const asButton = isMobile || p.displayMode === "button";
  const toggleCat = (c: string) => {
    if (p.selectedCategories.includes(c)) {
      p.onSelectedCategoriesChange(p.selectedCategories.filter((x) => x !== c));
    } else {
      p.onSelectedCategoriesChange([...p.selectedCategories, c]);
    }
  };

  const activeIds = p.activeProjectIds ?? [];
  const toggleProj = (id: string) => {
    if (activeIds.includes(id)) {
      p.onActiveProjectIdsChange?.(activeIds.filter((x) => x !== id));
    } else {
      p.onActiveProjectIdsChange?.([...activeIds, id]);
    }
  };
  const projectLabel = activeIds.length === 0
    ? "All projects"
    : `Projects · ${activeIds.length}`;

  const divider = (
    <span className="w-px h-5 bg-border shrink-0" aria-hidden />
  );

  const activeCount =
    (!p.notesMode && p.dateFilter !== "all" ? 1 : 0) +
    (p.selectedCategories.length > 0 ? 1 : 0) +
    (activeIds.length > 0 ? 1 : 0) +
    (!p.notesMode && p.overdueMode !== "all" ? 1 : 0);

  const pillsRow = (
    <div
      className="flex items-center gap-1.5 overflow-x-auto scrollbar-none"
      style={{ scrollbarWidth: "none" }}
    >
      {!p.notesMode && (
        <>
          <Pill active={p.dateFilter === "all"} onClick={() => p.onDateFilterChange("all")}>All</Pill>
          <Pill active={p.dateFilter === "today"} onClick={() => p.onDateFilterChange("today")}>Today</Pill>
          <Pill active={p.dateFilter === "week"} onClick={() => p.onDateFilterChange("week")}>This Week</Pill>
          {divider}
        </>
      )}

      {p.projects && p.onActiveProjectIdsChange && p.showProjectsFilter !== false && (() => {
        const available = p.availableProjectIds;
        // Always render the full tree; grey-out ones that don't survive the cascade instead
        // of removing them so the hierarchy stays intact.
        const tree = buildProjectTree(p.projects);
        const flat = flattenProjectTree(tree);
        const nodeIndex = indexProjectNodes(tree);
        const availableSet = available ? new Set(available) : null;
        const showNone = p.hasNoProjectOption !== false;
        const q = projSearch.trim().toLowerCase();
        const isSearching = q.length > 0;
        const parentIds = flat.filter((n) => n.children.length > 0).map((n) => n.project.id);
        // In search mode: show flat matching list (auto-expanded).
        // Otherwise: honor collapsed state — hide any node whose ancestor is collapsed.
        const hiddenByCollapse = new Set<string>();
        if (!isSearching) {
          const walk = (n: typeof flat[number], hiddenParent: boolean) => {
            if (hiddenParent) hiddenByCollapse.add(n.project.id);
            const collapsed = collapsedProjNodes.has(n.project.id);
            const treeNode = nodeIndex.get(n.project.id);
            treeNode?.children.forEach((c) => walk(
              { project: c.project, depth: c.depth, path: c.path, children: c.children },
              hiddenParent || collapsed,
            ));
          };
          tree.forEach((r) => walk({ project: r.project, depth: r.depth, path: r.path, children: r.children }, false));
        }
        const filteredNodes = flat.filter((n) => {
          if (isSearching) return n.path.join(" / ").toLowerCase().includes(q);
          return !hiddenByCollapse.has(n.project.id);
        });
        const expandAll = () => setCollapsedProjNodes(new Set());
        const collapseAll = () => setCollapsedProjNodes(new Set(parentIds));
        // Selected breadcrumb summary — show the deepest selected node's path.
        const selectedPath = activeIds.length === 1 && activeIds[0] !== "__none__"
          ? getProjectPath(nodeIndex, activeIds[0])
          : null;
        return (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(pillBase, activeIds.length > 0 ? pillActive : pillIdle)}
              >
                <span className="max-w-[180px] truncate" title={selectedPath || projectLabel}>
                  {selectedPath || projectLabel}
                </span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-[11px] font-medium text-muted-foreground">Filter by project (incl. subprojects)</span>
                {activeIds.length > 0 && (
                  <button
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => p.onActiveProjectIdsChange?.([])}
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="relative mb-2">
                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={projSearch}
                  onChange={(e) => setProjSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full h-8 pl-7 pr-2 text-xs bg-secondary/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              {!isSearching && parentIds.length > 0 && (
                <div className="flex items-center gap-1 px-1 pb-1.5">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="inline-flex items-center gap-1 text-[10.5px] uppercase tracking-wide text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded"
                  >
                    <ChevronsUpDown className="w-3 h-3" /> Expand all
                  </button>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="inline-flex items-center gap-1 text-[10.5px] uppercase tracking-wide text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded"
                  >
                    <ChevronsDownUp className="w-3 h-3" /> Collapse all
                  </button>
                </div>
              )}
              <div className="max-h-64 overflow-y-auto space-y-1">
                {showNone && (
                  <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary cursor-pointer text-sm">
                    <Checkbox
                      checked={activeIds.includes("__none__")}
                      onCheckedChange={() => toggleProj("__none__")}
                    />
                    <span className="flex-1 truncate italic text-muted-foreground">No project</span>
                  </label>
                )}
                {filteredNodes.map((n) => {
                  const pr = n.project;
                  const checked = activeIds.includes(pr.id);
                  const dimmed = availableSet ? !availableSet.has(pr.id) : false;
                  const hasChildren = n.children.length > 0;
                  const isCollapsed = collapsedProjNodes.has(pr.id);
                  return (
                    <div
                      key={pr.id}
                      className={cn(
                        "flex items-center gap-1 pr-2 py-1 rounded-md hover:bg-secondary text-sm",
                        dimmed && "opacity-50",
                      )}
                      style={{ paddingLeft: `${n.depth * 14 + 4}px` }}
                      title={n.path.join(" / ")}
                    >
                      {hasChildren && !isSearching ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setCollapsedProjNodes((prev) => {
                              const next = new Set(prev);
                              if (next.has(pr.id)) next.delete(pr.id); else next.add(pr.id);
                              return next;
                            });
                          }}
                          className="w-4 h-4 flex items-center justify-center rounded text-muted-foreground/70 hover:text-foreground flex-shrink-0"
                        >
                          <ChevronRight className={cn("w-3 h-3 transition-transform", !isCollapsed && "rotate-90")} />
                        </button>
                      ) : (
                        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                          {n.depth > 0 && <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />}
                        </span>
                      )}
                      <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                        <Checkbox checked={checked} onCheckedChange={() => toggleProj(pr.id)} />
                        <span className={cn("flex-1 truncate", hasChildren && "font-medium")}>{pr.name}</span>
                      </label>
                    </div>
                  );
                })}
                {filteredNodes.length === 0 && !showNone && (
                  <div className="px-2 py-2 text-xs text-muted-foreground">No projects match current filters</div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        );
      })()}

      {!p.notesMode && (
        <>
          {divider}

          <OverdueButton mode={p.overdueMode} onChange={p.onOverdueModeChange} />

          <Pill
            onClick={() =>
              p.onNoDatePositionChange(p.noDatePosition === "top" ? "bottom" : "top")
            }
          >
            No-date: {p.noDatePosition}
            <ChevronDown className="w-3 h-3 opacity-70" />
          </Pill>
        </>
      )}

      <div className="flex-1" />
    </div>
  );

  if (!asButton) return pillsRow;

  // Button (collapsed) mode: single Filters trigger opens a popover with all controls stacked.
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(pillBase, activeCount > 0 ? pillActive : pillIdle)}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters{activeCount > 0 ? ` · ${activeCount}` : ""}
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(92vw,20rem)] p-3 space-y-3 max-h-[70vh] overflow-y-auto">
          {!p.notesMode && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">Timeframe</p>
              <div className="flex flex-wrap gap-1.5">
                <Pill active={p.dateFilter === "all"} onClick={() => p.onDateFilterChange("all")}>All</Pill>
                <Pill active={p.dateFilter === "today"} onClick={() => p.onDateFilterChange("today")}>Today</Pill>
                <Pill active={p.dateFilter === "week"} onClick={() => p.onDateFilterChange("week")}>This Week</Pill>
              </div>
            </div>
          )}

          {p.projects && p.onActiveProjectIdsChange && p.showProjectsFilter !== false && (() => {
            const available = p.availableProjectIds;
            const visibleProjects = available ? p.projects.filter((pr) => available.includes(pr.id)) : p.projects;
            const showNone = p.hasNoProjectOption !== false;
            return (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-muted-foreground">{projectLabel}</p>
                  {activeIds.length > 0 && (
                    <button
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={() => p.onActiveProjectIdsChange?.([])}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-md p-1">
                  {showNone && (
                    <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary cursor-pointer text-sm">
                      <Checkbox checked={activeIds.includes("__none__")} onCheckedChange={() => toggleProj("__none__")} />
                      <span className="flex-1 truncate italic text-muted-foreground">No project</span>
                    </label>
                  )}
                  {visibleProjects.map((pr) => {
                    const checked = activeIds.includes(pr.id);
                    return (
                      <label key={pr.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary cursor-pointer text-sm">
                        <Checkbox checked={checked} onCheckedChange={() => toggleProj(pr.id)} />
                        <span className="flex-1 truncate">{pr.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {!p.notesMode && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">Overdue</p>
              <OverdueButton mode={p.overdueMode} onChange={p.onOverdueModeChange} />
            </div>
          )}

          {!p.notesMode && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">No-date position</p>
              <Pill onClick={() => p.onNoDatePositionChange(p.noDatePosition === "top" ? "bottom" : "top")}>
                {p.noDatePosition}
                <ChevronDown className="w-3 h-3 opacity-70" />
              </Pill>
            </div>
          )}

        </PopoverContent>
      </Popover>
    </div>
  );
}