import { useEffect, useMemo, useRef, useState } from "react";
import { AlignLeft, ListOrdered, ListChecks, List, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LinkDialogState {
  idx: number;
  selStart: number;
  selEnd: number;
  text: string;
  url: string;
}

/**
 * Shared task description editor.
 *
 * Storage: markdown-ish, one item per line.
 *   text:       "hello"
 *   ordered:    "{indent×"  "}1. text"        (number is regenerated on render)
 *   check off:  "{indent×"  "}- [ ] text"
 *   check on:   "{indent×"  "}- [x] text"
 *
 * The renderer computes hierarchical numbering (1., 1.1., 1.1.1.) by tracking
 * an ordered-counter per indent level. A counter at depth N is reset whenever
 * its parent (any depth < N) is incremented — this is the "no gap" behaviour
 * users expect and avoids the classic "sibling continues past a sub-list"
 * numbering bug.
 */

type LineType = "text" | "ordered" | "check" | "bullet";
interface Line {
  type: LineType;
  indent: number;
  text: string;
  checked?: boolean;
}

const MAX_INDENT = 4;
const INDENT_UNIT = "  "; // 2 spaces

function parse(source: string): Line[] {
  if (!source) return [];
  const raw = source.split(/\r?\n/);
  const out: Line[] = [];
  for (const line of raw) {
    // count leading double-space groups as indent, cap at MAX_INDENT
    const indentMatch = line.match(/^((?:  )*)/);
    const indent = Math.min(
      MAX_INDENT,
      (indentMatch ? indentMatch[1].length : 0) / 2
    );
    const body = line.slice(indent * 2);
    let m: RegExpMatchArray | null;
    if ((m = body.match(/^\d+\.\s?(.*)$/))) {
      out.push({ type: "ordered", indent, text: m[1] });
    } else if ((m = body.match(/^-\s\[([ xX])\]\s?(.*)$/))) {
      out.push({
        type: "check",
        indent,
        text: m[2],
        checked: m[1].toLowerCase() === "x",
      });
    } else if ((m = body.match(/^[-•]\s?(.*)$/))) {
      out.push({ type: "bullet", indent, text: m[1] });
    } else {
      out.push({ type: "text", indent, text: body });
    }
  }
  return out;
}

function serialize(lines: Line[]): string {
  return lines
    .map((l) => {
      const pad = INDENT_UNIT.repeat(l.indent);
      if (l.type === "ordered") return `${pad}1. ${l.text}`;
      if (l.type === "check")
        return `${pad}- [${l.checked ? "x" : " "}] ${l.text}`;
      if (l.type === "bullet") return `${pad}- ${l.text}`;
      return `${pad}${l.text}`;
    })
    .join("\n");
}

/**
 * Compute the display prefix for each ordered line so hierarchy is correct.
 * Non-ordered lines break sibling numbering at their indent and reset all
 * deeper counters — this matches how nested outlines are usually read.
 */
function computeOrderedLabels(lines: Line[]): (string | null)[] {
  const labels: (string | null)[] = new Array(lines.length).fill(null);
  const counters: number[] = []; // counters[d] = count so far at indent d
  let lastOrderedIndent = -1;

  lines.forEach((line, i) => {
    if (line.type !== "ordered") {
      // A non-ordered line only invalidates DEEPER counters — siblings at the
      // same indent should keep counting past an interleaved note or checkbox.
      counters.length = Math.min(counters.length, line.indent + 1);
      lastOrderedIndent = -1;
      return;
    }
    const d = line.indent;

    // Reset any deeper counters — starting a shallower/sibling item invalidates them.
    counters.length = d + 1;

    // If we jumped in from a shallower ordered line without children, seed missing
    // parent counters at 1 so 1 → 1.1, not "undefined.1".
    for (let k = 0; k <= d; k++) if (counters[k] == null) counters[k] = 0;

    counters[d] = (counters[d] ?? 0) + 1;
    lastOrderedIndent = d;

    labels[i] = counters.slice(0, d + 1).join(".") + ".";
  });

  void lastOrderedIndent;
  return labels;
}

interface TaskDescriptionProps {
  value: string;
  onChange: (v: string) => void;
  onCommit?: () => void;
  placeholder?: string;
  className?: string;
  /** When true, always show the editor (no collapsed "Add description" button). */
  alwaysOpen?: boolean;
  addLabel?: string;
}

export function TaskDescription({
  value,
  onChange,
  onCommit,
  placeholder = "Add a description…",
  className,
  alwaysOpen = false,
  addLabel = "Add description",
}: TaskDescriptionProps) {
  const [open, setOpen] = useState<boolean>(alwaysOpen || !!value);

  // Keep in sync when the value fills in from outside.
  useEffect(() => {
    if (alwaysOpen) setOpen(true);
    else if (value) setOpen(true);
  }, [value, alwaysOpen]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground",
          className
        )}
      >
        <AlignLeft className="w-3 h-3" /> {addLabel}
      </button>
    );
  }

  return (
    <DescriptionEditor
      value={value}
      onChange={onChange}
      onCommit={onCommit}
      placeholder={placeholder}
      className={className}
      onCollapse={
        alwaysOpen
          ? undefined
          : () => {
              if (!value) setOpen(false);
            }
      }
    />
  );
}

interface EditorProps {
  value: string;
  onChange: (v: string) => void;
  onCommit?: () => void;
  placeholder?: string;
  className?: string;
  onCollapse?: () => void;
}

function DescriptionEditor({
  value,
  onChange,
  onCommit,
  placeholder,
  className,
  onCollapse,
}: EditorProps) {
  const lines = useMemo<Line[]>(() => {
    const parsed = parse(value);
    return parsed.length > 0 ? parsed : [{ type: "text", indent: 0, text: "" }];
  }, [value]);

  const labels = useMemo(() => computeOrderedLabels(lines), [lines]);
  const inputRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [linkDialog, setLinkDialog] = useState<LinkDialogState | null>(null);

  useEffect(() => {
    if (focusIndex == null) return;
    const el = inputRefs.current[focusIndex];
    if (el) {
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
    }
    setFocusIndex(null);
  }, [focusIndex, lines.length]);

  const commit = (next: Line[]) => onChange(serialize(next));

  const updateLine = (idx: number, patch: Partial<Line>) => {
    const next = lines.map((l, i) => (i === idx ? { ...l, ...patch } : l));
    commit(next);
  };

  const insertLine = (idx: number, line: Line, focus = true) => {
    const next = [...lines.slice(0, idx + 1), line, ...lines.slice(idx + 1)];
    commit(next);
    if (focus) setFocusIndex(idx + 1);
  };

  const removeLine = (idx: number) => {
    if (lines.length === 1) {
      commit([{ type: "text", indent: 0, text: "" }]);
      return;
    }
    const next = lines.filter((_, i) => i !== idx);
    commit(next);
    setFocusIndex(Math.max(0, idx - 1));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    idx: number
  ) => {
    const line = lines[idx];
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Enter on an empty structured item → downgrade to plain text
      if ((line.type === "ordered" || line.type === "check") && !line.text.trim()) {
        if (line.indent > 0) {
          updateLine(idx, { indent: line.indent - 1 });
        } else {
          updateLine(idx, { type: "text", checked: undefined });
        }
        return;
      }
      // Otherwise start a fresh sibling of the same kind
      const newLine: Line =
        line.type === "text"
          ? { type: "text", indent: line.indent, text: "" }
          : line.type === "ordered"
          ? { type: "ordered", indent: line.indent, text: "" }
          : line.type === "bullet"
          ? { type: "bullet", indent: line.indent, text: "" }
          : { type: "check", indent: line.indent, text: "", checked: false };
      insertLine(idx, newLine);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        if (line.indent > 0) updateLine(idx, { indent: line.indent - 1 });
      } else if (line.indent < MAX_INDENT) {
        updateLine(idx, { indent: line.indent + 1 });
      }
      return;
    }
    if (e.key === "Backspace" && !line.text) {
      e.preventDefault();
      if (line.type !== "text") {
        updateLine(idx, { type: "text", checked: undefined });
      } else if (line.indent > 0) {
        updateLine(idx, { indent: line.indent - 1 });
      } else {
        removeLine(idx);
      }
      return;
    }
    // Cmd/Ctrl+K → open link dialog with current selection prefilled
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      openLinkDialog(idx);
    }
  };

  const convertActive = (type: "ordered" | "check" | "bullet") => {
    // Convert the currently-focused line (or last one) to the requested type.
    const active = document.activeElement as HTMLTextAreaElement | null;
    let idx = inputRefs.current.findIndex((el) => el === active);
    if (idx < 0) idx = lines.length - 1;
    const line = lines[idx];
    if (line.type === type) {
      updateLine(idx, { type: "text", checked: undefined });
    } else {
      updateLine(idx, {
        type,
        checked: type === "check" ? line.checked ?? false : undefined,
      });
    }
    setFocusIndex(idx);
  };

  const openLinkDialog = (idxHint?: number) => {
    const active = document.activeElement as HTMLTextAreaElement | null;
    let idx = inputRefs.current.findIndex((el) => el === active);
    if (idx < 0) idx = idxHint ?? lines.length - 1;
    const el = inputRefs.current[idx];
    const line = lines[idx];
    const start = el?.selectionStart ?? line.text.length;
    const end = el?.selectionEnd ?? line.text.length;
    const selected = line.text.slice(start, end);
    setLinkDialog({
      idx,
      selStart: start,
      selEnd: end,
      text: selected,
      url: /^https?:\/\//i.test(selected) ? selected : "",
    });
  };

  const applyLink = () => {
    if (!linkDialog) return;
    let url = linkDialog.url.trim();
    if (!url) {
      setLinkDialog(null);
      return;
    }
    if (!/^[a-z]+:\/\//i.test(url) && !url.startsWith("mailto:")) {
      url = `https://${url}`;
    }
    const label = linkDialog.text.trim() || url;
    const md = `[${label}](${url})`;
    const line = lines[linkDialog.idx];
    if (!line) {
      setLinkDialog(null);
      return;
    }
    const next =
      line.text.slice(0, linkDialog.selStart) +
      md +
      line.text.slice(linkDialog.selEnd);
    updateLine(linkDialog.idx, { text: next });
    setLinkDialog(null);
    setFocusIndex(linkDialog.idx);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5">
        <ToolbarBtn
          onClick={() => convertActive("ordered")}
          title="Numbered list"
          icon={<ListOrdered className="w-3.5 h-3.5" />}
        />
        <ToolbarBtn
          onClick={() => convertActive("bullet")}
          title="Bullet list"
          icon={<List className="w-3.5 h-3.5" />}
        />
        <ToolbarBtn
          onClick={() => convertActive("check")}
          title="Checklist"
          icon={<ListChecks className="w-3.5 h-3.5" />}
        />
        <ToolbarBtn
          onClick={() => openLinkDialog()}
          title="Insert link (⌘K)"
          icon={<Link2 className="w-3.5 h-3.5" />}
        />
        {onCollapse && !value && (
          <button
            type="button"
            onClick={onCollapse}
            className="ml-auto text-[10px] text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Lines */}
      <div
        className="rounded-lg bg-secondary/50 p-2 space-y-0.5 min-h-[5.25rem]"
        onBlur={(e) => {
          // fire commit when focus leaves the whole editor
          if (!e.currentTarget.contains(e.relatedTarget as Node)) onCommit?.();
        }}
      >
        {lines.map((line, i) => (
          <LineRow
            key={i}
            line={line}
            label={labels[i]}
            placeholder={i === 0 && lines.length === 1 ? placeholder : undefined}
            inputRef={(el) => (inputRefs.current[i] = el)}
            onTextChange={(t) => updateLine(i, { text: t })}
            onToggleCheck={() => updateLine(i, { checked: !line.checked })}
            onKeyDown={(e) => handleKeyDown(e, i)}
          />
        ))}
      </div>

      <Dialog open={!!linkDialog} onOpenChange={(o) => !o && setLinkDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Insert link</DialogTitle>
          </DialogHeader>
          {linkDialog && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                applyLink();
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Text</label>
                <Input
                  autoFocus={!linkDialog.text}
                  value={linkDialog.text}
                  onChange={(e) =>
                    setLinkDialog({ ...linkDialog, text: e.target.value })
                  }
                  placeholder="Link label"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">URL</label>
                <Input
                  autoFocus={!!linkDialog.text}
                  value={linkDialog.url}
                  onChange={(e) =>
                    setLinkDialog({ ...linkDialog, url: e.target.value })
                  }
                  placeholder="https://…"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLinkDialog(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!linkDialog.url.trim()}>
                  Insert
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToolbarBtn({
  onClick,
  title,
  icon,
}: {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      {icon}
    </button>
  );
}

interface LineRowProps {
  line: Line;
  label: string | null;
  placeholder?: string;
  inputRef: (el: HTMLTextAreaElement | null) => void;
  onTextChange: (t: string) => void;
  onToggleCheck: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

function LineRow({
  line,
  label,
  placeholder,
  inputRef,
  onTextChange,
  onToggleCheck,
  onKeyDown,
}: LineRowProps) {
  const marker = (() => {
    if (line.type === "ordered")
      return (
        <span className="text-xs font-medium text-muted-foreground tabular-nums pt-[3px] min-w-[1.75rem] text-right">
          {label ?? "1."}
        </span>
      );
    if (line.type === "check")
      return (
        <span className="pt-[3px]">
          <Checkbox
            checked={!!line.checked}
            onCheckedChange={onToggleCheck}
            className="h-3.5 w-3.5"
          />
        </span>
      );
    if (line.type === "bullet")
      return (
        <span className="text-muted-foreground pt-[3px] min-w-[1rem] text-center leading-none">
          •
        </span>
      );
    return null;
  })();

  return (
    <div
      className="flex items-start gap-1.5"
      style={{ paddingLeft: line.indent * 16 }}
    >
      {marker}
      <AutoTextarea
        inputRef={inputRef}
        value={line.text}
        onChange={onTextChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        strikethrough={line.type === "check" && line.checked}
      />
    </div>
  );
}

interface AutoTextareaProps {
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  strikethrough?: boolean;
  inputRef: (el: HTMLTextAreaElement | null) => void;
}

function AutoTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  strikethrough,
  inputRef,
}: AutoTextareaProps) {
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value, focused]);

  const hasLink = !focused && !!value && LINK_RE.test(value);
  // reset regex lastIndex after test()
  LINK_RE.lastIndex = 0;

  return (
    <div className="flex-1 min-w-0 relative">
      <textarea
      ref={(el) => {
        localRef.current = el;
        inputRef(el);
      }}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={cn(
        "block w-full resize-none bg-transparent border-0 text-sm leading-6 focus:outline-none placeholder:text-muted-foreground/60 p-0",
        strikethrough && "line-through text-muted-foreground",
        hasLink && "invisible"
      )}
      style={{ overflow: "hidden" }}
      />
      {hasLink && (
        <div
          onMouseDown={(e) => {
            // Focus the textarea when the user clicks empty space, but let
            // link clicks navigate normally.
            const target = e.target as HTMLElement;
            if (target.tagName === "A") return;
            e.preventDefault();
            localRef.current?.focus();
            const end = value.length;
            localRef.current?.setSelectionRange(end, end);
          }}
          className={cn(
            "absolute inset-0 text-sm leading-6 whitespace-pre-wrap break-words cursor-text",
            strikethrough && "line-through text-muted-foreground"
          )}
        >
          {renderLinkified(value)}
        </div>
      )}
    </div>
  );
}

// Matches either markdown links [text](url) or bare http(s) URLs.
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
        onMouseDown={(e) => e.stopPropagation()}
      >
        {label}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}