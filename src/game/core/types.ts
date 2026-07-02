// Core engine types. This module (and everything under src/game/core) is PURE:
// no DOM, no Date.now, no Math.random — time is integer ticks, randomness is injected.

export const BOARD_W = 10;
export const BOARD_H = 40; // rows 0..39, row 0 = bottom; rows 20..39 are the hidden buffer
export const VISIBLE_H = 20;
export const TICKS_PER_SECOND = 60;
export const TICK_MS = 1000 / TICKS_PER_SECOND;

export type PieceKind = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export const PIECE_KINDS: readonly PieceKind[] = [
  "I",
  "O",
  "T",
  "S",
  "Z",
  "J",
  "L",
];
export type Rotation = 0 | 1 | 2 | 3;
export type ModeId = "marathon" | "sprint" | "ultra";
export type TSpinKind = "none" | "mini" | "full";
export type GameOverReason = "blockOut" | "lockOut" | "timeUp" | "goalReached";

/** Board cell values: 0 = empty, 1..7 = locked piece color index (order of PIECE_KINDS). */
export const COLOR_INDEX: Record<PieceKind, number> = {
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7,
};
export const KIND_BY_COLOR: readonly (PieceKind | null)[] = [
  null,
  "I",
  "O",
  "T",
  "S",
  "Z",
  "J",
  "L",
];

export interface ActivePiece {
  kind: PieceKind;
  rot: Rotation;
  /** x of the piece's bounding-box origin (see pieces.ts offsets); +x = right */
  x: number;
  /** y of the piece's bounding-box origin; +y = up (row 0 = bottom) */
  y: number;
}

/** Engine-level actions. Held actions carry press/release edges; DAS/ARR live in the engine. */
export type InputAction =
  | { action: "moveLeft" | "moveRight" | "softDrop"; edge: "press" | "release" }
  | { action: "hardDrop" | "rotateCw" | "rotateCcw" | "hold" };

export interface EngineConfig {
  /** delayed auto shift, in ticks (default 10 = 167ms) */
  dasTicks: number;
  /** auto repeat rate, in ticks (0 = instant wall-slam, default 2 = 33ms) */
  arrTicks: number;
  /** soft drop gravity multiplier (default 20) */
  softDropFactor: number;
  /** ghost piece computation on/off (render hint only; ghost always computed for hard drop) */
  ghost: boolean;
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  dasTicks: 10,
  arrTicks: 2,
  softDropFactor: 20,
  ghost: true,
};

export const LOCK_DELAY_TICKS = 30; // 500ms
export const LOCK_RESET_CAP = 15;
export const NEXT_QUEUE_SIZE = 5;
export const MAX_LEVEL = 30;

export interface FinalStats {
  score: number;
  lines: number;
  level: number;
  ticks: number;
  durationMs: number;
  pps: number;
  piecesPlaced: number;
  maxCombo: number;
  quads: number;
  tSpins: number;
  reason: GameOverReason;
}

/**
 * Immutable-by-convention snapshot handed to the renderer/HUD.
 * `board` is a live reference for performance — consumers must never mutate it.
 * `version` increments on every state change (useSyncExternalStore support).
 */
export interface EngineSnapshot {
  readonly board: Uint8Array;
  readonly active: ActivePiece | null;
  readonly ghostY: number;
  readonly hold: PieceKind | null;
  readonly canHold: boolean;
  readonly queue: readonly PieceKind[];
  readonly score: number;
  readonly lines: number;
  readonly level: number;
  /** current combo count; -1 = no active combo */
  readonly combo: number;
  readonly b2b: boolean;
  readonly ticks: number;
  readonly status: "running" | "ended";
  readonly mode: ModeId;
  readonly final: FinalStats | null;
  readonly version: number;
}
