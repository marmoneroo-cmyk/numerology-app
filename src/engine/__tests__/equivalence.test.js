/*
 * The engine must give exactly what the shipped App.jsx gave, for every input,
 * except where the owner changed the method on 2026-10-11 (the soul's vowels add
 * ה, the personal month is the personal year plus the month and the personal day
 * adds the day, and karmic debts count every step of the reduction). Those are
 * checked against small reference versions of the new rules, written here apart
 * from the engine.
 * Each sweep collects mismatches instead of asserting per item, so a failure
 * prints the first offending inputs and the sweep sizes stay large but fast.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { isDeepStrictEqual } from "node:util";
import * as engine from "../index.js";
import * as legacy from "./legacy.js";

// the method since 2026-10-11, written apart from the engine
const NEW_VOWELS = new Set([..."אהויע"]);
const MASTERS = [11, 22, 33];
const KARMIC = [13, 14, 16, 19];
const digitSum = (n) => [...String(n)].reduce((a, c) => a + Number(c), 0);
const reduce = (n, keepMasters = false) => {
  let x = n;
  if (keepMasters && MASTERS.includes(x)) return x;
  while (x >= 10) {
    x = digitSum(x);
    if (keepMasters && MASTERS.includes(x)) return x;
  }
  return x;
};
const letters = (s, keep) => [...s].filter((c) => engine.LV[c] && keep(c)).reduce((a, c) => a + engine.LV[c], 0);
const isVowel = (c) => NEW_VOWELS.has(c);
const refSU = (s) => reduce(letters(s, isVowel), true);
const refEX = (s) => reduce(letters(s, (c) => !isVowel(c)), true);
const pad = (n) => String(n).padStart(2, "0");
const refPM = (d, m, now, add) => {
  const base = reduce(digitSum(`${pad(d)}${pad(m)}${now.getFullYear()}`));
  const py = (add ?? now.getMonth() >= 6) ? reduce(base + 1) : base;
  return reduce(py + now.getMonth() + 1);
};
const refPD = (d, m, now, add) => reduce(refPM(d, m, now, add) + now.getDate());
const chain = (n) => {
  const out = [n];
  for (let x = n; x >= 10; ) out.push((x = digitSum(x)));
  return out;
};
const refKarmic = (d, m, y, nm) => {
  const sums = [digitSum(`${d}${m}${y}`), letters(nm, () => true), letters(nm, isVowel), letters(nm, (c) => !isVowel(c))];
  const found = KARMIC.filter((k) => sums.some((s) => chain(s).includes(k)));
  if (KARMIC.includes(d)) found.push(d);
  return [...new Set(found)];
};
/** The parts of a map the owner did not change, which must still equal the shipped code's. */
const kept = ({ su, ex, pm, pd, kd, psych, ...rest }) => rest;

const CLOCKS = [
  ["a regular day", new Date(2026, 9, 5, 12, 0)],
  ["new year, just after midnight", new Date(2026, 0, 1, 0, 0, 30)],
  ["the last minute of a year", new Date(2025, 11, 31, 23, 59)],
  ["a leap day", new Date(2024, 1, 29, 9, 0)],
  ["a future year", new Date(2030, 6, 15, 18, 0)],
];

const HEBREW = "אבגדהוזחטיכךלמםנןסעפףצץקרשת";
const ALPHABET = [...(HEBREW + "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -'.\"ßé״")];
const FIXED_NAMES = ["שני כהן אזולאי", "שני", "", " ", "Shani Cohen", "Noa נועה", "צביה-ליאורה", HEBREW, "ע", "אאאא", "יוסף חיים"];

/** Small seeded generator so every run checks the same inputs. */
function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const pick = (r, list) => list[Math.floor(r() * list.length)];
function randomName(r) {
  let s = "";
  for (let i = Math.floor(r() * 24); i > 0; i--) s += pick(r, ALPHABET);
  return s;
}
const NAMES = (() => {
  const r = rng(7);
  return [...FIXED_NAMES, ...Array.from({ length: 3000 }, () => randomName(r))];
})();

function sweep(inputs, run) {
  const mismatches = [];
  let checked = 0;
  for (const input of inputs) {
    const [got, want] = run(input);
    checked++;
    if (!isDeepStrictEqual(got, want)) mismatches.push({ input, got, want });
  }
  return { checked, mismatches: mismatches.slice(0, 5) };
}

function* everyDate(fromYear = 1900, toYear = 2030) {
  for (let y = fromYear; y <= toYear; y++) for (let m = 1; m <= 12; m++) for (let d = 1; d <= 31; d++) yield [d, m, y];
}

afterEach(() => vi.useRealTimers());
const freeze = (now) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
};

describe("engine matches the shipped code", () => {
  it("R and Rm over -1,000 … 100,000", () => {
    const ns = Array.from({ length: 101001 }, (_, i) => i - 1000);
    const res = sweep(ns, (n) => [[engine.R(n), engine.Rm(n)], [legacy.R(n), legacy.Rm(n)]]);
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(101001);
  });

  it("name numbers and the live calculator over 3,011 names", () => {
    const res = sweep(NAMES, (s) => [
      [engine.NV(s), engine.liveNum(s), engine.SU(s), engine.EX(s)],
      [legacy.NV(s), legacy.liveNum(s), refSU(s), refEX(s)],
    ]);
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(3011);
  });

  it("a name with no ה keeps its shipped soul and consonants", () => {
    const plain = NAMES.filter((s) => !s.includes("ה"));
    const res = sweep(plain, (s) => [[engine.SU(s), engine.EX(s)], [legacy.SU(s), legacy.EX(s)]]);
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBeGreaterThan(1000);
  });

  it("date numbers, Lo Shu, karmic debts and personal years for every day 1900–2030", () => {
    const res = sweep(everyDate(), ([d, m, y]) => [
      [engine.LP(d, m, y), engine.LPm(d, m, y), engine.loShu(d, m, y), engine.karmicDebt(d, m, y, ""), engine.PY(d, m, y, false), engine.PY(d, m, y, true)],
      [legacy.LP(d, m, y), legacy.LPm(d, m, y), legacy.loShu(d, m, y), legacy.karmicDebt(d, m, y, ""), legacy.PY(d, m, y, false), legacy.PY(d, m, y, true)],
    ]);
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(31 * 12 * 131);
  });

  it("karmic debts with names: every step of the reduction, of the date, the name, the soul and the consonants", () => {
    const r = rng(11);
    const cases = Array.from({ length: 5000 }, () => [1 + Math.floor(r() * 31), 1 + Math.floor(r() * 12), 1900 + Math.floor(r() * 131), pick(r, NAMES)]);
    const res = sweep(cases, ([d, m, y, nm]) => [engine.karmicDebt(d, m, y, nm), refKarmic(d, m, y, nm)]);
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(5000);
    // every debt the shipped code found is still found
    const lost = cases.filter(([d, m, y, nm]) => legacy.karmicDebt(d, m, y, nm).some((k) => !engine.karmicDebt(d, m, y, nm).includes(k)));
    expect(lost).toEqual([]);
  });

  it("challenges for every pair -50 … 50", () => {
    const pairs = [];
    for (let a = -50; a <= 50; a++) for (let b = -50; b <= 50; b++) pairs.push([a, b]);
    const res = sweep(pairs, ([a, b]) => [engine.CH(a, b), legacy.CH(a, b)]);
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(101 * 101);
  });
});

// a clock no test date shares: anything the engine reads from the system
// clock instead of its `now` argument shows up as a mismatch
const DECOY = new Date(1999, 2, 3, 4, 5);
const ADD_VALUES = [true, false, 1, 0, "yes", "", undefined, null];
const LANGS = ["he", "en", "EN", undefined, "fr"];

describe.each(CLOCKS.map(([label, now], i) => [label, now, i]))("engine matches the shipped code on %s", (_, now, i) => {
  it("age, personal month and personal day for every birthday; explicit `now` under a decoy clock, default `now` under the real one", () => {
    freeze(now);
    const dates = [...everyDate(1920, 2030)];
    const wants = dates.map(([d, m, y]) => [legacy.CA(d, m, y), refPM(d, m, now), refPD(d, m, now)]);
    const defaults = dates.map(([d, m, y]) => [engine.CA(d, m, y), engine.PM(d, m), engine.PD(d, m)]);
    freeze(DECOY);
    const res = sweep(dates.keys(), (k) => {
      const [d, m, y] = dates[k];
      return [[engine.CA(d, m, y, now), engine.PM(d, m, now), engine.PD(d, m, now), ...defaults[k]], [...wants[k], ...wants[k]]];
    });
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(31 * 12 * 111);
  });

  it("full maps and recommendations for 1,500 readings, with every kind of `add` and `lang`", () => {
    const r = rng(1000 + i);
    const cases = Array.from({ length: 1500 }, () => [
      1 + Math.floor(r() * 31), 1 + Math.floor(r() * 12), 1900 + Math.floor(r() * 131), pick(r, NAMES), pick(r, ADD_VALUES), pick(r, LANGS),
    ]);
    freeze(now);
    const wants = cases.map(([d, m, y, nm, add, lang]) => {
      // since 2026-10-10 a reading that leaves the +1 out lets the date decide it (July 1 - December 31);
      // the shipped code had only the checkbox, so it gets the same +1 explicitly
      const map = legacy.fullCalc(d, m, y, nm, add ?? engine.addsOne(now));
      return { map, recs: legacy.getRecommendations(map, lang) };
    });
    const defaults = cases.map(([d, m, y, nm, add]) => engine.fullCalc(d, m, y, nm, add));
    freeze(DECOY);
    const res = sweep(cases.keys(), (k) => {
      const [d, m, y, nm, add, lang] = cases[k];
      const got = engine.fullCalc(d, m, y, nm, add, now);
      const plus = add ?? engine.addsOne(now);
      const changed = { su: got.su, ex: got.ex, pm: got.pm, pd: got.pd, kd: got.kd };
      const wanted = { su: refSU(nm), ex: refEX(nm), pm: refPM(d, m, now, plus), pd: refPD(d, m, now, plus), kd: refKarmic(d, m, y, nm) };
      // the recommendation rules did not change: both read the engine's own map
      return [
        [kept(got), kept(defaults[k]), changed, defaults[k].pm, engine.getRecommendations(got, lang)],
        [kept(wants[k].map), kept(wants[k].map), wanted, wanted.pm, legacy.getRecommendations(got, lang)],
      ];
    });
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(1500);
  });

  it("a name with no ה keeps its shipped psychological map", () => {
    const r = rng(2000 + i);
    const cases = Array.from({ length: 800 }, () => [1 + Math.floor(r() * 31), 1 + Math.floor(r() * 12), 1900 + Math.floor(r() * 131), pick(r, NAMES)]).filter(([, , , nm]) => !nm.includes("ה"));
    freeze(now);
    const wants = cases.map(([d, m, y, nm]) => legacy.fullCalc(d, m, y, nm, engine.addsOne(now)).psych);
    freeze(DECOY);
    const res = sweep(cases.keys(), (k) => {
      const [d, m, y, nm] = cases[k];
      return [engine.fullCalc(d, m, y, nm, undefined, now).psych, wants[k]];
    });
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBeGreaterThan(300);
  });
});

describe("recommendation rules over every combination of the numbers they read", () => {
  it("life path, name, soul (1-9, 11, 22, 33) x personal year x karmic debt x missing 4 and 8 x language", () => {
    const NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];
    const maps = [];
    for (const lp of NUMS) for (const nv of NUMS) for (const su of NUMS) for (let py = 1; py <= 9; py++)
      for (const kd of [[], [13]]) for (const miss of [[], [4, 8], [4]]) maps.push({ lp, nv, su, ex: 8, py, kd, ls: { miss } });
    const res = sweep(maps, (map) => {
      const before = structuredClone(map);
      const got = [engine.getRecommendations(map, "he"), engine.getRecommendations(map, "en")];
      return [[...got, map], [legacy.getRecommendations(map, "he"), legacy.getRecommendations(map, "en"), before]];
    });
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(12 * 12 * 12 * 9 * 2 * 3);
  });
});

describe("an explicit `now` makes results independent of the system clock", () => {
  it("the map for 5.10.2026 is the same under two unrelated system clocks", () => {
    const now = new Date(2026, 9, 5, 12);
    freeze(new Date(2001, 0, 1));
    const a = engine.fullCalc(15, 8, 1990, "שני כהן אזולאי", false, now);
    freeze(new Date(2039, 5, 30));
    const b = engine.fullCalc(15, 8, 1990, "שני כהן אזולאי", false, now);
    expect(a).toEqual(b);
    // and it is the 5.10.2026 map, not one for either system clock: personal year 6, month 6 + 10 = 16 -> 7, day 7 + 5 = 12 -> 3
    expect({ age: a.age, py: a.py, pm: a.pm, pd: a.pd, current: a.proj.find((p) => p.isCurrent).year }).toEqual({
      age: 36, py: 6, pm: 7, pd: 3, current: 2026,
    });
  });
});

describe("engine version", () => {
  it("is a semver string saved readings can record", () => {
    expect(engine.ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
