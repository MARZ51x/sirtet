import { TICKS_PER_SECOND } from "./types";

// Guideline gravity curve: seconds per row = (0.8 - (level - 1) * 0.007) ^ (level - 1).
// Level 20+ is effectively instant (20G).

export function secondsPerRow(level: number): number {
  if (level >= 20) return 1 / (20 * TICKS_PER_SECOND); // 20G: 20 rows per tick
  const l = Math.max(1, level);
  return Math.pow(0.8 - (l - 1) * 0.007, l - 1);
}

/** Rows of gravity to accumulate per engine tick at the given level. */
export function rowsPerTick(level: number): number {
  if (level >= 20) return 20;
  return 1 / (secondsPerRow(level) * TICKS_PER_SECOND);
}
