import type { ActivePiece, PieceKind, Rotation } from "./types";

// Cell offsets from the piece's bounding-box origin (bottom-left), +x right, +y up.
// Derived from the standard SRS matrices; rotation 0 is the spawn state
// (flat side down for J/L/S/T/Z).

type Offsets = readonly (readonly [number, number])[];

const SHAPES: Record<PieceKind, readonly [Offsets, Offsets, Offsets, Offsets]> =
  {
    I: [
      [[0, 2], [1, 2], [2, 2], [3, 2]],
      [[2, 3], [2, 2], [2, 1], [2, 0]],
      [[0, 1], [1, 1], [2, 1], [3, 1]],
      [[1, 3], [1, 2], [1, 1], [1, 0]],
    ],
    O: [
      [[1, 2], [2, 2], [1, 1], [2, 1]],
      [[1, 2], [2, 2], [1, 1], [2, 1]],
      [[1, 2], [2, 2], [1, 1], [2, 1]],
      [[1, 2], [2, 2], [1, 1], [2, 1]],
    ],
    T: [
      [[1, 2], [0, 1], [1, 1], [2, 1]],
      [[1, 2], [1, 1], [2, 1], [1, 0]],
      [[0, 1], [1, 1], [2, 1], [1, 0]],
      [[1, 2], [0, 1], [1, 1], [1, 0]],
    ],
    S: [
      [[1, 2], [2, 2], [0, 1], [1, 1]],
      [[1, 2], [1, 1], [2, 1], [2, 0]],
      [[1, 1], [2, 1], [0, 0], [1, 0]],
      [[0, 2], [0, 1], [1, 1], [1, 0]],
    ],
    Z: [
      [[0, 2], [1, 2], [1, 1], [2, 1]],
      [[2, 2], [1, 1], [2, 1], [1, 0]],
      [[0, 1], [1, 1], [1, 0], [2, 0]],
      [[1, 2], [0, 1], [1, 1], [0, 0]],
    ],
    J: [
      [[0, 2], [0, 1], [1, 1], [2, 1]],
      [[1, 2], [2, 2], [1, 1], [1, 0]],
      [[0, 1], [1, 1], [2, 1], [2, 0]],
      [[1, 2], [1, 1], [0, 0], [1, 0]],
    ],
    L: [
      [[2, 2], [0, 1], [1, 1], [2, 1]],
      [[1, 2], [1, 1], [1, 0], [2, 0]],
      [[0, 1], [1, 1], [2, 1], [0, 0]],
      [[0, 2], [1, 2], [1, 1], [1, 0]],
    ],
  };

/** Spawn bounding-box origins: pieces occupy rows 20–21, horizontally centered. */
const SPAWN: Record<PieceKind, { x: number; y: number }> = {
  I: { x: 3, y: 18 }, // occupies columns 3–6, row 20
  O: { x: 3, y: 19 }, // columns 4–5, rows 20–21
  T: { x: 3, y: 19 },
  S: { x: 3, y: 19 },
  Z: { x: 3, y: 19 },
  J: { x: 3, y: 19 },
  L: { x: 3, y: 19 },
};

export function spawnPiece(kind: PieceKind): ActivePiece {
  return { kind, rot: 0, x: SPAWN[kind].x, y: SPAWN[kind].y };
}

export function cellOffsets(kind: PieceKind, rot: Rotation): Offsets {
  return SHAPES[kind][rot];
}

/** Absolute board cells [x, y] occupied by the piece. */
export function pieceCells(piece: ActivePiece): [number, number][] {
  return SHAPES[piece.kind][piece.rot].map(([dx, dy]) => [
    piece.x + dx,
    piece.y + dy,
  ]);
}
