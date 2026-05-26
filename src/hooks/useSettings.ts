import { useState, useEffect, useCallback } from "react";
import { AppSettings, DEFAULT_SETTINGS } from "@/types/settings";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const SETTINGS_KEY = "eisenhower-settings";

const loadSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
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

function applyQuadrantColors(settings: AppSettings) {
  const root = document.documentElement;
  for (const key of [1, 2, 3, 4] as const) {
    const colors = settings.quadrantColors[key];
    root.style.setProperty(`--quadrant-${key}`, hexToHSL(colors.main));
    root.style.setProperty(`--quadrant-${key}-light`, hexToHSL(colors.light));
    root.style.setProperty(`--quadrant-${key}-border`, hexToHSL(colors.border));
    root.style.setProperty(`--quadrant-${key}-foreground`, hexToHSL(colors.foreground));
  }
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
      setSettings(cloudSettings ? { ...DEFAULT_SETTINGS, ...cloudSettings } : DEFAULT_SETTINGS);
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

  // Apply on mount
  useEffect(() => {
    applyQuadrantColors(settings);
  }, []);

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

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    updateQuadrantColor,
    addCategoryColor,
    removeCategoryColor,
    getCategoryColor,
    resetToDefaults,
  };
}
