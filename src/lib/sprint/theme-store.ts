import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

/**
 * Sprint's theme hook, adapted to piggy-back on the app-wide dark mode
 * (managed by Header via the `.dark` class on <html>). Keeps the sprint UI
 * in sync with the rest of the app so users see one consistent theme.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const sync = () =>
      setThemeState(el.classList.contains("dark") ? "dark" : "light");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const toggle = () => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const isDark = el.classList.contains("dark");
    if (isDark) {
      el.classList.remove("dark");
      try { localStorage.setItem("theme", "light"); } catch { /* ignore */ }
    } else {
      el.classList.add("dark");
      try { localStorage.setItem("theme", "dark"); } catch { /* ignore */ }
    }
  };

  return { theme, toggle };
}

// Legacy no-op exports (kept for parity with the original module signature).
export function loadTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
export function applyTheme(_t: Theme) { /* no-op: app manages the class */ }