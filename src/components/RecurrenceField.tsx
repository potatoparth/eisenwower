import { Repeat } from "lucide-react";
import { Recurrence } from "@/types/task";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface RecurrenceFieldProps {
  recurrence: Recurrence;
  recurrenceDays: number[];
  onChange: (next: { recurrence: Recurrence; recurrenceDays: number[] }) => void;
  compact?: boolean;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function RecurrenceField({
  recurrence, recurrenceDays, onChange, compact = false,
}: RecurrenceFieldProps) {
  const handleRecurrenceChange = (v: string) => {
    const next = v as Recurrence;
    let days = recurrenceDays;
    if (next === "weekly" && (!days || days.length === 0)) {
      days = [new Date().getDay()];
    } else if (next === "monthly" && (!days || days.length === 0)) {
      days = [new Date().getDate()];
    } else if (next !== "weekly" && next !== "monthly") {
      days = [];
    }
    onChange({ recurrence: next, recurrenceDays: days });
  };

  const toggleDay = (d: number) => {
    const set = new Set(recurrenceDays);
    if (set.has(d)) {
      if (set.size === 1) return; // require at least one
      set.delete(d);
    } else set.add(d);
    onChange({ recurrence, recurrenceDays: Array.from(set).sort((a, b) => a - b) });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Repeat className={cn("text-muted-foreground flex-shrink-0", compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
        <div className="flex-1">
          <Select value={recurrence} onValueChange={handleRecurrenceChange}>
            <SelectTrigger className={cn("border-0 bg-secondary/60 rounded-lg", compact ? "h-8 text-xs" : "h-9 text-sm")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Does not repeat</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {recurrence === "weekly" && (
        <div className="flex gap-1 pl-6">
          {DAY_LABELS.map((label, i) => {
            const active = recurrenceDays.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={cn(
                  "w-7 h-7 rounded-full text-[11px] font-medium border transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {recurrence === "monthly" && (
        <div className="flex items-center gap-2 pl-6 text-xs text-muted-foreground">
          <span>On day</span>
          <Input
            type="number"
            min={1}
            max={31}
            value={recurrenceDays[0] ?? new Date().getDate()}
            onChange={(e) => {
              const n = Math.max(1, Math.min(31, parseInt(e.target.value) || 1));
              onChange({ recurrence, recurrenceDays: [n] });
            }}
            className="h-7 w-16 border-0 bg-secondary/60 rounded-md text-sm"
          />
        </div>
      )}
    </div>
  );
}