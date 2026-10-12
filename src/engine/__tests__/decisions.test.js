/*
 * The owner's decisions after the calculation review (2026-10-11, second round), kept as the method's
 * temporary defaults until the owner says otherwise, and the arithmetic checks the owner asked for.
 * Every expected value here is worked out by hand in the comments, not taken from the engine.
 * Example person throughout: מאיה לוי, born 19.04.1986 (a made-up client), on 11.10.2026.
 */
import { describe, it, expect } from "vitest";
import * as E from "../index.js";

const MAYA = { name: "מאיה לוי", d: 19, m: 4, y: 1986 };
const YOSSI = { name: "יוסי לוי", d: 6, m: 10, y: 1990 };
const RACHEL = { name: "רחל כהן", d: 7, m: 10, y: 1985 };
const NOA = { name: "נועה כהן", d: 14, m: 2, y: 2016 };
const ON = (d, m, y = 2026) => new Date(y, m - 1, d, 10, 0);
const NOW = ON(11, 10);

describe("one reduction, with an explicit choice to keep the master numbers", () => {
  it("adds the digits down to one, or stops at 11, 22 or 33 on the way when asked", () => {
    const cases = [
      // n, reduced, masters kept
      [0, 0, 0], [9, 9, 9], [10, 1, 1], [19, 1, 1], // 19 → 10 → 1
      [29, 2, 11], [38, 2, 11], [47, 2, 11], // 2+9, 3+8, 4+7 = 11
      [49, 4, 4], // 49 → 13 → 4: 13 is no master
      [499, 4, 22], [2299, 4, 22], // 4+9+9 = 22; 2+2+9+9 = 22
      [33, 6, 33], [6999, 6, 33], // 6+9+9+9 = 33
    ];
    for (const [n, reduced, kept] of cases) {
      expect([E.reduce(n), E.reduce(n, { keepMasters: false }), E.reduce(n, { keepMasters: true })]).toEqual([reduced, reduced, kept]);
    }
  });

  // R and Rm against the shipped code, over -1,000 to 100,000: equivalence.test.js
  it("gives 0 for 0, also for -0, as the shipped R did", () => {
    expect([Object.is(E.reduce(-0), 0), Object.is(E.R(-0), 0), Object.is(E.Rm(-0), 0)]).toEqual([true, true, true]);
  });

  it("knows the master numbers in one place", () => {
    expect(E.MASTER_NUMBERS).toEqual([11, 22, 33]);
    expect([10, 11, 22, 33, 44].map(E.isMaster)).toEqual([false, true, true, true, false]);
  });
});

describe("final letters, spaces and hyphens in a name", () => {
  it("counts a final letter as its regular form, and nothing for a space or a hyphen", () => {
    expect(["ך", "ם", "ן", "ף", "ץ"].map((c) => E.LV[c])).toEqual([2, 4, 5, 8, 9]);
    expect(E.NV("ךםןףץ")).toBe(E.NV("כמנפצ")); // 2+4+5+8+9 = 28 → 1
    expect(E.NV("כהן")).toBe(3); // 2+5+5 = 12 → 3
    // 21 (מאיה לוי) + 12 (כהן) = 33, a master; the hyphen and the space add nothing
    expect([E.NV("מאיה לוי-כהן"), E.NV("מאיה לוי כהן"), E.NV("מאיה  לוי - כהן")]).toEqual([33, 33, 33]);
    expect(E.SU("מאיה לוי-כהן")).toBe(1); // א1 י1 ה5 ו6 י1 ה5 = 19 → 10 → 1
    expect(E.EX("מאיה לוי-כהן")).toBe(5); // מ4 ל3 כ2 ן5 = 14 → 5
    expect([E.dominantNumbers("כהן"), E.missingNumbers("כהן")]).toEqual([[5], [1, 3, 4, 6, 7, 8, 9]]); // ה5 and ן5
  });
});

describe("master numbers: kept in the name, soul, expression, life path, maturity and birthday", () => {
  it("keeps them where the method keeps them", () => {
    expect(E.LPm(MAYA.d, MAYA.m, MAYA.y)).toBe(11); // 1+9+0+4+1+9+8+6 = 38 → 11
    expect(E.LPm(1, 2, 1990)).toBe(22); // 0+1+0+2+1+9+9+0 = 22
    expect(E.LPm(5, 9, 1990)).toBe(33); // 0+5+0+9+1+9+9+0 = 33
    expect(E.LPm(29, 11, 1979)).toBe(3); // all the digits together: 39 → 12 → 3, not the 29 and the 11
    expect(E.NV("הדר")).toBe(11); // 5+4+2
    expect(E.SU("הוד")).toBe(11); // ה5 ו6
    expect(E.maturity(MAYA.d, MAYA.m, MAYA.y, MAYA.name)).toBe(5); // 11 + 3 = 14 → 5
    expect([11, 22, 29, 13, 31].map(E.birthdayNumber)).toEqual([11, 22, 11, 4, 4]);
  });

  it("reduces the personal year, month and day, the hidden year, the pinnacles and the challenges to one digit", () => {
    // June 30, 2026: personal year 6, month 6+6 = 12 → 3, day 3+30 = 33 → 6 (no master here)
    const june30 = E.fullCalc(MAYA.d, MAYA.m, MAYA.y, MAYA.name, ON(30, 6));
    expect([june30.py, june30.pm, june30.pd]).toEqual([6, 3, 6]);
    // born 2.9: the first pinnacle 2+9 = 11 → 2 (the owner: pinnacles stay reduced)
    expect(E.fullCalc(2, 9, 1980, "", NOW).pk).toEqual([2, 2, 4, 9]); // 2+9, 2+9 (1980 → 18 → 9), 2+2, 9+9 → 9
    const map = E.fullCalc(MAYA.d, MAYA.m, MAYA.y, MAYA.name, NOW);
    expect(map.hy).toBe(6); // 11 + 40 = 51 → 6
    for (const n of [map.py, map.pm, map.pd, map.hy, ...map.pk, ...map.hp, ...map.hc]) expect(n).toBeLessThanOrEqual(9);
  });
});

describe("the three numbers of a day, each its own calculation", () => {
  it("on 11.10.2026: the day of the month gives 2, the universal day 4, and Maya's personal day 9", () => {
    expect(E.dailyRitualNumber(NOW)).toBe(2); // 11 mod 9
    expect(E.universalDay(NOW)).toBe(4); // 1+1+1+0+2+0+2+6 = 13 → 4
    expect(E.PD(MAYA.d, MAYA.m, NOW)).toBe(9); // personal year 24 → 6, month 6 + 10 = 16 → 7, day 7 + 11 = 18 → 9
  });

  it("sums every digit of the date for the universal day, reduced to one digit", () => {
    expect(E.universalDay(ON(30, 6))).toBe(1); // 3+0+0+6+2+0+2+6 = 19 → 10 → 1
    expect(E.universalDay(ON(1, 7))).toBe(9); // 0+1+0+7+2+0+2+6 = 18 → 9
    expect(E.universalDay(ON(29, 9))).toBe(3); // 2+9+0+9+2+0+2+6 = 30 → 3
    expect(E.universalDay(ON(1, 1, 2007))).toBe(2); // 0+1+0+1+2+0+0+7 = 11, reduced to 2 (pending the owner's word)
  });

  it("gives Maya's personal day on the 9th, 10th, 29th and 31st of October 2026", () => {
    // the personal month in October is 6 + 10 = 16 → 7
    expect([9, 10, 29, 31].map((day) => E.PD(MAYA.d, MAYA.m, ON(day, 10)))).toEqual([7, 8, 9, 2]); // 16→7, 17→8, 36→9, 38→11→2
    expect([9, 10, 29, 31].map((day) => E.dailyRitualNumber(ON(day, 10)))).toEqual([9, 1, 2, 4]);
  });

  it("keeps the personal year from June 30 to July 1 (no +1, the owner, 2026-10-12), and moves it on January 1", () => {
    const at = (date) => [E.personalYearOn(MAYA.d, MAYA.m, date), E.PM(MAYA.d, MAYA.m, date), E.PD(MAYA.d, MAYA.m, date)];
    expect(at(ON(30, 6))).toEqual([6, 3, 6]); // 24 → 6; 6+6 = 12 → 3; 3+30 = 33 → 6
    expect(at(ON(1, 7))).toEqual([6, 4, 5]); // still 6; 6+7 = 13 → 4; 4+1 = 5
    expect(at(ON(1, 1, 2027))).toEqual([7, 8, 9]); // 1+9+0+4+2+0+2+7 = 25 → 7; 7+1 = 8; 8+1 = 9
  });
});

describe("age and the life cycles at their edges", () => {
  it("turns 40 on the birthday itself, and the hidden year moves with it", () => {
    expect([E.CA(MAYA.d, MAYA.m, MAYA.y, ON(18, 4)), E.CA(MAYA.d, MAYA.m, MAYA.y, ON(19, 4))]).toEqual([39, 40]);
    const hidden = (date) => E.fullCalc(MAYA.d, MAYA.m, MAYA.y, MAYA.name, date).hy;
    expect([hidden(ON(18, 4)), hidden(ON(19, 4))]).toEqual([5, 6]); // 11+39 = 50 → 5; 11+40 = 51 → 6
  });

  it("starts the second, third and fourth cycles at 34, 43 and 52 for a life path of 11", () => {
    const exit = 27 - 2; // the life path in one digit: 11 → 2
    expect(E.fullCalc(MAYA.d, MAYA.m, MAYA.y, MAYA.name, NOW).exit).toBe(exit);
    expect([33, 34, 42, 43, 51, 52, 90].map((age) => E.cycleAt(age, exit))).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });

  it("gives Maya's four pinnacles, challenges and hidden numbers in the order of the four periods", () => {
    const map = E.fullCalc(MAYA.d, MAYA.m, MAYA.y, MAYA.name, NOW);
    // day 19 → 1, month 4, year 1986 → 24 → 6
    expect(map.pk).toEqual([5, 7, 3, 1]); // 1+4, 1+6, 5+7 = 12 → 3, 4+6 = 10 → 1
    expect(map.ch).toEqual([3, 5, 2, 2]); // |1−4|, |1−6|, |3−5|, |4−6|
    expect(map.hp).toEqual([8, 3, 5, 3]); // pinnacle + its challenge: 5+3, 7+5 = 12 → 3, 3+2, 1+2
    expect(map.hc).toEqual([1, 5, 7, 5]); // hidden pinnacle + life path 11: 19 → 1, 14 → 5, 16 → 7, 14 → 5
  });
});

describe("Lo Shu: the birth date's digits without zeros, plus the life path and the day in one digit", () => {
  it("finds Maya's missing numbers and full rows", () => {
    const ls = E.loShu(MAYA.d, MAYA.m, MAYA.y);
    // 1, 9, 4, 1, 9, 8, 6, and 2 (life path), 1 (the day)
    expect(ls.g).toEqual({ 1: 3, 2: 1, 3: 0, 4: 1, 5: 0, 6: 1, 7: 0, 8: 1, 9: 2 });
    expect([ls.miss, ls.planes]).toEqual([[3, 5, 7], ["mind", "practical"]]);
  });

  it("drops the zeros, counts repeats, and lists what is missing", () => {
    // 10.10.2000: 1, 1, 2 (no zeros), life path 4 (1+1+2), the day 10 → 1
    const ls = E.loShu(10, 10, 2000);
    expect(ls.g).toEqual({ 1: 3, 2: 1, 3: 0, 4: 1, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 });
    expect([ls.miss, ls.planes]).toEqual([[3, 5, 6, 7, 8, 9], []]);
  });
});

describe("the psychological map: points from the numbers only, 0 when there are none", () => {
  it("gives Maya 3 for intuition (life path 2) and creativity (name 3), and 0 for the rest", () => {
    const map = E.fullCalc(MAYA.d, MAYA.m, MAYA.y, MAYA.name, NOW);
    expect(map.psych).toEqual({ leadership: 0, intuition: 3, creativity: 3, stability: 0, ambition: 0, wisdom: 0 });
  });

  // the sweep against a reference version of the rules, over thousands of maps, is in equivalence.test.js
});

describe("the live calculator keeps the master numbers, as the full reading does", () => {
  it("gives a Hebrew name its letter values and a Latin one its letter positions, masters kept", () => {
    expect([E.liveNum("הדר"), E.liveNum("Dana"), E.liveNum("Victor"), E.liveNum("Shani"), E.liveNum("")]).toEqual([11, 11, 33, 6, 0]);
    // D4 A1 N5 A1 = 11; V4 I9 C3 T2 O6 R9 = 33; S1 H8 A1 N5 I9 = 24 → 6
  });
});

/** A date whose life path is `lp` (1-9, no master on the way), for a person named `name`. */
function personWithLifePath(lp, name) {
  for (let y = 1980; y <= 1999; y++) {
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= 28; d++) if (E.LPm(d, m, y) === lp) return { name, d, m, y };
    }
  }
  throw new Error(`no date with life path ${lp}`);
}
const LIFE_PATHS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

describe("compatibility: one formula for a couple everywhere, and its rules spelled out", () => {
  it("compares every number in one digit, and keeps each original beside it (the owner, 2026-10-11 and 12)", () => {
    expect(E.COMPAT_RULES).toEqual({ lifePath: "reduced", name: "reduced", soul: "reduced", expression: "reduced" });
    const match = E.matchReading(MAYA, { name: "הוד", d: 1, m: 2, y: 1990 }, "love");
    expect([match.lp1, match.lpm1, match.lp2, match.lpm2]).toEqual([2, 11, 4, 22]); // 38 → 11 → 2; 0+1+0+2+1+9+9+0 = 22 → 4
    // הוד: soul ה5 ו6 = 11, compared as 2; name 5+6+4 = 15 → 6; expression ד4
    expect([match.su2, match.sum2, match.nv2, match.nvm2, match.ex2, match.exm2]).toEqual([2, 11, 6, 6, 4, 4]);
    expect([match.su1, match.sum1, match.nv1, match.nvm1, match.ex1, match.exm1]).toEqual([5, 5, 3, 3, 7, 7]);
  });

  it("counts a soul of 11 and a soul of 2 as the same", () => {
    // הוד: soul 11, name 6; אביב: soul א1 י1 = 2, name 1+2+1+2 = 6; both born 1.1.1990 (life path 21 → 3)
    const hod = { name: "הוד", d: 1, m: 1, y: 1990 }, aviv = { name: "אביב", d: 1, m: 1, y: 1990 };
    const match = E.matchReading(hod, aviv, "love");
    expect([match.su1, match.su2, match.sum1, match.sum2]).toEqual([2, 2, 11, 2]);
    expect(match.score).toBe(95); // 50, same life path +20, same soul +15 (with 11 kept, 9 apart: nothing), same name +10
    const family = E.parentChildReading(hod, aviv);
    expect([family.suP, family.suC, family.sumP, family.score]).toEqual([2, 2, 11, 83]); // 55 +18 (same path) +10 (same soul)
  });

  it("scores a couple the same on the התאמה tab as in the calculators and the client file", () => {
    // Yossi: life path 8, soul 6, name 6. Rachel: life path 4, soul 5, name 7.
    // 50, life paths 4 apart (no change), souls 1 apart +8 = 58 (the tab used to add 5 for names 1 apart: 63)
    expect(E.coupleReading(YOSSI, RACHEL)).toEqual(E.matchReading(YOSSI, RACHEL, "love"));
    expect(E.coupleReading(YOSSI, RACHEL).score).toBe(58);
    expect(E.coupleReading(MAYA, YOSSI).score).toBe(53); // 50, life paths 2 and 8 (6 apart) −5, souls 5 and 6 +8
  });

  it("keeps the original life paths of a parent and child beside the reduced ones it compares", () => {
    const pc = E.parentChildReading(MAYA, NOA);
    expect([pc.lpP, pc.lpmP, pc.lpC, pc.lpmC]).toEqual([2, 11, 7, 7]); // Noa: 1+4+0+2+2+0+1+6 = 16 → 7
    expect([pc.nvP, pc.nvmP, pc.suP, pc.sumP]).toEqual([3, 3, 5, 5]); // no masters in Maya's name: the same either way
    expect(E.parentChildReading(RACHEL, NOA).score).toBe(65); // 55, life paths 4 and 7, souls 5 and 5 +10
  });

  it("adds 10 once for every 'who teaches whom' pair, in either direction, and for no other pair", () => {
    // 1→4, 2→8, 3→7, 4→5, 5→6, 6→1, 7→3, 8→9, 9→2: as unordered pairs (3 and 7 teach each other)
    const TEACH_PAIRS = ["1-4", "2-8", "3-7", "4-5", "5-6", "1-6", "8-9", "2-9"];
    const teaches = (a, b) => TEACH_PAIRS.includes(`${Math.min(a, b)}-${Math.max(a, b)}`);
    const pathBonus = (a, b) => (a === b ? 18 : Math.abs(a - b) <= 2 ? 12 : 0);
    const bad = [];
    for (const p of LIFE_PATHS) {
      for (const c of LIFE_PATHS) {
        // different souls (5 and 6), so only the life paths and the teaching move the score
        const score = E.parentChildReading(personWithLifePath(p, "רחל כהן"), personWithLifePath(c, "יוסי לוי")).score;
        const want = 55 + pathBonus(p, c) + (teaches(p, c) ? 10 : 0);
        if (score !== want) bad.push({ p, c, score, want });
      }
    }
    expect(bad).toEqual([]);
  });

  it("adds 12 for the complementary pairs 1-2, 3-4, 5-6, 7-8 and 1-9, in either order, and for no other pair", () => {
    const PAIRS = ["1-2", "3-4", "5-6", "7-8", "1-9"];
    const complementary = (a, b) => PAIRS.includes(`${Math.min(a, b)}-${Math.max(a, b)}`);
    const pathBonus = (a, b) => (a === b ? 20 : Math.abs(a - b) <= 2 ? 15 : Math.abs(a - b) >= 5 ? -5 : 0);
    const bad = [];
    for (const a of LIFE_PATHS) {
      for (const b of LIFE_PATHS) {
        // Rachel's name (7, soul 5) against Yossi's (6, soul 6): +8 for the souls, nothing for the names
        const score = E.matchReading(personWithLifePath(a, "רחל כהן"), personWithLifePath(b, "יוסי לוי"), "love").score;
        const want = 50 + pathBonus(a, b) + 8 + (complementary(a, b) ? 12 : 0);
        if (score !== want) bad.push({ a, b, score, want });
      }
    }
    expect(bad).toEqual([]);
  });
});
