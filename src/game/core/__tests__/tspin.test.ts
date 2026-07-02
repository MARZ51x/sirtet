import { describe, expect, it } from "vitest";
import { cellIndex, createBoard } from "../board";
import { detectTSpin } from "../tspin";
import type { ActivePiece } from "../types";

// T at (x=3, y=0), rot 2 (nose pointing down): 3x3 box corners are
// (3,0) (5,0) bottom / (3,2) (5,2) top; front corners = bottom pair.
const T_DOWN: ActivePiece = { kind: "T", rot: 2, x: 3, y: 0 };

function boardWithCorners(corners: [number, number][]): Uint8Array {
  const board = createBoard();
  for (const [x, y] of corners) board[cellIndex(x, y)] = 1;
  return board;
}

describe("detectTSpin", () => {
  it("requires the last move to be a rotation", () => {
    const board = boardWithCorners([
      [3, 0],
      [5, 0],
      [3, 2],
      [5, 2],
    ]);
    expect(detectTSpin(board, T_DOWN, false, 0)).toBe("none");
    expect(detectTSpin(board, T_DOWN, true, 0)).toBe("full");
  });

  it("only applies to T pieces", () => {
    const board = boardWithCorners([
      [3, 0],
      [5, 0],
      [3, 2],
    ]);
    expect(
      detectTSpin(board, { ...T_DOWN, kind: "S" }, true, 0),
    ).toBe("none");
  });

  it("needs at least 3 filled corners", () => {
    const board = boardWithCorners([
      [3, 0],
      [5, 0],
    ]);
    expect(detectTSpin(board, T_DOWN, true, 0)).toBe("none");
  });

  it("full when both front corners are filled", () => {
    // front (rot 2) = bottom corners (3,0) and (5,0); one back corner
    const board = boardWithCorners([
      [3, 0],
      [5, 0],
      [3, 2],
    ]);
    expect(detectTSpin(board, T_DOWN, true, 0)).toBe("full");
  });

  it("mini when a front corner is open", () => {
    // back corners + one front corner
    const board = boardWithCorners([
      [3, 2],
      [5, 2],
      [3, 0],
    ]);
    expect(detectTSpin(board, T_DOWN, true, 0)).toBe("mini");
  });

  it("kick test 5 upgrades mini to full", () => {
    const board = boardWithCorners([
      [3, 2],
      [5, 2],
      [3, 0],
    ]);
    expect(detectTSpin(board, T_DOWN, true, 4)).toBe("full");
  });

  it("walls count as filled corners", () => {
    // T against the left wall at x = -1: corners (-1,0), (1,0), (-1,2), (1,2);
    // the x = -1 pair is out of bounds -> filled
    const board = boardWithCorners([[1, 0]]);
    const piece: ActivePiece = { kind: "T", rot: 1, x: -1, y: 0 };
    expect(detectTSpin(board, piece, true, 0)).not.toBe("none");
  });
});
