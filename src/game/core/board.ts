import type { ActivePiece } from "./types";
import { BOARD_H, BOARD_W, COLOR_INDEX } from "./types";
import { pieceCells } from "./pieces";

export function createBoard(): Uint8Array {
  return new Uint8Array(BOARD_W * BOARD_H);
}

export function cellIndex(x: number, y: number): number {
  return y * BOARD_W + x;
}

export function collides(board: Uint8Array, piece: ActivePiece): boolean {
  for (const [x, y] of pieceCells(piece)) {
    if (x < 0 || x >= BOARD_W || y < 0 || y >= BOARD_H) return true;
    if (board[cellIndex(x, y)] !== 0) return true;
  }
  return false;
}

/** Writes the piece into the board. Returns the occupied cell indices. */
export function lockPiece(board: Uint8Array, piece: ActivePiece): number[] {
  const color = COLOR_INDEX[piece.kind];
  const cells: number[] = [];
  for (const [x, y] of pieceCells(piece)) {
    const idx = cellIndex(x, y);
    board[idx] = color;
    cells.push(idx);
  }
  return cells;
}

/** Row indices (bottom-up order) that are completely filled. */
export function findFullRows(board: Uint8Array): number[] {
  const rows: number[] = [];
  for (let y = 0; y < BOARD_H; y++) {
    let full = true;
    for (let x = 0; x < BOARD_W; x++) {
      if (board[cellIndex(x, y)] === 0) {
        full = false;
        break;
      }
    }
    if (full) rows.push(y);
  }
  return rows;
}

/** Removes the given rows and shifts everything above them down. */
export function clearRows(board: Uint8Array, rows: number[]): void {
  // iterate top-down so earlier shifts don't move pending rows
  const sorted = [...rows].sort((a, b) => b - a);
  for (const row of sorted) {
    board.copyWithin(row * BOARD_W, (row + 1) * BOARD_W);
    board.fill(0, (BOARD_H - 1) * BOARD_W);
  }
}

export function isBoardEmpty(board: Uint8Array): boolean {
  for (let i = 0; i < board.length; i++) if (board[i] !== 0) return false;
  return true;
}

/** y the piece would occupy after dropping straight down (ghost position). */
export function ghostY(board: Uint8Array, piece: ActivePiece): number {
  let y = piece.y;
  while (!collides(board, { ...piece, y: y - 1 })) y--;
  return y;
}
