// @vitest-environment jsdom
/* The map summary: every number on one screen, each with "how was this calculated". */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import ReadingSummary from "../ReadingSummary.jsx";
import { ContentContext, EMPTY_CONTENT } from "../../workspace/content.js";
import { fullCalc } from "../../engine/index.js";

afterEach(cleanup);

const NOW = new Date(2026, 9, 5, 12); // October: the +1 season
const NAME = "שני כהן אזולאי";
const MAP = fullCalc(15, 8, 1990, NAME, undefined, NOW);
const CONTENT = {
  ...EMPTY_CONTENT,
  D: { 1: { t: "המנהיג", te: "The Leader" }, 3: { t: "היוצר", te: "The Creator" }, 4: { t: "הבונה", te: "The Builder" } },
  MASTER: { 33: { t: "המורה הגדול", te: "The Master Teacher" } },
  YEAR_ENERGY: { 7: { he: "שנת התבוננות פנימית. צלול פנימה.", en: "Year of inner reflection. Dive within." } },
};

const show = (props = {}) =>
  render(
    <ContentContext.Provider value={CONTENT}>
      <ReadingSummary r={MAP} name={NAME} now={NOW} he {...props} />
    </ContentContext.Provider>,
  );
const cell = (id) => screen.getByTestId(id).textContent;

describe("the map summary", () => {
  it("shows every number of the map at once, with the person's details", () => {
    show();
    expect(screen.getByRole("heading", { level: 2, name: "סיכום המפה" })).toBeTruthy();
    expect(screen.getByText(/שני כהן אזולאי/).textContent).toContain("15.08.1990");
    expect([cell("rs-lp"), cell("rs-nv"), cell("rs-su"), cell("rs-ex")]).toEqual(["33", "4", "1", "3"]);
    expect([cell("rs-py"), cell("rs-age")]).toEqual(["7", "36"]);
    expect([cell("rs-pm"), cell("rs-pd"), cell("rs-hy")]).toEqual([MAP.pm, MAP.pd, MAP.hy].map(String));
    expect([0, 1, 2, 3].map((i) => cell(`rs-pk-${i}`))).toEqual(MAP.pk.map(String));
    expect([0, 1, 2, 3].map((i) => cell(`rs-ch-${i}`))).toEqual(MAP.ch.map(String));
    expect([0, 1, 2, 3].map((i) => cell(`rs-hp-${i}`))).toEqual(MAP.hp.map(String));
    expect([0, 1, 2, 3].map((i) => cell(`rs-hc-${i}`))).toEqual(MAP.hc.map(String));
    expect(cell("rs-miss")).toBe(MAP.ls.miss.join(" · "));
  });

  it("gives each core number its title, and the personal year its theme", () => {
    show();
    const row = (id) => screen.getByTestId(id).closest("tr");
    expect(within(row("rs-lp")).getByText("המורה הגדול")).toBeTruthy();
    expect(within(row("rs-ex")).getByText("היוצר")).toBeTruthy();
    expect(within(row("rs-py")).getByText("שנת התבוננות פנימית")).toBeTruthy();
  });

  it("marks the life cycle the person is in now", () => {
    show();
    // life path 33 -> 6, so the cycles start at 21: 21-30, 30-39 ... at 36 the second
    const current = screen.getByText("עכשיו").closest("tr");
    expect(current.getAttribute("aria-current")).toBe("true");
    expect(current.textContent).toContain("30–39");
  });

  it("starts the first cycle at birth and leaves the last open, so a young person is in one", () => {
    // life path 33 -> 6: the cycles turn at 30, 39 and 48
    const young = fullCalc(15, 8, 2016, NAME, undefined, NOW); // 10 years old
    show({ r: young });
    const rows = screen.getAllByRole("row").filter((row) => row.querySelector(".rs-ages"));
    expect(rows.map((row) => row.querySelector(".rs-ages").textContent)).toEqual([`0–${young.exit + 9}`, `${young.exit + 9}–${young.exit + 18}`, `${young.exit + 18}–${young.exit + 27}`, `${young.exit + 27}+`]);
    expect(rows[0].getAttribute("aria-current")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "איך זה חושב: גילי המחזורים" }));
    expect(within(screen.getByRole("dialog")).getByText(`${young.exit + 27}+`, { selector: "bdi" })).toBeTruthy();
  });

  it("explains a number in a window, and closes it with Escape, back to its button", () => {
    show();
    const how = screen.getByRole("button", { name: "איך זה חושב: שנה אישית" });
    fireEvent.click(how);
    const dialog = screen.getByRole("dialog", { name: "איך זה חושב: שנה אישית" });
    expect(within(dialog).getByText("מה-1.7 ועד ה-31.12 מוסיפים 1")).toBeTruthy();
    expect(within(dialog).getByText("6+1 = 7")).toBeTruthy();
    expect(within(dialog).getByText("7").tagName).toBe("B");
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "סגירה" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(how);
  });

  it("closes from its button and from outside, not from inside", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "איך זה חושב: פסגה" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(dialog.parentElement);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "איך זה חושב: שביל הגורל" }));
    fireEvent.click(screen.getByRole("button", { name: "סגירה" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("has a 'how' for every number and every column", () => {
    show();
    const names = screen.getAllByRole("button", { name: /^איך זה חושב: / }).map((b) => b.getAttribute("aria-label").replace("איך זה חושב: ", ""));
    expect(names).toEqual([
      "שביל הגורל", "ערך השם", "קול הנשמה", "ביטוי",
      "שנה אישית", "חודש אישי", "יום אישי", "שנה נסתרת", "גיל",
      "גילי המחזורים", "פסגה", "אתגר", "פסגה נסתרת", "אתגר נסתר",
      "חובות קארמתיים", "חסרים בלו שו",
      "מספר הבגרות", "מספר יום הלידה", "דומיננטיים בשם", "חסרים בשם",
    ]);
  });

  it("adds maturity, the birthday number, and the name's dominant and missing numbers", () => {
    show();
    // maturity 33 + 4 = 37 -> 1; day 15 -> 6; the name carries 1 most, and never 4, 8, 9
    expect([cell("rs-mat"), cell("rs-bday"), cell("rs-dom"), cell("rs-name-miss")]).toEqual(["1", "6", "1", "4 · 8 · 9"]);
  });

  it("follows a saved reading's own +1 rather than the date", () => {
    const saved = fullCalc(15, 8, 1990, NAME, false, NOW);
    show({ r: saved, add: false });
    fireEvent.click(screen.getByRole("button", { name: "איך זה חושב: שנה אישית" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText("מה-1.7 ועד ה-31.12 מוסיפים 1")).toBeNull();
    expect(cell("rs-py")).toBe("6");
  });

  it("says why a name in Latin letters gets 0 for its name numbers, and only then", () => {
    show();
    expect(screen.queryByRole("note")).toBeNull();
    cleanup();
    show({ r: fullCalc(15, 8, 1990, "John Smith", undefined, NOW), name: "John Smith" });
    expect(screen.getByRole("note").textContent).toContain("בשם אין אותיות עבריות");
    expect(cell("rs-nv")).toBe("0");
  });

  it("speaks English", () => {
    show({ he: false });
    expect(screen.getByRole("heading", { level: 2, name: "Map summary" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "How it was calculated: Life path" })).toBeTruthy();
    expect(screen.getByText("Now")).toBeTruthy();
  });
});
