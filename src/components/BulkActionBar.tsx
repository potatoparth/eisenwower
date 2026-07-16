import { useState } from "react";
import { X, CalendarClock, Zap, Trash2, LayoutGrid, Plus, ArrowRight, Archive, MoreHorizontal, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DateTimePicker } from "@/components/DateTimePicker";
import { ProjectTreePicker } from "@/components/ProjectTreePicker";
import { useSelection } from "@/hooks/useSelection";
import { Task } from "@/types/task";
import {
  KanbanBoard, KanbanColumn, MAX_KANBAN_BOARDS, MAX_KANBAN_COLUMNS_PER_BOARD, ProjectTemplate,
} from "@/types/project";
import { cn } from "@/lib/utils";

interface Props {
  onBulkReschedule: (ids: string[], iso: string) => void;
  /** Send the current selection to the Sprint view (opens the composer prefilled). */
  onAddToSprint?: (ids: string[]) => void;
  /** Permanently delete the selected tasks. */
  onBulkDelete?: (ids: string[]) => void;
  /** Archive the selected tasks (soft-delete — recoverable from Archived list). */
  onBulkArchive?: (ids: string[]) => void;
  /** Kanban add flow. */
  boards?: KanbanBoard[];
  columnsByBoard?: Record<string, KanbanColumn[]>;
  onAddToNewKanban?: (ids: string[], name: string, columnTitles: string[]) => void;
  onAddToExistingKanban?: (ids: string[], boardId: string, columnKey: string) => void;
  /** Bulk-assign a category to the selected tasks. */
  onBulkSetCategory?: (ids: string[], category: string) => void;
  /** Bulk-assign a project to the selected tasks (null = detach from any project). */
  onBulkSetProject?: (ids: string[], projectId: string | null) => void;
  categories?: string[];
  projects?: ProjectTemplate[];
  onCreateCategory?: (name: string) => string;
  onCreateProject?: (name: string, parentId?: string | null) => string;
}

/**
 * Floating bar shown when the user has tasks selected via the global Select
 * mode. Currently exposes a single bulk action: Reschedule.
 */
export function BulkActionBar({
  onBulkReschedule, onAddToSprint, onBulkDelete, onBulkArchive,
  boards = [], columnsByBoard = {}, onAddToNewKanban, onAddToExistingKanban,
  onBulkSetCategory, onBulkSetProject,
  categories = [], projects = [], onCreateCategory, onCreateProject,
}: Props) {
  const { selectMode, selectedIds, count, clear, setSelectMode } = useSelection();
  const [date, setDate] = useState<string | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [kanbanMenuOpen, setKanbanMenuOpen] = useState(false);
  const [newKanbanOpen, setNewKanbanOpen] = useState(false);
  const [existingKanbanOpen, setExistingKanbanOpen] = useState(false);
  const [pickBoardId, setPickBoardId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCols, setNewCols] = useState<string[]>(["To Do", "Doing", "Done"]);
  const [catOpen, setCatOpen] = useState(false);
  const [catQuery, setCatQuery] = useState("");
  const [projOpen, setProjOpen] = useState(false);
  const [projQuery, setProjQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [projMoveOpen, setProjMoveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!selectMode || count === 0) return null;

  const apply = (iso: string | undefined) => {
    if (!iso) return;
    onBulkReschedule(Array.from(selectedIds), iso);
    setDate(undefined);
    setPickerOpen(false);
    clear();
  };

  const canAddNew = boards.length < MAX_KANBAN_BOARDS;
  const showKanban = !!(onAddToNewKanban || onAddToExistingKanban);

  const filteredCats = categories.filter((c) =>
    c.toLowerCase().includes(catQuery.trim().toLowerCase())
  );
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projQuery.trim().toLowerCase())
  );
  const canCreateCat =
    !!onCreateCategory &&
    catQuery.trim().length > 0 &&
    !categories.some((c) => c.toLowerCase() === catQuery.trim().toLowerCase());

  const finishAndClose = () => {
    setKanbanMenuOpen(false);
    setNewKanbanOpen(false);
    setExistingKanbanOpen(false);
    setPickBoardId(null);
    clear();
    setSelectMode(false);
  };

  type ActionItem = {
    key: string;
    label: string;
    icon: React.ReactNode;
    onSelect: () => void;
    destructive?: boolean;
    accent?: boolean;
  };
  const items: ActionItem[] = [];
  if (onAddToSprint) items.push({
    key: "sprint", label: "Add to sprint", icon: <Zap className="w-4 h-4" />,
    onSelect: () => { onAddToSprint(Array.from(selectedIds)); clear(); setSelectMode(false); },
  });
  items.push({
    key: "reschedule", label: "Reschedule…", icon: <CalendarClock className="w-4 h-4" />, accent: true,
    onSelect: () => { setMenuOpen(false); setPickerOpen(true); },
  });
  if (showKanban) items.push({
    key: "kanban", label: "Add to Kanban…", icon: <LayoutGrid className="w-4 h-4" />,
    onSelect: () => { setMenuOpen(false); setKanbanMenuOpen(true); },
  });
  if (onBulkSetProject) items.push({
    key: "project", label: "Move to project…", icon: <FolderTree className="w-4 h-4" />,
    onSelect: () => { setMenuOpen(false); setProjMoveOpen(true); },
  });
  if (onBulkArchive) items.push({
    key: "archive", label: "Archive", icon: <Archive className="w-4 h-4" />,
    onSelect: () => { onBulkArchive(Array.from(selectedIds)); clear(); setMenuOpen(false); },
  });
  if (onBulkDelete) items.push({
    key: "delete", label: "Delete permanently", icon: <Trash2 className="w-4 h-4" />, destructive: true,
    onSelect: () => { setMenuOpen(false); setConfirmDelete(true); },
  });

  return (
    <>
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-border bg-card/95 backdrop-blur px-3 py-2 shadow-lg max-w-[calc(100vw-1rem)]">
      <span className="text-xs font-medium px-1 tabular-nums whitespace-nowrap">
        {count} selected
      </span>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" className="rounded-full gap-1.5 px-3">
            <MoreHorizontal className="w-3.5 h-3.5" />
            Actions
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={8}
          className="w-60 p-1.5 rounded-2xl border-border/60 bg-popover/80 backdrop-blur-xl shadow-2xl"
        >
          <div className="px-2 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            {count} task{count === 1 ? "" : "s"} selected
          </div>
          <div className="flex flex-col">
            {items.map((it) => (
              <button
                key={it.key}
                type="button"
                onClick={it.onSelect}
                className={cn(
                  "flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors text-left",
                  it.destructive
                    ? "text-destructive hover:bg-destructive/10"
                    : it.accent
                      ? "text-foreground hover:bg-primary/10"
                      : "text-foreground hover:bg-accent"
                )}
              >
                <span className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md",
                  it.destructive ? "bg-destructive/10" : it.accent ? "bg-primary/15" : "bg-secondary/60"
                )}>
                  {it.icon}
                </span>
                <span className="flex-1">{it.label}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full h-8 w-8"
        onClick={() => setSelectMode(false)}
        title="Exit select mode"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>

    {/* Reschedule popover — anchored to viewport center */}
    <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
      <PopoverTrigger asChild>
        <span className="fixed bottom-16 left-1/2 -translate-x-1/2 h-0 w-0" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[min(22rem,92vw)] p-3">
        <div className="text-xs font-medium text-muted-foreground mb-2">
          New deadline for {count} task{count === 1 ? "" : "s"}
        </div>
        <DateTimePicker value={date} onChange={(v) => { setDate(v); apply(v); }} placeholder="Pick deadline…" />
      </PopoverContent>
    </Popover>

    {/* Kanban submenu */}
    <Popover open={kanbanMenuOpen} onOpenChange={setKanbanMenuOpen}>
      <PopoverTrigger asChild>
        <span className="fixed bottom-16 left-1/2 -translate-x-1/2 h-0 w-0" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="center" className="w-60 p-2">
        <div className="flex flex-col gap-1">
          {canAddNew && onAddToNewKanban && (
            <Button variant="ghost" size="sm" className="justify-start gap-2"
              onClick={() => { setKanbanMenuOpen(false); setNewKanbanOpen(true); }}>
              <Plus className="w-3.5 h-3.5" /> Add to new Kanban
            </Button>
          )}
          {onAddToExistingKanban && (
            <Button variant="ghost" size="sm" className="justify-start gap-2"
              disabled={boards.length === 0}
              onClick={() => { setKanbanMenuOpen(false); setExistingKanbanOpen(true); }}>
              <ArrowRight className="w-3.5 h-3.5" /> Add to existing Kanban
            </Button>
          )}
          {!canAddNew && (
            <div className="text-[11px] text-muted-foreground px-2 py-1">
              Max {MAX_KANBAN_BOARDS} boards reached
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>

    {/* Move-to-project popover */}
    {onBulkSetProject && (
      <Popover open={projMoveOpen} onOpenChange={setProjMoveOpen}>
        <PopoverTrigger asChild>
          <span className="fixed bottom-16 left-1/2 -translate-x-1/2 h-0 w-0" aria-hidden />
        </PopoverTrigger>
        <PopoverContent align="center" className="w-[min(20rem,92vw)] p-2">
          <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
            Move {count} task{count === 1 ? "" : "s"} to…
          </div>
          <ProjectTreePicker
            projects={projects}
            value={null}
            onChange={(id) => {
              onBulkSetProject(Array.from(selectedIds), id ?? null);
              setProjMoveOpen(false);
              clear(); setSelectMode(false);
            }}
            onCreate={onCreateProject}
            placeholder="Pick a project…"
          />
        </PopoverContent>
      </Popover>
    )}

    {/* Confirm delete */}
    {onBulkDelete && (
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {count} task{count === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the selected {count === 1 ? "task" : "tasks"}. This cannot be undone. If you might need them later, use Archive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onBulkDelete(Array.from(selectedIds));
                clear();
              }}
            >
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}

    {/* New Kanban board dialog */}
    <Dialog open={newKanbanOpen} onOpenChange={setNewKanbanOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Kanban board for {count} task{count === 1 ? "" : "s"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Board name</label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Q3 launch" autoFocus />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Columns (1–{MAX_KANBAN_COLUMNS_PER_BOARD})</label>
            <div className="space-y-2">
              {newCols.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input value={c} placeholder={`Column ${idx + 1}`}
                    onChange={e => setNewCols(prev => prev.map((v, i) => i === idx ? e.target.value : v))} />
                  {newCols.length > 1 && (
                    <Button size="icon" variant="ghost" className="w-8 h-8"
                      onClick={() => setNewCols(prev => prev.filter((_, i) => i !== idx))}>
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              {newCols.length < MAX_KANBAN_COLUMNS_PER_BOARD && (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setNewCols(prev => [...prev, ""])}>
                  <Plus className="w-3 h-3" /> Add column
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Selected tasks will be added to the first column.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setNewKanbanOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            const cols = newCols.map(c => c.trim()).filter(Boolean);
            if (!cols.length || !onAddToNewKanban) return;
            onAddToNewKanban(Array.from(selectedIds), newName.trim() || "Untitled board", cols);
            setNewName(""); setNewCols(["To Do", "Doing", "Done"]);
            finishAndClose();
          }}>Create & add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Existing Kanban board picker */}
    <Dialog open={existingKanbanOpen} onOpenChange={(o) => { setExistingKanbanOpen(o); if (!o) setPickBoardId(null); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{pickBoardId ? "Pick a column" : "Pick a Kanban board"}</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-1 max-h-[60vh] overflow-y-auto">
          {!pickBoardId && boards.map(b => (
            <button key={b.id}
              onClick={() => setPickBoardId(b.id)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent border border-border">
              <div className="text-sm font-medium">{b.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {(columnsByBoard[b.id] || []).length} columns
              </div>
            </button>
          ))}
          {pickBoardId && (columnsByBoard[pickBoardId] || []).map(col => (
            <button key={col.id}
              onClick={() => {
                if (!onAddToExistingKanban) return;
                onAddToExistingKanban(Array.from(selectedIds), pickBoardId, col.id);
                finishAndClose();
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent border border-border text-sm">
              {col.title}
            </button>
          ))}
          {!pickBoardId && boards.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-6">No boards yet</div>
          )}
        </div>
        <DialogFooter>
          {pickBoardId && (
            <Button variant="ghost" onClick={() => setPickBoardId(null)}>Back</Button>
          )}
          <Button variant="ghost" onClick={() => setExistingKanbanOpen(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}