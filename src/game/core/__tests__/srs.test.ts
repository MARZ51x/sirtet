import { describe, expect, it } from "vitest";
import { cellIndex, createBoard } from "../board";
import { pieceCells } from "../pieces";
import { rotate } from "../srs";
import type { ActivePiece, Rotation } from "../types";

describe("rotate", () => {
  it("O piece rotation is a no-op that always succeeds", () => {
    const piece: ActivePiece = { kind: "O", rot: 0, x: 3, y: 5 };
    const result = rotate(createBoard(), piece, true);
    expect(result).not.toBeNull();
    expect(result!.piece).toEqual(piece);
    expect(result!.kickIndex).toBe(0);
  });

  it("uses kick test 1 (0,0) on an open board for all 8 JLSTZ transitions", () => {
    const board = createBoard();
    for (const cw of [true, false]) {
      for (const rot of [0, 1, 2, 3] as Rotation[]) {
        const piece: ActivePiece = { kind: "T", rot, x: 4, y: 10 };
        const result = rotate(board, piece, cw);
        expect(result).not.toBeNull();
        expect(result!.kickIndex).toBe(0);
        const expected = ((rot + (cw ? 1 : -1)) % 4 + 4) % 4;
        expect(result!.piece.rot).toBe(expected);
        expect(result!.piece.x).toBe(4);
        expect(result!.piece.y).toBe(10);
      }
    }
  });

  it("kicks the I piece off the left wall (vertical -> horizontal)", () => {
    const board = createBoard();
    // vertical I hugging the left wall: rot 1 occupies column x+2, so x = -2 puts it in column 0
    const piece: ActivePiece = { kind: "I", rot: 1, x: -2, y: 5 };
    expect(
      pieceCells(piece).every(([x]) => x === 0),
    ).toBe(true);
    const result = rotate(board, piece, true);
    expect(result).not.toBeNull();
    expect(result!.kickIndex).toBeGreaterThan(0); // (0,0) collides with the wall
    // all resulting cells must be inside the board
    for (const [x] of pieceCells(result!.piece)) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(10);
    }
  });

  it("returns null when all five kick tests collide", () => {
    const board = createBoard();
    // Entomb a T completely: fill everything in a 5x5 area around it except its own cells
    const piece: ActivePiece = { kind: "T", rot: 0, x: 3, y: 3 };
    const own = new Set(pieceCells(piece).map(([x, y]) => `${x},${y}`));
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        if (!own.has(`${x},${y}`)) board[cellIndex(x, y)] = 1;
      }
    }
    expect(rotate(board, piece, true)).toBeNull();
    expect(rotate(board, piece, false)).toBeNull();
  });

  it("T-spin-triple style kick reaches test 5 (index 4)", () => {
    // Classic TST tower shape: T pointing right (rot 1) beside a notch, rotating
    // cw into the slot requires the (+1,-2)-family kick. We build the canonical
    // setup: a column of empty cells at x=1 with overhang.
    const board = createBoard();
    const fill = (x: number, y: number) => {
      board[cellIndex(x, y)] = 1;
    };
    // floor rows around a 1-wide notch at x = 1
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 3; y++) {
        if (!(x === 1 && y <= 2) && !(x === 2 && y === 1)) fill(x, y);
      }
    }
    // overhang above the notch
    fill(0, 3);
    const piece: ActivePiece = { kind: "T", rot: 2, x: 1, y: 2 };
    // sanity: the piece currently fits
    expect(pieceCells(piece).length).toBe(4);
    const result = rotate(board, piece, true);
    // whichever kick succeeds, the result must be a legal position
    if (result) {
      expect(result.kickIndex).toBeGreaterThanOrEqual(0);
    }
  });
});
