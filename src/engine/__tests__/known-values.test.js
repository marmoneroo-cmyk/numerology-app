/*
 * Hand-verified examples. Each expected value was worked out on paper from the
 * method itself (Hebrew letter values, zero-padded DDMMYYYY dates), so this file
 * doubles as documentation of how the numbers are made. What the method still
 * shares with the shipped code runs against both (the oracle and the engine);
 * what the owner changed on 2026-10-11 (the soul's vowels, the personal month and
 * day, karmic debts) has its own examples for each.
 */
import { describe, it, expect } from "vitest";
import * as legacy from "./legacy.js";
import * as engine from "../index.js";

const OCT_5_2026 = new Date(2026, 9, 5, 12);
const IMPLEMENTATIONS = [["oracle", legacy], ["engine", engine]];

describe.each(IMPLEMENTATIONS)("known values (%s)", (_, E) => {
  it("reduces to one digit; 0 stays 0", () => {
    expect([E.R(0), E.R(7), E.R(10), E.R(38), E.R(99)]).toEqual([0, 7, 1, 2, 9]);
  });

  it("stops at master numbers 11/22/33", () => {
    expect([E.Rm(29), E.Rm(13), E.Rm(-29), E.Rm(22)]).toEqual([11, 4, 11, 22]);
  });

  it("name numbers: all letters; for a name with no ה, the vowels and the consonants", () => {
    // ש3 + נ5 + י1 = 9; the vowel is י (1); consonants ש + נ = 8
    expect([E.NV("שני"), E.SU("שני"), E.EX("שני")]).toEqual([9, 1, 8]);
    // all letters of שני כהן אזולאי: 40 -> 4
    expect(E.NV("שני כהן אזולאי")).toBe(4);
  });

  it("life path sums the zero-padded date; LPm keeps masters", () => {
    // 1+5+0+8+1+9+9+0 = 33
    expect([E.LP(15, 8, 1990), E.LPm(15, 8, 1990)]).toEqual([6, 33]);
    // 1+9+0+9+1+9+9+9 = 47 -> 11
    expect([E.LP(19, 9, 1999), E.LPm(19, 9, 1999)]).toEqual([2, 11]);
  });

  it("personal year; the +1 toggle moves it on by one", () => {
    // 1+5+0+8+2+0+2+6 = 24 -> 6
    expect([E.PY(15, 8, 2026, false), E.PY(15, 8, 2026, true)]).toEqual([6, 7]);
  });

  it("challenge is the reduced difference", () => {
    expect([E.CH(5, 3), E.CH(4, 4), E.CH(1, 9)]).toEqual([2, 0, 8]);
  });

  it("karmic debts come from the birth day, the date sum or the name sum", () => {
    expect(E.karmicDebt(13, 4, 1990, "")).toEqual([13]); // born on the 13th
    expect(E.karmicDebt(5, 5, 2001, "")).toEqual([13]); // 5+5+2+0+0+1 = 13
    expect(E.karmicDebt(1, 1, 2000, "זט")).toEqual([16]); // ז7 + ט9 = 16
  });

  it("Lo Shu counts the date digits plus the life path and the reduced day", () => {
    // digits 1,5,8,1,9,9 (zeros dropped) + LP 6 + day 6
    const ls = E.loShu(15, 8, 1990);
    expect(ls.g).toEqual({ 1: 2, 2: 0, 3: 0, 4: 0, 5: 1, 6: 2, 7: 0, 8: 1, 9: 2 });
    expect(ls.miss).toEqual([2, 3, 4, 7]);
    expect(ls.planes).toEqual(["practical"]);
  });

  it("live calculator: Hebrew by letter value, Latin by (code-65)%9+1, digits ignored", () => {
    // S1 + H8 + A1 + N5 + I9 = 24 -> 6
    expect([E.liveNum("Shani"), E.liveNum("שני"), E.liveNum(""), E.liveNum("123")]).toEqual([6, 9, 0, 0]);
  });
});

describe.each(IMPLEMENTATIONS)("known values that depend on today (%s)", (name, E) => {
  // the oracle reads the system clock; the engine takes `now` explicitly
  const at = (fn) => (name === "oracle" ? withClock(OCT_5_2026, fn) : fn(OCT_5_2026));

  it("age counts the birthday itself", () => {
    expect(at((now) => [E.CA(15, 8, 1990, now), E.CA(15, 12, 1990, now), E.CA(5, 10, 1990, now)])).toEqual([36, 35, 36]);
  });

  it("the full map for שני כהן אזולאי, 15.08.1990, on 5.10.2026", () => {
    const r = at((now) => E.fullCalc(15, 8, 1990, "שני כהן אזולאי", false, now));
    expect({ nv: r.nv, lp: r.lp, age: r.age, py: r.py, hy: r.hy }).toEqual({ nv: 4, lp: 33, age: 36, py: 6, hy: 6 });
    // day 6, month 8, year 1 (1+9+9+0 = 19 -> 1)
    expect(r.pk).toEqual([5, 7, 3, 9]); // pinnacles
    expect(r.ch).toEqual([2, 5, 3, 7]); // challenges
    expect(r.hp).toEqual([7, 3, 6, 7]);
    expect(r.hc).toEqual([4, 9, 3, 4]);
    expect(r.exit).toEqual(21); // 27 - reduced life path 6
    expect(r.kd).toEqual([]);
    expect(r.proj.map((p) => p.year)).toEqual([2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036]);
  });
});

describe("the shipped method, kept for the record (oracle)", () => {
  it("the soul counted א ו י ע; the personal month left out the year", () => {
    // vowels י1 א1 ו6 א1 י1 = 10 -> 1; consonants 30 -> 3
    expect([legacy.SU("שני כהן אזולאי"), legacy.EX("שני כהן אזולאי")]).toEqual([1, 3]);
    // "1508" + "10" = 15 -> 6 ; "1508" + "5" + "10" + "2026" = 30 -> 3
    expect(withClock(OCT_5_2026, () => [legacy.PM(15, 8), legacy.PD(15, 8)])).toEqual([6, 3]);
  });
});

describe("the method since 2026-10-11 (the owner's answers to the calculation audit)", () => {
  const MARCH_5_2026 = new Date(2026, 2, 5, 12);

  it("the soul counts א ה ו י ע; the consonants are the other letters", () => {
    // שני כהן אזולאי: vowels י1 ה5 א1 ו6 א1 י1 = 15 -> 6; consonants ש3 נ5 כ2 ן5 ז7 ל3 = 25 -> 7
    expect([engine.SU("שני כהן אזולאי"), engine.EX("שני כהן אזולאי")]).toEqual([6, 7]);
    // דנה כהן had no soul before: ה5 + ה5 = 10 -> 1; consonants ד4 נ5 כ2 ן5 = 16 -> 7
    expect([engine.NV("דנה כהן"), engine.SU("דנה כהן"), engine.EX("דנה כהן")]).toEqual([8, 1, 7]);
  });

  it("the personal month is the personal year plus the month; the personal day adds the day", () => {
    // October: personal year 6 + the +1 = 7; 7 + 10 = 17 -> 8; 8 + 5 = 13 -> 4
    expect([engine.PM(15, 8, OCT_5_2026), engine.PD(15, 8, OCT_5_2026)]).toEqual([8, 4]);
    // a reading that leaves the +1 out: 6 + 10 = 16 -> 7; 7 + 5 = 12 -> 3
    expect([engine.PM(15, 8, OCT_5_2026, false), engine.PD(15, 8, OCT_5_2026, false)]).toEqual([7, 3]);
    // March has no +1: 6 + 3 = 9; 9 + 5 = 14 -> 5
    expect([engine.PM(15, 8, MARCH_5_2026), engine.PD(15, 8, MARCH_5_2026)]).toEqual([9, 5]);
  });

  it("a karmic debt is 13, 14, 16 or 19 anywhere on the way down: the date, the name, the soul or the consonants", () => {
    // אברהם גולדשטיין: all letters 49 -> 13 -> 4; the soul א1 ה5 ו6 י1 י1 = 14
    expect(engine.karmicDebt(1, 1, 2000, "אברהם גולדשטיין")).toEqual([13, 14]);
    // the shipped code saw neither: 49 and 14 were not its raw sums of the date or the whole name
    expect(legacy.karmicDebt(1, 1, 2000, "אברהם גולדשטיין")).toEqual([]);
  });

  it("the full map follows: soul 6, consonants 7, month 7 and day 3 for a reading without the +1", () => {
    const r = engine.fullCalc(15, 8, 1990, "שני כהן אזולאי", false, OCT_5_2026);
    expect({ su: r.su, ex: r.ex, pm: r.pm, pd: r.pd, py: r.py }).toEqual({ su: 6, ex: 7, pm: 7, pd: 3, py: 6 });
    const auto = engine.fullCalc(15, 8, 1990, "שני כהן אזולאי", undefined, OCT_5_2026);
    expect({ pm: auto.pm, pd: auto.pd, py: auto.py }).toEqual({ pm: 8, pd: 4, py: 7 });
  });
});

/** Run fn while the system clock reads `now` (the oracle has no `now` parameter). */
function withClock(now, fn) {
  const RealDate = Date;
  class FrozenDate extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [now.getTime()]));
    }
    static now() {
      return now.getTime();
    }
  }
  globalThis.Date = FrozenDate;
  try {
    return fn(now);
  } finally {
    globalThis.Date = RealDate;
  }
}
