// @vitest-environment jsdom
/* App inside Root: entering and leaving the Studio go through `navigate`; the demo says what it is and stays in memory. */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import App from "../App.jsx";
import { AccountProvider } from "../account/AccountContext.jsx";
import { ToastProvider } from "../studio/Toasts.jsx";
import { demoService } from "../demo/sampleAccount.js";
import { SALES_WHATSAPP } from "../sales/config.js";

/** A 2D context that accepts every drawing call: the background canvases draw stars the tests do not look at. */
const canvas2d = new Proxy({}, { get: (store, key) => (key in store ? store[key] : () => canvas2d), set: (store, key, value) => ((store[key] = value), true) });

beforeEach(() => {
  localStorage.clear();
  // a computer's screen
  vi.stubGlobal("matchMedia", vi.fn((q) => ({
    matches: !q.includes("reduce") && 1300 >= Number((q.match(/min-width: ([0-9]+)px/) || [])[1] || 0),
    addEventListener() {},
    removeEventListener() {},
  })));
  HTMLCanvasElement.prototype.getContext = () => canvas2d;
  // scroll reveals show at once
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
  vi.restoreAllMocks();
});

const LONG = { timeout: 8000 };
/** The real account service, which never answers here: the Studio waits at its sign-in. */
const never = () => new Promise(() => {});

function show(view, { loadService = never, active } = {}) {
  const navigate = vi.fn();
  render(
    <AccountProvider active={active} loadService={loadService}>
      <ToastProvider>
        <App view={view} navigate={navigate} />
      </ToastProvider>
    </AccountProvider>,
  );
  return navigate;
}

describe("App inside Root", { timeout: 20000 }, () => {
  it("goes to the Studio through navigate from Shani's page", async () => {
    const navigate = show("customer");
    fireEvent.click(await screen.findByRole("button", { name: "סטודיו" }, LONG));
    expect(navigate).toHaveBeenCalledWith("studio");
  });

  it("keeps the master numbers in the live calculator on Shani's page, and says how the sample map reads (the owner, 2026-10-11 and 12)", async () => {
    show("customer");
    const name = await screen.findByPlaceholderText("השם המלא…", {}, LONG);
    const circle = name.closest("section") || document.body;
    fireEvent.change(name, { target: { value: "Dana" } }); // D4 A1 N5 A1 = 11, no longer 2
    expect(await within(circle).findByText("11", {}, LONG)).toBeTruthy();
    fireEvent.change(name, { target: { value: "הדר" } }); // 5+4+2 = 11, as the reading gives it
    expect(await within(circle).findByText("11", {}, LONG)).toBeTruthy();
    expect((await screen.findAllByTestId("psych-note", {}, LONG))[0].textContent).toBe("הגרף יחסי לתכונה החזקה ביותר: היא מגיעה עד הקצה, והשאר לפי היחס אליה. ״לא מודגש״ פירושו שאף מספר לא נותן לתכונה נקודות.");
  });

  it("leaves Shani's page as it was designed (2026-10-12): no Studio text size, the wave at its own width, the cycle's badge at the row's end", async () => {
    // Arrange: a reading on the customer page, past the lead gate
    localStorage.setItem("numerology_lead_done", "1");
    show("customer");
    expect(document.documentElement.dataset.stView).toBe("site");
    fireEvent.change(await screen.findByPlaceholderText("השם המלא בעברית...", {}, LONG), { target: { value: "מאיה לוי" } });
    fireEvent.click(screen.getByRole("button", { name: "המשך ←" }));
    const date = await screen.findByPlaceholderText("dd.mm.yyyy", {}, LONG);
    fireEvent.change(date, { target: { value: "19.04.1986" } });
    fireEvent.keyDown(date, { key: "Enter" });

    // Act: open the chapters one by one, up to the life map
    await waitFor(() => {
      const next = screen.queryByText("לחצו לחשיפה ▾");
      if (next) fireEvent.click(next);
      expect(screen.getByText("מחזורי חיים")).toBeTruthy();
    }, LONG);

    // Assert
    const wave = document.querySelector('svg[viewBox="0 0 520 230"]');
    expect(wave.style.width).toBe("");
    const badge = screen.getAllByText("עכשיו").find((el) => el.tagName === "SPAN");
    expect(badge.parentElement.style.justifyContent).toBe("space-between");
  });

  it("leaves the Studio for the sales page through navigate", async () => {
    const navigate = show("studio");
    fireEvent.click(await screen.findByRole("button", { name: "יציאה ממצב בעל עסק" }, LONG));
    expect(navigate).toHaveBeenCalledWith("home");
  });

  it("shows the demo as a demo: the banner, the sample clients, no admin screen, no customer preview, no device store", async () => {
    const open = vi.fn(() => {
      throw new Error("the demo must not open the browser's own workspace");
    });
    vi.stubGlobal("indexedDB", { open });
    const navigate = show("demo", { active: true, loadService: async () => demoService() });
    const banner = await screen.findByRole("note", { name: "הדגמה" }, LONG);
    expect(banner.textContent).toContain("זו הדגמה");
    // the banner reaches the owner on WhatsApp, in a new tab
    const talk = within(banner).getByRole("link", { name: "לדבר איתנו" });
    expect(talk.getAttribute("href").startsWith(`https://wa.me/${SALES_WHATSAPP}?text=`)).toBe(true);
    expect([talk.getAttribute("target"), talk.getAttribute("rel")]).toEqual(["_blank", "noopener noreferrer"]);
    expect((await screen.findAllByText(/רחל כהן/, {}, LONG)).length).toBeGreaterThan(0);
    // the sample clients' phones are for show: a greeting opens WhatsApp with no one chosen
    for (const greeting of screen.getAllByRole("link", { name: /^ברכה/ })) expect(greeting.getAttribute("href").startsWith("https://wa.me/?text=")).toBe(true);
    const nav = screen.getByRole("navigation", { name: "כלי הסטודיו" });
    expect(within(nav).queryByRole("button", { name: /חשבונות/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "תצוגת לקוח" })).toBeNull();
    // the leads are this browser's real ones (Shani's page saves them here): never in the demo, not even by quick search
    expect(within(nav).queryByRole("button", { name: /לידים/ })).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "חיפוש מהיר" })[0]); // the top bar's (Today has one too)
    const search = await screen.findByRole("dialog");
    expect(within(search).queryAllByRole("option").length).toBeGreaterThan(0);
    expect(within(search).queryByRole("option", { name: /לידים/ })).toBeNull();
    fireEvent.keyDown(search, { key: "Escape" });
    fireEvent.click(within(nav).getByRole("button", { name: /לקוחות/ }));
    await screen.findAllByText(/דנה שמיר/, {}, LONG); // the clients tab is open, with its list
    expect(open).not.toHaveBeenCalled();
    fireEvent.click(within(banner).getByRole("button", { name: "חזרה לעמוד" }));
    expect(navigate).toHaveBeenCalledWith("home");
  });
});
