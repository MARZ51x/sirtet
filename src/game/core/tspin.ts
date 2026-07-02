import type { ActivePiece, TSpinKind } from "./types";
import { BOARD_H, BOARD_W } from "./types";
import { cellIndex } from "./board";

// 3-corner T-spin rule: the T piece's last successful action was a rotation and
// >= 3 of the 4 diagonal corners of its 3x3 box are filled (or wall/floor).
// Mini when the two "front" corners (the side the T points to) are not both
// filled — except SRS kick test 5 (index 4) upgrades a mini to a full T-spin.

function filled(board: Uint8Array, x: number, y: number): boolean {
  if (x < 0 || x >= BOARD_W || y < 0 || y >= BOARD_H) return true;
  return board[cellIndex(x, y)] !== 0;
}

export function detectTSpin(
  board: Uint8Array,
  piece: ActivePiece,
  lastMoveWasRotation: boolean,
  lastKickIndex: number,
): TSpinKind {
  if (piece.kind !== "T" || !lastMoveWasRotation) return "none";

  const { x, y, rot } = piece;
  // corners of the 3x3 bounding box
  const bl = filled(board, x, y);
  const br = filled(board, x + 2, y);
  const tl = filled(board, x, y + 2);
  const tr = filled(board, x + 2, y + 2);
  const count = Number(bl) + Number(br) + Number(tl) + Number(tr);
  if (count < 3) return "none";

  // front corners per rotation (the direction the T's nose points)
  const front: [boolean, boolean] =
    rot === 0 ? [tl, tr] : rot === 1 ? [tr, br] : rot === 2 ? [bl, br] : [tl, bl];

  if (front[0] && front[1]) return "full";
  return lastKickIndex === 4 ? "full" : "mini";
}
