import type { TSpinKind } from "./types";

// Guideline-style scoring. All line-clear values are level-multiplied;
// back-to-back applies x1.5 to the base clear value; combo adds 50 x combo x level.

export interface ClearInput {
  lines: 0 | 1 | 2 | 3 | 4;
  tSpin: TSpinKind;
  perfectClear: boolean;
  level: number;
  /** combo count BEFORE this lock; -1 = none active */
  combo: number;
  /** back-to-back chain active BEFORE this lock */
  b2b: boolean;
}

export interface ClearResult {
  points: number;
  /** combo count AFTER this lock (-1 when broken) */
  combo: number;
  /** b2b chain state AFTER this lock */
  b2b: boolean;
  /** whether this clear was "difficult" (quad or line-clearing t-spin) */
  difficult: boolean;
}

const BASE: Record<TSpinKind, Record<number, number>> = {
  none: { 1: 100, 2: 300, 3: 500, 4: 800 },
  mini: { 0: 100, 1: 200, 2: 400 },
  full: { 0: 400, 1: 800, 2: 1200, 3: 1600 },
};

const PERFECT_CLEAR: Record<number, number> = {
  1: 800,
  2: 1200,
  3: 1800,
  4: 2000,
};
const B2B_QUAD_PERFECT_CLEAR = 3200;

export function scoreClear(input: ClearInput): ClearResult {
  const { lines, tSpin, perfectClear, level, combo, b2b } = input;
  const difficult = lines > 0 && (lines === 4 || tSpin !== "none");

  let base = BASE[tSpin][lines] ?? 0;

  const b2bApplied = difficult && b2b;
  if (b2bApplied) base = base * 1.5;

  let points = Math.round(base) * level;

  const newCombo = lines > 0 ? combo + 1 : -1;
  if (newCombo > 0) points += 50 * newCombo * level;

  if (perfectClear && lines > 0) {
    const pc =
      b2bApplied && lines === 4
        ? B2B_QUAD_PERFECT_CLEAR
        : PERFECT_CLEAR[lines];
    points += pc * level;
  }

  // Non-clearing locks never break b2b; non-difficult clears do.
  const newB2b = lines > 0 ? difficult : b2b;

  return { points, combo: newCombo, b2b: newB2b, difficult };
}

export const SOFT_DROP_POINTS_PER_CELL = 1;
export const HARD_DROP_POINTS_PER_CELL = 2;
