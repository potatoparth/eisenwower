import { CalendarDays, CalendarRange, Eye, EyeOff, ArrowUpToLine, ArrowDownToLine } from "lucide-react";
import { cn } from "@/lib/utils";

export type DateFilter = "all" | "today" | "week";

interface FilterBarProps {
  dateFilter: DateFilter;
  onDateFilterChange: (f: DateFilter) => void;
  showOverdue: boolean;
  onShowOverdueChange: (v: boolean) => void;
  noDatePosition: "top" | "bottom";
  onNoDatePositionChange: (v: "top" | "bottom") => void;
  categories: string[];
  selectedCategories: string[];
  onSelectedCategoriesChange: (v: string[]) => void;
  getCategoryColor?: (name: string) => string | undefined;
}

export function FilterBar(p: FilterBarProps) {
  const Chip = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "px-3 h-7 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all border",
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-card text-muted-foreground border-border hover:text-foreground"
      )}
    >
      {children}
    </button>
  );

  const toggleCat = (c: string) => {
    if (p.selectedCategories.includes(c)) {
      p.onSelectedCategoriesChange(p.selectedCategories.filter((x) => x !== c));
    } else {
      p.onSelectedCategoriesChange([...p.selectedCategories, c]);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap py-2">
      <Chip active={p.dateFilter === "all"} onClick={() => p.onDateFilterChange("all")}>
        All
      </Chip>
      <Chip active={p.dateFilter === "today"} onClick={() => p.onDateFilterChange("today")}>
        <CalendarDays className="w-3 h-3" /> Today
      </Chip>
      <Chip active={p.dateFilter === "week"} onClick={() => p.onDateFilterChange("week")}>
        <CalendarRange className="w-3 h-3" /> This week
      </Chip>

      <div className="w-px h-5 bg-border mx-1" />

      <Chip
        active={p.showOverdue}
        onClick={() => p.onShowOverdueChange(!p.showOverdue)}
      >
        {p.showOverdue ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        {p.showOverdue ? "Show overdue" : "Hide overdue"}
      </Chip>

      <Chip
        active={p.noDatePosition === "top"}
        onClick={() =>
          p.onNoDatePositionChange(p.noDatePosition === "top" ? "bottom" : "top")
        }
      >
        {p.noDatePosition === "top" ? (
          <ArrowUpToLine className="w-3 h-3" />
        ) : (
          <ArrowDownToLine className="w-3 h-3" />
        )}
        No-date {p.noDatePosition}
      </Chip>

      {p.categories.length > 0 && (
        <>
          <div className="w-px h-5 bg-border mx-1" />
          {p.categories.map((c) => {
            const color = p.getCategoryColor?.(c);
            const active = p.selectedCategories.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleCat(c)}
                className={cn(
                  "px-2.5 h-7 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all border",
                  active
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {color && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                )}
                {c}
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}