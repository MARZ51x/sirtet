import type { ActivePiece, Rotation } from "./types";
import { collides } from "./board";

// SRS wall kicks. Offsets are (x, y) with +y = up. Five tests per transition;
// the first non-colliding offset wins.

type Kick = readonly (readonly [number, number])[];
type KickTable = Record<string, Kick>;

const JLSTZ_KICKS: KickTable = {
  "0>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "1>0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "1>2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "2>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "2>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "3>2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "3>0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "0>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

const I_KICKS: KickTable = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

export interface RotateResult {
  piece: ActivePiece;
  /** which of the 5 kick tests succeeded (0-based); feeds T-spin detection */
  kickIndex: number;
}

/**
 * Attempt an SRS rotation. Returns null when all five kick tests collide.
 * O pieces "rotate" trivially in place (kickIndex 0, no visual change).
 */
export function rotate(
  board: Uint8Array,
  piece: ActivePiece,
  cw: boolean,
): RotateResult | null {
  if (piece.kind === "O") {
    return { piece: { ...piece }, kickIndex: 0 };
  }

  const from = piece.rot;
  const to = (((from + (cw ? 1 : -1)) % 4) + 4) % 4 as Rotation;
  const table = piece.kind === "I" ? I_KICKS : JLSTZ_KICKS;
  const kicks = table[`${from}>${to}`];

  for (let i = 0; i < kicks.length; i++) {
    const [dx, dy] = kicks[i];
    const candidate: ActivePiece = {
      ...piece,
      rot: to,
      x: piece.x + dx,
      y: piece.y + dy,
    };
    if (!collides(board, candidate)) {
      return { piece: candidate, kickIndex: i };
    }
  }
  return null;
}
