import { describe, expect, it } from "vitest";
import { Sfc32, SevenBag, seedFromHex, type Seed } from "../rng";
import { PIECE_KINDS } from "../types";

const SEED: Seed = [0xdeadbeef, 0x12345678, 0x9abcdef0, 0x0f1e2d3c];

describe("Sfc32", () => {
  it("same seed produces an identical 1000-draw sequence", () => {
    const a = new Sfc32(SEED);
    const b = new Sfc32(SEED);
    for (let i = 0; i < 1000; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it("stays in [0, 1)", () => {
    const rng = new Sfc32(SEED);
    for (let i = 0; i < 10_000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("different seeds diverge", () => {
    const a = new Sfc32(SEED);
    const b = new Sfc32([1, 2, 3, 4]);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });
});

describe("seedFromHex", () => {
  it("parses 32 hex chars into four uint32s", () => {
    expect(seedFromHex("00000001000000020000000300000004")).toEqual([
      1, 2, 3, 4,
    ]);
  });
});

describe("SevenBag", () => {
  it("deals exactly 100 of each piece over 700 draws", () => {
    const bag = new SevenBag(SEED);
    const counts = new Map<string, number>();
    for (let i = 0; i < 700; i++) {
      const p = bag.next();
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    for (const kind of PIECE_KINDS) {
      expect(counts.get(kind)).toBe(100);
    }
  });

  it("every bag-aligned 7-window contains all 7 pieces", () => {
    const bag = new SevenBag(SEED);
    for (let b = 0; b < 50; b++) {
      const window = new Set<string>();
      for (let i = 0; i < 7; i++) window.add(bag.next());
      expect(window.size).toBe(7);
    }
  });

  it("is deterministic per seed", () => {
    const a = new SevenBag(SEED);
    const b = new SevenBag(SEED);
    for (let i = 0; i < 70; i++) expect(a.next()).toBe(b.next());
  });
});
