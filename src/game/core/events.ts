import type {
  FinalStats,
  PieceKind,
  TSpinKind,
} from "./types";

/** Typed events emitted synchronously (in order) from Engine.tick(). SFX and FX layers subscribe independently. */
export type GameEvent =
  | { type: "pieceSpawn"; piece: PieceKind; queue: PieceKind[] }
  | { type: "pieceMove"; dx: -1 | 1; source: "tap" | "das" }
  | { type: "pieceRotate"; cw: boolean; kickIndex: number }
  | { type: "hold"; held: PieceKind }
  | { type: "holdBlocked" }
  | { type: "softDropStep"; rows: number }
  | { type: "hardDrop"; distance: number }
  | {
      type: "pieceLock";
      piece: PieceKind;
      /** board cell indices (y * 10 + x) the piece occupies */
      cells: number[];
      tSpin: TSpinKind;
    }
  | {
      type: "lineClear";
      lines: 1 | 2 | 3 | 4;
      /** row indices cleared (bottom-up) */
      rows: number[];
      b2b: boolean;
      combo: number;
      perfectClear: boolean;
      points: number;
      tSpin: TSpinKind;
    }
  | { type: "levelUp"; level: number }
  | { type: "scoreChange"; score: number; delta: number }
  | { type: "gameOver"; stats: FinalStats };

export type GameEventType = GameEvent["type"];

type Handler<T extends GameEventType> = (
  event: Extract<GameEvent, { type: T }>,
) => void;

/** Minimal fully-typed emitter; zero dependencies. */
export class GameEventEmitter {
  private handlers = new Map<GameEventType, Set<(e: GameEvent) => void>>();

  on<T extends GameEventType>(type: T, fn: Handler<T>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    const wrapped = fn as (e: GameEvent) => void;
    set.add(wrapped);
    return () => set.delete(wrapped);
  }

  emit(event: GameEvent): void {
    const set = this.handlers.get(event.type);
    if (!set) return;
    for (const fn of set) fn(event);
  }

  removeAll(): void {
    this.handlers.clear();
  }
}
