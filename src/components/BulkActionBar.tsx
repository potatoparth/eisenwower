import { useState } from "react";
import { X, CalendarClock, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { DateTimePicker } from "@/components/DateTimePicker";
import { useSelection } from "@/hooks/useSelection";
import { Task } from "@/types/task";

interface Props {
  onBulkReschedule: (ids: string[], iso: string) => void;
  /** Send the current selection to the Sprint view (opens the composer prefilled). */
  onAddToSprint?: (ids: string[]) => void;
}

/**
 * Floating bar shown when the user has tasks selected via the global Select
 * mode. Currently exposes a single bulk action: Reschedule.
 */
export function BulkActionBar({ onBulkReschedule, onAddToSprint }: Props) {
  const { selectMode, selectedIds, count, clear, setSelectMode } = useSelection();
  const [date, setDate] = useState<string | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!selectMode || count === 0) return null;

  const apply = (iso: string | undefined) => {
    if (!iso) return;
    onBulkReschedule(Array.from(selectedIds), iso);
    setDate(undefined);
    setPickerOpen(false);
    clear();
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-border bg-card/95 backdrop-blur px-3 py-2 shadow-lg">
      <span className="text-xs font-medium px-2 tabular-nums">
        {count} selected
      </span>
      {onAddToSprint && (
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full gap-1.5"
          onClick={() => {
            onAddToSprint(Array.from(selectedIds));
            clear();
            setSelectMode(false);
          }}
        >
          <Timer className="w-3.5 h-3.5" />
          Add to sprint
        </Button>
      )}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" className="rounded-full gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" />
            Reschedule
          </Button>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-[min(22rem,92vw)] p-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            New deadline for {count} task{count === 1 ? "" : "s"}
          </div>
          <DateTimePicker value={date} onChange={(v) => { setDate(v); apply(v); }} placeholder="Pick deadline…" />
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
  );
}