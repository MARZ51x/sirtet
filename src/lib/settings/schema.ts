import { z } from "zod";
import {
  DEFAULT_PRESET,
  PRESET_IDS,
  type PresetId,
  type ThemeTokens,
} from "@/lib/theme/themes";

// One version-stamped settings object. Always persisted to localStorage
// (sirtet:settings:v1); mirrored to Supabase user_settings.data when signed in.
// Merge rule on login: newest-wins whole-object via meta.updatedAt, except the
// server's `background` sub-object is preserved when a guest-local object wins.

export const SETTINGS_STORAGE_KEY = "sirtet:settings:v1";
export const LOCAL_BEST_STORAGE_KEY = "sirtet:localbest:v1";

/** Actions bindable in the controls UI ('pause' is shell-level, not an engine action). */
export const BINDABLE_ACTIONS = [
  "moveLeft",
  "moveRight",
  "softDrop",
  "hardDrop",
  "rotateCw",
  "rotateCcw",
  "hold",
  "pause",
] as const;
export type BindableAction = (typeof BINDABLE_ACTIONS)[number];

export const ACTION_LABELS: Record<BindableAction, string> = {
  moveLeft: "Move left",
  moveRight: "Move right",
  softDrop: "Soft drop",
  hardDrop: "Hard drop",
  rotateCw: "Rotate clockwise",
  rotateCcw: "Rotate counter-clockwise",
  hold: "Hold",
  pause: "Pause",
};

/** KeyboardEvent.code values (layout-independent). */
export const DEFAULT_KEY_BINDINGS: Record<BindableAction, string[]> = {
  moveLeft: ["ArrowLeft"],
  moveRight: ["ArrowRight"],
  softDrop: ["ArrowDown"],
  hardDrop: ["Space"],
  rotateCw: ["ArrowUp", "KeyX"],
  rotateCcw: ["KeyZ", "ControlLeft"],
  hold: ["KeyC", "ShiftLeft"],
  pause: ["Escape", "KeyP"],
};

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const rgbaOrHex = z
  .string()
  .max(64)
  .regex(/^(#[0-9a-fA-F]{6,8}|rgba?\([\d\s.,%]+\))$/);

export const ThemeTokensSchema = z.object({
  bg: hexColor,
  surface: hexColor,
  surface2: hexColor,
  border: hexColor,
  text: hexColor,
  textMuted: hexColor,
  accent: hexColor,
  onAccent: hexColor,
  danger: hexColor,
  boardBg: hexColor,
  boardGrid: hexColor,
  pieceI: hexColor,
  pieceO: hexColor,
  pieceT: hexColor,
  pieceS: hexColor,
  pieceZ: hexColor,
  pieceJ: hexColor,
  pieceL: hexColor,
  ghost: rgbaOrHex,
  glow: hexColor,
}) satisfies z.ZodType<ThemeTokens>;

export const SettingsSchema = z.object({
  version: z.literal(1),
  theme: z.object({
    mode: z.enum(["preset", "custom"]),
    presetId: z.enum(PRESET_IDS),
    customTokens: ThemeTokensSchema.nullable(),
  }),
  background: z.object({
    enabled: z.boolean(),
    /** storage object path inside the backgrounds bucket, e.g. "<uid>/bg-123.webp" */
    path: z.string().max(200).nullable(),
    /** dim overlay 0–90 (%) */
    dim: z.number().min(0).max(90),
    /** blur 0–20 (px) */
    blur: z.number().min(0).max(20),
  }),
  audio: z.object({
    /** master volume 0–100; perceptual gain = (v/100)^2 * 0.9 */
    master: z.number().min(0).max(100),
    muted: z.boolean(),
  }),
  effects: z.object({
    /** visual flare 0–100 (see fx gate table) */
    intensity: z.number().min(0).max(100),
    /** user explicitly allowed motion despite prefers-reduced-motion */
    allowMotionOverride: z.boolean(),
  }),
  gameplay: z.object({
    ghost: z.boolean(),
    /** DAS in ms, 67–333 */
    das: z.number().min(67).max(333),
    /** ARR in ms, 0–83 */
    arr: z.number().min(0).max(83),
  }),
  keyBindings: z.record(z.enum(BINDABLE_ACTIONS), z.array(z.string().max(32)).max(3)),
  accessibility: z.object({
    touchButtons: z.boolean(),
  }),
  meta: z.object({
    seenTutorial: z.boolean(),
    /** ISO timestamp of last local edit — drives the newest-wins merge */
    updatedAt: z.string(),
  }),
});

export type Settings = z.infer<typeof SettingsSchema>;

export function defaultSettings(reducedMotion = false): Settings {
  return {
    version: 1,
    theme: {
      mode: "preset",
      presetId: DEFAULT_PRESET as PresetId,
      customTokens: null,
    },
    background: { enabled: false, path: null, dim: 55, blur: 6 },
    audio: { master: 70, muted: false },
    effects: {
      intensity: reducedMotion ? 15 : 70,
      allowMotionOverride: false,
    },
    gameplay: { ghost: true, das: 167, arr: 33 },
    keyBindings: { ...DEFAULT_KEY_BINDINGS },
    accessibility: { touchButtons: true },
    meta: { seenTutorial: false, updatedAt: new Date(0).toISOString() },
  };
}

/** Zod-parse anything (localStorage, Supabase jsonb); falls back to defaults on failure. */
export function parseSettings(raw: unknown, reducedMotion = false): Settings {
  const result = SettingsSchema.safeParse(raw);
  if (result.success) return result.data;
  return defaultSettings(reducedMotion);
}

export const LocalBestSchema = z.object({
  marathon: z.number().int().min(0).nullable(),
  /** sprint best = fastest duration in ms */
  sprint: z.number().int().min(0).nullable(),
  ultra: z.number().int().min(0).nullable(),
});
export type LocalBest = z.infer<typeof LocalBestSchema>;
export const DEFAULT_LOCAL_BEST: LocalBest = {
  marathon: null,
  sprint: null,
  ultra: null,
};
