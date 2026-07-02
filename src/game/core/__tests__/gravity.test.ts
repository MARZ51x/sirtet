import { describe, expect, it } from "vitest";
import { rowsPerTick, secondsPerRow } from "../gravity";

describe("gravity curve", () => {
  it("level 1 falls 1 row per second", () => {
    expect(secondsPerRow(1)).toBeCloseTo(1.0, 9);
    expect(rowsPerTick(1)).toBeCloseTo(1 / 60, 9);
  });

  it("matches the guideline formula for levels 2-19", () => {
    for (let level = 2; level <= 19; level++) {
      const expected = Math.pow(0.8 - (level - 1) * 0.007, level - 1);
      expect(secondsPerRow(level)).toBeCloseTo(expected, 9);
    }
    // spot values
    expect(secondsPerRow(2)).toBeCloseTo(0.793, 9);
    expect(secondsPerRow(5)).toBeCloseTo(Math.pow(0.772, 4), 9);
  });

  it("is strictly faster each level", () => {
    for (let level = 2; level <= 19; level++) {
      expect(secondsPerRow(level)).toBeLessThan(secondsPerRow(level - 1));
    }
  });

  it("clamps to 20G at level 20+", () => {
    expect(rowsPerTick(20)).toBe(20);
    expect(rowsPerTick(30)).toBe(20);
  });
});
