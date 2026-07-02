import { describe, expect, it } from "vitest";
import {
  cellIndex,
  clearRows,
  collides,
  createBoard,
  findFullRows,
  ghostY,
  isBoardEmpty,
  lockPiece,
} from "../board";
import { BOARD_W, COLOR_INDEX } from "../types";
import type { ActivePiece } from "../types";

function fillRow(board: Uint8Array, y: number, color = 1, skipX: number[] = []) {
  for (let x = 0; x < BOARD_W; x++) {
    if (!skipX.includes(x)) board[cellIndex(x, y)] = color;
  }
}

describe("collides", () => {
  const t: ActivePiece = { kind: "T", rot: 0, x: 3, y: 5 };

  it("is false on an empty board mid-field", () => {
    expect(collides(createBoard(), t)).toBe(false);
  });

  it("detects left/right walls and floor", () => {
    const board = createBoard();
    expect(collides(board, { ...t, x: -1 })).toBe(true); // left wall
    expect(collides(board, { ...t, x: 8 })).toBe(true); // right wall (cells reach x=10)
    expect(collides(board, { ...t, y: -2 })).toBe(true); // floor
  });

  it("detects locked cells", () => {
    const board = createBoard();
    board[cellIndex(4, 6)] = 3; // overlaps T's flat row (y+1 = 6)
    expect(collides(board, t)).toBe(true);
  });
});

describe("lockPiece", () => {
  it("writes the piece's color index into its cells", () => {
    const board = createBoard();
    const piece: ActivePiece = { kind: "J", rot: 0, x: 0, y: 0 };
    const cells = lockPiece(board, piece);
    expect(cells).toHaveLength(4);
    for (const idx of cells) expect(board[idx]).toBe(COLOR_INDEX.J);
  });
});

describe("findFullRows / clearRows", () => {
  it("finds non-adjacent full rows and clears them with correct shifts", () => {
    const board = createBoard();
    fillRow(board, 0);
    fillRow(board, 2);
    board[cellIndex(0, 1)] = 5; // partial row 1
    board[cellIndex(0, 3)] = 6; // partial row 3

    expect(findFullRows(board)).toEqual([0, 2]);

    clearRows(board, [0, 2]);
    // old row 1 drops to row 0, old row 3 drops to row 1
    expect(board[cellIndex(0, 0)]).toBe(5);
    expect(board[cellIndex(0, 1)]).toBe(6);
    expect(board[cellIndex(0, 2)]).toBe(0);
  });

  it("detects perfect clears", () => {
    const board = createBoard();
    fillRow(board, 0);
    clearRows(board, [0]);
    expect(isBoardEmpty(board)).toBe(true);
  });
});

describe("ghostY", () => {
  it("projects straight down to the floor on an empty board", () => {
    const piece: ActivePiece = { kind: "T", rot: 0, x: 3, y: 19 };
    // T's lowest cells are at y+1, so the box can go to y = -1
    expect(ghostY(createBoard(), piece)).toBe(-1);
  });

  it("stops on top of a stack", () => {
    const board = createBoard();
    fillRow(board, 0);
    const piece: ActivePiece = { kind: "T", rot: 0, x: 3, y: 19 };
    expect(ghostY(board, piece)).toBe(0); // flat row sits at y+1 = 1, above the stack
  });
});
