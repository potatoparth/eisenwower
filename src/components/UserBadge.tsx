import { cn } from "@/lib/utils";
import { useUserProfile, type BadgeGradient } from "@/lib/userProfiles";

/**
 * Deterministic HSL color derived from a user id, so the same person always
 * gets the same badge color across the app.
 */
/**
 * Curated set of gradients (no orange/red-orange) used as the default badge
 * background when a user hasn't set their own color/gradient/avatar.
 */
const FALLBACK_GRADIENTS: { from: string; to: string; angle: number }[] = [
  { from: "#6366f1", to: "#8b5cf6", angle: 135 }, // indigo → violet
  { from: "#3b82f6", to: "#06b6d4", angle: 135 }, // blue → cyan
  { from: "#0ea5e9", to: "#22d3ee", angle: 135 }, // sky → cyan
  { from: "#8b5cf6", to: "#ec4899", angle: 135 }, // violet → pink
  { from: "#ec4899", to: "#a855f7", angle: 135 }, // pink → purple
  { from: "#14b8a6", to: "#22c55e", angle: 135 }, // teal → green
  { from: "#10b981", to: "#06b6d4", angle: 135 }, // emerald → cyan
  { from: "#22c55e", to: "#84cc16", angle: 135 }, // green → lime
  { from: "#0891b2", to: "#4f46e5", angle: 135 }, // cyan → indigo
  { from: "#7c3aed", to: "#2563eb", angle: 135 }, // purple → blue
  { from: "#db2777", to: "#7c3aed", angle: 135 }, // pink → purple deep
  { from: "#0d9488", to: "#4338ca", angle: 135 }, // teal → indigo
];

function gradientForUserId(id: string): { from: string; to: string; angle: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return FALLBACK_GRADIENTS[Math.abs(hash) % FALLBACK_GRADIENTS.length];
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
  const fallback = gradientForUserId(userId);
  const background = effGradient
    ? `linear-gradient(${effGradient.angle ?? 135}deg, ${effGradient.from}, ${effGradient.to})`
    : effColor
      ? effColor
      : `linear-gradient(${fallback.angle}deg, ${fallback.from}, ${fallback.to})`;
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
      style={{ background, color: "hsl(0, 0%, 100%)" }}
    >
      {initialFor(effName)}
    </span>
  );
}