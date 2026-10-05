import { describe, it, expect } from "vitest";
import { parseDmy, formatDmy, formatStamp, personOf, summarizeReading, formatBytes, errorText, countLabel } from "../format.js";

describe("workspace format helpers", () => {
  it("parses day.month.year in its common spellings and rejects impossible dates", () => {
    expect(["15.08.1990", "5.8.1990", "05/08/1990", "5-8-1990"].map((s) => parseDmy(s))).toEqual(["1990-08-15", "1990-08-05", "1990-08-05", "1990-08-05"]);
    expect(["29.02.2001", "1990-08-15", "15.08.90", "", null].map((s) => parseDmy(s))).toEqual([null, null, null, null, null]);
  });

  it("formats dates and stamps", () => {
    expect(formatDmy("1990-08-15")).toBe("15.08.1990");
    expect(formatDmy(null)).toBe("");
    expect(formatStamp(new Date(2026, 9, 5, 12).toISOString())).toBe("5.10.2026");
  });

  it("builds the engine's person from a client", () => {
    expect(personOf("שני", "1990-08-15")).toEqual({ d: 15, m: 8, y: 1990, name: "שני" });
  });

  it("summarises each reading type in one line", () => {
    expect(summarizeReading({ type: "map", input: {}, result: { lp: 33, nv: 4, py: 6 } }, true)).toBe("שביל הגורל 33 · ערך השם 4 · שנה אישית 6");
    expect(summarizeReading({ type: "match", input: { matchType: "biz", other: { name: "דנה" } }, result: { score: 45 } }, true)).toBe("45% התאמה עסקית עם דנה");
    expect(summarizeReading({ type: "parentChild", input: { other: { name: "נועה" } }, result: { score: 55 } }, true)).toBe("55% חיבור עם נועה");
    expect(summarizeReading({ type: "yearCycle", input: {}, result: { proj: [{ year: 2024 }, { year: 2036 }] } }, true)).toBe("שנים אישיות 2024–2036");
  });

  it("counts in natural Hebrew and English", () => {
    expect([countLabel(1, "clients", true), countLabel(3, "clients", true), countLabel(0, "files", true), countLabel(1, "savedReadings", true)])
      .toEqual(["לקוח אחד", "3 לקוחות", "0 קבצים", "בדיקה שמורה אחת"]);
    expect([countLabel(1, "readings", false), countLabel(2, "readings", false)]).toEqual(["1 reading", "2 readings"]);
  });

  it("formats sizes and error messages", () => {
    expect([formatBytes(900), formatBytes(1536), formatBytes(5 * 1024 * 1024)]).toEqual(["900 B", "1.5 KB", "5.0 MB"]);
    expect(errorText("fullName", "required", true)).toBe("חובה למלא שם");
    expect(errorText("whatever", "odd", false)).toBe("Invalid value");
  });
});
