/*
 * "How was this calculated?": every explanation must end in the very number the engine gives,
 * over thousands of dates, names and clocks, and must read as a worked example.
 */
import { describe, it, expect } from "vitest";
import { isDeepStrictEqual } from "node:util";
import { howFor, reduction, HOW_KEYS } from "../how.js";
import { fullCalc, PY, dailyRitualNumber, maturity, birthdayNumber, dominantNumbers, missingNumbers, textNumber } from "../../engine/index.js";

const CLOCKS = [
  new Date(2026, 9, 5, 12), // autumn: the +1 season
  new Date(2026, 5, 30, 23, 59), // the last minute before it
  new Date(2026, 6, 1, 0, 0), // its first minute
  new Date(2025, 11, 31, 23, 59),
  new Date(2026, 0, 1, 0, 0, 30),
  new Date(2024, 1, 29, 9),
];
const HEBREW = "אבגדהוזחטיכךלמםנןסעפףצץקרשת";
const ALPHABET = [...(HEBREW + "abcXYZ019 -'\"״")];

function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

const r = rng(42);
const randomName = () => Array.from({ length: Math.floor(r() * 20) }, () => ALPHABET[Math.floor(r() * ALPHABET.length)]).join("");
const CASES = Array.from({ length: 3000 }, (_, i) => ({
  d: 1 + Math.floor(r() * 31),
  m: 1 + Math.floor(r() * 12),
  y: 1900 + Math.floor(r() * 131),
  name: i < 6 ? ["שני כהן אזולאי", "", "ע", "Noa", "יוסף חיים", HEBREW][i] : randomName(),
  now: CLOCKS[i % CLOCKS.length],
}));

const MAP_KEYS = ["nv", "su", "ex", "lp", "age", "py", "pm", "pd", "hy", "pk", "ch", "hp", "hc", "exit", "kd", "ls"];

describe("every explanation ends in the engine's number", () => {
  it.each([true, false])("for 3,000 people and six clocks (Hebrew: %s)", (he) => {
    const mismatches = [];
    for (const c of CASES) {
      const map = fullCalc(c.d, c.m, c.y, c.name, undefined, c.now);
      for (const key of MAP_KEYS) {
        const how = howFor(key, c, he);
        if (!isDeepStrictEqual(how.result, map[key])) mismatches.push({ key, c, got: how.result, want: map[key] });
      }
      if (howFor("daily", c, he).result !== dailyRitualNumber(c.now)) mismatches.push({ key: "daily", c });
      const extras = {
        mat: maturity(c.d, c.m, c.y, c.name),
        bday: birthdayNumber(c.d),
        dom: dominantNumbers(c.name),
        miss: missingNumbers(c.name),
      };
      for (const [key, want] of Object.entries(extras)) {
        const got = howFor(key, c, he).result;
        if (!isDeepStrictEqual(got, want)) mismatches.push({ key, c, got, want });
      }
      const text = `${c.name} ${c.d}${c.m}${c.y}`;
      if (howFor("text", { text }, he).result !== textNumber(text)) mismatches.push({ key: "text", text });
    }
    expect(mismatches.slice(0, 5)).toEqual([]);
  });

  it("a saved reading's own +1 wins over the date, and a cycle row names its year", () => {
    const now = new Date(2026, 9, 5, 12);
    expect(howFor("py", { d: 15, m: 8, now, add: false }, true).result).toBe(PY(15, 8, 2026, false));
    expect(howFor("py", { d: 15, m: 8, now, add: true }, true).result).toBe(PY(15, 8, 2026, true));
    expect(howFor("py", { d: 15, m: 8, now, year: 2031, add: false }, true).result).toBe(PY(15, 8, 2031, false));
  });
});

describe("the explanations read as worked examples", () => {
  const SHANI = { d: 15, m: 8, y: 1990, name: "שני כהן אזולאי", now: new Date(2026, 9, 5, 12) };

  it("life path, with the master number kept", () => {
    expect(howFor("lp", SHANI, true)).toEqual({
      title: "שביל הגורל",
      steps: [
        { text: "סוכמים את כל ספרות תאריך הלידה 15.08.1990", math: "1+5+0+8+1+9+9+0 = 33" },
        { text: "33 הוא מספר מאסטר, ולכן נשאר כמו שהוא", math: "" },
      ],
      result: 33,
    });
  });

  it("the personal year, with the +1 of July to December", () => {
    expect(howFor("py", SHANI, true).steps).toEqual([
      { text: "ספרות יום וחודש הלידה, ועוד ספרות השנה 2026", math: "1+5+0+8+2+0+2+6 = 24" },
      { text: "מצמצמים", math: "2+4 = 6" },
      { text: "מה-1.7 ועד ה-31.12 מוסיפים 1", math: "6+1 = 7" },
    ]);
  });

  it("the soul number names the letters it counts", () => {
    const how = howFor("su", SHANI, true);
    expect(how.steps[0]).toEqual({ text: "רק האותיות א, ו, י, ע", math: "י=1 א=1 ו=6 א=1 י=1" });
    expect(how.steps[1]).toEqual({ text: "סוכמים", math: "1+1+6+1+1 = 10" });
    expect(how.result).toBe(1);
  });

  it("the pinnacles start from day, month and year in one digit", () => {
    const how = howFor("pk", SHANI, true);
    expect(how.steps.slice(0, 3).map((s) => s.math)).toEqual(["15 → 1+5 = 6", "8", "1990 → 1+9+9+0 = 19 → 1+9 = 10 → 1+0 = 1"]);
    expect(how.steps[3]).toEqual({ text: "פסגה 1: יום ועוד חודש", math: "6+8 = 14 → 5" });
    expect(how.result).toEqual([5, 7, 3, 9]);
  });

  it("the age says when the birthday has not come yet", () => {
    const how = howFor("age", { ...SHANI, now: new Date(2026, 7, 14) }, true);
    expect(how.steps.map((s) => s.math)).toEqual(["2026−1990 = 36", "36−1 = 35"]);
  });

  it("the dominant and missing numbers count the name's letters", () => {
    const dom = howFor("dom", SHANI, true);
    expect(dom.steps[1].math).toBe("1×4 2×1 3×2 4×0 5×3 6×1 7×1 8×0 9×0");
    expect(dom.steps[2]).toEqual({ text: "הכי הרבה פעמים (4)", math: "1" });
    expect(howFor("miss", SHANI, true).steps[2]).toEqual({ text: "לא מופיעים אף פעם", math: "4, 8, 9" });
  });

  it("maturity adds the life path and the name number", () => {
    expect(howFor("mat", SHANI, true).steps.map((s) => s.math)).toEqual(["33+4 = 37", "3+7 = 10", "1+0 = 1"]);
  });

  it("a practical number shows every digit's value", () => {
    const how = howFor("text", { text: "052-1234567" }, true);
    expect(how.steps[1].math).toBe("0+5+2+1+2+3+4+5+6+7 = 35");
    expect(how.result).toBe(8);
  });

  it("an empty name counts 0, and says why", () => {
    expect(howFor("nv", { ...SHANI, name: "" }, true).steps[1]).toEqual({ text: "אין אותיות כאלה בשם, ולכן 0", math: "0" });
  });

  it("speaks English too", () => {
    expect(howFor("lp", SHANI, false).title).toBe("Life path");
    expect(howFor("py", SHANI, false).steps[2].text).toBe("From July 1 to December 31, add 1");
  });

  it("every step has words, and every key has a title", () => {
    for (const key of HOW_KEYS) {
      for (const he of [true, false]) {
        const how = howFor(key, SHANI, he);
        expect(how.title.length).toBeGreaterThan(0);
        for (const s of how.steps) expect(s.text.length).toBeGreaterThan(0);
      }
    }
  });

  it("knows nothing of other keys", () => {
    expect(howFor("nope", SHANI, true)).toBeNull();
    expect(howFor("constructor", SHANI, true)).toBeNull();
  });
});

describe("reduction", () => {
  it("stops at masters only when asked", () => {
    expect(reduction(29, true)).toEqual({ steps: ["2+9 = 11"], result: 11, master: true });
    expect(reduction(29)).toEqual({ steps: ["2+9 = 11", "1+1 = 2"], result: 2, master: false });
    expect(reduction(38, true)).toEqual({ steps: ["3+8 = 11"], result: 11, master: true });
    expect(reduction(33, true)).toEqual({ steps: [], result: 33, master: true });
    expect(reduction(7)).toEqual({ steps: [], result: 7, master: false });
  });
});
