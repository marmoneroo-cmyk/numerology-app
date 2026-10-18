/*
 * The personal year goes by the last birthday (the owner, 2026-10-18): the birth day and month with the year in
 * which the person last had a birthday, by the computer's date. Before the birthday comes, it is still last
 * year's; on the birthday itself it is the new one. No +1. The personal month and day, the years table, the
 * how-calculated steps and saved readings all follow it.
 */
import { describe, it, expect } from "vitest";
import { ENGINE_VERSION, lastBirthdayYear, personalYearOn, PY, PM, PD, fullCalc, yearCycle, withoutPlusOne } from "../index.js";

const day = (y, m, d) => new Date(y, m - 1, d, 12);
const NAME = "שני כהן אזולאי";

describe("the year of the last birthday", () => {
  it("is last year until the birthday comes, and this year from the birthday on", () => {
    expect(lastBirthdayYear(11, 11, day(2026, 10, 18))).toBe(2025);
    expect(lastBirthdayYear(19, 10, day(2026, 10, 18))).toBe(2025);
    expect(lastBirthdayYear(18, 10, day(2026, 10, 18))).toBe(2026);
    expect(lastBirthdayYear(15, 8, day(2026, 10, 18))).toBe(2026);
    expect(lastBirthdayYear(1, 1, day(2026, 1, 1))).toBe(2026);
    expect(lastBirthdayYear(31, 12, day(2026, 12, 30))).toBe(2025);
  });
});

describe("the personal year, by the last birthday", () => {
  it("is the owner's examples on 18.10.2026", () => {
    // 11.11, birthday not yet: 1+1+1+1 + 2+0+2+5 = 13 -> 4 (by the calendar year it would be 5)
    expect(personalYearOn(11, 11, day(2026, 10, 18))).toBe(4);
    // 19.10, birthday tomorrow: 1+9+1+0 + 2+0+2+5 = 20 -> 2
    expect(personalYearOn(19, 10, day(2026, 10, 18))).toBe(2);
    // 18.10, birthday today: 1+8+1+0 + 2+0+2+6 = 20 -> 2
    expect(personalYearOn(18, 10, day(2026, 10, 18))).toBe(2);
    // 15.8, birthday past: 1+5+0+8 + 2+0+2+6 = 24 -> 6
    expect(personalYearOn(15, 8, day(2026, 10, 18))).toBe(6);
  });

  it("changes on the birthday, not on January 1", () => {
    expect(personalYearOn(15, 8, day(2026, 1, 1))).toBe(PY(15, 8, 2025));
    expect(personalYearOn(15, 8, day(2026, 8, 14))).toBe(PY(15, 8, 2025));
    expect(personalYearOn(15, 8, new Date(2026, 7, 15, 0, 0))).toBe(PY(15, 8, 2026));
  });

  it("is a 9 as it sums, never moved on to 1", () => {
    // 0+9+0+8 + 2+0+2+6 = 27 -> 9, after the birthday
    expect(personalYearOn(9, 8, day(2026, 10, 5))).toBe(9);
  });

  it("for a birthday on February 29, counts it from March 1 in a year without one", () => {
    expect(lastBirthdayYear(29, 2, day(2027, 2, 28))).toBe(2026);
    expect(lastBirthdayYear(29, 2, day(2027, 3, 1))).toBe(2027);
    expect(lastBirthdayYear(29, 2, day(2028, 2, 29))).toBe(2028);
  });
});

describe("what is built on it", () => {
  it("the personal month and day add the calendar month and day to it", () => {
    // 11.11 on 18.10.2026: year 4, month 4+10 = 14 -> 5, day 5+18 = 23 -> 5
    expect(PM(11, 11, day(2026, 10, 18))).toBe(5);
    expect(PD(11, 11, day(2026, 10, 18))).toBe(5);
  });

  it("the years table marks the year of the last birthday, two back and ten ahead of it", () => {
    const proj = yearCycle(11, 11, day(2026, 10, 18));
    expect(proj.find((p) => p.isCurrent)).toEqual({ year: 2025, py: 4, isCurrent: true });
    expect(proj.map((p) => p.year)).toEqual([2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035]);
    for (const { year, py } of proj) expect([year, py]).toEqual([year, PY(11, 11, year)]);
  });

  it("a full map has the same year as its table", () => {
    const r = fullCalc(11, 11, 1985, NAME, day(2026, 10, 18));
    expect([r.py, r.pm, r.pd]).toEqual([4, 5, 5]);
    expect(r.proj.find((p) => p.isCurrent).py).toBe(r.py);
  });

  it("is engine 4", () => {
    expect(ENGINE_VERSION.split(".")[0]).toBe("4");
  });
});

describe("a saved reading made under the calendar-year rule", () => {
  const birthDate = "1985-11-11";
  const computedFor = day(2026, 10, 13).toISOString();
  const old = fullCalc(11, 11, 1985, NAME, day(2026, 10, 13));

  it("is shown with the year of the last birthday on the day it was made for", () => {
    const saved = { type: "map", engineVersion: "3.0.0", computedFor, input: { birthDate, add: false }, result: { ...old, py: 5, pm: 6, pd: 1 } };
    const shown = withoutPlusOne(saved);
    expect(shown.recalculated).toBe(true);
    expect(shown.result.py).toBe(4);
    expect(shown.result.proj.find((p) => p.isCurrent).year).toBe(2025);
    expect(shown.result.nv).toBe(old.nv);
  });

  it("is left alone when the birthday rule gives the same numbers", () => {
    const saved = { type: "map", engineVersion: "3.0.0", computedFor, input: { birthDate: "1990-08-15", add: false }, result: fullCalc(15, 8, 1990, NAME, day(2026, 10, 13)) };
    expect(withoutPlusOne(saved)).toBe(saved);
  });

  it("made by engine 4 is left alone", () => {
    const saved = { type: "map", engineVersion: ENGINE_VERSION, computedFor, input: { birthDate, add: false }, result: old };
    expect(withoutPlusOne(saved)).toBe(saved);
  });
});
