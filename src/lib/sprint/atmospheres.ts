export type AtmosphereId = "midnight" | "warm" | "white" | "tactical";

export interface Atmosphere {
  id: AtmosphereId;
  name: string;
  tagline: string;
  swatch: string[];
  glow: string;
  glowSecondary: string;
  particleColor: string;
}

export const atmospheres: Atmosphere[] = [
  {
    id: "midnight",
    name: "Midnight Terminal",
    tagline: "Deep focus. Hacker energy.",
    swatch: ["#0a0e1a", "#1a2340", "#3b82f6", "#60a5fa"],
    glow: "rgba(59, 130, 246, 0.18)",
    glowSecondary: "rgba(96, 165, 250, 0.12)",
    particleColor: "rgba(100, 180, 255, 0.5)",
  },
  {
    id: "warm",
    name: "Warm Studio",
    tagline: "Late-night creative workspace.",
    swatch: ["#1a1208", "#3a2410", "#d97706", "#fbbf24"],
    glow: "rgba(217, 119, 6, 0.18)",
    glowSecondary: "rgba(251, 191, 36, 0.12)",
    particleColor: "rgba(251, 191, 36, 0.5)",
  },
  {
    id: "white",
    name: "White Space",
    tagline: "Zen minimal precision.",
    swatch: ["#fafafa", "#e5e5e5", "#737373", "#171717"],
    glow: "rgba(0, 0, 0, 0.04)",
    glowSecondary: "rgba(0, 0, 0, 0.03)",
    particleColor: "rgba(0, 0, 0, 0.25)",
  },
  {
    id: "tactical",
    name: "Tactical",
    tagline: "F1 telemetry. Mission control.",
    swatch: ["#0a0a0a", "#1f1611", "#ea580c", "#f97316"],
    glow: "rgba(234, 88, 12, 0.18)",
    glowSecondary: "rgba(249, 115, 22, 0.12)",
    particleColor: "rgba(249, 115, 22, 0.5)",
  },
];

export const atmosphereById = Object.fromEntries(
  atmospheres.map((a) => [a.id, a])
) as Record<AtmosphereId, Atmosphere>;

export const durations = [25, 45, 60, 90] as const;
export type Duration = (typeof durations)[number];
