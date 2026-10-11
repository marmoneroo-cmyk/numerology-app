/* The name generator: every name it offers really adds up to the number asked for. */
import { describe, it, expect } from "vitest";
import { nameIdeas } from "../nameIdeas.js";
import { NV, R, liveNum } from "../../engine/index.js";

describe("name ideas", () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])("offers at least four Hebrew and four Latin names for %i, each adding up to it", (target) => {
    for (const he of [true, false]) {
      const ideas = nameIdeas(target, he);
      expect(ideas.length).toBeGreaterThanOrEqual(4);
      for (const { name, value } of ideas) {
        expect(value).toBe(he ? NV(name) : liveNum(name));
        expect(R(value)).toBe(target);
      }
    }
  });

  it("names its values the way the reading does: אורי is 1+6+2+1 = 10 -> 1", () => {
    expect(nameIdeas(1, true).find((x) => x.name === "אורי")).toEqual({ name: "אורי", value: 1 });
  });

  it("keeps a master number whole, and offers it under its base", () => {
    const masters = [2, 4, 6].flatMap((t) => nameIdeas(t, true, 100)).filter((x) => x.value > 9);
    for (const { value } of masters) expect([11, 22, 33]).toContain(value);
  });

  it("finds names of 11, 22 and 33 before the reduction, in Hebrew and in Latin letters (the owner, 2026-10-11)", () => {
    const has = (target, he, name, value) => expect(nameIdeas(target, he, 200)).toContainEqual({ name, value });
    has(2, true, "הדר", 11); // 5+4+2
    has(4, true, "נועם", 22); // 5+6+7+4
    // Latin letters by position, masters kept since the live calculator keeps them
    has(2, false, "Dana", 11); // 4+1+5+1
    has(4, false, "Ruth", 22); // 9+3+2+8
    has(6, false, "Victor", 33); // 4+9+3+2+6+9
    // and the first eight offered for 2 show the masters too
    expect(nameIdeas(2, true).slice(0, 3)).toEqual([{ name: "הדר", value: 11 }, { name: "עוז", value: 2 }, { name: "יעל", value: 11 }]);
  });

  it("gives no names for numbers outside 1-9, and at most `count`", () => {
    expect(nameIdeas(0, true)).toEqual([]);
    expect(nameIdeas(12, true)).toEqual([]);
    expect(nameIdeas(3, true, 2)).toHaveLength(2);
  });
});
