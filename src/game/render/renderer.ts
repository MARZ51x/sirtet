import type { EngineSnapshot, PieceKind } from "@/game/core/types";
import { KIND_BY_COLOR, VISIBLE_H } from "@/game/core/types";
import { pieceCells } from "@/game/core/pieces";
import type { ThemeTokens } from "@/lib/theme/themes";
import type { FxEngine } from "./fx";

// Three stacked canvases:
//   board — locked cells + grid, redrawn only when dirty (lock/clear/theme/resize)
//   piece — active piece + ghost, redrawn every frame
//   fx    — particles/flashes, drawn while any effect is alive

const BOARD_COLS = 10;
const DPR_CAP = 2;

export function pieceColor(tokens: ThemeTokens, kind: PieceKind): string {
  switch (kind) {
    case "I":
      return tokens.pieceI;
    case "O":
      return tokens.pieceO;
    case "T":
      return tokens.pieceT;
    case "S":
      return tokens.pieceS;
    case "Z":
      return tokens.pieceZ;
    case "J":
      return tokens.pieceJ;
    case "L":
      return tokens.pieceL;
  }
}

export class Renderer {
  private cellPx = 24;
  private width = 240;
  private height = 480;
  private boardDirty = true;
  private lastBoardVersion = -1;
  private ghostEnabled = true;

  private tokens: ThemeTokens | null = null;

  constructor(
    private readonly boardCanvas: HTMLCanvasElement,
    private readonly pieceCanvas: HTMLCanvasElement,
    private readonly fxCanvas: HTMLCanvasElement,
  ) {}

  setTheme(tokens: ThemeTokens): void {
    this.tokens = tokens;
    this.boardDirty = true;
  }

  setGhostEnabled(enabled: boolean): void {
    this.ghostEnabled = enabled;
  }

  markBoardDirty(): void {
    this.boardDirty = true;
  }

  get cellSize(): number {
    return this.cellPx;
  }

  /** y px of the TOP of a board row (rows are bottom-up; canvas is top-down). */
  rowToY = (row: number): number => {
    return (VISIBLE_H - 1 - row) * this.cellPx;
  };

  /** Resize all canvases to fit the container; returns the CSS pixel size. */
  resize(availWidth: number, availHeight: number): { w: number; h: number } {
    const cell = Math.max(
      8,
      Math.floor(Math.min(availWidth / BOARD_COLS, availHeight / VISIBLE_H)),
    );
    this.cellPx = cell;
    this.width = cell * BOARD_COLS;
    this.height = cell * VISIBLE_H;
    const dpr = Math.min(
      typeof devicePixelRatio === "number" ? devicePixelRatio : 1,
      DPR_CAP,
    );
    for (const canvas of [this.boardCanvas, this.pieceCanvas, this.fxCanvas]) {
      canvas.width = Math.round(this.width * dpr);
      canvas.height = Math.round(this.height * dpr);
      canvas.style.width = `${this.width}px`;
      canvas.style.height = `${this.height}px`;
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.boardDirty = true;
    return { w: this.width, h: this.height };
  }

  draw(snapshot: EngineSnapshot, fx: FxEngine, now: number): void {
    if (!this.tokens) return;
    if (this.boardDirty || snapshot.version !== this.lastBoardVersion) {
      // board content only changes on lock/clear, but version tracks all
      // changes; the board layer redraw is cheap enough at version-change rate
      this.drawBoard(snapshot);
      this.lastBoardVersion = snapshot.version;
      this.boardDirty = false;
    }
    this.drawPieceLayer(snapshot);
    const fxCtx = this.fxCanvas.getContext("2d");
    if (fxCtx) {
      if (fx.hasWork) {
        fx.draw(fxCtx, this.cellPx, this.width, this.height, now, this.rowToY);
      } else {
        fxCtx.clearRect(0, 0, this.width, this.height);
      }
    }
  }

  private drawBoard(snapshot: EngineSnapshot): void {
    const ctx = this.boardCanvas.getContext("2d");
    const tokens = this.tokens;
    if (!ctx || !tokens) return;
    const cell = this.cellPx;

    ctx.fillStyle = tokens.boardBg;
    ctx.fillRect(0, 0, this.width, this.height);

    // grid
    ctx.strokeStyle = tokens.boardGrid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < BOARD_COLS; x++) {
      ctx.moveTo(x * cell + 0.5, 0);
      ctx.lineTo(x * cell + 0.5, this.height);
    }
    for (let y = 1; y < VISIBLE_H; y++) {
      ctx.moveTo(0, y * cell + 0.5);
      ctx.lineTo(this.width, y * cell + 0.5);
    }
    ctx.stroke();

    // locked cells
    for (let row = 0; row < VISIBLE_H; row++) {
      for (let x = 0; x < BOARD_COLS; x++) {
        const value = snapshot.board[row * BOARD_COLS + x];
        if (value === 0) continue;
        const kind = KIND_BY_COLOR[value];
        if (!kind) continue;
        this.drawCell(ctx, x * cell, this.rowToY(row), pieceColor(tokens, kind));
      }
    }
  }

  private drawPieceLayer(snapshot: EngineSnapshot): void {
    const ctx = this.pieceCanvas.getContext("2d");
    const tokens = this.tokens;
    if (!ctx || !tokens) return;
    ctx.clearRect(0, 0, this.width, this.height);
    const active = snapshot.active;
    if (!active || snapshot.status !== "running") return;
    const cell = this.cellPx;
    const color = pieceColor(tokens, active.kind);

    // ghost
    if (this.ghostEnabled && snapshot.ghostY < active.y) {
      const ghost = { ...active, y: snapshot.ghostY };
      ctx.fillStyle = tokens.ghost;
      ctx.strokeStyle = tokens.ghost;
      ctx.lineWidth = 1;
      for (const [x, y] of pieceCells(ghost)) {
        if (y >= VISIBLE_H) continue;
        ctx.fillRect(x * cell + 1, this.rowToY(y) + 1, cell - 2, cell - 2);
        ctx.strokeRect(
          x * cell + 1.5,
          this.rowToY(y) + 1.5,
          cell - 3,
          cell - 3,
        );
      }
    }

    for (const [x, y] of pieceCells(active)) {
      if (y >= VISIBLE_H) continue;
      this.drawCell(ctx, x * cell, this.rowToY(y), color);
    }
  }

  private drawCell(
    ctx: CanvasRenderingContext2D,
    xPx: number,
    yPx: number,
    color: string,
  ): void {
    const cell = this.cellPx;
    ctx.fillStyle = color;
    ctx.fillRect(xPx + 1, yPx + 1, cell - 2, cell - 2);
    // subtle bevel: top highlight + bottom shade
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(xPx + 1, yPx + 1, cell - 2, Math.max(2, cell * 0.15));
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(
      xPx + 1,
      yPx + cell - 1 - Math.max(2, cell * 0.12),
      cell - 2,
      Math.max(2, cell * 0.12),
    );
  }
}
