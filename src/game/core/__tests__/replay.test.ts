import { describe, expect, it } from "vitest";
import { Engine } from "../engine";
import { MODES } from "../modes";
import {
  ReplayRecorder,
  deserializeReplay,
  runReplay,
  serializeReplay,
} from "../replay";
import type { Seed } from "../rng";
import type { InputAction } from "../types";

const SEED: Seed = [101, 202, 303, 404];

// A scripted "game": rotations, movement, and repeated hard drops.
const SCRIPT: [number, InputAction][] = [
  [2, { action: "rotateCw" }],
  [3, { action: "moveLeft", edge: "press" }],
  [6, { action: "moveLeft", edge: "release" }],
  [8, { action: "hardDrop" }],
  [10, { action: "moveRight", edge: "press" }],
  [14, { action: "moveRight", edge: "release" }],
  [15, { action: "rotateCcw" }],
  [16, { action: "hardDrop" }],
  [18, { action: "hold" }],
  [20, { action: "hardDrop" }],
  [24, { action: "softDrop", edge: "press" }],
  [40, { action: "softDrop", edge: "release" }],
  [42, { action: "hardDrop" }],
  [50, { action: "hardDrop" }],
];
const LAST_TICK = 60;

function runScripted(): {
  finalScore: number;
  finalLines: number;
  board: Uint8Array;
  log: ReturnType<ReplayRecorder["toLog"]>;
} {
  const engine = new Engine(MODES.marathon, SEED);
  const recorder = new ReplayRecorder("marathon", SEED, 1);
  const byTick = new Map<number, InputAction[]>();
  for (const [tick, action] of SCRIPT) {
    byTick.set(tick, [...(byTick.get(tick) ?? []), action]);
    recorder.record(tick, action);
  }
  for (let t = 0; t <= LAST_TICK; t++) {
    if (engine.snapshot().status === "ended") break;
    engine.tick(byTick.get(t) ?? []);
  }
  const s = engine.snapshot();
  return {
    finalScore: s.score,
    finalLines: s.lines,
    board: Uint8Array.from(s.board),
    log: recorder.toLog(),
  };
}

describe("replay", () => {
  it("re-simulating a recorded log reproduces the exact final state", () => {
    const original = runScripted();
    const replayed = runReplay(original.log, LAST_TICK);
    expect(replayed.score).toBe(original.finalScore);
    expect(replayed.lines).toBe(original.finalLines);
    expect(Uint8Array.from(replayed.board)).toEqual(original.board);
  });

  it("is deterministic across repeated replays", () => {
    const { log } = runScripted();
    const a = runReplay(log, LAST_TICK);
    const b = runReplay(log, LAST_TICK);
    expect(a.score).toBe(b.score);
    expect(Uint8Array.from(a.board)).toEqual(Uint8Array.from(b.board));
  });

  it("survives a serialize/deserialize round trip", () => {
    const { log } = runScripted();
    const restored = deserializeReplay(serializeReplay(log));
    expect(restored).toEqual(log);
  });

  it("rejects malformed payloads", () => {
    expect(deserializeReplay("not json")).toBeNull();
    expect(deserializeReplay('{"engineVersion":"1"}')).toBeNull();
    expect(
      deserializeReplay(
        JSON.stringify({
          engineVersion: "1.0.0",
          modeId: "bogus",
          seed: [1, 2, 3, 4],
          startLevel: 1,
          actions: [],
        }),
      ),
    ).toBeNull();
  });
});
