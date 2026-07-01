import { useMemo } from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { Task, Quadrant, QuadrantInfo, QUADRANT_MAP } from "@/types/task";
import { format, parseISO, differenceInDays, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useSelectionOptional } from "@/hooks/useSelection";

interface GanttViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  getCategoryColor?: (name: string) => string | undefined;
  quadrantMap?: Record<Quadrant, QuadrantInfo>;
}

export function GanttView({ tasks, onTaskClick, getCategoryColor, quadrantMap = QUADRANT_MAP }: GanttViewProps) {
  const sel = useSelectionOptional();
  const isSelectMode = !!sel?.selectMode;
  // Only show tasks with due dates
  const tasksWithDates = useMemo(() =>
    tasks.filter(t => t.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!)),
    [tasks]
  );

  const { days, weekHeaders, minDate } = useMemo(() => {
    if (tasksWithDates.length === 0) {
      const today = new Date();
      const start = startOfWeek(today, { weekStartsOn: 1 });
      const end = addDays(start, 27); // 4 weeks
      const days = eachDayOfInterval({ start, end });
      const weeks: { label: string; span: number; start: Date }[] = [];
      let currentWeekStart = start;
      while (currentWeekStart <= end) {
        const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
        const daysInView = days.filter(d => d >= currentWeekStart && d <= weekEnd).length;
        if (daysInView > 0) weeks.push({ label: format(currentWeekStart, "MMM d"), span: daysInView, start: currentWeekStart });
        currentWeekStart = addDays(weekEnd, 1);
      }
      return { days, weekHeaders: weeks, minDate: start };
    }

    const dates = tasksWithDates.map(t => parseISO(t.dueDate!));
    const today = new Date();
    const earliest = new Date(Math.min(today.getTime(), ...dates.map(d => d.getTime())));
    const latest = new Date(Math.max(today.getTime(), ...dates.map(d => d.getTime())));

    const start = addDays(startOfWeek(earliest, { weekStartsOn: 1 }), -7);
    const end = addDays(endOfWeek(latest, { weekStartsOn: 1 }), 7);
    const days = eachDayOfInterval({ start, end });

    const weeks: { label: string; span: number; start: Date }[] = [];
    let currentWeekStart = start;
    while (currentWeekStart <= end) {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      const daysInView = days.filter(d => d >= currentWeekStart && d <= weekEnd).length;
      if (daysInView > 0) weeks.push({ label: format(currentWeekStart, "MMM d"), span: daysInView, start: currentWeekStart });
      currentWeekStart = addDays(weekEnd, 1);
    }

    return { days, weekHeaders: weeks, minDate: start };
  }, [tasksWithDates]);

  const DAY_WIDTH = 36;

  const getBarColor = (task: Task) => {
    const catColor = getCategoryColor?.(task.category);
    if (catColor) return catColor;
    const q = quadrantMap[task.quadrant];
    const colorMap: Record<number, string> = {
      1: "hsl(var(--quadrant-1))",
      2: "hsl(var(--quadrant-2))",
      3: "hsl(var(--quadrant-3))",
      4: "hsl(var(--quadrant-4))",
    };
    return colorMap[q.color] || "hsl(var(--primary))";
  };

  if (tasksWithDates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-muted-foreground font-medium">No tasks with due dates</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Add due dates to your tasks to see them on the Gantt chart</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="min-w-fit">
          {/* Week headers */}
          <div className="flex sticky top-0 z-20 bg-card border-b border-border">
            <div className="w-[200px] flex-shrink-0 p-2 text-xs font-semibold text-muted-foreground border-r border-border">Task</div>
            <div className="flex">
              {weekHeaders.map((week, i) => (
                <div key={i} className="text-xs font-semibold text-muted-foreground text-center border-r border-border py-1" style={{ width: week.span * DAY_WIDTH }}>
                  {week.label}
                </div>
              ))}
            </div>
          </div>

          {/* Day headers */}
          <div className="flex sticky top-[29px] z-20 bg-card/95 backdrop-blur-sm border-b border-border">
            <div className="w-[200px] flex-shrink-0 border-r border-border" />
            <div className="flex">
              {days.map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-[10px] text-center border-r border-border/50 py-1",
                    isToday(day) ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground",
                    day.getDay() === 0 || day.getDay() === 6 ? "bg-muted/30" : ""
                  )}
                  style={{ width: DAY_WIDTH }}
                >
                  {format(day, "d")}
                </div>
              ))}
            </div>
          </div>

          {/* Task rows */}
          {tasksWithDates.map((task, rowIdx) => {
            const dueDate = parseISO(task.dueDate!);
            const createdDate = parseISO(task.createdAt);
            const startDay = Math.max(0, differenceInDays(createdDate, minDate));
            const endDay = differenceInDays(dueDate, minDate);
            const barStart = Math.min(startDay, endDay);
            const barWidth = Math.max(1, Math.abs(endDay - startDay) + 1);

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: rowIdx * 0.03 }}
                className={cn(
                  "flex border-b border-border/50 hover:bg-accent/20 transition-colors cursor-pointer",
                  task.status === "done" && "opacity-50",
                  isSelectMode && sel?.has(task.id) && "bg-primary/10"
                )}
                onClick={() => {
                  if (isSelectMode) { sel?.toggle(task.id); return; }
                  onTaskClick?.(task);
                }}
              >
                <div className="w-[200px] flex-shrink-0 p-2 text-sm truncate border-r border-border flex items-center gap-2">
                  {isSelectMode && (
                    <span
                      aria-hidden
                      className={cn(
                        "flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                        sel?.has(task.id) ? "bg-primary border-primary" : "border-muted-foreground/50 bg-transparent"
                      )}
                    >
                      {sel?.has(task.id) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                    </span>
                  )}
                  {getCategoryColor?.(task.category) && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(task.category) }} />
                  )}
                  <span className={cn(task.status === "done" && "line-through")}>{task.name}</span>
                </div>
                <div className="flex relative" style={{ width: days.length * DAY_WIDTH }}>
                  {/* Weekend backgrounds */}
                  {days.map((day, i) => (
                    <div
                      key={i}
                      className={cn(
                        "absolute top-0 bottom-0 border-r border-border/20",
                        (day.getDay() === 0 || day.getDay() === 6) && "bg-muted/20",
                        isToday(day) && "bg-primary/5"
                      )}
                      style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                    />
                  ))}
                  {/* Bar */}
                  <div
                    className="absolute top-1.5 h-[calc(100%-12px)] rounded-md transition-all"
                    style={{
                      left: barStart * DAY_WIDTH + 2,
                      width: barWidth * DAY_WIDTH - 4,
                      backgroundColor: getBarColor(task),
                      opacity: task.status === "done" ? 0.5 : 0.8,
                    }}
                  >
                    <div className="px-1.5 text-[9px] text-white font-medium truncate leading-[24px]">
                      {task.name}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
