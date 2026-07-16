import { cn } from "@/lib/utils";

/**
 * Deterministic HSL color derived from a user id, so the same person always
 * gets the same badge color across the app.
 */
function colorForUserId(id: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue}, 70%, 45%)`,
    fg: "hsl(0, 0%, 100%)",
  };
}

function initialFor(name?: string): string {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  // First letter of first word, uppercased.
  return trimmed.charAt(0).toUpperCase();
}

interface UserBadgeProps {
  userId: string;
  name?: string;
  size?: "xs" | "sm" | "md";
  className?: string;
  title?: string;
}

export function UserBadge({ userId, name, size = "xs", className, title }: UserBadgeProps) {
  const { bg, fg } = colorForUserId(userId);
  const sizing =
    size === "md" ? "w-6 h-6 text-[11px]" :
    size === "sm" ? "w-5 h-5 text-[10px]" :
                    "w-4 h-4 text-[9px]";
  return (
    <span
      aria-label={name || "User"}
      title={title ?? name ?? "User"}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold leading-none select-none flex-shrink-0",
        sizing,
        className,
      )}
      style={{ backgroundColor: bg, color: fg }}
    >
      {initialFor(name)}
    </span>
  );
}