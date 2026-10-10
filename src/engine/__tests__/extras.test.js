/*
 * The numbers added in 2026-10 from common practice (Decoz, and the Israeli schools' "dominant and
 * missing in the name"): worked by hand, so this file doubles as their definition.
 */
import { describe, it, expect } from "vitest";
import { nameCounts, dominantNumbers, missingNumbers, maturity, birthdayNumber, textNumber, LV } from "../index.js";

// שני כהן אזולאי: ש3 נ5 י1 כ2 ה5 ן5 א1 ז7 ו6 ל3 א1 י1
const SHANI = "שני כהן אזולאי";

describe("the name's numbers", () => {
  it("counts the letters carrying each value", () => {
    expect(nameCounts(SHANI)).toEqual({ 1: 4, 2: 1, 3: 2, 4: 0, 5: 3, 6: 1, 7: 1, 8: 0, 9: 0 });
  });

  it("dominant: the values that appear most, ties kept", () => {
    expect(dominantNumbers(SHANI)).toEqual([1]);
    expect(dominantNumbers("אב")).toEqual([1, 2]);
  });

  it("missing: the values no letter carries", () => {
    expect(missingNumbers(SHANI)).toEqual([4, 8, 9]);
  });

  it("a name with no Hebrew letters has neither", () => {
    for (const name of ["", "John", "123", null]) {
      expect(dominantNumbers(name)).toEqual([]);
      expect(missingNumbers(name)).toEqual([]);
    }
  });

  it("every Hebrew letter is counted, finals included", () => {
    const all = Object.keys(LV).join("");
    expect(Object.values(nameCounts(all)).reduce((a, b) => a + b, 0)).toBe(27);
  });
});

describe("maturity", () => {
  it("is the life path plus the name number, masters kept", () => {
    // life path 33 (15.08.1990) + name 4 = 37 -> 10 -> 1
    expect(maturity(15, 8, 1990, SHANI)).toBe(1);
    // life path 11 (19.09.1999) + name 0 = 11, kept
    expect(maturity(19, 9, 1999, "")).toBe(11);
  });
});

describe("the birthday number", () => {
  it("is the day of birth reduced, masters kept", () => {
    expect([1, 9, 10, 11, 13, 22, 29, 31].map(birthdayNumber)).toEqual([1, 9, 1, 11, 4, 22, 11, 4]);
  });
});

describe("a practical number: phone, address, car, account, business name", () => {
  it("adds every digit and every letter, and reduces, masters kept", () => {
    // 0+5+2+1+2+3+4+5+6+7 = 35 -> 8
    expect(textNumber("052-123-4567")).toBe(8);
    // הרצל 12: ה5 ר2 צ9 ל3 + 1+2 = 22, kept
    expect(textNumber("הרצל 12")).toBe(22);
    // Latin letters by position: A1 B2 C3 = 6
    expect(textNumber("ABC")).toBe(6);
  });

  it("is 0 for nothing to count", () => {
    expect([textNumber(""), textNumber("--- !"), textNumber(null)]).toEqual([0, 0, 0]);
  });
});
