import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, PinOff, Trash2, Palette, FolderKanban, Tag, ListChecks, Search, X, StickyNote } from "lucide-react";
import { Note, NOTE_COLORS, noteColorFor } from "@/types/note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SelectorWithCreate } from "@/components/SelectorWithCreate";
import { TaskDescription } from "@/components/TaskDescription";
import { TaskAttachments } from "@/components/TaskAttachments";
import { TaskAttachment } from "@/types/task";
import { Paperclip } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ProjectTemplate } from "@/types/project";
import { cn } from "@/lib/utils";

interface NotesViewProps {
  notes: Note[];
  categories: string[];
  projects: ProjectTemplate[];
  defaultCategory?: string;
  defaultProjectId?: string;
  onCreateCategory?: (name: string) => string;
  onCreateProject?: (name: string) => string;
  onAddNote: (options?: Partial<Note>) => Note | null;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onConvertToTask: (note: Note) => void;
  getCategoryColor?: (name: string) => string | undefined;
}

function useIsDark() {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export function NotesView(props: NotesViewProps) {
  const {
    notes, categories, projects, defaultCategory, defaultProjectId,
    onCreateCategory, onCreateProject, onAddNote, onUpdateNote, onDeleteNote,
    onConvertToTask, getCategoryColor,
  } = props;

  const dark = useIsDark();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const editingNote = useMemo(
    () => (editingId ? notes.find((n) => n.id === editingId) ?? null : null),
    [editingId, notes]
  );
  const composerWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const projectName = (id?: string) => projects.find((p) => p.id === id)?.name;
  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (projects.find((p) => p.id === n.projectId)?.name || "").toLowerCase().includes(q)
    );
  }, [notes, searchQuery, projects]);

  const startEdit = (id: string) => {
    setEditingId(id);
    // Scroll composer into view so the user sees the pre-filled form
    requestAnimationFrame(() => {
      composerWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const pinned = useMemo(() => filteredNotes.filter((n) => n.pinned), [filteredNotes]);
  const others = useMemo(() => filteredNotes.filter((n) => !n.pinned), [filteredNotes]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-1 pb-8">
        <div ref={composerWrapRef} className="pt-4 pb-2 flex justify-center">
          {composing || editingNote ? (
            <div className="w-full max-w-xl [&>div]:pt-0 [&>div]:pb-0">
              <NoteComposer
                categories={categories}
                projects={projects}
                defaultCategory={defaultCategory}
                defaultProjectId={defaultProjectId}
                onCreateCategory={onCreateCategory}
                onCreateProject={onCreateProject}
                onAddNote={(opts) => { const n = onAddNote(opts); setComposing(false); return n; }}
                onUpdateNote={onUpdateNote}
                editingNote={editingNote}
                onCancelEdit={() => { setEditingId(null); setComposing(false); }}
                dark={dark}
                autoOpen
              />
            </div>
          ) : (
            <div className="relative flex h-12 w-full max-w-xl items-center rounded-full border border-border/60 bg-secondary/40 px-5">
              {searchOpen ? (
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } }}
                  placeholder="Search notes..."
                  className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setComposing(true)}
                  className="flex h-full min-w-0 flex-1 items-center text-left text-sm text-muted-foreground/80"
                >
                  <span aria-hidden className="flex h-8 w-8 items-center justify-center text-muted-foreground/60 -ml-2 mr-1">
                    <StickyNote className="w-4 h-4" strokeWidth={1.75} />
                  </span>
                  <span className="flex-1 truncate">Add a new note...</span>
                </button>
              )}
              <div className="ml-2 -mr-2 flex h-full flex-shrink-0 items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => (searchOpen ? (setSearchOpen(false), setSearchQuery("")) : setSearchOpen(true))}
                  className="h-8 w-8 rounded-full"
                  title={searchOpen ? "Close search" : "Search notes"}
                  aria-pressed={searchOpen}
                >
                  {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>

        {pinned.length > 0 && (
          <>
            <SectionLabel>Pinned</SectionLabel>
            <MasonryGrid>
              <AnimatePresence initial={false}>
                {pinned.filter((n) => n.id !== editingId).map((n) => (
                  <NoteCard
                    key={n.id}
                    note={n}
                    categories={categories}
                    projects={projects}
                    projectName={projectName(n.projectId)}
                    onCreateCategory={onCreateCategory}
                    onCreateProject={onCreateProject}
                    onUpdate={onUpdateNote}
                    onDelete={onDeleteNote}
                    onConvert={onConvertToTask}
                    onEdit={startEdit}
                    getCategoryColor={getCategoryColor}
                    dark={dark}
                  />
                ))}
              </AnimatePresence>
            </MasonryGrid>
          </>
        )}

        {others.length > 0 && (
          <>
            {pinned.length > 0 && <SectionLabel>Others</SectionLabel>}
            <MasonryGrid>
              <AnimatePresence initial={false}>
                {others.filter((n) => n.id !== editingId).map((n) => (
                  <NoteCard
                    key={n.id}
                    note={n}
                    categories={categories}
                    projects={projects}
                    projectName={projectName(n.projectId)}
                    onCreateCategory={onCreateCategory}
                    onCreateProject={onCreateProject}
                    onUpdate={onUpdateNote}
                    onDelete={onDeleteNote}
                    onConvert={onConvertToTask}
                    onEdit={startEdit}
                    getCategoryColor={getCategoryColor}
                    dark={dark}
                  />
                ))}
              </AnimatePresence>
            </MasonryGrid>
          </>
        )}

        {notes.length === 0 && (
          <div className="text-center text-muted-foreground py-24 text-sm">
            Notes you add appear here. Click above to create one.
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-widest text-muted-foreground/80 mt-6 mb-2 px-2">
      {children}
    </div>
  );
}

function MasonryGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-3 [column-fill:_balance]">
      {children}
    </div>
  );
}

/* ---------------- Composer ---------------- */

interface ComposerProps {
  categories: string[];
  projects: ProjectTemplate[];
  defaultCategory?: string;
  defaultProjectId?: string;
  onCreateCategory?: (name: string) => string;
  onCreateProject?: (name: string) => string;
  onAddNote: (options?: Partial<Note>) => Note | null;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  editingNote?: Note | null;
  onCancelEdit?: () => void;
  dark: boolean;
  autoOpen?: boolean;
}

export function NoteComposer(props: ComposerProps) {
  const isEditing = !!props.editingNote;
  const MAX_TITLE = 120;
  const MAX_CONTENT = 10000;
  const MAX_NOTE_BYTES = 20 * 1024 * 1024; // 20 MB per note
  const [open, setOpen] = useState(!!props.autoOpen);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [draftId, setDraftId] = useState<string>(() => crypto.randomUUID());
  const [category, setCategory] = useState(props.defaultCategory || "General");
  const [projectId, setProjectId] = useState(props.defaultProjectId || "");
  const [color, setColor] = useState<string>("default");
  const containerRef = useRef<HTMLDivElement>(null);

  // When entering edit mode, prefill from the note.
  useEffect(() => {
    if (props.editingNote) {
      setOpen(true);
      setTitle(props.editingNote.title);
      setContent(props.editingNote.content);
      setAttachments(props.editingNote.attachments ?? []);
      setCategory(props.editingNote.category || "General");
      setProjectId(props.editingNote.projectId || "");
      setColor(props.editingNote.color || "default");
      setDraftId(props.editingNote.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.editingNote?.id]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        // Ignore clicks that land inside floating UI (radix popovers/dialogs) which
        // are portaled to document.body.
        const el = target as HTMLElement;
        if (el.closest?.("[data-radix-popper-content-wrapper], [role='dialog']")) return;
        commit();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, title, content, category, projectId, color, attachments]);

  const reset = () => {
    setTitle(""); setContent(""); setColor("default"); setAttachments([]);
    setCategory(props.defaultCategory || "General");
    setProjectId(props.defaultProjectId || "");
    setOpen(false);
    setDraftId(crypto.randomUUID());
    props.onCancelEdit?.();
  };

  const commit = () => {
    if (!title.trim() && !content.trim() && attachments.length === 0) { reset(); return; }
    if (isEditing && props.editingNote) {
      props.onUpdateNote(props.editingNote.id, {
        title: title.trim(),
        content: content.trim(),
        category,
        projectId: projectId || undefined,
        color: color === "default" ? undefined : color,
        attachments,
      });
    } else {
      props.onAddNote({
        id: draftId,
        title: title.trim(),
        content: content.trim(),
        category,
        projectId: projectId || undefined,
        color: color === "default" ? undefined : color,
        attachments,
      });
    }
    reset();
  };

  const bg = noteColorFor(color, props.dark ? "dark" : "light");
  const catList = props.categories.length ? props.categories : ["General"];
  const catOptions = catList.map((c) => ({ value: c, label: c }));
  const projectOptions = [{ value: "", label: "No project" }, ...props.projects.map((p) => ({ value: p.id, label: p.name }))];

  return (
    <div className="pt-4 pb-2 flex justify-center">
      <div
        ref={containerRef}
        className={cn(
          "w-full max-w-xl rounded-2xl border border-border shadow-sm transition-shadow",
          open && "shadow-lg"
        )}
        style={{ backgroundColor: bg }}
      >
        {!open ? (
          <button
            className="w-full text-left px-4 py-3 text-sm text-muted-foreground rounded-2xl"
            onClick={() => setOpen(true)}
          >
            Take a note…
          </button>
        ) : (
          <div className="flex flex-col">
            {/* Body */}
            <div className="px-4 pt-4 pb-3 space-y-3">
              <div
                className="sticky top-0 z-20 -mx-4 px-4 pt-2 pb-1 rounded-t-2xl"
                style={{ backgroundColor: bg }}
              >
                <Input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value.replace(/[\r\n]+/g, " ").slice(0, MAX_TITLE))}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  maxLength={MAX_TITLE}
                  placeholder="Title"
                  className="border-0 bg-transparent outline-none shadow-none ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none px-0 text-lg font-semibold h-8 placeholder:text-muted-foreground/60"
                />
              </div>
              <TaskDescription
                value={content}
                onChange={(v) => setContent(v.length > MAX_CONTENT ? v.slice(0, MAX_CONTENT) : v)}
                placeholder="Take a note…"
                alwaysOpen
                stickyToolbar={{ top: 44, background: bg }}
              />
              {attachments.length > 0 && (
                <TaskAttachments
                  taskId={draftId}
                  value={attachments}
                  onChange={setAttachments}
                  maxTotalBytes={MAX_NOTE_BYTES}
                />
              )}
            </div>

            {/* Footer bar */}
            <div className="px-3 py-2.5 bg-muted/40 border-t border-border/60 flex items-center gap-2 rounded-b-2xl">
              <div className="flex items-center gap-1 flex-wrap">
                <SelectorWithCreate
                  options={projectOptions}
                  value={projectId}
                  onChange={setProjectId}
                  onCreate={props.onCreateProject}
                  placeholder="No project"
                  compact
                  icon={<FolderKanban className="w-3.5 h-3.5" />}
                />
                <span className="w-px h-5 bg-border mx-1" />
                <ColorPicker value={color} onChange={setColor} dark={props.dark} />
                <InlineAttachTrigger
                  taskId={draftId}
                  value={attachments}
                  onChange={setAttachments}
                  maxTotalBytes={MAX_NOTE_BYTES}
                />
              </div>
              <div className="ml-auto flex items-center gap-1">
                {content.length > MAX_CONTENT * 0.9 && (
                  <span className="text-[11px] text-muted-foreground mr-2">
                    {content.length}/{MAX_CONTENT}
                  </span>
                )}
                <Button size="sm" variant="ghost" onClick={reset} className="h-8">Cancel</Button>
                <Button size="sm" onClick={commit} className="h-8 px-4">{isEditing ? "Save" : "Done"}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Compact attach trigger — renders TaskAttachments UI inside a popover so the
 * footer stays a single tidy row. */
function InlineAttachTrigger({
  taskId, value, onChange, maxTotalBytes,
}: { taskId: string; value: TaskAttachment[]; onChange: (n: TaskAttachment[]) => void; maxTotalBytes?: number }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Attach file or link">
          <Paperclip className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <TaskAttachments taskId={taskId} value={value} onChange={onChange} maxTotalBytes={maxTotalBytes} />
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- Card ---------------- */

interface CardProps {
  note: Note;
  categories: string[];
  projects: ProjectTemplate[];
  projectName?: string;
  onCreateCategory?: (name: string) => string;
  onCreateProject?: (name: string) => string;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onConvert: (note: Note) => void;
  onEdit: (id: string) => void;
  getCategoryColor?: (name: string) => string | undefined;
  dark: boolean;
}

function NoteCard(props: CardProps) {
  const { note, dark } = props;
  const bg = noteColorFor(note.color, dark ? "dark" : "light");
  const catColor = props.getCategoryColor?.(note.category);

  return (
    <motion.div
      layout
      initial={false}
      className="mb-3 break-inside-avoid rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
      style={{ backgroundColor: bg, ["--note-bg" as any]: bg }}
      onClick={(e) => {
        const el = e.target as HTMLElement;
        if (el.closest("button, a, input, textarea, [role='dialog'], [data-radix-popper-content-wrapper]")) return;
        props.onEdit(note.id);
      }}
    >
      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div>
              {note.title && (
                <div className="font-semibold text-sm mb-1 break-words line-clamp-2">{note.title}</div>
              )}
              {note.content ? (
                <div className="relative max-h-40 overflow-hidden">
                  <NotePreview text={note.content} />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[var(--note-bg,transparent)] to-transparent" />
                </div>
              ) : !note.title && (!note.attachments || note.attachments.length === 0) ? (
                <div className="text-sm text-muted-foreground italic">Empty note</div>
              ) : null}
              {note.attachments && note.attachments.length > 0 && (
                <div className="mt-2">
                  <NoteAttachmentPreview attachments={note.attachments} />
                </div>
              )}
            </div>
          </div>
          <button
            className="opacity-60 hover:opacity-100 p-1 -mr-1 -mt-1"
            onClick={(e) => { e.stopPropagation(); props.onUpdate(note.id, { pinned: !note.pinned }); }}
            title={note.pinned ? "Unpin" : "Pin"}
          >
            {note.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-3 text-[11px]">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 border"
            style={{
              borderColor: catColor ? `${catColor}66` : undefined,
              backgroundColor: catColor ? `${catColor}22` : undefined,
              color: catColor,
            }}
          >
            <Tag className="w-3 h-3" />
            {note.category}
          </span>
          {props.projectName && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 border border-border/60 text-muted-foreground">
              <FolderKanban className="w-3 h-3" />
              {props.projectName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 mt-2 opacity-90">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Convert to task"
            onClick={(e) => { e.stopPropagation(); props.onConvert(note); }}
          >
            <ListChecks className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Delete note"
            onClick={(e) => { e.stopPropagation(); props.onDelete(note.id); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------- Color picker ---------------- */

function ColorPicker({ value, onChange, dark }: { value: string; onChange: (v: string) => void; dark: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Background color">
          <Palette className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-5 gap-1.5">
          {NOTE_COLORS.map((c) => {
            const bg = dark ? c.dark : c.light;
            const active = value === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onChange(c.id)}
                className={cn(
                  "w-7 h-7 rounded-full border transition-transform hover:scale-110",
                  active ? "border-foreground ring-2 ring-foreground/40" : "border-border"
                )}
                style={{ backgroundColor: bg }}
                title={c.label}
              />
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- Read-only preview ---------------- */

const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>]+)/gi;

function renderLinkified(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(LINK_RE.source, "gi");
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const label = m[1] ?? m[3];
    const href = m[2] ?? m[3];
    nodes.push(
      <a
        key={`${m.index}-${href}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline decoration-primary/40 hover:decoration-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {label}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type PreviewLine = { type: "text" | "ordered" | "check" | "bullet"; indent: number; text: string; checked?: boolean; label?: string };

function parsePreview(source: string): PreviewLine[] {
  const raw = source.split(/\r?\n/);
  const out: PreviewLine[] = [];
  const counters: number[] = [];
  for (const line of raw) {
    const m = line.match(/^((?:  )*)/);
    const indent = Math.min(4, (m ? m[1].length : 0) / 2);
    const body = line.slice(indent * 2);
    let type: PreviewLine["type"] = "text";
    let text = body;
    let checked: boolean | undefined;
    let label: string | undefined;
    let mm: RegExpMatchArray | null;
    if ((mm = body.match(/^\d+\.\s?(.*)$/))) {
      type = "ordered"; text = mm[1];
      counters.length = indent + 1;
      for (let k = 0; k <= indent; k++) if (counters[k] == null) counters[k] = 0;
      counters[indent] = (counters[indent] ?? 0) + 1;
      label = counters.slice(0, indent + 1).join(".") + ".";
    } else if ((mm = body.match(/^-\s\[([ xX])\]\s?(.*)$/))) {
      type = "check"; checked = mm[1].toLowerCase() === "x"; text = mm[2];
      counters.length = Math.min(counters.length, indent + 1);
    } else if ((mm = body.match(/^[-•]\s?(.*)$/))) {
      type = "bullet"; text = mm[1];
      counters.length = Math.min(counters.length, indent + 1);
    } else {
      counters.length = Math.min(counters.length, indent + 1);
    }
    out.push({ type, indent, text, checked, label });
  }
  return out;
}

function NotePreview({ text }: { text: string }) {
  const lines = useMemo(() => parsePreview(text), [text]);
  return (
    <div className="text-sm leading-snug space-y-0.5">
      {lines.map((l, i) => {
        if (l.type === "text" && !l.text) return <div key={i} className="h-3" />;
        const marker =
          l.type === "ordered" ? (
            <span className="text-xs font-medium text-muted-foreground tabular-nums min-w-[1.5rem] text-right">{l.label}</span>
          ) : l.type === "check" ? (
            <span className="pt-[3px]"><Checkbox checked={!!l.checked} disabled className="h-3.5 w-3.5" /></span>
          ) : l.type === "bullet" ? (
            <span className="text-muted-foreground min-w-[1rem] text-center">•</span>
          ) : null;
        return (
          <div key={i} className="flex items-start gap-1.5" style={{ paddingLeft: l.indent * 12 }}>
            {marker}
            <span className={cn("whitespace-pre-wrap break-words flex-1", l.type === "check" && l.checked && "line-through text-muted-foreground")}>
              {renderLinkified(l.text)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function NoteAttachmentPreview({ attachments }: { attachments: TaskAttachment[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
      {attachments.map((a) => (
        <span key={a.id} className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-1.5 py-0.5 max-w-full">
          <Paperclip className="w-3 h-3 shrink-0" />
          <span className="truncate max-w-[10rem]">{a.name}</span>
        </span>
      ))}
    </div>
  );
}