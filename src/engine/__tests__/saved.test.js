/*
 * Readings saved with the +1 (July - December from 2026-10-10, or the checkbox before) are shown without it (the
 * owner, 2026-10-12): the numbers that rest on the personal year are worked out again for the date the reading was
 * made for; everything else stays as saved, and the saved row itself is not changed.
 */
import { describe, it, expect } from "vitest";
import { withoutPlusOne, fullCalc, yearCycle, getRecommendations } from "../index.js";

const NAME = "דנה לוי";
const MADE = "2026-10-05T09:00:00.000Z"; // October 5, noon in Israel
const AT = new Date(MADE);

/**
 * A map as it was saved on 2026-10-05 with the +1. The plain personal year is 1+5+0+9 + 2+0+2+6 = 25 -> 7; with the
 * +1 it was 8, the month 8+10 = 18 -> 9, the day 9+5 = 14 -> 5, every row of the years table one on, and the
 * ambition trait 2 more (the year was 8).
 */
function savedMap(overrides = {}) {
  const plain = fullCalc(15, 9, 1990, NAME, AT);
  const result = {
    ...plain,
    py: 8,
    pm: 9,
    pd: 5,
    proj: plain.proj.map((p) => ({ ...p, py: p.py === 9 ? 1 : p.py + 1 })),
    psych: { ...plain.psych, ambition: plain.psych.ambition + 2 },
    pk: [9, 9, 9, 9], // pinnacles saved under an earlier rule
    insights: { he: [{ icon: "coin", t: "חלון שפע", d: "שנה 8" }], en: [{ icon: "coin", t: "Abundance window", d: "Year 8" }] },
  };
  return { id: "r1", clientId: "c1", type: "map", input: { name: NAME, birthDate: "1990-09-15", add: true }, result, engineVersion: "2.2.0", computedFor: MADE, ...overrides };
}

describe("a map saved with the +1", () => {
  it("shows its personal year, month and day without it, for the date it was made for", () => {
    const { result } = withoutPlusOne(savedMap());
    // 7; 7+10 = 17 -> 8; 8+5 = 13 -> 4
    expect([result.py, result.pm, result.pd]).toEqual([7, 8, 4]);
  });

  it("shows its years table without it, as that date gives it", () => {
    expect(withoutPlusOne(savedMap()).result.proj).toEqual(yearCycle(15, 9, AT));
  });

  it("works out again what reads the personal year: the ambition trait and the insights", () => {
    const { result } = withoutPlusOne(savedMap());
    expect(result.psych).toEqual(fullCalc(15, 9, 1990, NAME, AT).psych);
    expect(result.insights).toEqual({ he: getRecommendations(result, "he"), en: getRecommendations(result, "en") });
    expect(result.insights.he.map((x) => x.t)).not.toContain("חלון שפע"); // the 8's insight went with the 8
  });

  it("keeps everything else as saved, and says it now has no +1", () => {
    const saved = savedMap();
    const shown = withoutPlusOne(saved);
    expect(shown.result.pk).toEqual([9, 9, 9, 9]);
    for (const key of ["nv", "lp", "age", "hy", "su", "ex", "ch", "hp", "hc", "exit", "kd", "ls", "d", "m", "y"]) {
      expect([key, shown.result[key]]).toEqual([key, saved.result[key]]);
    }
    expect(shown.input).toEqual({ name: NAME, birthDate: "1990-09-15", add: false });
    expect([shown.id, shown.computedFor, shown.engineVersion]).toEqual(["r1", MADE, "2.2.0"]);
  });

  it("leaves the saved reading itself untouched", () => {
    const saved = savedMap();
    const copy = structuredClone(saved);
    withoutPlusOne(saved);
    expect(saved).toEqual(copy);
  });

  it("works out insights only for a map that saved them (older maps get today's at display)", () => {
    const saved = savedMap();
    const { insights, ...rest } = saved.result;
    expect(withoutPlusOne({ ...saved, result: rest }).result).not.toHaveProperty("insights");
    expect(insights).toBeTruthy();
  });
});

describe("other readings", () => {
  it("a years table saved with the +1 is worked out again for its date", () => {
    const saved = { type: "yearCycle", input: { birthDate: "1990-09-15", add: true }, result: { proj: [{ year: 2026, py: 8, isCurrent: true }] }, computedFor: MADE };
    expect(withoutPlusOne(saved).result).toEqual({ proj: yearCycle(15, 9, AT) });
    expect(withoutPlusOne(saved).input).toEqual({ birthDate: "1990-09-15", add: false });
  });

  it("a reading saved without the +1 is shown as it is", () => {
    const saved = savedMap({ input: { name: NAME, birthDate: "1990-09-15", add: false } });
    expect(withoutPlusOne(saved)).toBe(saved);
  });

  it("matches and parent-child readings never had it", () => {
    const match = { type: "match", input: { add: true }, result: { score: 80 } };
    expect(withoutPlusOne(match)).toBe(match);
  });

  it("a damaged reading (no usable birth date or date made for) is shown as it is, for the screen to say so", () => {
    for (const reading of [savedMap({ input: { name: NAME, birthDate: "15.09.1990", add: true } }), savedMap({ computedFor: "not a date" }), { type: "map", input: null, result: null }]) {
      expect(withoutPlusOne(reading)).toBe(reading);
    }
  });
});
