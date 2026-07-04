import { cn } from "@/lib/utils";

/**
 * Horizontal scrollable chip strip for "recent" categories/projects.
 * Mobile-friendly: snap-x, hidden scrollbars, shrink-0 chips.
 */
export function RecentChipStrip({
  items,
  value,
  onSelect,
  ariaLabel,
}: {
  items: { value: string; label: string }[];
  value: string;
  onSelect: (v: string) => void;
  ariaLabel: string;
}) {
  if (items.length === 0) return null;
  return (
    <div
      role="listbox"
      aria-label={ariaLabel}
      className="-mx-1 flex items-center gap-1.5 overflow-x-auto scroll-smooth px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x"
    >
      {items.map((it) => {
        const active = value === it.value;
        return (
          <button
            key={it.value}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onSelect(it.value)}
            className={cn(
              "shrink-0 snap-start rounded-full border px-2.5 py-1 text-[11px] leading-none transition-colors max-w-[9rem] truncate",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/40 border-border/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
            title={it.label}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}