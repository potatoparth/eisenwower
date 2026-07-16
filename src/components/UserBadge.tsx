import { cn } from "@/lib/utils";
import { useUserProfile, type BadgeGradient } from "@/lib/userProfiles";

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
  /** Override avatar (skips profile lookup). */
  avatarUrl?: string | null;
  /** Override solid badge color. */
  color?: string | null;
  /** Override gradient. */
  gradient?: BadgeGradient | null;
}

export function UserBadge({ userId, name, size = "xs", className, title, avatarUrl, color, gradient }: UserBadgeProps) {
  const profile = useUserProfile(userId);
  const effAvatar = avatarUrl ?? profile?.avatarSignedUrl ?? null;
  const effColor = color ?? profile?.badgeColor ?? null;
  const effGradient = gradient ?? profile?.badgeGradient ?? null;
  const effName = name ?? profile?.name;
  const hash = colorForUserId(userId);
  const background = effGradient
    ? `linear-gradient(${effGradient.angle ?? 135}deg, ${effGradient.from}, ${effGradient.to})`
    : (effColor || hash.bg);
  const sizing =
    size === "md" ? "w-6 h-6 text-[11px]" :
    size === "sm" ? "w-5 h-5 text-[10px]" :
                    "w-4 h-4 text-[9px]";
  const pxSize = size === "md" ? 24 : size === "sm" ? 20 : 16;
  if (effAvatar) {
    return (
      <img
        src={effAvatar}
        alt={effName || "User"}
        title={title ?? effName ?? "User"}
        width={pxSize}
        height={pxSize}
        className={cn("rounded-full object-cover flex-shrink-0", sizing, className)}
      />
    );
  }
  return (
    <span
      aria-label={effName || "User"}
      title={title ?? effName ?? "User"}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold leading-none select-none flex-shrink-0",
        sizing,
        className,
      )}
      style={{ background, color: hash.fg }}
    >
      {initialFor(effName)}
    </span>
  );
}