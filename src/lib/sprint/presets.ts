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
import snowForest from "@/assets/presets/pexels-efrem-efre-2786187-34888244.jpg.asset.json";
import goldenPeak from "@/assets/presets/pexels-gsn-travel-28539583.jpg.asset.json";
import mistValley from "@/assets/presets/pexels-triemli-29034983.jpg.asset.json";
import starTrails from "@/assets/presets/pexels-instawally-169789.jpg.asset.json";
import crimsonShore from "@/assets/presets/pexels-tu-n-vu-2153773491-38214264.jpg.asset.json";
import pastelAlps from "@/assets/presets/pexels-marek-piwnicki-3907296-16339069.jpg.asset.json";
import duskSea from "@/assets/presets/pexels-wewe-yang-2383099-5116972.jpg.asset.json";
import autumnRoad from "@/assets/presets/pexels-taakill-5690519.jpg.asset.json";
import blueRidge from "@/assets/presets/pexels-dreamypixel-552784.jpg.asset.json";
import autumnCanopy from "@/assets/presets/pexels-markp-1671230.jpg.asset.json";
import starrySky from "@/assets/presets/pexels-dennisariel-7373530.jpg.asset.json";
import whiteBeach from "@/assets/presets/pexels-elly-mar-tamayor-939226503-34098196.jpg.asset.json";
import loneTree from "@/assets/presets/pexels-jplenio-1642770.jpg.asset.json";
import starfieldVideo from "@/assets/presets/starfield-loop.mp4.asset.json";
import starfieldPoster from "@/assets/presets/starfield-poster.jpg.asset.json";
import gradientSunset from "@/assets/presets/adrian-infernus-GLf7bAwCdYg-unsplash.jpg.asset.json";
import gradientCrimson from "@/assets/presets/codioful-formerly-gradienta-n2XqPm7Bqhk-unsplash.jpg.asset.json";
import gradientTeal from "@/assets/presets/luke-chesser-pJadQetzTkI-unsplash.jpg.asset.json";
import sunsetHorizon from "@/assets/presets/pexels-abdghat-1631677.jpg.asset.json";
import gradientViolet from "@/assets/presets/pexels-codioful-7135028.jpg.asset.json";
import lakeCanoe from "@/assets/presets/pexels-jplenio-2080960.jpg.asset.json";
import videoA from "@/assets/presets/11387730-hd_1920_1080_30fps.mp4.asset.json";
import videoAPoster from "@/assets/presets/11387730-hd_1920_1080_30fps-poster.jpg.asset.json";
import videoB from "@/assets/presets/185365-875417518_medium.mp4.asset.json";
import videoBPoster from "@/assets/presets/185365-875417518_medium-poster.jpg.asset.json";
import videoC from "@/assets/presets/8788-214200557_medium.mp4.asset.json";
import videoCPoster from "@/assets/presets/8788-214200557_medium-poster.jpg.asset.json";

export interface Preset {
  id: string;
  name: string;
  url: string;
  type?: "image" | "video";
  poster?: string;
  mime?: string;
}

export const PRESETS: Preset[] = [
  {
    id: "starfield-loop",
    name: "Starfield (Video)",
    url: starfieldVideo.url,
    type: "video",
    mime: "video/mp4",
    poster: starfieldPoster.url,
  },
  {
    id: "video-a",
    name: "Ambient Loop I",
    url: videoA.url,
    type: "video",
    mime: "video/mp4",
    poster: videoAPoster.url,
  },
  {
    id: "video-b",
    name: "Ambient Loop II",
    url: videoB.url,
    type: "video",
    mime: "video/mp4",
    poster: videoBPoster.url,
  },
  {
    id: "video-c",
    name: "Ambient Loop III",
    url: videoC.url,
    type: "video",
    mime: "video/mp4",
    poster: videoCPoster.url,
  },
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
  { id: "snow-forest", name: "Snow Forest", url: snowForest.url },
  { id: "golden-peak", name: "Golden Peak", url: goldenPeak.url },
  { id: "mist-valley", name: "Mist Valley", url: mistValley.url },
  { id: "star-trails", name: "Star Trails", url: starTrails.url },
  { id: "crimson-shore", name: "Crimson Shore", url: crimsonShore.url },
  { id: "pastel-alps", name: "Pastel Alps", url: pastelAlps.url },
  { id: "dusk-sea", name: "Dusk Sea", url: duskSea.url },
  { id: "autumn-road", name: "Autumn Road", url: autumnRoad.url },
  { id: "blue-ridge", name: "Blue Ridge", url: blueRidge.url },
  { id: "autumn-canopy", name: "Autumn Canopy", url: autumnCanopy.url },
  { id: "starry-sky", name: "Starry Sky", url: starrySky.url },
  { id: "white-beach", name: "White Beach", url: whiteBeach.url },
  { id: "lone-tree", name: "Lone Tree", url: loneTree.url },
  { id: "gradient-sunset", name: "Sunset Gradient", url: gradientSunset.url },
  { id: "gradient-crimson", name: "Crimson Gradient", url: gradientCrimson.url },
  { id: "gradient-teal", name: "Teal Gradient", url: gradientTeal.url },
  { id: "sunset-horizon", name: "Sunset Horizon", url: sunsetHorizon.url },
  { id: "gradient-violet", name: "Violet Gradient", url: gradientViolet.url },
  { id: "lake-canoe", name: "Lake Canoe", url: lakeCanoe.url },
];

export const presetById = (id: string | null) =>
  id ? PRESETS.find((p) => p.id === id) ?? null : null;

/* ---------------- Hidden presets (per user, localStorage) ---------------- */

const HIDDEN_KEY = "sprint.preset.hidden";
const HIDDEN_CHANGE = "sprint.preset.hidden.change";

export function getHiddenPresetIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HIDDEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function hidePreset(id: string) {
  if (typeof window === "undefined") return;
  const set = new Set(getHiddenPresetIds());
  set.add(id);
  window.localStorage.setItem(HIDDEN_KEY, JSON.stringify([...set]));
  window.dispatchEvent(new Event(HIDDEN_CHANGE));
}

export function restoreHiddenPresets() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(HIDDEN_KEY);
  window.dispatchEvent(new Event(HIDDEN_CHANGE));
}

export const HIDDEN_PRESETS_CHANGE_EVENT = HIDDEN_CHANGE;