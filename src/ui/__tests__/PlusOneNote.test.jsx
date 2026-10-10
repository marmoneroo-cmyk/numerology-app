// @vitest-environment jsdom
/* The note that replaced the "+1" checkbox: the rule, and whether it applies on the reading's date. */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import PlusOneNote, { plusOneNote } from "../PlusOneNote.jsx";

afterEach(cleanup);

const MARCH = new Date(2026, 2, 5, 12);
const OCTOBER = new Date(2026, 9, 5, 12);

describe("the +1 note", () => {
  it("names the dates in both seasons", () => {
    for (const now of [MARCH, OCTOBER]) {
      expect(plusOneNote(true, now)).toContain("מה-1.7 ועד ה-31.12");
      expect(plusOneNote(false, now)).toContain("July 1 to December 31");
    }
  });

  it("says the 1 was added when the date is in the season, and only then", () => {
    expect(plusOneNote(true, OCTOBER)).toMatch(/^נוסף 1/);
    expect(plusOneNote(true, MARCH)).not.toMatch(/^נוסף 1/);
    expect(plusOneNote(false, OCTOBER)).toMatch(/^1 was added/);
  });

  it("renders as a note", () => {
    render(<PlusOneNote he now={OCTOBER} />);
    expect(screen.getByRole("note").textContent).toBe(plusOneNote(true, OCTOBER));
  });
});
