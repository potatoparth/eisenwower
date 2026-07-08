import { CheckCheck, MousePointerSquareDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSelection } from "@/hooks/useSelection";
import { cn } from "@/lib/utils";

interface Props {
  /** IDs of the items currently visible in this view, used by "Select all". */
  getAllIds: () => string[];
  /** Compact spacing (used in dense toolbars). */
  compact?: boolean;
  className?: string;
}

/**
 * Two-button group: toggle Select mode + Select all visible.
 * Icons are intentionally distinct so their purpose is obvious:
 *   - MousePointerSquareDashed → "enter / exit select mode"
 *   - CheckCheck               → "select all visible"
 */
export function SelectionToolbar({ getAllIds, compact, className }: Props) {
  const { selectMode, toggleSelectMode, setSelectMode, selectMany, clear, count } = useSelection();
  const size = compact ? "h-8 w-8" : "h-9 w-9";

  const handleSelectAll = () => {
    const ids = getAllIds();
    if (!selectMode) setSelectMode(true);
    if (ids.length === 0) return;
    // If everything visible is already selected, treat the button as "clear".
    const allSelected = ids.every((id) => count > 0) && ids.length === count;
    if (allSelected) clear();
    else selectMany(ids);
  };

  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      <Button
        variant={selectMode ? "default" : "ghost"}
        size="icon"
        onClick={toggleSelectMode}
        className={cn("rounded-lg relative", size)}
        title={selectMode ? "Exit select mode" : "Select items"}
        aria-pressed={selectMode}
      >
        <MousePointerSquareDashed className="w-4 h-4" />
        {selectMode && count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-[10px] font-semibold text-primary-foreground flex items-center justify-center border border-background">
            {count}
          </span>
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSelectAll}
        className={cn("rounded-lg", size)}
        title="Select all visible"
      >
        <CheckCheck className="w-4 h-4" />
      </Button>
    </div>
  );
}