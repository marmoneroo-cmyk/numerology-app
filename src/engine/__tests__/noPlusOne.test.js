/*
 * The personal year never has a +1 (the owner, 2026-10-12, "remove it from every calculation"); since
 * 2026-10-18 it is the birth day and month with the year of the last birthday (lastBirthday.test.js). From 2026-10-10 to then, July 1 - December 31 added 1; before,
 * a checkbox did. The personal month and day, and the years table, are built on it.
 */
import { describe, it, expect } from "vitest";
import * as engine from "../index.js";
import { personalYearOn, PY, PM, PD, fullCalc, yearCycle } from "../index.js";

const day = (y, m, d) => new Date(y, m - 1, d, 12);
const NAME = "שני כהן אזולאי";

describe("the personal year, without a +1", () => {
  // 1+5+0+8 + 2+0+2+6 = 24 -> 6
  it("is the birth day and month with the last birthday's year, never one more, in every month", () => {
    // since 2026-10-18 by the last birthday: before August 15 the 2025 year, 1+5+0+8 + 2+0+2+5 = 23 -> 5
    for (const at of [day(2026, 1, 1), day(2026, 6, 30), day(2026, 7, 1)]) {
      expect([at.toDateString(), personalYearOn(15, 8, at)]).toEqual([at.toDateString(), 5]);
    }
    for (const at of [day(2026, 8, 15), day(2026, 10, 12), day(2026, 12, 31)]) {
      expect([at.toDateString(), personalYearOn(15, 8, at)]).toEqual([at.toDateString(), 6]);
    }
    expect(PY(15, 8, 2026)).toBe(6);
  });

  it("does not change on January 1 (since 2026-10-18 it changes on the birthday)", () => {
    expect(personalYearOn(15, 8, new Date(2026, 11, 31, 23, 59))).toBe(6);
    expect(personalYearOn(15, 8, new Date(2027, 0, 1, 0, 0))).toBe(6);
  });

  it("is a 9 as it sums, never moved on to 1", () => {
    // 0+9+0+8 + 2+0+2+6 = 27 -> 9
    expect(personalYearOn(9, 8, day(2026, 10, 5))).toBe(9);
  });

  it("leaves no +1 in the engine to call", () => {
    expect(engine.addsOne).toBeUndefined();
  });
});

describe("what is built on it", () => {
  it("the personal month is the personal year and the month, the personal day the month and the day", () => {
    // October 5, 2026: year 6, month 6+10 = 16 -> 7, day 7+5 = 12 -> 3
    expect(PM(15, 8, day(2026, 10, 5))).toBe(7);
    expect(PD(15, 8, day(2026, 10, 5))).toBe(3);
  });

  it("a full map made in October has the plain year, month and day, and so does its years table", () => {
    const r = fullCalc(15, 8, 1990, NAME, day(2026, 10, 5));
    expect([r.py, r.pm, r.pd]).toEqual([6, 7, 3]);
    expect(r.proj.find((p) => p.isCurrent)).toEqual({ year: 2026, py: 6, isCurrent: true });
    expect(r.proj).toEqual(yearCycle(15, 8, day(2026, 10, 5)));
  });

  it("the years table runs from two years back to ten ahead, each year by its own digits", () => {
    const proj = yearCycle(15, 8, day(2026, 10, 5));
    expect(proj.map((p) => p.year)).toEqual([2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036]);
    for (const { year, py } of proj) expect([year, py]).toEqual([year, PY(15, 8, year)]);
  });

  it("the map is the same in September and in October of one year, but for the month and the day", () => {
    const spring = fullCalc(15, 8, 1990, NAME, day(2026, 9, 5));
    const autumn = fullCalc(15, 8, 1990, NAME, day(2026, 10, 5));
    expect(spring.py).toBe(autumn.py);
    expect(spring.proj).toEqual(autumn.proj);
    expect(spring.psych).toEqual(autumn.psych);
  });
});
