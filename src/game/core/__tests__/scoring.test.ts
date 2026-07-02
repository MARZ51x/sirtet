import { describe, expect, it } from "vitest";
import { scoreClear } from "../scoring";

const base = {
  tSpin: "none" as const,
  perfectClear: false,
  combo: -1,
  b2b: false,
};

describe("scoreClear — base table", () => {
  it.each([
    [1, 100],
    [2, 300],
    [3, 500],
    [4, 800],
  ] as const)("%i lines = %i x level", (lines, points) => {
    expect(scoreClear({ ...base, lines, level: 1 }).points).toBe(points);
    expect(scoreClear({ ...base, lines, level: 5 }).points).toBe(points * 5);
  });

  it("t-spin values", () => {
    expect(
      scoreClear({ ...base, lines: 0, tSpin: "full", level: 1 }).points,
    ).toBe(400);
    expect(
      scoreClear({ ...base, lines: 0, tSpin: "mini", level: 1 }).points,
    ).toBe(100);
    expect(
      scoreClear({ ...base, lines: 1, tSpin: "full", level: 1 }).points,
    ).toBe(800);
    expect(
      scoreClear({ ...base, lines: 1, tSpin: "mini", level: 1 }).points,
    ).toBe(200);
    expect(
      scoreClear({ ...base, lines: 2, tSpin: "full", level: 1 }).points,
    ).toBe(1200);
    expect(
      scoreClear({ ...base, lines: 2, tSpin: "mini", level: 1 }).points,
    ).toBe(400);
    expect(
      scoreClear({ ...base, lines: 3, tSpin: "full", level: 1 }).points,
    ).toBe(1600);
  });
});

describe("scoreClear — back-to-back", () => {
  it("applies x1.5 to a difficult clear following a difficult clear", () => {
    const quad = scoreClear({ ...base, lines: 4, level: 1, b2b: true });
    expect(quad.points).toBe(1200); // 800 * 1.5
    expect(quad.b2b).toBe(true);
  });

  it("starts the chain on the first difficult clear without the bonus", () => {
    const first = scoreClear({ ...base, lines: 4, level: 1 });
    expect(first.points).toBe(800);
    expect(first.b2b).toBe(true);
  });

  it("breaks on a non-difficult clear", () => {
    const single = scoreClear({ ...base, lines: 1, level: 1, b2b: true });
    expect(single.b2b).toBe(false);
    expect(single.points).toBe(100); // no x1.5 for non-difficult
  });

  it("survives non-clearing locks", () => {
    const nothing = scoreClear({ ...base, lines: 0, level: 1, b2b: true });
    expect(nothing.b2b).toBe(true);
  });

  it("t-spin single continues the chain with the bonus", () => {
    const tss = scoreClear({
      ...base,
      lines: 1,
      tSpin: "full",
      level: 1,
      b2b: true,
    });
    expect(tss.points).toBe(1200); // 800 * 1.5
    expect(tss.b2b).toBe(true);
  });
});

describe("scoreClear — combo", () => {
  it("increments on consecutive clears and adds 50 x combo x level", () => {
    const first = scoreClear({ ...base, lines: 1, level: 2, combo: -1 });
    expect(first.combo).toBe(0);
    expect(first.points).toBe(200); // no combo bonus at combo 0

    const second = scoreClear({ ...base, lines: 1, level: 2, combo: 0 });
    expect(second.combo).toBe(1);
    expect(second.points).toBe(200 + 50 * 1 * 2);

    const third = scoreClear({ ...base, lines: 1, level: 2, combo: 1 });
    expect(third.combo).toBe(2);
    expect(third.points).toBe(200 + 50 * 2 * 2);
  });

  it("resets on a non-clearing lock", () => {
    const broken = scoreClear({ ...base, lines: 0, level: 1, combo: 5 });
    expect(broken.combo).toBe(-1);
  });
});

describe("scoreClear — perfect clear", () => {
  it.each([
    [1, 800],
    [2, 1200],
    [3, 1800],
    [4, 2000],
  ] as const)("%i-line perfect clear adds %i x level", (lines, bonus) => {
    const withPc = scoreClear({
      ...base,
      lines,
      level: 1,
      perfectClear: true,
    });
    const withoutPc = scoreClear({ ...base, lines, level: 1 });
    expect(withPc.points - withoutPc.points).toBe(bonus);
  });

  it("b2b quad perfect clear pays 3200", () => {
    const pc = scoreClear({
      ...base,
      lines: 4,
      level: 1,
      b2b: true,
      perfectClear: true,
    });
    expect(pc.points).toBe(1200 + 3200); // b2b quad + b2b quad PC
  });
});
