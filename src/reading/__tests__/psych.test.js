import { describe, it, expect } from "vitest";
import { psychLevels, PSYCH_KEYS } from "../psych.js";

// the engine's six traits for מאיה לוי (19.04.1986) are not needed here: the display only reads the points
const sample = { leadership: 2, intuition: 3, creativity: 2, stability: 3, ambition: 2, wisdom: 0 };

describe("psychLevels, the psychological map shown relative to the person's strongest trait", () => {
  it("draws the strongest trait at the edge and the others in proportion", () => {
    // Act
    const { items } = psychLevels(sample);

    // Assert
    const byKey = Object.fromEntries(items.map((t) => [t.key, t.ratio]));
    expect(byKey).toEqual({ leadership: 2 / 3, intuition: 1, creativity: 2 / 3, stability: 1, ambition: 2 / 3, wisdom: 0 });
  });

  it("names each trait's level instead of a score out of 10", () => {
    // Act
    const { items } = psychLevels(sample);

    // Assert: 60% of the strongest or more is strong, anything above 0 is present, 0 is not emphasized
    expect(Object.fromEntries(items.map((t) => [t.key, t.level]))).toEqual({
      leadership: "strong",
      intuition: "strong",
      creativity: "strong",
      stability: "strong",
      ambition: "strong",
      wisdom: "none",
    });
    expect(psychLevels({ ...sample, intuition: 5, stability: 2 }).items.find((t) => t.key === "leadership").level).toBe("present");
  });

  it("gives every trait the strongest share in the order of the chart", () => {
    expect(psychLevels(sample).items.map((t) => t.key)).toEqual(PSYCH_KEYS);
  });

  it("lists every trait that shares the top as dominant", () => {
    expect(psychLevels(sample).dominant).toEqual(["intuition", "stability"]);
    expect(psychLevels({ ...sample, intuition: 5 }).dominant).toEqual(["intuition"]);
  });

  it("keeps an empty map at the centre, with nothing dominant", () => {
    // Arrange
    const empty = Object.fromEntries(PSYCH_KEYS.map((k) => [k, 0]));

    // Act
    const result = psychLevels(empty);

    // Assert
    expect(result.items.every((t) => t.ratio === 0 && t.level === "none")).toBe(true);
    expect(result.dominant).toEqual([]);
  });

  it("reads a missing trait as 0, as an old saved reading might lack one", () => {
    const { items } = psychLevels({ intuition: 3 });
    expect(items.find((t) => t.key === "wisdom")).toMatchObject({ value: 0, ratio: 0, level: "none" });
  });
});
