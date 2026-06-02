import { Task, QuadrantInfo } from "@/types/task";
import { isOverdue } from "@/lib/sort";
import { isToday, parseISO } from "date-fns";

interface CompactQuadrantTileProps {
  quadrant: QuadrantInfo;
  tasks: Task[];
  onClick: () => void;
}

const MUTED = "#9CA3AF";

export function CompactQuadrantTile({ quadrant, tasks, onClick }: CompactQuadrantTileProps) {
  const open = tasks.filter((t) => t.status === "open");
  const todayTasks = open.filter((t) => t.dueDate && isToday(parseISO(t.dueDate)));
  const today = todayTasks.length;
  const overdue = open.filter((t) => isOverdue(t)).length;

  const accent = `hsl(var(--quadrant-${quadrant.color}))`;
  const accentBg = `hsl(var(--quadrant-${quadrant.color}) / 0.08)`;
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
        style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${accentDivider}` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="rounded-full flex-shrink-0"
            style={{ width: 8, height: 8, backgroundColor: accent }}
          />
          <span
            className="flex-1 truncate"
            style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", color: accent }}
          >
            {quadrant.title}
          </span>
          <span
            className="inline-flex items-center justify-center tabular-nums flex-shrink-0"
            style={{
              backgroundColor: badgeBg,
              color: accent,
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 20,
              padding: "2px 8px",
            }}
          >
            {open.length}
          </span>
        </div>
        <p
          className="mt-1 max-w-full overflow-hidden whitespace-nowrap text-ellipsis"
          style={{ fontSize: 11, color: subtitleColor }}
        >
          {quadrant.subtitle}
        </p>
      </div>

      {/* SECTION 2 — STATS */}
      <div
        className="flex flex-1 flex-col justify-center"
        style={{ padding: "12px 14px", gap: 6 }}
      >
        <StatRow label="Today" value={today} color={today > 0 ? "#D97706" : MUTED} />
        <StatRow label="Open" value={open.length} color={open.length > 0 ? accent : MUTED} />
        <StatRow label="Overdue" value={overdue} color={overdue > 0 ? "#DC2626" : MUTED} />
      </div>

      {/* SECTION 3 — FOOTER */}
      {today > 0 && (
        <div
          className="flex-shrink-0"
          style={{ padding: "10px 14px", borderTop: `1px solid ${accentDivider}`, display: "flex", flexDirection: "column", gap: 4 }}
        >
          {todayTasks.slice(0, 2).map((t) => (
            <div key={t.id} className="flex items-center gap-1.5 min-w-0">
              <span
                className="rounded-full flex-shrink-0"
                style={{ width: 5, height: 5, backgroundColor: accent }}
              />
              <span
                className="overflow-hidden whitespace-nowrap text-ellipsis text-foreground/80"
                style={{ fontSize: 11 }}
              >
                {t.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 12, color: MUTED }}>{label}</span>
      <span className="tabular-nums" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color }}>
        {value}
      </span>
    </div>
  );
}