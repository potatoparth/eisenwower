import { Task, QuadrantInfo } from "@/types/task";
import { isOverdue } from "@/lib/sort";
import { isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface CompactQuadrantTileProps {
  quadrant: QuadrantInfo;
  tasks: Task[];
  onClick: () => void;
}

export function CompactQuadrantTile({ quadrant, tasks, onClick }: CompactQuadrantTileProps) {
  const open = tasks.filter((t) => t.status === "open");
  const today = open.filter((t) => t.dueDate && isToday(parseISO(t.dueDate))).length;
  const overdue = open.filter((t) => isOverdue(t)).length;

  const quadClass =
    quadrant.color === 1 ? "quadrant-1"
      : quadrant.color === 2 ? "quadrant-2"
      : quadrant.color === 3 ? "quadrant-3"
      : "quadrant-4";
  const accentVar = `hsl(var(--quadrant-${quadrant.color}))`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col rounded-xl border overflow-hidden text-left p-3 transition-all hover:shadow-md active:scale-[0.99]",
        quadClass
      )}
      style={{ borderTop: `3px solid ${accentVar}` }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentVar }} />
        <span className="text-[13px] font-semibold tracking-tight text-foreground truncate">
          {quadrant.title}
        </span>
      </div>
      <dl className="space-y-0.5 text-[12px]">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Today</dt>
          <dd className="font-semibold tabular-nums text-foreground">{today}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Open</dt>
          <dd className="font-semibold tabular-nums text-foreground">{open.length}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Overdue</dt>
          <dd className={cn("font-semibold tabular-nums", overdue > 0 ? "text-destructive" : "text-foreground")}>
            {overdue}
          </dd>
        </div>
      </dl>
    </button>
  );
}