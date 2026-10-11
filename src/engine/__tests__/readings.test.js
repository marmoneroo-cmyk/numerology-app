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

// the scores read the soul number, which counts ה since 2026-10-11: the shipped handlers still agree on
// every name without ה, which is what these sweeps compare
const PLAIN = PEOPLE.filter((p) => !p.name.includes("ה"));

function compareAllPairs(run, people = PLAIN) {
  const mismatches = [];
  let checked = 0;
  for (const a of people) for (const b of people) {
    const [got, want] = run(a, b);
    checked++;
    if (!isDeepStrictEqual(got, want) && mismatches.length < 5) mismatches.push({ a, b, got, want });
  }
  return { checked, mismatches };
}

describe("compatibility readings match the shipped handlers for every pair of 300 people", () => {
  it.each([["love", "love"], ["twin", "twin"], ["biz", "biz"], ["no type", undefined]])("studio match: %s", (_, type) => {
    const res = compareAllPairs((a, b) => {
      const want = handlers.doMatchCalc(a, b, a.name, b.name, type);
      const got = engine.matchReading(a, b, type);
      return [{ res: got, key: engine.compatKey(got.lp1, got.lp2) }, { res: want.res, key: want.k1 }];
    });
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(PLAIN.length ** 2);
  });

  // the shipped code scored a parent and child match as a love match (the audit of 2026-10-11);
  // it now scores as the parent-and-child reading does, the first person being the parent
  it("studio match: parent, scored as parent and child", () => {
    const res = compareAllPairs((a, b) => {
      const want = handlers.doMatchCalc(a, b, a.name, b.name, "parent").res;
      const got = engine.matchReading(a, b, "parent");
      const score = engine.parentChildReading(a, b).score;
      const gauges = {
        harmony: Math.min(10, Math.round(score / 10)),
        tension: Math.min(10, Math.round((100 - score) / 12)),
        growth: want.growth, // from the numbers, not the score
      };
      return [got, { ...want, score, ...gauges }];
    });
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(PLAIN.length ** 2);
  });

  // since 2026-10-11 (the owner) the couple scores as the studio's love match everywhere; the shipped
  // התאמה tab added 5 more for name numbers 1 or 2 apart, and nothing else differed
  it("couple: the studio's love match, 5 under the shipped tab exactly when the names are 1 or 2 apart", () => {
    const res = compareAllPairs((a, b) => {
      const got = engine.coupleReading(a, b);
      const shipped = handlers.calcCouple(a, b, a.name, b.name);
      const numbersOf = (r) => [r.lp1, r.lp2, r.nv1, r.nv2, r.su1, r.su2, r.ex1, r.ex2];
      const nameGap = Math.abs(shipped.nv1 - shipped.nv2);
      return [
        { love: isDeepStrictEqual(got, engine.matchReading(a, b, "love")), numbers: numbersOf(got), gap: shipped.score - got.score },
        { love: true, numbers: numbersOf(shipped), gap: nameGap === 1 || nameGap === 2 ? 5 : 0 },
      ];
    });
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(PLAIN.length ** 2);
  });

  it("parent and child, with the original life paths beside the compared ones", () => {
    const res = compareAllPairs((p, c) => {
      const { lpmP, lpmC, ...got } = engine.parentChildReading(p, c);
      return [[got, lpmP, lpmC], [handlers.calcPC(p, c, p.name, c.name), engine.LPm(p.d, p.m, p.y), engine.LPm(c.d, c.m, c.y)]];
    });
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(PLAIN.length ** 2);
  });
});

describe("hand-checked compatibility examples", () => {
  const shani = { d: 15, m: 8, y: 1990, name: "שני כהן אזולאי" }; // LP 6, NV 4, SU 6 (the ה counts since 2026-10-11)
  const partner = { d: 1, m: 1, y: 1990, name: "שני" }; // LP 1+1+1+9+9 = 21 -> 3, NV 9, SU 1
  const sister = { d: 15, m: 8, y: 1990, name: "שני" }; // LP 6, NV 9, SU 1
  it("studio love match: |6-3| = 3 (no LP bonus), souls 6 and 1 (no soul bonus), no name bonus, score 50", () => {
    expect(engine.matchReading(shani, partner, "love")).toMatchObject({ lp1: 6, lp2: 3, su1: 6, su2: 1, score: 50, harmony: 5, tension: 4 });
  });
  it("same life path +20 and the same soul +15, names 9 and 4: score 85", () => {
    // שי: ש3 + י1 = 4, its soul י = 1
    expect(engine.matchReading(sister, { ...sister, name: "שי" }, "love")).toMatchObject({ lp1: 6, lp2: 6, su1: 1, su2: 1, nv1: 9, nv2: 4, score: 85 });
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
