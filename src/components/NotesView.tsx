import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, PinOff, Trash2, CheckSquare, Palette, FolderKanban, Tag, ListChecks, X, Plus } from "lucide-react";
import { Note, NOTE_COLORS, noteColorFor } from "@/types/note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SelectorWithCreate } from "@/components/SelectorWithCreate";
import { Quadrant } from "@/types/task";
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

  const pinned = useMemo(() => notes.filter((n) => n.pinned), [notes]);
  const others = useMemo(() => notes.filter((n) => !n.pinned), [notes]);

  const projectName = (id?: string) => projects.find((p) => p.id === id)?.name;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-1 pb-8">
        <NoteComposer
          categories={categories}
          projects={projects}
          defaultCategory={defaultCategory}
          defaultProjectId={defaultProjectId}
          onCreateCategory={onCreateCategory}
          onCreateProject={onCreateProject}
          onAddNote={onAddNote}
          dark={dark}
        />

        {pinned.length > 0 && (
          <>
            <SectionLabel>Pinned</SectionLabel>
            <MasonryGrid>
              <AnimatePresence initial={false}>
                {pinned.map((n) => (
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
                {others.map((n) => (
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
  dark: boolean;
}

function NoteComposer(props: ComposerProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(props.defaultCategory || "General");
  const [projectId, setProjectId] = useState(props.defaultProjectId || "");
  const [color, setColor] = useState<string>("default");
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) commit();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, title, content, category, projectId, color]);

  const reset = () => {
    setTitle(""); setContent(""); setColor("default");
    setCategory(props.defaultCategory || "General");
    setProjectId(props.defaultProjectId || "");
    setOpen(false);
  };

  const commit = () => {
    if (!title.trim() && !content.trim()) { reset(); return; }
    props.onAddNote({
      title: title.trim(),
      content: content.trim(),
      category,
      projectId: projectId || undefined,
      color: color === "default" ? undefined : color,
    });
    reset();
  };

  const bg = noteColorFor(color, props.dark ? "dark" : "light");
  const catOptions = Array.from(new Set([...(categories(props.categories))])).map((c) => ({ value: c, label: c }));
  function categories(list: string[]) { return list.length ? list : ["General"]; }
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
            className="w-full text-left px-4 py-3 text-sm text-muted-foreground"
            onClick={() => { setOpen(true); setTimeout(() => contentRef.current?.focus(), 0); }}
          >
            Take a note…
          </button>
        ) : (
          <div className="p-3 space-y-2">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="border-0 bg-transparent focus-visible:ring-0 px-2 text-base font-medium h-9"
            />
            <Textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Take a note…"
              className="border-0 bg-transparent focus-visible:ring-0 px-2 min-h-[80px] resize-none text-sm"
            />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <SelectorWithCreate
                options={catOptions}
                value={category}
                onChange={setCategory}
                onCreate={props.onCreateCategory}
                placeholder="Category"
                compact
                icon={<Tag className="w-3.5 h-3.5" />}
              />
              <SelectorWithCreate
                options={projectOptions}
                value={projectId}
                onChange={setProjectId}
                onCreate={props.onCreateProject}
                placeholder="No project"
                compact
                icon={<FolderKanban className="w-3.5 h-3.5" />}
              />
              <ColorPicker value={color} onChange={setColor} dark={props.dark} />
              <div className="ml-auto flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={reset}>Cancel</Button>
                <Button size="sm" onClick={commit}>Done</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
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
  getCategoryColor?: (name: string) => string | undefined;
  dark: boolean;
}

function NoteCard(props: CardProps) {
  const { note, dark } = props;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);

  useEffect(() => { if (!editing) { setTitle(note.title); setContent(note.content); } }, [note.title, note.content, editing]);

  const bg = noteColorFor(note.color, dark ? "dark" : "light");
  const catColor = props.getCategoryColor?.(note.category);
  const catOptions = (props.categories.length ? props.categories : ["General"]).map((c) => ({ value: c, label: c }));
  const projectOptions = [{ value: "", label: "No project" }, ...props.projects.map((p) => ({ value: p.id, label: p.name }))];

  const commitEdit = () => {
    setEditing(false);
    if (title !== note.title || content !== note.content) {
      props.onUpdate(note.id, { title: title.trim(), content: content.trim() });
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="mb-3 break-inside-avoid rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow group"
      style={{ backgroundColor: bg }}
    >
      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {editing ? (
              <>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className="border-0 bg-transparent focus-visible:ring-0 px-1 text-base font-medium h-8"
                />
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Note"
                  className="border-0 bg-transparent focus-visible:ring-0 px-1 min-h-[60px] resize-none text-sm"
                  autoFocus
                />
              </>
            ) : (
              <div
                className="cursor-text"
                onClick={() => setEditing(true)}
              >
                {note.title && (
                  <div className="font-semibold text-sm mb-1 break-words">{note.title}</div>
                )}
                {note.content ? (
                  <div className="text-sm whitespace-pre-wrap break-words leading-snug">
                    {note.content}
                  </div>
                ) : !note.title ? (
                  <div className="text-sm text-muted-foreground italic">Empty note</div>
                ) : null}
              </div>
            )}
          </div>
          <button
            className="opacity-60 hover:opacity-100 p-1 -mr-1 -mt-1"
            onClick={() => props.onUpdate(note.id, { pinned: !note.pinned })}
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

        <div className="flex items-center gap-0.5 mt-2 opacity-70 group-hover:opacity-100 transition-opacity">
          {editing ? (
            <Button size="sm" onClick={commitEdit} className="h-7 text-xs">Done</Button>
          ) : (
            <>
              <ColorPicker
                value={note.color || "default"}
                onChange={(c) => props.onUpdate(note.id, { color: c === "default" ? undefined : c })}
                dark={dark}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Category & project">
                    <FolderKanban className="w-3.5 h-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2 space-y-2" align="start">
                  <div className="text-xs text-muted-foreground px-1">Category</div>
                  <SelectorWithCreate
                    options={catOptions}
                    value={note.category}
                    onChange={(v) => props.onUpdate(note.id, { category: v })}
                    onCreate={props.onCreateCategory}
                    icon={<Tag className="w-3.5 h-3.5" />}
                  />
                  <div className="text-xs text-muted-foreground px-1 pt-1">Project</div>
                  <SelectorWithCreate
                    options={projectOptions}
                    value={note.projectId || ""}
                    onChange={(v) => props.onUpdate(note.id, { projectId: v || undefined })}
                    onCreate={props.onCreateProject}
                    icon={<FolderKanban className="w-3.5 h-3.5" />}
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Convert to task"
                onClick={() => props.onConvert(note)}
              >
                <ListChecks className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Delete note"
                onClick={() => props.onDelete(note.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
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