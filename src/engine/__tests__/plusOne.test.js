/*
 * The method's +1: from July 1 to December 31 the personal year moves on by one.
 * It used to be a checkbox; since 2026-10-10 the date decides (the owner's request).
 */
import { describe, it, expect } from "vitest";
import { addsOne, personalYearOn, PY, fullCalc, yearCycle } from "../index.js";

const day = (y, m, d) => new Date(y, m - 1, d, 12);

describe("the +1 season", () => {
  it("runs from July 1 to December 31", () => {
    expect(addsOne(day(2026, 6, 30))).toBe(false);
    expect(addsOne(day(2026, 7, 1))).toBe(true);
    expect(addsOne(day(2026, 12, 31))).toBe(true);
    expect(addsOne(day(2027, 1, 1))).toBe(false);
  });

  it("starts at midnight on July 1, not at noon", () => {
    expect(addsOne(new Date(2026, 5, 30, 23, 59))).toBe(false);
    expect(addsOne(new Date(2026, 6, 1, 0, 0))).toBe(true);
  });
});

describe("the personal year on a date", () => {
  // 1+5+0+8 + 2+0+2+6 = 24 -> 6
  it("is the plain personal year until June 30", () => {
    expect(personalYearOn(15, 8, day(2026, 6, 30))).toBe(6);
    expect(personalYearOn(15, 8, day(2026, 6, 30))).toBe(PY(15, 8, 2026, false));
  });

  it("adds 1 from July 1 to December 31", () => {
    expect(personalYearOn(15, 8, day(2026, 7, 1))).toBe(7);
    expect(personalYearOn(15, 8, day(2026, 12, 31))).toBe(7);
  });

  it("reduces after adding: 9 + 1 is 1", () => {
    // 0+9+0+8 + 2+0+2+6 = 27 -> 9
    expect(PY(9, 8, 2026, false)).toBe(9);
    expect(personalYearOn(9, 8, day(2026, 7, 1))).toBe(1);
  });

  it("starts the new calendar year without the +1", () => {
    // 1+5+0+8 + 2+0+2+7 = 25 -> 7
    expect(personalYearOn(15, 8, day(2027, 1, 1))).toBe(7);
  });
});

describe("readings follow the date when no +1 is given", () => {
  const NAME = "שני כהן אזולאי";

  it("a full map made in October adds 1", () => {
    const r = fullCalc(15, 8, 1990, NAME, undefined, day(2026, 10, 5));
    expect(r.py).toBe(7);
    expect(r.proj.find((p) => p.isCurrent).py).toBe(7);
  });

  it("a full map made in March does not", () => {
    const r = fullCalc(15, 8, 1990, NAME, null, day(2026, 3, 5));
    expect(r.py).toBe(6);
  });

  it("an explicit choice still wins, so saved readings and the oracles keep their numbers", () => {
    expect(fullCalc(15, 8, 1990, NAME, false, day(2026, 10, 5)).py).toBe(6);
    expect(fullCalc(15, 8, 1990, NAME, true, day(2026, 3, 5)).py).toBe(7);
  });

  it("the year cycle moves on with it", () => {
    const autumn = yearCycle(15, 8, undefined, day(2026, 10, 5));
    expect(autumn).toEqual(yearCycle(15, 8, true, day(2026, 10, 5)));
    const spring = yearCycle(15, 8, undefined, day(2026, 3, 5));
    expect(spring).toEqual(yearCycle(15, 8, false, day(2026, 3, 5)));
  });
});
