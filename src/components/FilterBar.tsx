import { ChevronDown, LayoutGrid, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ProjectTemplate } from "@/types/project";
import { useIsMobile } from "@/hooks/use-mobile";

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

  return (
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

      {p.categories.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={cn(pillBase, p.selectedCategories.length > 0 ? pillActive : pillIdle)}>
              Category{p.selectedCategories.length > 0 ? ` · ${p.selectedCategories.length}` : ""}
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-2">
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="text-[11px] font-medium text-muted-foreground">Filter by category</span>
              {p.selectedCategories.length > 0 && (
                <button
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => p.onSelectedCategoriesChange([])}
                >
                  Clear
                </button>
              )}
            </div>
            <div className="relative mb-2">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                placeholder="Search categories..."
                className="w-full h-8 pl-7 pr-2 text-xs bg-secondary/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {p.categories
                .filter((c) => c.toLowerCase().includes(catSearch.toLowerCase()))
                .map((c) => {
                const color = p.getCategoryColor?.(c);
                const checked = p.selectedCategories.includes(c);
                return (
                  <label
                    key={c}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary cursor-pointer text-sm"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleCat(c)} />
                    {color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
                    <span className="flex-1 truncate">{c}</span>
                  </label>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {p.projects && p.onActiveProjectIdsChange && p.showProjectsFilter !== false && (() => {
        const available = p.availableProjectIds;
        const visibleProjects = available
          ? p.projects.filter((pr) => available.includes(pr.id))
          : p.projects;
        const showNone = p.hasNoProjectOption !== false;
        const filteredProjects = visibleProjects.filter((pr) =>
          pr.name.toLowerCase().includes(projSearch.toLowerCase())
        );
        return (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(pillBase, activeIds.length > 0 ? pillActive : pillIdle)}
              >
                <span className="max-w-[140px] truncate">{projectLabel}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-[11px] font-medium text-muted-foreground">Filter by project</span>
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
                {filteredProjects.map((pr) => {
                  const checked = activeIds.includes(pr.id);
                  return (
                    <label
                      key={pr.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary cursor-pointer text-sm"
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleProj(pr.id)} />
                      <span className="flex-1 truncate">{pr.name}</span>
                    </label>
                  );
                })}
                {filteredProjects.length === 0 && !showNone && (
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

      {!p.notesMode && p.onCompactModeChange && (
        <Pill
          active={!!p.compactMode}
          onClick={() => p.onCompactModeChange?.(!p.compactMode)}
          title="Toggle compact grid"
          className="!px-2"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </Pill>
      )}
    </div>
  );
}