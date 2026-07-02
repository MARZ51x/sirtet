import { z } from "zod";
import { Engine, ENGINE_VERSION } from "./engine";
import { MODES } from "./modes";
import type { Seed } from "./rng";
import type { EngineSnapshot, InputAction, ModeId } from "./types";

// A replay is the seed plus every tick-stamped input. Because the engine is
// pure and tick-based, replaying reproduces the exact final state. Recorded
// client-side today; the hook for future server-side score verification.

const InputActionSchema: z.ZodType<InputAction> = z.union([
  z.object({
    action: z.enum(["moveLeft", "moveRight", "softDrop"]),
    edge: z.enum(["press", "release"]),
  }),
  z.object({
    action: z.enum(["hardDrop", "rotateCw", "rotateCcw", "hold"]),
  }),
]);

export const ReplayLogSchema = z.object({
  engineVersion: z.string(),
  modeId: z.enum(["marathon", "sprint", "ultra"]),
  seed: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  startLevel: z.number().int().min(1).max(15),
  actions: z.array(z.tuple([z.number().int().min(0), InputActionSchema])),
});

export type ReplayLog = z.infer<typeof ReplayLogSchema>;

export class ReplayRecorder {
  private actions: [number, InputAction][] = [];

  constructor(
    private readonly modeId: ModeId,
    private readonly seed: Seed,
    private readonly startLevel: number,
  ) {}

  record(tick: number, action: InputAction): void {
    this.actions.push([tick, action]);
  }

  toLog(): ReplayLog {
    return {
      engineVersion: ENGINE_VERSION,
      modeId: this.modeId,
      seed: [...this.seed] as [number, number, number, number],
      startLevel: this.startLevel,
      actions: [...this.actions],
    };
  }
}

export function serializeReplay(log: ReplayLog): string {
  return JSON.stringify(log);
}

export function deserializeReplay(raw: string): ReplayLog | null {
  try {
    const parsed = ReplayLogSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Re-simulate a replay and return the final snapshot. Runs until the game
 * ends or `maxTicks` elapses after the last recorded action.
 */
export function runReplay(log: ReplayLog, maxTicks = 60 * 60 * 60): EngineSnapshot {
  const engine = new Engine(MODES[log.modeId], log.seed as Seed, {
    startLevel: log.startLevel,
  });
  const byTick = new Map<number, InputAction[]>();
  let lastTick = 0;
  for (const [tick, action] of log.actions) {
    const list = byTick.get(tick) ?? [];
    list.push(action);
    byTick.set(tick, list);
    lastTick = Math.max(lastTick, tick);
  }

  const limit = Math.min(maxTicks, lastTick + 60 * TICKS_SETTLE_SECONDS);
  for (let t = 0; t <= limit; t++) {
    if (engine.snapshot().status === "ended") break;
    engine.tick(byTick.get(t) ?? []);
  }
  return engine.snapshot();
}

const TICKS_SETTLE_SECONDS = 30;
