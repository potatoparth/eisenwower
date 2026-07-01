import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import {
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
} from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  accentColor?: string;
  placeholder?: string;
  className?: string;
  defaultTime?: string; // "HH:MM"
  id?: string;
}

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function parseValue(v?: string): Date | null {
  if (!v) return null;
  try {
    const d = v.length === 10 ? parseISO(v + "T00:00:00") : parseISO(v);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function nextSaturday(from: Date): Date {
  const day = from.getDay(); // Sun=0..Sat=6
  const diff = day === 6 ? 7 : 6 - day;
  return addDays(from, diff);
}
function nextMonday(from: Date): Date {
  const day = from.getDay();
  const diff = (8 - day) % 7 || 7; // always future Monday
  return addDays(from, diff);
}

const TIME_CHIPS: { label: string; h: number; m: number }[] = [
  { label: "9:00 AM", h: 9, m: 0 },
  { label: "12:00 PM", h: 12, m: 0 },
  { label: "6:00 PM", h: 18, m: 0 },
  { label: "9:00 PM", h: 21, m: 0 },
];

function formatTimeInput(h: number, m: number) {
  const isPM = h >= 12;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${pad(m)} ${isPM ? "PM" : "AM"}`;
}

function parseTimeInput(s: string): { h: number; m: number } | null {
  const str = s.trim().toLowerCase();
  if (!str) return null;
  const m = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3];
  if (isNaN(h) || isNaN(min) || min < 0 || min > 59) return null;
  if (ap) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (ap === "pm" ? 12 : 0);
  } else if (h < 0 || h > 23) {
    return null;
  }
  return { h, m: min };
}

export function DateTimePicker({
  value,
  onChange,
  accentColor = "hsl(var(--primary))",
  placeholder = "Set deadline…",
  className,
  defaultTime = "22:00",
  id,
}: DateTimePickerProps) {
  const parsed = useMemo(() => parseValue(value), [value]);
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const [defH, defM] = defaultTime.split(":").map((n) => parseInt(n, 10));

  const [draftDate, setDraftDate] = useState<Date | null>(parsed);
  const [draftHour, setDraftHour] = useState<number>(parsed ? parsed.getHours() : defH);
  const [draftMinute, setDraftMinute] = useState<number>(parsed ? parsed.getMinutes() : defM);
  const [viewMonth, setViewMonth] = useState<Date>(parsed ?? new Date());
  const [timeInput, setTimeInput] = useState<string>(
    formatTimeInput(parsed ? parsed.getHours() : defH, parsed ? parsed.getMinutes() : defM)
  );
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [showCustomTime, setShowCustomTime] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Re-snapshot draft each time the picker opens.
  useEffect(() => {
    if (!open) return;
    const p = parseValue(value);
    const h = p ? p.getHours() : defH;
    const m = p ? p.getMinutes() : defM;
    setDraftDate(p);
    setDraftHour(h);
    setDraftMinute(m);
    setViewMonth(p ?? new Date());
    setTimeInput(formatTimeInput(h, m));
    // Progressive disclosure: expand a section only if the current value doesn't match any chip.
    const chipDates = [
      new Date(),
      addDays(new Date(), 1),
      nextSaturday(new Date()),
      nextMonday(new Date()),
    ];
    const matchesDateChip = p ? chipDates.some((d) => isSameDay(d, p)) : true;
    const matchesTimeChip = TIME_CHIPS.some((c) => c.h === h && c.m === m);
    setShowCalendar(!!p && !matchesDateChip);
    setShowCustomTime(!matchesTimeChip);
  }, [open, value, defH, defM]);

  const today = new Date();

  // Scrollable rolling calendar: 16 weeks starting at the start of viewMonth's week.
  const days = useMemo(() => {
    const start = startOfWeek(viewMonth, { weekStartsOn: 0 });
    const arr: Date[] = [];
    for (let i = 0; i < 16 * 7; i++) arr.push(addDays(start, i));
    return arr;
  }, [viewMonth]);

  // Group days into weeks, tagging weeks that start a new month for divider labels.
  const weeks = useMemo(() => {
    const w: { days: Date[]; monthLabel?: string }[] = [];
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7);
      const prevChunk = i === 0 ? null : days.slice(i - 7, i);
      const showLabel =
        !prevChunk ||
        chunk.some(
          (d) =>
            d.getDate() === 1 ||
            (prevChunk && !isSameMonth(d, prevChunk[prevChunk.length - 1]))
        );
      // Only add label if the month changed vs the previous week (or first row)
      const monthChanged =
        !prevChunk ||
        !isSameMonth(chunk[0], prevChunk[0]);
      w.push({
        days: chunk,
        monthLabel: monthChanged ? format(chunk.find((d) => isSameMonth(d, chunk[3])) ?? chunk[0], "MMMM yyyy") : undefined,
      });
    }
    return w;
  }, [days]);

  const commit = () => {
    if (!draftDate) {
      onChange(undefined);
    } else {
      const iso = `${draftDate.getFullYear()}-${pad(draftDate.getMonth() + 1)}-${pad(
        draftDate.getDate()
      )}T${pad(draftHour)}:${pad(draftMinute)}:00`;
      onChange(iso);
    }
    setOpen(false);
  };
  const cancel = () => setOpen(false);
  const clear = () => {
    onChange(undefined);
    setOpen(false);
  };

  const pickDate = (d: Date) => {
    setDraftDate(d);
    setViewMonth(d);
  };

  const pickTimeChip = (h: number, m: number) => {
    setDraftHour(h);
    setDraftMinute(m);
    setTimeInput(formatTimeInput(h, m));
  };

  const onTimeInputChange = (v: string) => {
    setTimeInput(v);
    const p = parseTimeInput(v);
    if (p) {
      setDraftHour(p.h);
      setDraftMinute(p.m);
    }
  };
  const onTimeInputBlur = () => {
    const p = parseTimeInput(timeInput);
    if (p) setTimeInput(formatTimeInput(p.h, p.m));
    else setTimeInput(formatTimeInput(draftHour, draftMinute));
  };

  const chipToday = new Date();
  const dateChips = [
    { key: "today", label: "Today", date: chipToday },
    { key: "tomorrow", label: "Tomorrow", date: addDays(chipToday, 1) },
    { key: "weekend", label: "This weekend", date: nextSaturday(chipToday) },
    { key: "nextweek", label: "Next week", date: nextMonday(chipToday) },
  ];

  const triggerLabel = parsed
    ? `${format(parsed, "d MMM yyyy")} · ${format(parsed, "h:mm a")}`
    : placeholder;

  const activeTimeChip = TIME_CHIPS.find(
    (c) => c.h === draftHour && c.m === draftMinute
  );

  const Body = (
    <div className="flex flex-col gap-2.5">
      {/* Date quick chips */}
      <div className={cn("flex flex-wrap gap-1.5", isMobile && "gap-2")}>
        {dateChips.map((c) => {
          const active = !!draftDate && isSameDay(draftDate, c.date);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => pickDate(c.date)}
              className={cn(
                "rounded-full text-xs font-medium px-2.5 py-1 border transition-colors",
                isMobile && "text-sm px-4 py-2 min-h-11 flex-1",
                active
                  ? "text-white border-transparent"
                  : "bg-secondary/60 border-transparent hover:border-border text-foreground"
              )}
              style={active ? { backgroundColor: accentColor } : undefined}
            >
              {c.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowCalendar((s) => !s)}
          className={cn(
            "rounded-full text-xs font-medium px-2.5 py-1 border transition-colors inline-flex items-center gap-1",
            isMobile && "text-sm px-4 py-2 min-h-11",
            showCalendar
              ? "border-border bg-secondary text-foreground"
              : "bg-secondary/60 border-transparent hover:border-border text-foreground"
          )}
          aria-expanded={showCalendar}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Pick a date
        </button>
      </div>

      {showCalendar && (
        <div className="flex flex-col gap-1.5 rounded-lg border bg-secondary/30 p-2">
          {/* Month header */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
              className={cn(
                "rounded-md flex items-center justify-center hover:bg-secondary",
                isMobile ? "w-9 h-9" : "w-6 h-6"
              )}
              aria-label="Previous month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="text-xs font-semibold">{format(viewMonth, "MMMM yyyy")}</div>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className={cn(
                "rounded-md flex items-center justify-center hover:bg-secondary",
                isMobile ? "w-9 h-9" : "w-6 h-6"
              )}
              aria-label="Next month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* DOW (sticky above scrolling weeks) */}
          <div className="grid grid-cols-7">
            {DOW.map((d, i) => (
              <div
                key={i}
                className="text-[10px] font-medium text-muted-foreground text-center"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Scrollable weeks: ~2 rows tall */}
          <div
            ref={scrollRef}
            className="overflow-y-auto"
            style={{ maxHeight: isMobile ? 132 : 110 }}
          >
            <div className="flex flex-col">
              {weeks.map((wk, wi) => (
                <div key={wi}>
                  {wk.monthLabel && wi !== 0 && (
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 px-1 pt-1 pb-0.5 border-t border-border/40 mt-0.5">
                      {wk.monthLabel}
                    </div>
                  )}
                  <div className="grid grid-cols-7">
                    {wk.days.map((d, di) => {
                      const isToday = isSameDay(d, today);
                      const isSelected = draftDate && isSameDay(d, draftDate);
                      const dim = !isSameMonth(d, viewMonth);
                      return (
                        <button
                          key={di}
                          type="button"
                          onClick={() => pickDate(d)}
                          className={cn(
                            "mx-auto rounded-md flex items-center justify-center transition-colors",
                            isMobile ? "w-9 h-9 text-sm" : "w-8 h-8 text-[12px]",
                            dim && !isSelected && "opacity-40",
                            !isSelected && "hover:bg-secondary",
                            isToday && !isSelected && "font-semibold",
                            isSelected && "text-white font-semibold"
                          )}
                          style={{
                            ...(isToday && !isSelected
                              ? { boxShadow: `inset 0 0 0 1.5px ${accentColor}` }
                              : {}),
                            ...(isSelected ? { backgroundColor: accentColor } : {}),
                          }}
                        >
                          {d.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Time */}
      <div className="pt-2 border-t flex flex-col gap-1.5">
        <span className="text-[11px] text-muted-foreground">Time</span>
        <div className="flex flex-wrap gap-1.5">
          {TIME_CHIPS.map((c) => {
            const active = activeTimeChip?.label === c.label;
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => pickTimeChip(c.h, c.m)}
                className={cn(
                  "rounded-full text-xs font-medium px-2.5 py-1 border transition-colors tabular-nums",
                  isMobile && "text-sm px-4 py-2 min-h-11 flex-1",
                  active
                    ? "text-white border-transparent"
                    : "bg-secondary/60 border-transparent hover:border-border text-foreground"
                )}
                style={active ? { backgroundColor: accentColor } : undefined}
              >
                {c.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowCustomTime((s) => !s)}
            className={cn(
              "rounded-full text-xs font-medium px-2.5 py-1 border transition-colors inline-flex items-center gap-1",
              isMobile && "text-sm px-4 py-2 min-h-11",
              showCustomTime
                ? "border-border bg-secondary text-foreground"
                : "bg-secondary/60 border-transparent hover:border-border text-foreground"
            )}
            aria-expanded={showCustomTime}
          >
            <Clock className="w-3.5 h-3.5" />
            Custom
          </button>
        </div>
        {showCustomTime && (
          <input
            type="text"
            value={timeInput}
            onChange={(e) => onTimeInputChange(e.target.value)}
            onBlur={onTimeInputBlur}
            placeholder="e.g. 10:30 PM"
            className={cn(
              "w-full rounded-lg bg-secondary/60 px-3 text-sm border border-transparent focus:border-border focus:outline-none transition-colors tabular-nums",
              isMobile ? "h-11" : "h-8"
            )}
            aria-label="Custom time"
            autoFocus
          />
        )}
      </div>
    </div>
  );

  const Footer = (
    <div className={cn("flex items-center gap-2", !isMobile && "pt-2 mt-1 border-t")}>
      <button
        type="button"
        onClick={clear}
        className="text-xs text-muted-foreground hover:underline mr-auto"
      >
        Clear
      </button>
      <button
        type="button"
        onClick={cancel}
        className={cn(
          "rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors",
          isMobile ? "h-11 px-4" : "h-8 px-3"
        )}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={commit}
        className={cn(
          "rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90",
          isMobile ? "h-11 px-4 flex-1" : "h-8 px-3"
        )}
        style={{ backgroundColor: accentColor }}
      >
        Set deadline
      </button>
    </div>
  );

  const Trigger = (
    <button
      id={id}
      type="button"
      className={cn(
        "w-full text-left rounded-lg bg-secondary/60 px-3 h-9 text-sm border border-transparent hover:border-border transition-colors",
        !parsed && "text-muted-foreground/70",
        className
      )}
    >
      {triggerLabel}
    </button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{Trigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-t bg-popover p-0 flex flex-col max-h-[92vh]"
        >
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="px-4 pt-2 pb-3 overflow-y-auto flex-1">{Body}</div>
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 border-t bg-popover">
            {Footer}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{Trigger}</PopoverTrigger>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onClick={cancel}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] animate-in fade-in-0"
            aria-hidden
          />,
          document.body
        )}
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        avoidCollisions
        collisionPadding={16}
        className="z-50 p-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] border bg-popover flex flex-col overflow-hidden"
        style={{
          width: 320,
          maxHeight: "min(85vh, calc(100vh - 32px))",
        }}
      >
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">{Body}</div>
        {Footer}
      </PopoverContent>
    </Popover>
  );
}