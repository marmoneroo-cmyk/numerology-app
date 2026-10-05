/*
 * The calculations that used to live inside App.jsx event handlers and JSX -
 * compatibility scores, the personal-year cycle, the daily ritual number and
 * the master-number base - must match the shipped fragments exactly.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { isDeepStrictEqual } from "node:util";
import * as engine from "../index.js";
import * as handlers from "./legacy-handlers.js";

function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const HEBREW = [..."אבגדהוזחטיכךלמםנןסעפףצץקרשת "];
const person = (r) => {
  let name = "";
  for (let i = 1 + Math.floor(r() * 14); i > 0; i--) name += HEBREW[Math.floor(r() * HEBREW.length)];
  return { d: 1 + Math.floor(r() * 31), m: 1 + Math.floor(r() * 12), y: 1900 + Math.floor(r() * 131), name };
};
const PEOPLE = (() => {
  const r = rng(2026);
  return Array.from({ length: 300 }, () => person(r));
})();

afterEach(() => vi.useRealTimers());

function compareAllPairs(run) {
  const mismatches = [];
  let checked = 0;
  for (const a of PEOPLE) for (const b of PEOPLE) {
    const [got, want] = run(a, b);
    checked++;
    if (!isDeepStrictEqual(got, want) && mismatches.length < 5) mismatches.push({ a, b, got, want });
  }
  return { checked, mismatches };
}

describe("compatibility readings match the shipped handlers for every pair of 300 people", () => {
  it.each([["love", "love"], ["twin", "twin"], ["biz", "biz"], ["parent", "parent"], ["no type", undefined]])("studio match: %s", (_, type) => {
    const res = compareAllPairs((a, b) => {
      const want = handlers.doMatchCalc(a, b, a.name, b.name, type);
      const got = engine.matchReading(a, b, type);
      return [{ res: got, key: engine.compatKey(got.lp1, got.lp2) }, { res: want.res, key: want.k1 }];
    });
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(90000);
  });

  it("couple", () => {
    const res = compareAllPairs((a, b) => [engine.coupleReading(a, b), handlers.calcCouple(a, b, a.name, b.name)]);
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(90000);
  });

  it("parent and child", () => {
    const res = compareAllPairs((p, c) => [engine.parentChildReading(p, c), handlers.calcPC(p, c, p.name, c.name)]);
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(90000);
  });
});

describe("hand-checked compatibility examples", () => {
  const shani = { d: 15, m: 8, y: 1990, name: "שני כהן אזולאי" }; // LP 6, NV 4, SU 1
  const partner = { d: 1, m: 1, y: 1990, name: "שני" }; // LP 1+1+1+9+9 = 21 -> 3, NV 9, SU 1
  it("studio love match: |6-3| = 3 (no LP bonus), same soul +15, no name bonus, score 65", () => {
    expect(engine.matchReading(shani, partner, "love")).toMatchObject({ lp1: 6, lp2: 3, su1: 1, su2: 1, score: 65, harmony: 7, tension: 3 });
  });
  it("compatKey puts the smaller life path first", () => {
    expect([engine.compatKey(6, 3), engine.compatKey(3, 6), engine.compatKey(4, 4)]).toEqual(["3-6", "3-6", "4-4"]);
  });
});

describe("cycle, ritual number and master base", () => {
  const CLOCKS = [new Date(2026, 9, 5, 12), new Date(2026, 0, 1, 0, 0, 30), new Date(2025, 11, 31, 23, 59), new Date(2024, 1, 29, 9)];

  it.each(CLOCKS)("personal-year cycle for every birthday, on %s", (now) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    const wants = [];
    for (let m = 1; m <= 12; m++) for (let d = 1; d <= 31; d++) for (const add of [true, false]) wants.push([d, m, add, handlers.yearCycleButton({ d, m }, add)]);
    vi.setSystemTime(new Date(1999, 2, 3, 4)); // a decoy clock: the engine must use `now`, not the system clock
    const bad = wants.filter(([d, m, add, want]) => !isDeepStrictEqual(engine.yearCycle(d, m, add, now), want));
    expect(bad.slice(0, 3)).toEqual([]);
    expect(wants.length).toBe(744);
  });

  it("daily ritual number for every day of 2024 (a leap year)", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const bad = [];
    for (let t = new Date(2024, 0, 1, 12); t.getFullYear() === 2024; t = new Date(t.getTime() + 86400000)) {
      vi.setSystemTime(t);
      const want = handlers.ritualNumber();
      vi.setSystemTime(new Date(1999, 2, 3, 4));
      if (engine.dailyRitualNumber(t) !== want) bad.push(t.toDateString());
    }
    expect(bad).toEqual([]);
  });

  it("master base for 1 … 99", () => {
    const bad = [];
    for (let n = 1; n <= 99; n++) if (engine.masterBase(n) !== handlers.shareImageBase({ lp: n })) bad.push(n);
    expect(bad).toEqual([]);
    expect([engine.masterBase(11), engine.masterBase(22), engine.masterBase(33), engine.masterBase(7)]).toEqual([2, 4, 6, 7]);
  });
});
