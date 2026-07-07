import { useState } from "react";
import { X, CalendarClock, Zap, Trash2, LayoutGrid, Plus, ArrowRight, Tag, FolderKanban, Check } from "lucide-react";
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
  onBulkReschedule, onAddToSprint, onBulkDelete,
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

  return (
    <>
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 sm:gap-2 rounded-full border border-border bg-card/95 backdrop-blur px-2 sm:px-3 py-2 shadow-lg max-w-[calc(100vw-1rem)]">
      <span className="text-xs font-medium px-1 sm:px-2 tabular-nums whitespace-nowrap">
        {count}<span className="hidden sm:inline"> selected</span>
      </span>
      {onAddToSprint && (
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full gap-1.5 px-2 sm:px-3"
          onClick={() => {
            onAddToSprint(Array.from(selectedIds));
            clear();
            setSelectMode(false);
          }}
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add to sprint</span>
        </Button>
      )}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" className="rounded-full gap-1.5 px-2 sm:px-3">
            <CalendarClock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reschedule</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-[min(22rem,92vw)] p-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            New deadline for {count} task{count === 1 ? "" : "s"}
          </div>
          <DateTimePicker value={date} onChange={(v) => { setDate(v); apply(v); }} placeholder="Pick deadline…" />
        </PopoverContent>
      </Popover>
      {showKanban && (
        <Popover open={kanbanMenuOpen} onOpenChange={setKanbanMenuOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="secondary" className="rounded-full gap-1.5 px-2 sm:px-3">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add to Kanban</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-56 p-2">
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
      )}
      {onBulkSetCategory && (
        <Popover open={catOpen} onOpenChange={(o) => { setCatOpen(o); if (!o) setCatQuery(""); }}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="secondary" className="rounded-full gap-1.5 px-2 sm:px-3">
              <Tag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Category</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-[min(18rem,92vw)] p-2">
            <Input
              value={catQuery}
              onChange={(e) => setCatQuery(e.target.value)}
              placeholder="Search or create category…"
              className="h-8 text-xs mb-1.5"
            />
            <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5">
              {filteredCats.map((c) => (
                <button key={c}
                  onClick={() => {
                    onBulkSetCategory(Array.from(selectedIds), c);
                    setCatOpen(false); setCatQuery(""); clear(); setSelectMode(false);
                  }}
                  className="text-left text-xs px-2 py-1.5 rounded-md hover:bg-accent truncate">
                  {c}
                </button>
              ))}
              {filteredCats.length === 0 && !canCreateCat && (
                <div className="text-[11px] text-muted-foreground px-2 py-2">No categories</div>
              )}
              {canCreateCat && (
                <button
                  onClick={() => {
                    if (!onCreateCategory) return;
                    const name = onCreateCategory(catQuery.trim());
                    onBulkSetCategory(Array.from(selectedIds), name);
                    setCatOpen(false); setCatQuery(""); clear(); setSelectMode(false);
                  }}
                  className="text-left text-xs px-2 py-1.5 rounded-md hover:bg-accent flex items-center gap-1.5 text-primary">
                  <Plus className="w-3 h-3" /> Create “{catQuery.trim()}”
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
      {onBulkSetProject && (
        <div className="hidden sm:block">
          <ProjectTreePicker
            projects={projects}
            value={null}
            onChange={(id) => {
              onBulkSetProject(Array.from(selectedIds), id ?? null);
              clear(); setSelectMode(false);
            }}
            onCreate={onCreateProject}
            placeholder="Move to project…"
            compact
          />
        </div>
      )}
      {onBulkDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="destructive"
              className="rounded-full gap-1.5 px-2 sm:px-3"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete {count} task{count === 1 ? "" : "s"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the selected {count === 1 ? "task" : "tasks"}. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onBulkDelete(Array.from(selectedIds));
                  clear();
                  setSelectMode(false);
                }}
              >
                Yes, delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
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