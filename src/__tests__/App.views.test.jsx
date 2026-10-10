// @vitest-environment jsdom
/* App inside Root: entering and leaving the Studio go through `navigate`; the demo says what it is and stays in memory. */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import App from "../App.jsx";
import { AccountProvider } from "../account/AccountContext.jsx";
import { ToastProvider } from "../studio/Toasts.jsx";
import { demoService } from "../demo/sampleAccount.js";

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
    const banner = await screen.findByRole("note", {}, LONG);
    expect(banner.textContent).toContain("זו הדגמה");
    expect((await screen.findAllByText(/רחל כהן/, {}, LONG)).length).toBeGreaterThan(0);
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
