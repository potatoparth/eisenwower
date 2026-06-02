import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  const setHour24 = (h: number) => {
    const base = parsed ?? new Date();
    emit(base, ((h % 24) + 24) % 24, minute);
  };
  const setMinuteValue = (m: number) => {
    const base = parsed ?? new Date();
    emit(base, hour, ((m % 60) + 60) % 60);
  };

  const isPM = hour >= 12;
  const hour12 = ((hour + 11) % 12) + 1;
  const setHour12 = (h12: number) => {
    const next = ((h12 % 12) + (isPM ? 12 : 0)) % 24;
    setHour24(next);
  };
  const setPeriod = (pm: boolean) => {
    const next = pm ? (hour % 12) + 12 : hour % 12;
    setHour24(next);
  };

  const triggerLabel = parsed
    ? `${format(parsed, "d MMM yyyy")} · ${format(parsed, "h:mm a")}`
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

        {/* Time wheel */}
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Time</span>
            <span className="text-xs font-medium tabular-nums" style={{ color: accentColor }}>
              {pad(hour12)}:{pad(minute)} {isPM ? "PM" : "AM"}
            </span>
          </div>
          <div
            className="relative flex items-center justify-center gap-1 select-none"
            style={{ height: ITEM_H * 5 }}
          >
            {/* Selection highlight */}
            <div
              className="absolute left-0 right-0 mx-auto rounded-lg pointer-events-none"
              style={{
                top: ITEM_H * 2,
                height: ITEM_H,
                background: `${accentColor.includes("hsl") ? accentColor.replace(")", " / 0.10)") : accentColor + "1A"}`,
              }}
            />
            <WheelColumn
              values={Array.from({ length: 12 }, (_, i) => i + 1)}
              value={hour12}
              onChange={setHour12}
              format={pad}
              ariaLabel="Hour"
            />
            <div className="text-base font-medium opacity-50">:</div>
            <WheelColumn
              values={Array.from({ length: 60 }, (_, i) => i)}
              value={minute}
              onChange={setMinuteValue}
              format={pad}
              ariaLabel="Minute"
            />
            <WheelColumn
              values={["AM", "PM"]}
              value={isPM ? "PM" : "AM"}
              onChange={(v) => setPeriod(v === "PM")}
              format={(v) => String(v)}
              ariaLabel="AM or PM"
              wide
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

const ITEM_H = 32;

interface WheelColumnProps<T extends string | number> {
  values: T[];
  value: T;
  onChange: (v: T) => void;
  format: (v: T) => string;
  ariaLabel: string;
  wide?: boolean;
}

function WheelColumn<T extends string | number>({
  values,
  value,
  onChange,
  format,
  ariaLabel,
  wide,
}: WheelColumnProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const index = Math.max(0, values.indexOf(value));
  const settleRef = useRef<number | null>(null);
  const isInternalScroll = useRef(false);

  // Sync scrollTop when value changes externally
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = index * ITEM_H;
    if (Math.abs(el.scrollTop - target) > 1) {
      isInternalScroll.current = true;
      el.scrollTop = target;
      requestAnimationFrame(() => {
        isInternalScroll.current = false;
      });
    }
  }, [index]);

  const onScroll = () => {
    const el = ref.current;
    if (!el || isInternalScroll.current) return;
    if (settleRef.current) window.clearTimeout(settleRef.current);
    settleRef.current = window.setTimeout(() => {
      const i = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(values.length - 1, i));
      const v = values[clamped];
      if (v !== value) onChange(v);
      // Snap precisely
      isInternalScroll.current = true;
      el.scrollTop = clamped * ITEM_H;
      requestAnimationFrame(() => {
        isInternalScroll.current = false;
      });
    }, 90);
  };

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={ariaLabel}
      onScroll={onScroll}
      className="overflow-y-auto scrollbar-none snap-y snap-mandatory"
      style={{
        height: ITEM_H * 5,
        width: wide ? 44 : 40,
        scrollSnapType: "y mandatory",
        scrollbarWidth: "none",
      }}
    >
      <div style={{ height: ITEM_H * 2 }} aria-hidden />
      {values.map((v, i) => {
        const active = i === index;
        return (
          <div
            key={String(v)}
            onClick={() => onChange(v)}
            className="flex items-center justify-center cursor-pointer snap-center transition-opacity tabular-nums"
            style={{
              height: ITEM_H,
              fontSize: active ? 16 : 14,
              fontWeight: active ? 600 : 400,
              opacity: active ? 1 : 0.35,
            }}
          >
            {format(v)}
          </div>
        );
      })}
      <div style={{ height: ITEM_H * 2 }} aria-hidden />
    </div>
  );
}