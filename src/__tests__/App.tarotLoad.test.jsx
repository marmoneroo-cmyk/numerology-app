// @vitest-environment jsdom
/*
 * The tarot loads with the קלפים tab. When it cannot load (the connection dropped, a file went missing), the tab
 * says so and offers to try again or to show the number cards; the rest of the Studio keeps working.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import App from "../App.jsx";
import { AccountProvider } from "../account/AccountContext.jsx";
import { ToastProvider } from "../studio/Toasts.jsx";
import { labService } from "../lab/labAccount.js";

vi.mock("../studio/tarot/TarotScreen.jsx", () => {
  throw new Error("the deck's file did not load");
});

/** A 2D context that accepts every drawing call: the background canvases draw stars the tests do not look at. */
const canvas2d = new Proxy({}, { get: (store, key) => (key in store ? store[key] : () => canvas2d), set: (store, key, value) => ((store[key] = value), true) });

beforeEach(() => {
  localStorage.setItem("numerology_owner_mode", "owner");
  vi.stubGlobal("matchMedia", vi.fn((q) => ({ matches: !q.includes("reduce") && 1300 >= Number((q.match(/min-width: ([0-9]+)px/) || [])[1] || 0), addEventListener() {}, removeEventListener() {} })));
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
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("a tarot that cannot load", () => {
  it("stays in its tab, with a way to try again and the number cards a press away", async () => {
    // Arrange
    render(
      <AccountProvider active loadService={async () => labService()}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AccountProvider>,
    );
    const nav = await screen.findByRole("navigation", { name: "כלי הסטודיו" });

    // Act
    fireEvent.click(within(nav).getByRole("button", { name: "קלפים" }));

    // Assert: the tab says what happened; the Studio around it is still there
    const alert = await screen.findByRole("alert", {}, { timeout: 8000 });
    expect(alert.textContent).toContain("החפיסה לא נטענה");
    expect(screen.getByRole("navigation", { name: "כלי הסטודיו" })).toBeTruthy();
    fireEvent.click(within(alert).getByRole("button", { name: "לנסות שוב" }));
    expect((await screen.findByRole("alert", {}, { timeout: 8000 })).textContent).toContain("החפיסה לא נטענה");
    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "לקלפי המספרים" }));
    expect(screen.getByText("לוחצים על קלף כדי להפוך אותו.")).toBeTruthy();
  });
});
