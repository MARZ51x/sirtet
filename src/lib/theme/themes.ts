// Theme system: every theme — preset or custom — is a flat ThemeTokens record.
// applyTheme() writes them as `--st-*` custom properties on <html>.

export interface ThemeTokens {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  onAccent: string;
  danger: string;
  boardBg: string;
  boardGrid: string;
  pieceI: string;
  pieceO: string;
  pieceT: string;
  pieceS: string;
  pieceZ: string;
  pieceJ: string;
  pieceL: string;
  /** rgba() — includes alpha */
  ghost: string;
  /** effects color: particles, flashes, popups, glow */
  glow: string;
}

export type ThemeTokenKey = keyof ThemeTokens;

export const CSS_VAR_BY_TOKEN: Record<ThemeTokenKey, string> = {
  bg: "--st-bg",
  surface: "--st-surface",
  surface2: "--st-surface-2",
  border: "--st-border",
  text: "--st-text",
  textMuted: "--st-text-muted",
  accent: "--st-accent",
  onAccent: "--st-on-accent",
  danger: "--st-danger",
  boardBg: "--st-board-bg",
  boardGrid: "--st-board-grid",
  pieceI: "--st-piece-i",
  pieceO: "--st-piece-o",
  pieceT: "--st-piece-t",
  pieceS: "--st-piece-s",
  pieceZ: "--st-piece-z",
  pieceJ: "--st-piece-j",
  pieceL: "--st-piece-l",
  ghost: "--st-ghost",
  glow: "--st-glow",
};

export const PRESET_IDS = [
  "midnight-neon",
  "retro-arcade",
  "synthwave",
  "deep-ocean",
  "forest",
  "paper-light",
  "charcoal",
  "high-contrast",
] as const;
export type PresetId = (typeof PRESET_IDS)[number];
export const DEFAULT_PRESET: PresetId = "midnight-neon";

export const PRESET_LABELS: Record<PresetId, string> = {
  "midnight-neon": "Midnight Neon",
  "retro-arcade": "Retro Arcade",
  synthwave: "Synthwave",
  "deep-ocean": "Deep Ocean",
  forest: "Forest",
  "paper-light": "Paper Light",
  charcoal: "Charcoal",
  "high-contrast": "High Contrast",
};

export const PRESETS: Record<PresetId, ThemeTokens> = {
  "midnight-neon": {
    bg: "#0B0F1A",
    surface: "#131A2B",
    surface2: "#1B2438",
    border: "#26314D",
    text: "#E8ECF8",
    textMuted: "#8B94AD",
    accent: "#22D3EE",
    onAccent: "#06121A",
    danger: "#F43F5E",
    boardBg: "#0D1322",
    boardGrid: "#1E2A44",
    pieceI: "#22D3EE",
    pieceO: "#FACC15",
    pieceT: "#C084FC",
    pieceS: "#4ADE80",
    pieceZ: "#F43F5E",
    pieceJ: "#60A5FA",
    pieceL: "#FB923C",
    ghost: "rgba(232,236,248,.22)",
    glow: "#22D3EE",
  },
  "retro-arcade": {
    bg: "#101010",
    surface: "#1A1A1A",
    surface2: "#242424",
    border: "#333333",
    text: "#F5F5F0",
    textMuted: "#9A9A90",
    accent: "#FFD400",
    onAccent: "#141400",
    danger: "#FF3B30",
    boardBg: "#0A0A0A",
    boardGrid: "#262626",
    pieceI: "#00E0E0",
    pieceO: "#F8D000",
    pieceT: "#A845E8",
    pieceS: "#30D830",
    pieceZ: "#E83030",
    pieceJ: "#3050E8",
    pieceL: "#F88000",
    ghost: "rgba(245,245,240,.22)",
    glow: "#FFD400",
  },
  synthwave: {
    bg: "#1A0533",
    surface: "#240A45",
    surface2: "#2F1158",
    border: "#45207A",
    text: "#F8E7FF",
    textMuted: "#A98BC9",
    accent: "#FF3EA5",
    onAccent: "#2B0117",
    danger: "#FF5470",
    boardBg: "#12041F",
    boardGrid: "#331360",
    pieceI: "#00F0FF",
    pieceO: "#FFD319",
    pieceT: "#FF3EA5",
    pieceS: "#72F1B8",
    pieceZ: "#FE4450",
    pieceJ: "#7B61FF",
    pieceL: "#FF8E42",
    ghost: "rgba(248,231,255,.22)",
    glow: "#FF3EA5",
  },
  "deep-ocean": {
    bg: "#04121F",
    surface: "#0A1E30",
    surface2: "#10293F",
    border: "#1B3A55",
    text: "#DCEBF5",
    textMuted: "#7C99AE",
    accent: "#38BDF8",
    onAccent: "#04121F",
    danger: "#F87171",
    boardBg: "#03101C",
    boardGrid: "#14304A",
    pieceI: "#4DD8E6",
    pieceO: "#F5D061",
    pieceT: "#9F8CF5",
    pieceS: "#4AC796",
    pieceZ: "#E86A6A",
    pieceJ: "#5B8DEF",
    pieceL: "#E89B4A",
    ghost: "rgba(220,235,245,.22)",
    glow: "#38BDF8",
  },
  forest: {
    bg: "#0C1510",
    surface: "#14231A",
    surface2: "#1C3024",
    border: "#2A4534",
    text: "#E4EFE4",
    textMuted: "#8CA893",
    accent: "#A3E635",
    onAccent: "#15230A",
    danger: "#E86A5E",
    boardBg: "#0A120D",
    boardGrid: "#22392B",
    pieceI: "#6FD8C2",
    pieceO: "#E8C84C",
    pieceT: "#B58CE0",
    pieceS: "#7BC96F",
    pieceZ: "#D96C5B",
    pieceJ: "#5C9CD6",
    pieceL: "#D69A4E",
    ghost: "rgba(228,239,228,.22)",
    glow: "#A3E635",
  },
  "paper-light": {
    bg: "#F6F3EC",
    surface: "#FFFFFF",
    surface2: "#FFFFFF",
    border: "#E0DACC",
    text: "#2B2A26",
    textMuted: "#6F6B60",
    accent: "#C2571B",
    onAccent: "#FFF8F0",
    danger: "#C23B2E",
    boardBg: "#FBF9F4",
    boardGrid: "#E7E1D3",
    pieceI: "#0E7490",
    pieceO: "#B45309",
    pieceT: "#7C3AED",
    pieceS: "#15803D",
    pieceZ: "#BE123C",
    pieceJ: "#1D4ED8",
    pieceL: "#C2410C",
    ghost: "rgba(43,42,38,.28)",
    glow: "#C2571B",
  },
  charcoal: {
    bg: "#17181A",
    surface: "#202124",
    surface2: "#292A2E",
    border: "#37383D",
    text: "#E4E5E7",
    textMuted: "#8E9095",
    accent: "#8AB4F8",
    onAccent: "#101318",
    danger: "#E07070",
    boardBg: "#1B1C1F",
    boardGrid: "#2C2D31",
    pieceI: "#7FBFC9",
    pieceO: "#C9B87F",
    pieceT: "#A98FC0",
    pieceS: "#8FB98F",
    pieceZ: "#C08585",
    pieceJ: "#8595C0",
    pieceL: "#C0A075",
    ghost: "rgba(228,229,231,.20)",
    glow: "#8AB4F8",
  },
  "high-contrast": {
    bg: "#000000",
    surface: "#0D0D0D",
    surface2: "#1A1A1A",
    border: "#E6E6E6",
    text: "#FFFFFF",
    textMuted: "#C0C0C0",
    accent: "#FFFF00",
    onAccent: "#000000",
    danger: "#FF4040",
    boardBg: "#000000",
    boardGrid: "#4D4D4D",
    pieceI: "#00FFFF",
    pieceO: "#FFFF00",
    pieceT: "#FF00FF",
    pieceS: "#00FF00",
    pieceZ: "#FF3333",
    pieceJ: "#3399FF",
    pieceL: "#FF9900",
    ghost: "rgba(255,255,255,.60)",
    glow: "#FFFFFF",
  },
};

export function isPresetId(value: unknown): value is PresetId {
  return typeof value === "string" && (PRESET_IDS as readonly string[]).includes(value);
}

/** Last-applied tokens, cached so the pre-paint script can restore them before hydration. */
export const THEME_CACHE_KEY = "sirtet:theme-cache:v1";

/** Writes the tokens as inline --st-* custom properties on <html> and caches them. */
export function applyTheme(tokens: ThemeTokens): void {
  const root = document.documentElement;
  for (const key of Object.keys(CSS_VAR_BY_TOKEN) as ThemeTokenKey[]) {
    root.style.setProperty(CSS_VAR_BY_TOKEN[key], tokens[key]);
  }
  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(tokens));
  } catch {
    // storage full/unavailable — cosmetic only
  }
}

/**
 * Inline <script> for the root layout: re-applies the cached theme before
 * first paint so a non-default theme doesn't flash. Rendered with
 * dangerouslySetInnerHTML + suppressHydrationWarning on <html>.
 */
export const PRE_PAINT_SNIPPET = `(function(){try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(
  THEME_CACHE_KEY,
)}));if(!t)return;var m=${JSON.stringify(
  CSS_VAR_BY_TOKEN,
)};for(var k in m){if(typeof t[k]==="string")document.documentElement.style.setProperty(m[k],t[k])}}catch(e){}})()`;

export function resolveTheme(
  mode: "preset" | "custom",
  presetId: PresetId,
  customTokens: ThemeTokens | null,
): ThemeTokens {
  if (mode === "custom" && customTokens) return customTokens;
  return PRESETS[presetId] ?? PRESETS[DEFAULT_PRESET];
}

// ---------- contrast helpers (WCAG relative luminance) ----------

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function contrastRatio(hexA: string, hexB: string): number | null {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return null;
  const lum = ([r, g, bl]: [number, number, number]) =>
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(bl);
  const l1 = lum(a);
  const l2 = lum(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
