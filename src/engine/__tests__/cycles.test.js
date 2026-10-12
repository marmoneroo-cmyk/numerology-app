/*
 * The four life cycles by age. The screens used to show four 9-year rows starting at 27 minus the life
 * path, so anyone younger than that, or 36 years past it, was in no cycle at all (71.6% of people, the
 * audit of 2026-10-11). The boundaries stay; the first cycle now starts at birth and the last never ends.
 */
import { describe, it, expect } from "vitest";
import { cycleSpans, cycleAt, fullCalc } from "../index.js";

describe("life cycle ages", () => {
  // life path 4: exit 27 - 4 = 23, so the cycles turn at 32, 41 and 50
  it("runs from birth to the first turn, 9 years twice, then on", () => {
    expect(cycleSpans(23)).toEqual([
      { from: 0, to: 32 },
      { from: 32, to: 41 },
      { from: 41, to: 50 },
      { from: 50, to: null },
    ]);
  });

  it("puts every age in exactly one cycle", () => {
    expect([0, 20, 31, 32, 40, 41, 49, 50, 70, 104].map((age) => cycleAt(age, 23))).toEqual([0, 0, 0, 1, 1, 2, 2, 3, 3, 3]);
  });

  it("a 20-year-old with life path 4 is in the first cycle (the screens showed none)", () => {
    const r = fullCalc(15, 8, 2006, "", new Date(2026, 9, 11));
    expect([r.age, r.exit]).toEqual([20, 23]);
    expect(cycleAt(r.age, r.exit)).toBe(0);
  });

  it("everyone born 1900-2026 is in a cycle", () => {
    const now = new Date(2026, 9, 11);
    let outside = 0;
    for (let y = 1900; y <= 2026; y += 1) for (let m = 1; m <= 12; m += 1) {
      const r = fullCalc(15, m, y, "", now);
      if (r.age >= 0 && cycleAt(r.age, r.exit) === -1) outside += 1;
    }
    expect(outside).toBe(0);
  });
});
