// @vitest-environment jsdom
/*
 * The whole Studio as the owner uses it, signed in as the lab's sample admin
 * with its sample clients, all in memory (src/lab/labAccount.js). These cover
 * what only the App wires together: "היום", quick search, meeting mode and
 * the client file opened from elsewhere.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within, act } from "@testing-library/react";
import App from "../App.jsx";
import { AccountProvider } from "../account/AccountContext.jsx";
import { ToastProvider } from "../studio/Toasts.jsx";
import { labService } from "../lab/labAccount.js";

/** A 2D context that accepts every drawing call: the background canvases draw stars the test does not look at. */
const canvas2d = new Proxy({}, { get: (store, key) => (key in store ? store[key] : () => canvas2d), set: (store, key, value) => ((store[key] = value), true) });

beforeEach(() => {
  localStorage.setItem("numerology_owner_mode", "owner");
  // a computer's screen: the client list beside the open client
  vi.spyOn(window, "matchMedia").mockImplementation((q) => ({
    matches: !q.includes("reduce") && 1300 >= Number((q.match(/min-width: ([0-9]+)px/) || [])[1] || 0),
    addEventListener() {},
    removeEventListener() {},
  }));
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
const setField = (input, value) => fireEvent.change(input, { target: { value } });

/** A full reading from the reading tool: name, then birth date. */
async function readingFor(name, date) {
  tool("קריאה");
  setField(await screen.findByPlaceholderText("הכנס את שמך בעברית..."), name);
  fireEvent.click(screen.getByRole("button", { name: "המשך ←" }));
  setField(await screen.findByPlaceholderText("dd.mm.yyyy"), date);
  fireEvent.keyDown(screen.getByPlaceholderText("dd.mm.yyyy"), { key: "Enter" });
}

describe("the Studio", () => {
  it("opens on 'היום', and a recent client opens beside the list, but only once", async () => {
    studio();
    const recent = await screen.findByRole("region", { name: "לקוחות אחרונים" }).catch(() => null);
    const panel = recent || (await screen.findByText("לקוחות אחרונים")).closest("section");
    fireEvent.click(await within(panel).findByRole("button", { name: /יוסי לוי/ }));
    const open = await screen.findByRole("region", { name: "הלקוח הפתוח" });
    expect(await within(open).findByRole("heading", { name: "יוסי לוי" })).toBeTruthy();
    // away and back: the list, not the client asked for earlier
    tool("קריאה");
    tool("לקוחות");
    const again = await screen.findByRole("region", { name: "הלקוח הפתוח" });
    expect(await within(again).findByText("בחרו לקוח מהרשימה, או פתחו לקוח חדש.")).toBeTruthy();
  });

  it("finds a client with Ctrl+K, by phone, and opens their file", async () => {
    studio();
    await screen.findByText("לקוחות אחרונים");
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", code: "KeyK", ctrlKey: true, bubbles: true, cancelable: true }));
    });
    const dialog = await screen.findByRole("dialog", { name: "חיפוש מהיר" });
    const input = within(dialog).getByRole("combobox");
    setField(input, "0545550188");
    expect(await within(dialog).findByRole("option", { name: /יוסי לוי/ })).toBeTruthy();
    fireEvent.keyDown(input, { key: "Enter" });
    const open = await screen.findByRole("region", { name: "הלקוח הפתוח" });
    expect(await within(open).findByRole("heading", { name: "יוסי לוי" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "חיפוש מהיר" })).toBeNull();
  });

  it("shows the last reading in meeting mode, under the name it was made for, and none after 'קריאה חדשה'", async () => {
    studio();
    await screen.findByText("לקוחות אחרונים");
    await readingFor("רחל כהן", "08.03.1985");
    expect(await screen.findByText("רחל כהן", { selector: "h2, h1, div" })).toBeTruthy();
    tool("היום");
    fireEvent.click(await screen.findByRole("button", { name: "מצב פגישה" }));
    const meeting = await screen.findByRole("dialog", { name: "מצב פגישה" });
    expect(within(meeting).getByText("רחל כהן")).toBeTruthy();
    fireEvent.keyDown(within(meeting).getByRole("button", { name: /סיום הפגישה/ }), { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "מצב פגישה" })).toBeNull();
    // a new reading starts empty, so meeting mode has nothing stale to show
    fireEvent.click(screen.getByRole("button", { name: /קריאה חדשה/ }));
    expect((await screen.findByPlaceholderText("הכנס את שמך בעברית...")).value).toBe("");
    tool("היום");
    fireEvent.click(await screen.findByRole("button", { name: "מצב פגישה" }));
    expect(screen.queryByRole("dialog", { name: "מצב פגישה" })).toBeNull();
    expect(await screen.findByText("פותחים קריאה, ואז ׳מצב פגישה׳ מציג אותה בגדול.")).toBeTruthy();
  });
});
