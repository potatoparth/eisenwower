import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/sprint/theme-store";

interface Props {
  className?: string;
  /** Override text color (e.g. when placed over a media background). */
  color?: string;
  /** Override border color. */
  borderColor?: string;
}

export function ThemeToggle({ className = "", color, borderColor }: Props) {
  const { theme, toggle } = useTheme();
  const style: React.CSSProperties = {};
  if (color) style.color = color;
  if (borderColor) style.borderColor = borderColor;
  return (
    <button
      onClick={toggle}
      style={style}
      className={`grid h-7 w-7 place-items-center rounded-full border ${
        borderColor ? "" : "border-[color:var(--sp-border)]"
      } ${color ? "" : "text-[color:var(--sp-muted-foreground)] hover:text-[color:var(--sp-foreground)]"} transition ${className}`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}
