import { Task, QuadrantInfo } from "@/types/task";
import { isOverdue } from "@/lib/sort";
import { isToday, parseISO } from "date-fns";

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

  const accent = `hsl(var(--quadrant-${quadrant.color}))`;
  const accentBg = `hsl(var(--quadrant-${quadrant.color}) / var(--quadrant-tint-alpha, 0.08))`;
  const accentBorder = `hsl(var(--quadrant-${quadrant.color}) / 0.20)`;
  const accentDivider = `hsl(var(--quadrant-${quadrant.color}) / 0.12)`;
  const badgeBg = `hsl(var(--quadrant-${quadrant.color}) / 0.15)`;
  const subtitleColor = `hsl(var(--quadrant-${quadrant.color}) / 0.60)`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-full w-full flex-col overflow-hidden text-left transition-all duration-150 ease-out hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:scale-[1.005] active:opacity-85"
      style={{
        backgroundColor: accentBg,
        border: `1px solid ${accentBorder}`,
        borderRadius: 14,
      }}
    >
      {/* SECTION 1 — HEADER */}
      <div
        className="flex-shrink-0"
        className="flex-shrink-0 p-3 sm:p-4 sm:pb-2.5"
        style={{ borderBottom: `1px solid ${accentDivider}` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="rounded-full flex-shrink-0"
            style={{ width: 8, height: 8, backgroundColor: accent }}
          />
          <span
            className="flex-1 truncate"
            style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", color: accent }}
          >
            {quadrant.title}
          </span>
          <span
            className="inline-flex items-center justify-center tabular-nums flex-shrink-0"
            style={{
              backgroundColor: badgeBg,
              color: accent,
              fontSize: 10,
              fontWeight: 600,
              borderRadius: 20,
              padding: "2px 7px",
            }}
          >
            {open.length}
          </span>
        </div>
        {quadrant.subtitle && (
          <p
            className="mt-1 max-w-full overflow-hidden whitespace-nowrap text-ellipsis hidden sm:block"
            style={{ fontSize: 11, color: subtitleColor }}
          >
            {quadrant.subtitle}
          </p>
        )}
      </div>

      {/* SECTION 2 — STATS */}
      <div className="flex flex-1 flex-col justify-center gap-1.5 p-3 sm:gap-2 sm:p-4">
        <StatRow value={today} label="today" activeColor="#D97706" />
        <StatRow value={overdue} label="overdue" activeColor="#DC2626" />
        <StatRow value={open.length} label="open" activeColor={accent} alwaysActive />
      </div>

    </button>
  );
}

function StatRow({
  value,
  label,
  activeColor,
  alwaysActive = false,
}: {
  value: number;
  label: string;
  activeColor: string;
  alwaysActive?: boolean;
}) {
  const active = alwaysActive || value > 0;
  const mutedClass = "text-[#9CA3AF] dark:text-[#4B5563]";
  return (
    <div className="flex items-baseline gap-1.5 min-w-0">
      <span
        className={`tabular-nums flex-shrink-0 ${active ? "" : mutedClass}`}
        style={{
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          ...(active ? { color: activeColor } : {}),
        }}
      >
        {value}
      </span>
      <span
        className={`truncate ${active ? "" : mutedClass}`}
        style={{
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          ...(active ? { color: activeColor } : {}),
        }}
      >
        {label}
      </span>
    </div>
  );
}