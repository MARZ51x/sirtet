import {
  clearRows,
  collides,
  createBoard,
  findFullRows,
  ghostY,
  isBoardEmpty,
  lockPiece,
} from "./board";
import { GameEventEmitter } from "./events";
import { rowsPerTick } from "./gravity";
import type { ModeConfig } from "./modes";
import { pieceCells, spawnPiece } from "./pieces";
import { SevenBag, type Seed } from "./rng";
import {
  HARD_DROP_POINTS_PER_CELL,
  SOFT_DROP_POINTS_PER_CELL,
  scoreClear,
} from "./scoring";
import { rotate } from "./srs";
import { detectTSpin } from "./tspin";
import type {
  ActivePiece,
  EngineConfig,
  EngineSnapshot,
  FinalStats,
  GameOverReason,
  InputAction,
  PieceKind,
} from "./types";
import {
  DEFAULT_ENGINE_CONFIG,
  LOCK_DELAY_TICKS,
  LOCK_RESET_CAP,
  MAX_LEVEL,
  NEXT_QUEUE_SIZE,
  TICK_MS,
  TICKS_PER_SECOND,
  VISIBLE_H,
} from "./types";

export const ENGINE_VERSION = "1.0.0";

export interface EngineOptions {
  /** marathon only; clamped to 1–15 */
  startLevel?: number;
  config?: Partial<EngineConfig>;
}

type HeldDir = "left" | "right" | null;

/**
 * The stateful tick orchestrator. Updates only in whole ticks; all randomness
 * comes from the injected seed — same seed + same tick-stamped actions always
 * reproduce the same game (replay/verification foundation).
 */
export class Engine {
  readonly events = new GameEventEmitter();
  readonly mode: ModeConfig;

  private config: EngineConfig;
  private readonly startLevel: number;

  private board = createBoard();
  private bag: SevenBag;
  private queue: PieceKind[] = [];
  private active: ActivePiece | null = null;
  private holdPiece: PieceKind | null = null;
  private canHold = true;

  private score = 0;
  private lines = 0;
  private level: number;
  private combo = -1;
  private b2b = false;

  private ticks = 0;
  private status: "running" | "ended" = "running";
  private final: FinalStats | null = null;

  // per-piece state
  private gravityAcc = 0;
  private lockCounter = 0;
  private lockResets = 0;
  private lowestY = 0;
  private lastMoveWasRotation = false;
  private lastKickIndex = 0;

  // input state
  private heldLeft = false;
  private heldRight = false;
  private activeDir: HeldDir = null;
  private dasCounter = 0;
  private softHeld = false;

  // stats
  private piecesPlaced = 0;
  private maxCombo = 0;
  private quads = 0;
  private tSpins = 0;

  private version = 0;
  private snapshotCache: EngineSnapshot | null = null;
  private snapshotVersion = -1;

  constructor(mode: ModeConfig, seed: Seed, options: EngineOptions = {}) {
    this.mode = mode;
    this.startLevel =
      mode.id === "marathon"
        ? Math.min(15, Math.max(1, Math.floor(options.startLevel ?? 1)))
        : mode.startLevel;
    this.level = this.startLevel;
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...options.config };
    this.bag = new SevenBag(seed);
    for (let i = 0; i < NEXT_QUEUE_SIZE; i++) this.queue.push(this.bag.next());
  }

  /** Update DAS/ARR/soft-drop settings mid-session. */
  applyConfig(config: Partial<EngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getVersion(): number {
    return this.version;
  }

  tick(actions: readonly InputAction[]): void {
    if (this.status !== "running") return;

    // fixed-time end condition (ultra) — a final piece in flight is discarded
    if (
      this.mode.end &&
      "timeTicks" in this.mode.end &&
      this.ticks >= this.mode.end.timeTicks
    ) {
      this.endGame("timeUp");
      return;
    }

    if (!this.active) {
      this.spawnFromQueue();
      if (this.status !== "running") return;
    }

    for (const action of actions) {
      if (this.status !== "running") break;
      this.applyAction(action);
    }

    if (this.status === "running" && this.active) {
      this.autoRepeatPhase();
      this.gravityPhase();
    }
    if (this.status === "running" && this.active) {
      this.lockDelayPhase();
    }

    if (this.status === "running") {
      this.ticks++;
      this.bump();
    }
  }

  snapshot(): EngineSnapshot {
    if (this.snapshotVersion === this.version && this.snapshotCache) {
      return this.snapshotCache;
    }
    this.snapshotCache = {
      board: this.board,
      active: this.active ? { ...this.active } : null,
      ghostY: this.active ? ghostY(this.board, this.active) : 0,
      hold: this.holdPiece,
      canHold: this.canHold,
      queue: [...this.queue],
      score: this.score,
      lines: this.lines,
      level: this.level,
      combo: this.combo,
      b2b: this.b2b,
      ticks: this.ticks,
      status: this.status,
      mode: this.mode.id,
      final: this.final,
      version: this.version,
    };
    this.snapshotVersion = this.version;
    return this.snapshotCache;
  }

  // ---------- actions ----------

  private applyAction(action: InputAction): void {
    switch (action.action) {
      case "moveLeft":
        if (action.edge === "press") {
          this.heldLeft = true;
          this.activeDir = "left";
          this.dasCounter = 0;
          this.tryStep(-1, "tap");
        } else {
          this.heldLeft = false;
          this.activeDir = this.heldRight ? "right" : null;
          this.dasCounter = 0;
        }
        break;
      case "moveRight":
        if (action.edge === "press") {
          this.heldRight = true;
          this.activeDir = "right";
          this.dasCounter = 0;
          this.tryStep(1, "tap");
        } else {
          this.heldRight = false;
          this.activeDir = this.heldLeft ? "left" : null;
          this.dasCounter = 0;
        }
        break;
      case "softDrop":
        this.softHeld = action.edge === "press";
        break;
      case "rotateCw":
        this.doRotate(true);
        break;
      case "rotateCcw":
        this.doRotate(false);
        break;
      case "hold":
        this.doHold();
        break;
      case "hardDrop":
        this.doHardDrop();
        break;
    }
  }

  private tryStep(dx: -1 | 1, source: "tap" | "das"): boolean {
    if (!this.active) return false;
    const moved = { ...this.active, x: this.active.x + dx };
    if (collides(this.board, moved)) return false;
    this.active = moved;
    this.lastMoveWasRotation = false;
    this.events.emit({ type: "pieceMove", dx, source });
    this.lockMoveReset();
    return true;
  }

  private doRotate(cw: boolean): void {
    if (!this.active) return;
    if (this.active.kind === "O") return; // no-op, no event
    const result = rotate(this.board, this.active, cw);
    if (!result) return;
    this.active = result.piece;
    this.lastMoveWasRotation = true;
    this.lastKickIndex = result.kickIndex;
    this.events.emit({ type: "pieceRotate", cw, kickIndex: result.kickIndex });
    this.lockMoveReset();
  }

  private doHold(): void {
    if (!this.active) return;
    if (!this.canHold) {
      this.events.emit({ type: "holdBlocked" });
      return;
    }
    const current = this.active.kind;
    if (this.holdPiece === null) {
      this.holdPiece = current;
      this.spawnFromQueue();
    } else {
      const swapped = this.holdPiece;
      this.holdPiece = current;
      this.spawnAs(swapped);
    }
    this.canHold = false;
    if (this.status === "running") {
      this.events.emit({ type: "hold", held: current });
    }
  }

  private doHardDrop(): void {
    if (!this.active) return;
    const gy = ghostY(this.board, this.active);
    const distance = this.active.y - gy;
    if (distance > 0) {
      this.active = { ...this.active, y: gy };
      this.lastMoveWasRotation = false;
      this.addScore(distance * HARD_DROP_POINTS_PER_CELL);
    }
    this.events.emit({ type: "hardDrop", distance });
    this.lock();
  }

  // ---------- per-tick phases ----------

  private autoRepeatPhase(): void {
    if (!this.activeDir || !this.active) return;
    this.dasCounter++;
    const { dasTicks, arrTicks } = this.config;
    if (this.dasCounter < dasTicks) return;
    const dx = this.activeDir === "left" ? -1 : 1;
    if (arrTicks === 0) {
      // instant: slam to the wall
      while (this.tryStep(dx, "das")) {
        /* repeat until blocked */
      }
    } else if ((this.dasCounter - dasTicks) % arrTicks === 0) {
      this.tryStep(dx, "das");
    }
  }

  private gravityPhase(): void {
    if (!this.active) return;
    const gravityLevel =
      this.mode.gravity === "curve" ? this.level : this.mode.gravity.fixedLevel;
    const multiplier = this.softHeld ? this.config.softDropFactor : 1;
    this.gravityAcc += rowsPerTick(gravityLevel) * multiplier;

    let piece: ActivePiece = this.active;
    let dropped = 0;
    while (this.gravityAcc >= 1) {
      this.gravityAcc -= 1;
      const moved: ActivePiece = { ...piece, y: piece.y - 1 };
      if (collides(this.board, moved)) {
        this.gravityAcc = 0;
        break;
      }
      piece = moved;
      dropped++;
      if (piece.y < this.lowestY) {
        this.lowestY = piece.y;
        this.lockResets = 0;
        this.lockCounter = 0;
      }
    }
    this.active = piece;

    if (dropped > 0) {
      this.lastMoveWasRotation = false;
      if (this.softHeld) {
        this.addScore(dropped * SOFT_DROP_POINTS_PER_CELL);
        this.events.emit({ type: "softDropStep", rows: dropped });
      }
    }
  }

  private lockDelayPhase(): void {
    if (!this.active) return;
    if (this.grounded()) {
      this.lockCounter++;
      if (this.lockCounter >= LOCK_DELAY_TICKS) this.lock();
    } else {
      this.lockCounter = 0;
    }
  }

  private grounded(): boolean {
    if (!this.active) return false;
    return collides(this.board, { ...this.active, y: this.active.y - 1 });
  }

  /** Successful move/rotate while grounded resets the lock timer, up to the cap. */
  private lockMoveReset(): void {
    if (this.grounded() && this.lockResets < LOCK_RESET_CAP) {
      this.lockCounter = 0;
      this.lockResets++;
    }
  }

  // ---------- locking / clearing / spawning ----------

  private lock(): void {
    if (!this.active) return;
    const piece = this.active;
    const cellsBefore = pieceCells(piece);
    const cells = lockPiece(this.board, piece);
    const tSpin = detectTSpin(
      this.board,
      piece,
      this.lastMoveWasRotation,
      this.lastKickIndex,
    );

    this.events.emit({ type: "pieceLock", piece: piece.kind, cells, tSpin });

    // lock out: every cell above the visible field
    if (cellsBefore.every(([, y]) => y >= VISIBLE_H)) {
      this.active = null;
      this.endGame("lockOut");
      return;
    }

    const fullRows = findFullRows(this.board);
    const n = Math.min(fullRows.length, 4) as 0 | 1 | 2 | 3 | 4;
    let perfectClear = false;
    if (n > 0) {
      clearRows(this.board, fullRows);
      perfectClear = isBoardEmpty(this.board);
    }

    const prevB2b = this.b2b;
    const result = scoreClear({
      lines: n,
      tSpin,
      perfectClear,
      level: this.level,
      combo: this.combo,
      b2b: this.b2b,
    });
    this.combo = result.combo;
    this.b2b = result.b2b;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    if (tSpin !== "none") this.tSpins++;

    if (n > 0) {
      this.lines += n;
      if (n === 4) this.quads++;
      this.events.emit({
        type: "lineClear",
        lines: n as 1 | 2 | 3 | 4,
        rows: fullRows,
        b2b: result.difficult && prevB2b,
        combo: this.combo,
        perfectClear,
        points: result.points,
        tSpin,
      });
    }
    if (result.points > 0) this.addScore(result.points);

    if (this.mode.leveling) {
      const newLevel = Math.min(
        MAX_LEVEL,
        this.startLevel + Math.floor(this.lines / 10),
      );
      if (newLevel > this.level) {
        this.level = newLevel;
        this.events.emit({ type: "levelUp", level: newLevel });
      }
    }

    this.piecesPlaced++;
    this.canHold = true;
    this.active = null;

    if (
      this.mode.end &&
      "lines" in this.mode.end &&
      this.lines >= this.mode.end.lines
    ) {
      this.endGame("goalReached");
      return;
    }

    this.spawnFromQueue();
  }

  private spawnFromQueue(): void {
    const kind = this.queue.shift() as PieceKind;
    this.queue.push(this.bag.next());
    this.spawnAs(kind);
    if (this.status === "running") {
      this.events.emit({
        type: "pieceSpawn",
        piece: kind,
        queue: [...this.queue],
      });
    }
  }

  private spawnAs(kind: PieceKind): void {
    const piece = spawnPiece(kind);
    if (collides(this.board, piece)) {
      this.active = null;
      this.endGame("blockOut");
      return;
    }
    this.active = piece;
    this.gravityAcc = 0;
    this.lockCounter = 0;
    this.lockResets = 0;
    this.lowestY = piece.y;
    this.lastMoveWasRotation = false;
    this.lastKickIndex = 0;
  }

  private addScore(delta: number): void {
    if (delta <= 0) return;
    this.score += delta;
    this.events.emit({ type: "scoreChange", score: this.score, delta });
  }

  private endGame(reason: GameOverReason): void {
    this.status = "ended";
    const seconds = this.ticks / TICKS_PER_SECOND;
    this.final = {
      score: this.score,
      lines: this.lines,
      level: this.level,
      ticks: this.ticks,
      durationMs: Math.round(this.ticks * TICK_MS),
      pps: seconds > 0 ? this.piecesPlaced / seconds : 0,
      piecesPlaced: this.piecesPlaced,
      maxCombo: this.maxCombo,
      quads: this.quads,
      tSpins: this.tSpins,
      reason,
    };
    this.events.emit({ type: "gameOver", stats: this.final });
    this.bump();
  }

  private bump(): void {
    this.version++;
  }
}
