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

  it("gives no names for numbers outside 1-9, and at most `count`", () => {
    expect(nameIdeas(0, true)).toEqual([]);
    expect(nameIdeas(12, true)).toEqual([]);
    expect(nameIdeas(3, true, 2)).toHaveLength(2);
  });
});
