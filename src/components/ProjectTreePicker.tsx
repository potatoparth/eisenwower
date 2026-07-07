import { useMemo, useState } from "react";
import { ChevronRight, FolderKanban, FolderPlus, Plus, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectTemplate } from "@/types/project";
import {
  buildProjectTree,
  flattenProjectTree,
  indexProjectNodes,
  getProjectPath,
  searchProjectTree,
  type ProjectTreeNode,
} from "@/lib/projectTree";
import { cn } from "@/lib/utils";

interface ProjectTreePickerProps {
  projects: ProjectTemplate[];
  /** null / undefined = "No project". */
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  /** Create a new project. Return the id of the created project. parentId=null for top-level. */
  onCreate?: (name: string, parentId: string | null) => string;
  placeholder?: string;
  compact?: boolean;
  className?: string;
  /** Show the leading folder icon inside the trigger. */
  showIcon?: boolean;
  /** Hide the "No project" option (used when a value is required). */
  requireValue?: boolean;
  /** Optional label prefix rendered as small muted text before the trigger. */
  triggerLabel?: string;
}

export function ProjectTreePicker({
  projects,
  value,
  onChange,
  onCreate,
  placeholder = "No project",
  compact = false,
  className,
  showIcon = true,
  requireValue = false,
  triggerLabel,
}: ProjectTreePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState<{ parentId: string | null } | null>(null);
  const [newName, setNewName] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildProjectTree(projects), [projects]);
  const nodeIndex = useMemo(() => indexProjectNodes(tree), [tree]);
  const currentPath = value ? getProjectPath(nodeIndex, value) : "";

  const doCreate = (parentId: string | null) => {
    const trimmed = newName.trim();
    if (!trimmed || !onCreate) return;
    const id = onCreate(trimmed, parentId);
    setNewName("");
    setCreating(null);
    if (id) {
      onChange(id);
      setOpen(false);
    }
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const renderNode = (n: ProjectTreeNode) => {
    const isCollapsed = collapsed.has(n.project.id);
    const isSelected = value === n.project.id;
    return (
      <div key={n.project.id}>
        <div
          className={cn(
            "group flex items-center gap-1 rounded-md px-1.5 py-1 text-xs hover:bg-secondary/70",
            isSelected && "bg-secondary",
          )}
          style={{ paddingLeft: `${n.depth * 12 + 6}px` }}
        >
          {n.children.length > 0 ? (
            <button
              type="button"
              onClick={() => toggleCollapse(n.project.id)}
              className="w-4 h-4 flex items-center justify-center text-muted-foreground/70 hover:text-foreground"
            >
              <ChevronRight className={cn("w-3 h-3 transition-transform", !isCollapsed && "rotate-90")} />
            </button>
          ) : (
            <span className="w-4 h-4" />
          )}
          <button
            type="button"
            onClick={() => { onChange(n.project.id); setOpen(false); }}
            className="flex-1 min-w-0 text-left truncate"
          >
            {n.project.name}
          </button>
          {onCreate && (
            <button
              type="button"
              title="Add subproject"
              onClick={() => { setCreating({ parentId: n.project.id }); setNewName(""); }}
              className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>
        {creating?.parentId === n.project.id && (
          <div className="flex items-center gap-1 py-1" style={{ paddingLeft: `${(n.depth + 1) * 12 + 10}px` }}>
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); doCreate(n.project.id); }
                if (e.key === "Escape") { setCreating(null); setNewName(""); }
              }}
              placeholder="Subproject name"
              className="h-6 text-xs rounded-md bg-secondary/50 border-0 flex-1 min-w-0"
            />
            <Button type="button" size="sm" className="h-6 text-[11px] px-2 rounded-md" onClick={() => doCreate(n.project.id)} disabled={!newName.trim()}>Add</Button>
          </div>
        )}
        {!isCollapsed && n.children.map(renderNode)}
      </div>
    );
  };

  // Search: show flat filtered list with full path.
  const searchResults = query.trim() ? searchProjectTree(tree, query) : null;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {triggerLabel && <span className="text-[11px] text-muted-foreground">{triggerLabel}</span>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex-1 min-w-0 inline-flex items-center gap-1.5 border rounded-lg bg-secondary/40 hover:bg-secondary/60 border-border/60 text-left transition-colors",
              compact ? "h-8 px-2 text-xs" : "h-9 px-3 text-sm",
            )}
          >
            {showIcon && <FolderKanban className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
            <span className={cn("min-w-0 truncate", !currentPath && "text-muted-foreground")}>
              {currentPath || placeholder}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="p-2 w-[min(92vw,22rem)] max-h-[70vh] overflow-hidden flex flex-col">
          <div className="relative mb-2 flex-shrink-0">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              className="w-full h-8 pl-7 pr-2 text-xs bg-secondary/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="overflow-y-auto min-h-0 flex-1 space-y-0.5">
            {!requireValue && !query && (
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false); }}
                className={cn(
                  "w-full text-left px-2 py-1 rounded-md text-xs hover:bg-secondary/70 italic",
                  !value && "bg-secondary",
                )}
              >
                No project
              </button>
            )}
            {searchResults
              ? searchResults.length === 0
                ? <p className="text-xs text-muted-foreground px-2 py-2">No matches</p>
                : searchResults.map((n) => (
                    <button
                      key={n.project.id}
                      type="button"
                      onClick={() => { onChange(n.project.id); setOpen(false); }}
                      className={cn(
                        "w-full text-left px-2 py-1 rounded-md text-xs hover:bg-secondary/70 truncate",
                        value === n.project.id && "bg-secondary",
                      )}
                      title={n.path.join(" / ")}
                    >
                      {n.path.join(" / ")}
                    </button>
                  ))
              : tree.length === 0
                ? <p className="text-xs text-muted-foreground px-2 py-2">No projects yet</p>
                : tree.map(renderNode)}
          </div>
          {onCreate && !query && (
            <div className="border-t border-border/60 pt-2 mt-2 flex-shrink-0">
              {creating?.parentId === null ? (
                <div className="flex items-center gap-1">
                  <Input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); doCreate(null); }
                      if (e.key === "Escape") { setCreating(null); setNewName(""); }
                    }}
                    placeholder="New top-level project"
                    className="h-7 text-xs rounded-md bg-secondary/50 border-0 flex-1"
                  />
                  <Button type="button" size="sm" className="h-7 text-[11px] px-2 rounded-md" onClick={() => doCreate(null)} disabled={!newName.trim()}>Add</Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setCreating({ parentId: null }); setNewName(""); }}
                  className="w-full inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                >
                  <FolderPlus className="w-3.5 h-3.5" /> New top-level project
                </button>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}