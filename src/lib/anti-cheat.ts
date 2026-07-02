import "server-only";
import type { ModeId } from "@/game/core/types";

// All plausibility constants and formulas live here so they can be tuned in
// one place. Soft flags run in SHADOW MODE at launch (logged, not rejected);
// hard failures always reject. See the plan's "Anti-cheat v1" decision.

export const SCORE_HARD_CAPS = {
  score: 9_999_999,
  lines: 10_000,
  level: 30,
  durationMs: 21_600_000, // 6h
} as const;

/** ms of grace between claimed play time and wall-clock token age */
export const WALL_CLOCK_GRACE_MS = 5_000;
/** faster than this per piece is beyond world-class human speed */
export const MIN_MS_PER_PIECE = 150;
export const MIN_GAME_MS = 10_000;

export interface ScoreStats {
  mode: ModeId;
  score: number;
  lines: number;
  level: number;
  durationMs: number;
}

export interface PlausibilityVerdict {
  /** non-null → reject the submission (422) */
  hardFail: string | null;
  /** logged for tuning; not rejected during shadow-mode period */
  softFlags: string[];
}

export function evaluatePlausibility(
  s: ScoreStats,
  tokenAgeMs: number,
): PlausibilityVerdict {
  const softFlags: string[] = [];

  // --- hard checks: structurally impossible, always reject ---
  if (s.durationMs > tokenAgeMs + WALL_CLOCK_GRACE_MS) {
    return { hardFail: "duration_exceeds_wall_clock", softFlags };
  }
  if (s.mode === "sprint" && (s.lines < 40 || s.lines > 43)) {
    // sprint ends at >=40 lines; a final quad can overshoot to at most 43
    return { hardFail: "sprint_line_count", softFlags };
  }

  // --- soft checks (shadow mode) ---
  const piecesMin = Math.ceil(s.lines * 2.5); // 10 cells/line, 4 cells/piece

  if (s.durationMs < Math.max(MIN_GAME_MS, piecesMin * MIN_MS_PER_PIECE)) {
    softFlags.push("speed_floor");
  }
  if (s.level > Math.floor(s.lines / 10) + 15) {
    softFlags.push("level_consistency"); // start level is at most 15
  }
  if (s.lines > 0 && s.score < s.lines * 100) {
    softFlags.push("score_floor"); // cheapest clear is a single at level >= 1
  }
  if (s.score > s.lines * 1000 * s.level + piecesMin * 40 + 10_000) {
    softFlags.push("score_ceiling"); // generous B2B T-spin + combo + drop envelope
  }
  if (s.mode === "ultra" && (s.durationMs < 115_000 || s.durationMs > 125_000)) {
    softFlags.push("ultra_duration"); // ultra is a fixed 2:00 of game ticks
  }

  return { hardFail: null, softFlags };
}
