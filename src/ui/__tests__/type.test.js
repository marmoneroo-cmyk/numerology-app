import { describe, it, expect } from "vitest";
import { fs, TYPE_CAP } from "../type.js";

describe("fs, the Studio's text size", () => {
  it("scales body sizes by the Studio's --ts, never below its --ts-min", () => {
    // Arrange
    const px = 13;

    // Act
    const size = fs(px);

    // Assert
    expect(size).toBe("max(var(--ts-min, 0px), calc(13px * var(--ts, 1)))");
  });

  it("keeps half pixels", () => {
    expect(fs(12.5)).toBe("max(var(--ts-min, 0px), calc(12.5px * var(--ts, 1)))");
  });

  it("leaves display sizes above the cap as they are, in pixels", () => {
    expect(fs(TYPE_CAP + 4)).toBe(`${TYPE_CAP + 4}px`);
    expect(fs(92)).toBe("92px");
  });

  it("scales the cap itself", () => {
    expect(fs(TYPE_CAP)).toBe(`max(var(--ts-min, 0px), calc(${TYPE_CAP}px * var(--ts, 1)))`);
  });

  it("reads as the plain size wherever the variables are not set (the customer page)", () => {
    // without --ts and --ts-min the expression is max(0px, 13px * 1): the same 13px as before
    const size = fs(13);
    expect(size).toContain("var(--ts, 1)");
    expect(size).toContain("var(--ts-min, 0px)");
  });
});
