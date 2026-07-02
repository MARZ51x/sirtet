import type { PieceKind } from "./types";
import { PIECE_KINDS } from "./types";

/** 128-bit seed as four uint32s. Generated outside core (crypto) and recorded in replays. */
export type Seed = readonly [number, number, number, number];

/** sfc32 — small fast counter PRNG. Deterministic across platforms. */
export class Sfc32 {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: Seed) {
    this.a = seed[0] >>> 0;
    this.b = seed[1] >>> 0;
    this.c = seed[2] >>> 0;
    this.d = seed[3] >>> 0;
    // warm up so weak seeds diffuse
    for (let i = 0; i < 12; i++) this.next();
  }

  /** float in [0, 1) */
  next(): number {
    this.a >>>= 0;
    this.b >>>= 0;
    this.c >>>= 0;
    this.d >>>= 0;
    let t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  /** integer in [0, n) */
  nextInt(n: number): number {
    return Math.floor(this.next() * n);
  }
}

/** hex string (any length ≥ 32 chars) → Seed */
export function seedFromHex(hex: string): Seed {
  const clean = hex.replace(/[^0-9a-f]/gi, "").padEnd(32, "0");
  const part = (i: number) => parseInt(clean.slice(i * 8, i * 8 + 8), 16) >>> 0;
  return [part(0), part(1), part(2), part(3)];
}

/** 7-bag randomizer: each bag holds one of each tetromino, Fisher-Yates shuffled. */
export class SevenBag {
  private rng: Sfc32;
  private bag: PieceKind[] = [];

  constructor(seed: Seed) {
    this.rng = new Sfc32(seed);
  }

  next(): PieceKind {
    if (this.bag.length === 0) this.refill();
    return this.bag.pop() as PieceKind;
  }

  private refill(): void {
    this.bag = [...PIECE_KINDS];
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = this.rng.nextInt(i + 1);
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }
}
