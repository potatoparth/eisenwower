import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value?: string; // ISO datetime string or YYYY-MM-DD
  onChange: (value: string | undefined) => void;
  accentColor?: string; // any CSS color
  placeholder?: string;
  className?: string;
  defaultTime?: string; // "HH:MM"
  id?: string;
}

const DOW = ["Su", "M", "T", "W", "T", "F", "S"];

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
  const [viewMonth, setViewMonth] = useState<Date>(parsed ?? new Date());

  const hasTime = !!value && value.length > 10;
  const [defH, defM] = defaultTime.split(":").map((n) => parseInt(n, 10));
  const hour = parsed ? parsed.getHours() : defH;
  const minute = parsed ? parsed.getMinutes() : defM;

  useEffect(() => {
    if (parsed) setViewMonth(parsed);
  }, [parsed]);

  const today = new Date();

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
    const arr: Date[] = [];
    let d = start;
    while (d <= end) {
      arr.push(d);
      d = addDays(d, 1);
    }
    return arr;
  }, [viewMonth]);

  const emit = (date: Date, h: number, m: number) => {
    const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(h)}:${pad(m)}:00`;
    onChange(iso);
  };

  const pickDate = (d: Date) => {
    const h = parsed ? hour : defH;
    const m = parsed ? minute : defM;
    emit(d, h, m);
  };

  const bumpHour = (delta: number) => {
    const base = parsed ?? new Date();
    const nh = (hour + delta + 24) % 24;
    emit(base, nh, minute);
  };
  const bumpMinute = (delta: number) => {
    const base = parsed ?? new Date();
    const nm = (minute + delta + 60) % 60;
    emit(base, hour, nm);
  };

  const setHourValue = (v: number) => {
    if (isNaN(v)) return;
    const base = parsed ?? new Date();
    emit(base, Math.max(0, Math.min(23, v)), minute);
  };
  const setMinuteValue = (v: number) => {
    if (isNaN(v)) return;
    const base = parsed ?? new Date();
    emit(base, hour, Math.max(0, Math.min(59, v)));
  };

  const triggerLabel = parsed
    ? `${format(parsed, "d MMM yyyy")} · ${pad(hour)}:${pad(minute)}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="p-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border bg-popover"
        style={{ width: 280 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setViewMonth((m) => addMonths(m, -1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-sm font-semibold">{format(viewMonth, "MMMM yyyy")}</div>
          <button
            type="button"
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* DOW */}
        <div className="grid grid-cols-7 pb-2">
          {DOW.map((d, i) => (
            <div
              key={i}
              className="text-[11px] font-medium text-muted-foreground text-center"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((d, i) => {
            const inMonth = isSameMonth(d, viewMonth);
            const isToday = isSameDay(d, today);
            const isSelected = parsed && isSameDay(d, parsed);
            return (
              <button
                key={i}
                type="button"
                onClick={() => pickDate(d)}
                className={cn(
                  "w-9 h-9 mx-auto rounded-lg text-[13px] flex items-center justify-center transition-colors",
                  !inMonth && "opacity-30",
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

        {/* Time row */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Time</span>
          <div className="flex items-center gap-1">
            <TimeField
              value={hour}
              onChange={setHourValue}
              onBump={bumpHour}
              max={23}
              aria="Hour"
            />
            <span className="text-base text-muted-foreground">:</span>
            <TimeField
              value={minute}
              onChange={setMinuteValue}
              onBump={bumpMinute}
              max={59}
              aria="Minute"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t flex items-center gap-4">
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-xs text-muted-foreground hover:underline"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setViewMonth(now);
              emit(now, parsed ? hour : defH, parsed ? minute : defM);
            }}
            className="text-xs font-semibold hover:underline"
            style={{ color: accentColor }}
          >
            Today
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface TimeFieldProps {
  value: number;
  onChange: (n: number) => void;
  onBump: (delta: number) => void;
  max: number;
  aria: string;
}

function TimeField({ value, onChange, onBump, aria }: TimeFieldProps) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-0.5">
      <input
        ref={ref}
        aria-label={aria}
        type="text"
        inputMode="numeric"
        value={pad(value)}
        onChange={(e) => {
          const v = parseInt(e.target.value.replace(/\D/g, ""), 10);
          if (!isNaN(v)) onChange(v);
        }}
        onWheel={(e) => {
          if (document.activeElement !== ref.current) return;
          e.preventDefault();
          onBump(e.deltaY < 0 ? 1 : -1);
        }}
        className="w-11 h-9 text-center text-[15px] font-medium rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => onBump(1)}
          className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label={`Increase ${aria}`}
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => onBump(-1)}
          className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label={`Decrease ${aria}`}
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}