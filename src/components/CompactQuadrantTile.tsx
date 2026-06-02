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
  const todayTasks = open.filter((t) => t.dueDate && isToday(parseISO(t.dueDate)));
  const today = todayTasks.length;
  const overdue = open.filter((t) => isOverdue(t)).length;

  const accentVar = `hsl(var(--quadrant-${quadrant.color}))`;
  const accentBg = `hsl(var(--quadrant-${quadrant.color}) / 0.10)`;
  const accentBorder = `hsl(var(--quadrant-${quadrant.color}) / 0.20)`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col overflow-hidden text-left transition-all hover:shadow-md active:scale-[0.99] min-h-[120px]"
      )}
      style={{
        backgroundColor: accentBg,
        border: `1px solid ${accentBorder}`,
        borderRadius: 14,
        padding: 16,
      }}
    >
      {/* Top accent bar */}
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0"
        style={{ height: 4, backgroundColor: accentVar, borderTopLeftRadius: 13, borderTopRightRadius: 13 }}
      />

      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: accentVar }} />
        <span
          className="text-foreground truncate flex-1"
          style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em" }}
        >
          {quadrant.title}
        </span>
        <span
          className="inline-flex items-center justify-center rounded-full px-2 h-5 text-[11px] font-semibold tabular-nums"
          style={{ backgroundColor: accentVar, color: "hsl(var(--primary-foreground))" }}
        >
          {open.length}
        </span>
      </div>
      <p
        className="mt-0.5 truncate"
        style={{ fontSize: 11, color: accentVar, opacity: 0.6 }}
      >
        {quadrant.subtitle}
      </p>

      {/* Separator */}
      <div className="mt-3 mb-3 h-px bg-border" />

      {/* Stats */}
      <dl className="space-y-1.5">
        <StatRow label="Today" value={today} color={today > 0 ? "#D97706" : "#6B7280"} />
        <StatRow label="Open" value={open.length} color={open.length > 0 ? accentVar : "#6B7280"} />
        {overdue > 0 && <StatRow label="Overdue" value={overdue} color="#DC2626" />}
      </dl>

      {/* Footer: today's tasks preview */}
      {today > 0 && (
        <>
          <div className="mt-3 mb-2 h-px bg-border" />
          <ul className="space-y-1">
            {todayTasks.slice(0, 2).map((t) => (
              <li key={t.id} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: accentVar }} />
                <span className="truncate text-[11px] text-foreground/80">{t.name}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </button>
  );
}

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[12px]" style={{ color: "#6B7280" }}>{label}</dt>
      <dd className="tabular-nums" style={{ fontSize: 13, fontWeight: 600, color }}>
        {value}
      </dd>
    </div>
  );
}