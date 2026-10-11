// @vitest-environment jsdom
/*
 * The owner's decisions of 2026-10-11 (second round, temporary defaults) where the whole Studio shows
 * them: the day's three numbers each under its own name, one score for a couple on every screen, a master
 * life path beside its base in the profile, what goes into Lo Shu, what a 0 in the psychological map means,
 * and the four periods in order. Signed in as the lab's sample admin, all in memory, on 11.10.2026.
 * מאיה לוי (19.04.1986), יוסי לוי and רחל כהן are made up; their numbers are worked out in
 * src/engine/__tests__/decisions.test.js.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import App from "../App.jsx";
import { AccountProvider } from "../account/AccountContext.jsx";
import { ToastProvider } from "../studio/Toasts.jsx";
import { labService } from "../lab/labAccount.js";

/** A 2D context that accepts every drawing call: the background canvases draw stars the tests do not look at. */
const canvas2d = new Proxy({}, { get: (store, key) => (key in store ? store[key] : () => canvas2d), set: (store, key, value) => ((store[key] = value), true) });

beforeEach(() => {
  // 11.10.2026, 10:00, and the clock goes on from there
  vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 9, 11, 10, 0));
  localStorage.setItem("numerology_owner_mode", "owner");
  vi.stubGlobal("matchMedia", vi.fn((q) => ({
    matches: !q.includes("reduce") && 1300 >= Number((q.match(/min-width: ([0-9]+)px/) || [])[1] || 0),
    addEventListener() {},
    removeEventListener() {},
  })));
  HTMLCanvasElement.prototype.getContext = () => canvas2d;
  window.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {
      this.callback([{ isIntersecting: true }]);
    }
    disconnect() {}
  };
  window.scrollTo = () => {};
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

function studio() {
  render(
    <AccountProvider active loadService={async () => labService()}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AccountProvider>,
  );
}
const tool = (name) => fireEvent.click(within(screen.getByRole("navigation", { name: "כלי הסטודיו" })).getByRole("button", { name }));
/** The open tool's own area (the calculators, the tables, the התאמה tab). */
const toolArea = () => document.querySelector(".st-tool, .st-tool-wide");
const SIGNED_IN = { timeout: 5000 };
const LONG = { timeout: 8000 };
const signedIn = () => screen.findByText("לקוחות אחרונים", {}, SIGNED_IN);
const setField = (input, value) => fireEvent.change(input, { target: { value } });
/** The cells after the period's name, in a row of a periods table. */
const numbersIn = (row) => [...row.querySelectorAll("td")].slice(1).map((td) => td.textContent.trim());

/** An element by its test id, once it is on the page. */
const byTestId = (id) => document.querySelector(`[data-testid="${id}"]`);

describe("the day's three numbers, each under its own name", { timeout: 20000 }, () => {
  it("shows the universal day on 'היום': 1+1+1+0+2+0+2+6 = 13 → 4", async () => {
    studio();
    await signedIn();
    expect(screen.getByText("היום האוניברסלי")).toBeTruthy();
    expect(document.querySelector(".st-today-num").textContent).toBe("4");
  });

  it("keeps the day-of-month number on 'יומי', and says so: 11 mod 9 = 2", async () => {
    studio();
    await signedIn();
    tool("יומי");
    const basis = await screen.findByTestId("ritual-basis", {}, LONG);
    expect(basis.textContent).toContain("לפי מספר היום בחודש: 2");
    expect(within(basis).getByRole("button", { name: "איך זה חושב: מספר היום בחודש" })).toBeTruthy();
  });

  it("bases a reading's ritual on the personal day, and says what goes into Lo Shu and what a 0 means", async () => {
    studio();
    await signedIn();
    tool("קריאה");
    setField(await screen.findByPlaceholderText("הכנס את שמך בעברית...", {}, LONG), "מאיה לוי");
    fireEvent.click(screen.getByRole("button", { name: "המשך ←" }));
    const date = await screen.findByPlaceholderText("dd.mm.yyyy", {}, LONG);
    setField(date, "19.04.1986");
    fireEvent.keyDown(date, { key: "Enter" });
    // the chapters open one at a time: open each next one until the psychological map is there
    await waitFor(() => {
      const next = screen.queryByText("לחצו לחשיפה ▾");
      if (next) fireEvent.click(next);
      expect(byTestId("psych-note")).toBeTruthy();
    }, LONG);
    expect(byTestId("ritual-basis").textContent).toContain("לפי היום האישי: 1"); // 8 + 11 = 19 → 10 → 1
    expect(byTestId("loshu-sources").textContent).toBe("נכנסים לרשת: ספרות תאריך הלידה בלי 0, שביל הגורל בספרה אחת ויום הלידה בספרה אחת.");
    expect(byTestId("psych-note").textContent).toBe("תכונה שאף מספר לא נותן לה נקודות מוצגת 0.");
  });
});

describe("one score for a couple, on every screen", { timeout: 20000 }, () => {
  it("gives יוסי לוי and רחל כהן 58% on the התאמה tab and in the calculators alike", async () => {
    studio();
    await signedIn();
    tool("התאמה");
    const names = await screen.findAllByPlaceholderText("שם בעברית...", {}, LONG);
    const dates = screen.getAllByPlaceholderText("dd.mm.yyyy");
    setField(names[0], "יוסי לוי");
    setField(dates[0], "06.10.1990");
    setField(names[1], "רחל כהן");
    setField(dates[1], "07.10.1985");
    fireEvent.click(screen.getByRole("button", { name: "בדוק התאמה" }));
    expect(await screen.findByText("58%", {}, LONG)).toBeTruthy(); // the tab used to give 63%

    tool("מחשבונים");
    fireEvent.click(await within(toolArea()).findByRole("button", { name: "התאמה" }, LONG));
    fireEvent.click(await within(toolArea()).findByText("התאמה זוגית", {}, LONG));
    const area = toolArea();
    const [first, second] = within(area).getAllByPlaceholderText("שם בעברית...");
    const [firstDate, secondDate] = within(area).getAllByPlaceholderText("dd.mm.yyyy");
    setField(first, "יוסי לוי");
    setField(firstDate, "06.10.1990");
    setField(second, "רחל כהן");
    setField(secondDate, "07.10.1985");
    fireEvent.click(within(area).getByRole("button", { name: "חשב התאמה" }));
    expect(await within(area).findByText("58%", {}, LONG)).toBeTruthy();
  });

  it("compares a master life path in one digit, and shows it beside that digit: 11/2", async () => {
    studio();
    await signedIn();
    tool("התאמה");
    const names = await screen.findAllByPlaceholderText("שם בעברית...", {}, LONG);
    const dates = screen.getAllByPlaceholderText("dd.mm.yyyy");
    setField(names[0], "מאיה לוי");
    setField(dates[0], "19.04.1986");
    setField(names[1], "יוסי לוי");
    setField(dates[1], "06.10.1990");
    fireEvent.click(screen.getByRole("button", { name: "בדוק התאמה" }));
    // 50, life paths 2 and 8 (6 apart) −5, souls 5 and 6 +8 = 53
    expect(await screen.findByText("53%", {}, LONG)).toBeTruthy();
    expect(within(toolArea()).getAllByText("11/2").length).toBeGreaterThan(0);
  });

  it("shows a master life path beside its base in the personal profile: 11/2", async () => {
    studio();
    await signedIn();
    tool("התאמה");
    fireEvent.click(await screen.findByRole("button", { name: "פרופיל אישי" }, LONG));
    setField(await screen.findByPlaceholderText("שם בעברית...", {}, LONG), "מאיה לוי");
    setField(screen.getByPlaceholderText("dd.mm.yyyy"), "19.04.1986");
    fireEvent.click(screen.getByRole("button", { name: "גלה את עצמך" }));
    expect((await screen.findByTestId("profile-lp", {}, LONG)).textContent).toBe("11/2");
  });
});

describe("the four periods, in order, with their hidden numbers", { timeout: 20000 }, () => {
  const ROWS = [
    // ages, then pinnacle, challenge, hidden pinnacle, hidden challenge
    ["0–34", ["5", "3", "8", "1"]],
    ["34–43", ["7", "5", "3", "5"]],
    ["43–52", ["3", "2", "5", "7"]],
    ["52+", ["1", "2", "3", "5"]],
  ];
  /** Each period's row by its ages, checked in order down the table. */
  async function expectPeriods() {
    const rows = [];
    for (const [ages, numbers] of ROWS) {
      const row = (await within(toolArea()).findByText(ages, {}, LONG)).closest("tr");
      expect(numbersIn(row)).toEqual(numbers);
      rows.push(row);
    }
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].compareDocumentPosition(rows[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }

  it("on the tables", async () => {
    studio();
    await signedIn();
    tool("טבלאות");
    setField(await screen.findByPlaceholderText("שם פרטי...", {}, LONG), "מאיה");
    setField(screen.getByPlaceholderText("שם משפחה..."), "לוי");
    setField(screen.getByPlaceholderText("dd.mm.yyyy"), "19.04.1986");
    fireEvent.click(within(toolArea()).getByRole("button", { name: "חשב" }));
    await expectPeriods();
  });

  it("in the calculators' life cycles", async () => {
    studio();
    await signedIn();
    tool("מחשבונים");
    fireEvent.click(await within(toolArea()).findByText("מחזורי חיים", {}, LONG));
    const [name] = toolArea().querySelectorAll("input.gi");
    setField(name, "מאיה לוי");
    setField(within(toolArea()).getByPlaceholderText("dd.mm.yyyy"), "19.04.1986");
    fireEvent.click(within(toolArea()).getByRole("button", { name: "חשב" }));
    await expectPeriods();
  });
});
