import { useState, useEffect, useCallback } from "react";
import { AppSettings, DEFAULT_SETTINGS, DEFAULT_QUADRANT_ACCENTS } from "@/types/settings";
import { Quadrant, DEFAULT_QUADRANT_LABELS } from "@/types/task";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const SETTINGS_KEY = "eisenhower-settings";
const ACCENTS_LIGHT_KEY = "quadrant_colors_light";
const ACCENTS_DARK_KEY = "quadrant_colors_dark";

type ThemeMode = "light" | "dark";

const currentTheme = (): ThemeMode =>
  typeof document !== "undefined" && document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";

const loadAccents = (mode: ThemeMode) => {
  try {
    const raw = localStorage.getItem(mode === "dark" ? ACCENTS_DARK_KEY : ACCENTS_LIGHT_KEY);
    if (!raw) return { ...DEFAULT_QUADRANT_ACCENTS[mode] };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_QUADRANT_ACCENTS[mode], ...parsed };
  } catch {
    return { ...DEFAULT_QUADRANT_ACCENTS[mode] };
  }
};

const saveAccents = (mode: ThemeMode, accents: Record<1|2|3|4, string>) => {
  localStorage.setItem(
    mode === "dark" ? ACCENTS_DARK_KEY : ACCENTS_LIGHT_KEY,
    JSON.stringify(accents)
  );
};

const mergeSettings = (partial: Partial<AppSettings>): AppSettings => {
  const merged: AppSettings = { ...DEFAULT_SETTINGS, ...partial };
  merged.quadrantLabels = { ...DEFAULT_QUADRANT_LABELS };
  (Object.keys(DEFAULT_QUADRANT_LABELS) as Quadrant[]).forEach((id) => {
    merged.quadrantLabels[id] = {
      ...DEFAULT_QUADRANT_LABELS[id],
      ...partial.quadrantLabels?.[id],
    };
  });
  // Always merge accents from localStorage (per-theme bucket is the source of truth)
  merged.quadrantAccents = {
    light: loadAccents("light"),
    dark: loadAccents("dark"),
  };
  return merged;
};

const loadSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return mergeSettings(JSON.parse(stored));
    }
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// Convert hex to HSL string for CSS variables
function hexToHSL(hex: string): string {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function accentToForeground(accent: string): string {
  const hex = accent.replace("#", "");
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  l = 0.2;
  s = Math.min(s, 0.85);

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function applyQuadrantColors(settings: AppSettings) {
  const root = document.documentElement;
  // Apply quadrant tint alpha (0..30 -> 0..0.30)
  const tint = Math.max(0, Math.min(30, settings.quadrantTintIntensity ?? 10)) / 100;
  root.style.setProperty("--quadrant-tint-alpha", String(tint));

  // Apply global primary color (buttons, links, rings)
  const primary = settings.primaryColor;
  if (primary) {
    const hsl = hexToHSL(primary);
    // Derived tokens
    const parts = hsl.split(" "); // "H S% L%"
    const h = parts[0];
    const s = parts[1];
    const l = parseInt((parts[2] || "50%").replace("%", ""), 10);
    const accentBgLight = `${h} ${s} 95%`;
    const accentFgLight = `${h} ${s} 35%`;
    const accentBgDark = `${h} ${s} 20%`;
    const accentFgDark = `${h} ${s} 80%`;
    const isDark = document.documentElement.classList.contains("dark");
    const accentBg = isDark ? accentBgDark : accentBgLight;
    const accentFg = isDark ? accentFgDark : accentFgLight;
    const primaryGlow = `${h} ${s} ${Math.min(l + 15, 90)}%`;
    const primaryForeground = l > 60 ? "0 0% 8%" : "0 0% 100%";

    root.style.setProperty("--primary", hsl);
    root.style.setProperty("--primary-foreground", primaryForeground);
    root.style.setProperty("--primary-glow", primaryGlow);
    root.style.setProperty("--ring", hsl);
    root.style.setProperty("--accent", accentBg);
    root.style.setProperty("--accent-foreground", accentFg);
    root.style.setProperty("--sidebar-primary", hsl);
    root.style.setProperty("--sidebar-primary-foreground", primaryForeground);
    root.style.setProperty("--sidebar-ring", hsl);
    root.style.setProperty("--sidebar-accent", accentBg);
    root.style.setProperty("--sidebar-accent-foreground", accentFg);
    // Sprint scope
    root.style.setProperty("--sp-ring", `hsl(${hsl})`);
    root.style.setProperty("--sp-accent-glow", `hsla(${h}, ${s}, ${l}%, 0.18)`);
  } else {
    root.style.removeProperty("--primary");
    root.style.removeProperty("--primary-foreground");
    root.style.removeProperty("--primary-glow");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-foreground");
    root.style.removeProperty("--sidebar-primary");
    root.style.removeProperty("--sidebar-primary-foreground");
    root.style.removeProperty("--sidebar-ring");
    root.style.removeProperty("--sidebar-accent");
    root.style.removeProperty("--sidebar-accent-foreground");
    root.style.removeProperty("--sp-ring");
    root.style.removeProperty("--sp-accent-glow");
  }

  // Apply per-theme accent overrides
  const mode = currentTheme();
  const accents = settings.quadrantAccents?.[mode] ?? DEFAULT_QUADRANT_ACCENTS[mode];
  const defaults = DEFAULT_QUADRANT_ACCENTS[mode];
  ([1, 2, 3, 4] as const).forEach((n) => {
    const accent = accents[n] || defaults[n];
    const isDefault = accent.toLowerCase() === defaults[n].toLowerCase();
    if (isDefault) {
      root.style.removeProperty(`--quadrant-${n}`);
      root.style.removeProperty(`--quadrant-${n}-border`);
      root.style.removeProperty(`--quadrant-${n}-foreground`);
      root.style.removeProperty(`--quadrant-${n}-badge`);
    } else {
      const hsl = hexToHSL(accent);
      root.style.setProperty(`--quadrant-${n}`, hsl);
      root.style.setProperty(`--quadrant-${n}-border`, hsl);
      root.style.setProperty(`--quadrant-${n}-foreground`, hsl);
    }
  });
}

export function useSettings(userId?: string) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHasLoaded(false);

    if (!userId) {
      setSettings(loadSettings());
      setHasLoaded(true);
      return;
    }

    supabase.from("app_settings").select("settings").eq("user_id", userId).maybeSingle().then(({ data }) => {
      if (cancelled) return;
      const cloudSettings = data?.settings as Partial<AppSettings> | undefined;
      setSettings(cloudSettings ? mergeSettings(cloudSettings) : DEFAULT_SETTINGS);
      setHasLoaded(true);
    });

    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    saveSettings(settings);
    if (userId && hasLoaded) {
      supabase.from("app_settings").upsert({ user_id: userId, settings: settings as unknown as Json }, { onConflict: "user_id" }).then(() => undefined);
    }
    applyQuadrantColors(settings);
  }, [settings, userId, hasLoaded]);

  // Apply on mount + reapply whenever the theme class on <html> changes
  useEffect(() => {
    applyQuadrantColors(settings);
    const observer = new MutationObserver(() => applyQuadrantColors(settings));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const updateQuadrantColor = useCallback((quadrant: 1 | 2 | 3 | 4, colors: Partial<AppSettings["quadrantColors"][1]>) => {
    setSettings(prev => ({
      ...prev,
      quadrantColors: {
        ...prev.quadrantColors,
        [quadrant]: { ...prev.quadrantColors[quadrant], ...colors },
      },
    }));
  }, []);

  const updateQuadrantAccent = useCallback(
    (quadrant: 1 | 2 | 3 | 4, accent: string, mode?: ThemeMode) => {
      const themeMode = mode ?? currentTheme();
      setSettings(prev => {
        const prevAccents = prev.quadrantAccents ?? {
          light: { ...DEFAULT_QUADRANT_ACCENTS.light },
          dark: { ...DEFAULT_QUADRANT_ACCENTS.dark },
        };
        const nextForMode = { ...prevAccents[themeMode], [quadrant]: accent };
        saveAccents(themeMode, nextForMode);
        const foreground = accentToForeground(accent);
        return {
          ...prev,
          quadrantAccents: { ...prevAccents, [themeMode]: nextForMode },
          // Keep legacy field roughly in sync so other code that reads it still works.
          quadrantColors: {
            ...prev.quadrantColors,
            [quadrant]: {
              main: accent,
              light: accent,
              border: accent,
              foreground,
            },
          },
        };
      });
    },
    []
  );

  const addCategoryColor = useCallback((name: string, color: string) => {
    setSettings(prev => ({
      ...prev,
      categoryColors: [...prev.categoryColors.filter(c => c.name !== name), { name, color }],
    }));
  }, []);

  const removeCategoryColor = useCallback((name: string) => {
    setSettings(prev => ({
      ...prev,
      categoryColors: prev.categoryColors.filter(c => c.name !== name),
    }));
  }, []);

  const getCategoryColor = useCallback((name: string): string | undefined => {
    if (!settings.colorCodingEnabled) return undefined;
    return settings.categoryColors.find(c => c.name === name)?.color;
  }, [settings.categoryColors, settings.colorCodingEnabled]);

  const updateQuadrantLabel = useCallback((quadrant: Quadrant, label: Partial<{ title: string; subtitle: string }>) => {
    setSettings(prev => ({
      ...prev,
      quadrantLabels: {
        ...prev.quadrantLabels,
        [quadrant]: { ...prev.quadrantLabels[quadrant], ...label },
      },
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    updateQuadrantColor,
    updateQuadrantAccent,
    addCategoryColor,
    removeCategoryColor,
    updateQuadrantLabel,
    getCategoryColor,
    resetToDefaults,
  };
}
