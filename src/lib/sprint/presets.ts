import mountains from "@/assets/presets/pexels-jplenio-4466993.jpg.asset.json";
import aurora from "@/assets/presets/pexels-frank-cone-140140-23938388.jpg.asset.json";
import forest from "@/assets/presets/pexels-manfred-langpap-493471790-16386966.jpg.asset.json";
import nebulaOrange from "@/assets/presets/pexels-marek-pavlik-1929759405-37269527.jpg.asset.json";
import milkyBlue from "@/assets/presets/pexels-xing-zhao-260666386-12641707.jpg.asset.json";
import milkyPastel from "@/assets/presets/pexels-moments-11738628.jpg.asset.json";
import nebulaBlue from "@/assets/presets/pexels-marek-pavlik-1929759405-37269528.jpg.asset.json";
import cosmicMist from "@/assets/presets/pexels-enginakyurt-6138036.jpg.asset.json";
import galaxyCore from "@/assets/presets/pexels-incrediblerafa-4737522.jpg.asset.json";
import auroraGreen from "@/assets/presets/pexels-aedrian-28920480.jpg.asset.json";

export interface Preset {
  id: string;
  name: string;
  url: string;
}

export const PRESETS: Preset[] = [
  { id: "mountains", name: "Alpine Night", url: mountains.url },
  { id: "aurora", name: "Aurora Burst", url: aurora.url },
  { id: "forest", name: "Starlit Forest", url: forest.url },
  { id: "nebula-orange", name: "Ember Nebula", url: nebulaOrange.url },
  { id: "milky-blue", name: "Milky Way", url: milkyBlue.url },
  { id: "milky-pastel", name: "Pastel Cosmos", url: milkyPastel.url },
  { id: "nebula-blue", name: "Sapphire Nebula", url: nebulaBlue.url },
  { id: "cosmic-mist", name: "Cosmic Mist", url: cosmicMist.url },
  { id: "galaxy-core", name: "Galactic Core", url: galaxyCore.url },
  { id: "aurora-green", name: "Northern Lights", url: auroraGreen.url },
];

export const presetById = (id: string | null) =>
  id ? PRESETS.find((p) => p.id === id) ?? null : null;