import { TICK_MS } from "./core/types";

// Fixed-timestep accumulator driven by requestAnimationFrame. The engine
// updates only in whole ticks (deterministic at any refresh rate); the
// renderer gets an interpolation alpha for smooth visuals.

export interface LoopCallbacks {
  /** run one engine tick (drain input inside) */
  tick: () => void;
  /** draw a frame; alpha = fraction of a tick accumulated (0..1) */
  render: (alpha: number) => void;
}

export class GameLoop {
  private rafId: number | null = null;
  private last = 0;
  private acc = 0;
  private paused = false;

  constructor(private readonly callbacks: LoopCallbacks) {}

  start(): void {
    if (this.rafId !== null) return;
    this.last = performance.now();
    this.acc = 0;
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  get running(): boolean {
    return this.rafId !== null;
  }

  /** While paused the loop keeps rendering but skips engine ticks. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused) {
      // no catch-up burst after resume
      this.last = performance.now();
      this.acc = 0;
    }
  }

  private frame = (now: number): void => {
    // clamp: max ~15 ticks of catch-up, prevents the spiral of death
    this.acc += Math.min(now - this.last, 250);
    this.last = now;

    if (this.paused) {
      this.acc = 0;
    } else {
      while (this.acc >= TICK_MS) {
        this.callbacks.tick();
        this.acc -= TICK_MS;
      }
    }

    this.callbacks.render(this.acc / TICK_MS);
    this.rafId = requestAnimationFrame(this.frame);
  };
}
