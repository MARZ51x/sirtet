import {
  DEFAULT_LOCAL_BEST,
  LOCAL_BEST_STORAGE_KEY,
  LocalBestSchema,
  SETTINGS_STORAGE_KEY,
  parseSettings,
  type LocalBest,
  type Settings,
} from "./schema";
import type { ModeId } from "@/game/core/types";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function loadLocalSettings(): Settings {
  const reduced = prefersReducedMotion();
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return parseSettings(undefined, reduced);
    return parseSettings(JSON.parse(raw), reduced);
  } catch {
    return parseSettings(undefined, reduced);
  }
}

export function saveLocalSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable — session-only settings
  }
}

/** Stamp the settings as freshly edited (drives the newest-wins merge). */
export function touch(settings: Settings): Settings {
  return {
    ...settings,
    meta: { ...settings.meta, updatedAt: new Date().toISOString() },
  };
}

// ---------- guest personal bests ----------

export function loadLocalBest(): LocalBest {
  try {
    const raw = localStorage.getItem(LOCAL_BEST_STORAGE_KEY);
    if (!raw) return DEFAULT_LOCAL_BEST;
    const parsed = LocalBestSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_LOCAL_BEST;
  } catch {
    return DEFAULT_LOCAL_BEST;
  }
}

/** Returns the updated record and whether this run set a new personal best. */
export function recordLocalBest(
  mode: ModeId,
  value: number,
): { best: LocalBest; isNewBest: boolean } {
  const best = loadLocalBest();
  const previous = best[mode];
  // sprint ranks by fastest time (lower is better); others by score
  const isNewBest =
    previous === null || (mode === "sprint" ? value < previous : value > previous);
  if (isNewBest) {
    const updated = { ...best, [mode]: value };
    try {
      localStorage.setItem(LOCAL_BEST_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    return { best: updated, isNewBest };
  }
  return { best, isNewBest };
}
