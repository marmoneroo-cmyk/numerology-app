/*
 * The engine must give exactly what the shipped App.jsx gave, for every input.
 * Each sweep collects mismatches instead of asserting per item, so a failure
 * prints the first offending inputs and the sweep sizes stay large but fast.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { isDeepStrictEqual } from "node:util";
import * as engine from "../index.js";
import * as legacy from "./legacy.js";

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
      [engine.NV(s), engine.SU(s), engine.EX(s), engine.liveNum(s)],
      [legacy.NV(s), legacy.SU(s), legacy.EX(s), legacy.liveNum(s)],
    ]);
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(NAMES.length);
  });

  it("date numbers, Lo Shu, karmic debts and personal years for every day 1900–2030", () => {
    const res = sweep(everyDate(), ([d, m, y]) => [
      [engine.LP(d, m, y), engine.LPm(d, m, y), engine.loShu(d, m, y), engine.karmicDebt(d, m, y, ""), engine.PY(d, m, y, false), engine.PY(d, m, y, true)],
      [legacy.LP(d, m, y), legacy.LPm(d, m, y), legacy.loShu(d, m, y), legacy.karmicDebt(d, m, y, ""), legacy.PY(d, m, y, false), legacy.PY(d, m, y, true)],
    ]);
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(31 * 12 * 131);
  });

  it("karmic debts with names", () => {
    const r = rng(11);
    const cases = Array.from({ length: 5000 }, () => [1 + Math.floor(r() * 31), 1 + Math.floor(r() * 12), 1900 + Math.floor(r() * 131), pick(r, NAMES)]);
    const res = sweep(cases, ([d, m, y, nm]) => [engine.karmicDebt(d, m, y, nm), legacy.karmicDebt(d, m, y, nm)]);
    expect(res.mismatches).toEqual([]);
  });

  it("challenges for every pair -50 … 50", () => {
    const pairs = [];
    for (let a = -50; a <= 50; a++) for (let b = -50; b <= 50; b++) pairs.push([a, b]);
    const res = sweep(pairs, ([a, b]) => [engine.CH(a, b), legacy.CH(a, b)]);
    expect(res.mismatches).toEqual([]);
  });
});

describe.each(CLOCKS)("engine matches the shipped code on %s", (_, now) => {
  it("age, personal month and personal day for every birthday, explicit and default `now`", () => {
    freeze(now);
    const res = sweep(everyDate(1920, 2030), ([d, m, y]) => [
      [engine.CA(d, m, y, now), engine.PM(d, m, now), engine.PD(d, m, now), engine.CA(d, m, y), engine.PM(d, m), engine.PD(d, m)],
      [legacy.CA(d, m, y), legacy.PM(d, m), legacy.PD(d, m), legacy.CA(d, m, y), legacy.PM(d, m), legacy.PD(d, m)],
    ]);
    expect(res.mismatches).toEqual([]);
  });

  it("full maps and recommendations for 1,500 readings", () => {
    freeze(now);
    const r = rng(now.getTime() % 100000);
    const cases = Array.from({ length: 1500 }, () => [
      1 + Math.floor(r() * 31), 1 + Math.floor(r() * 12), 1900 + Math.floor(r() * 131), pick(r, NAMES), r() < 0.5,
    ]);
    const res = sweep(cases, ([d, m, y, nm, add]) => {
      const want = legacy.fullCalc(d, m, y, nm, add);
      const got = engine.fullCalc(d, m, y, nm, add, now);
      const gotDefault = engine.fullCalc(d, m, y, nm, add);
      return [
        [got, gotDefault, engine.getRecommendations(got, "he"), engine.getRecommendations(got, "en")],
        [want, want, legacy.getRecommendations(want, "he"), legacy.getRecommendations(want, "en")],
      ];
    });
    expect(res.mismatches).toEqual([]);
    expect(res.checked).toBe(1500);
  });
});

describe("an explicit `now` makes results independent of the system clock", () => {
  it("same input and `now`, two different system clocks, same map", () => {
    const now = new Date(2026, 9, 5, 12);
    freeze(new Date(2001, 0, 1));
    const a = engine.fullCalc(15, 8, 1990, "שני כהן אזולאי", false, now);
    freeze(new Date(2039, 5, 30));
    const b = engine.fullCalc(15, 8, 1990, "שני כהן אזולאי", false, now);
    expect(a).toEqual(b);
  });
});

describe("engine version", () => {
  it("is a semver string saved readings can record", () => {
    expect(engine.ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
