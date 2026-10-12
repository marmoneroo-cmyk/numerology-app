// @vitest-environment jsdom
/*
 * Every Studio screen says in a line or two what it is for, and so does each of the התאמה tab's three
 * comparisons (the owner, 2026-10-12: "a short explanation for each topic"). Signed in as the lab's sample
 * admin, all in memory.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import App from "../App.jsx";
import { AccountProvider } from "../account/AccountContext.jsx";
import { ToastProvider } from "../studio/Toasts.jsx";
import { labService } from "../lab/labAccount.js";
import { SCREEN_HELP, MATCH_HELP } from "../studio/screenHelp.js";

/** A 2D context that accepts every drawing call: the background canvases draw stars the tests do not look at. */
const canvas2d = new Proxy({}, { get: (store, key) => (key in store ? store[key] : () => canvas2d), set: (store, key, value) => ((store[key] = value), true) });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 9, 12, 10, 0));
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
const nav = () => screen.getByRole("navigation", { name: "כלי הסטודיו" });
const intro = () => screen.getByRole("note", { name: "על המסך הזה" });

const TOOLS = [
  ["היום", "today"],
  ["לקוחות", "clients"],
  ["קריאה", "reading"],
  ["לידים", "leads"],
  ["טבלאות", "tables"],
  ["התאמה", "match"],
  ["יומי", "daily"],
  ["מספרים", "numbers"],
  ["מחשבונים", "calc"],
  ["החשבון שלי", "account"],
  ["חשבונות", "admin"],
];

describe("the explanation on every Studio screen", () => {
  it("has a Hebrew and an English text for every tool and every comparison", () => {
    for (const [, key] of TOOLS) {
      expect(SCREEN_HELP[key]?.he?.length, key).toBeGreaterThan(30);
      expect(SCREEN_HELP[key]?.en?.length, key).toBeGreaterThan(30);
    }
    for (const key of ["couple", "profile", "parent"]) {
      expect(MATCH_HELP[key]?.he?.length, key).toBeGreaterThan(30);
      expect(MATCH_HELP[key]?.en?.length, key).toBeGreaterThan(30);
    }
  });

  it("shows each screen's own explanation when the screen opens", async () => {
    // Arrange
    studio();
    await within(await screen.findByRole("navigation", { name: "כלי הסטודיו" })).findByRole("button", { name: "חשבונות" });

    for (const [name, key] of TOOLS) {
      // Act
      fireEvent.click(within(nav()).getByRole("button", { name }));

      // Assert
      expect(intro().textContent, name).toContain(SCREEN_HELP[key].he);
    }
  });

  it("opens the מספרים tab on the number library, each number on its page with the Studio's own texts (the owner, 2026-10-12)", async () => {
    // Arrange
    studio();
    fireEvent.click(within(await screen.findByRole("navigation", { name: "כלי הסטודיו" })).getByRole("button", { name: "מספרים" }));

    // Assert: every number, the masters and the debts, and no tarot anywhere
    const numbers = await screen.findAllByRole("button", { name: /^\d+ · / });
    expect(numbers.map((b) => Number(b.getAttribute("data-number")))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33, 13, 14, 16, 19]);
    expect(screen.queryByText(/טארוט/)).toBeNull();

    // Act: open 7
    fireEvent.click(screen.getByRole("button", { name: /^7 · / }));

    // Assert: its page, from the texts the rest of the Studio shows
    const page = screen.getByRole("heading", { level: 2, name: /^7 · / }).closest("article");
    for (const part of ["המהות", "הסיפור של אנשי 7", "חוזקות", "אתגרים", "השיעור", "צל וצמיחה", "כשנה אישית", "מאפיינים", "טקס"]) {
      expect(within(page).getByRole("heading", { level: 3, name: part })).toBeTruthy();
    }
    fireEvent.click(within(page).getByRole("button", { name: "לכל המספרים" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /^7 · / }));

    // a page left open: coming back to the tab shows every number again
    fireEvent.click(screen.getByRole("button", { name: /^7 · / }));
    fireEvent.click(within(nav()).getByRole("button", { name: "היום" }));
    fireEvent.click(within(nav()).getByRole("button", { name: "מספרים" }));
    expect(screen.queryByRole("heading", { level: 2, name: /^7 · / })).toBeNull();
    expect(screen.getAllByRole("button", { name: /^\d+ · / })).toHaveLength(16);
  });

  it("explains the comparison that is chosen in the התאמה tab", async () => {
    // Arrange
    studio();
    fireEvent.click(within(await screen.findByRole("navigation", { name: "כלי הסטודיו" })).getByRole("button", { name: "התאמה" }));
    const explanation = () => screen.getByTestId("match-help");

    // Assert: the couple comparison is open first
    expect(explanation().textContent).toBe(MATCH_HELP.couple.he);

    // Act and assert: each of the other two
    fireEvent.click(screen.getByRole("button", { name: /פרופיל אישי/ }));
    expect(explanation().textContent).toBe(MATCH_HELP.profile.he);
    fireEvent.click(screen.getByRole("button", { name: /הורה-ילד/ }));
    expect(explanation().textContent).toBe(MATCH_HELP.parent.he);
  });
});
