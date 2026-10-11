// @vitest-environment jsdom
/* The demo, as AppWorld opens it: a reading shows its summary and numbers, and blurs its interpretations. */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import AppWorld from "../AppWorld.jsx";

const canvas2d = new Proxy({}, { get: (store, key) => (key in store ? store[key] : () => canvas2d), set: (store, key, value) => ((store[key] = value), true) });

beforeEach(() => {
  localStorage.clear();
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
  vi.restoreAllMocks();
});

const LONG = { timeout: 8000 };

describe("the demo's reading", { timeout: 20000 }, () => {
  it("shows the summary's numbers, and blurs the interpretation with a word on where it opens", async () => {
    const { container } = render(<AppWorld view="demo" navigate={vi.fn()} />);
    const nav = await screen.findByRole("navigation", { name: "כלי הסטודיו" }, LONG);
    fireEvent.click(within(nav).getByRole("button", { name: /קריאה/ }));
    fireEvent.change(await screen.findByPlaceholderText("השם המלא בעברית...", {}, LONG), { target: { value: "שני כהן אזולאי" } });
    fireEvent.click(screen.getByRole("button", { name: "המשך ←" }));
    const date = await screen.findByPlaceholderText("dd.mm.yyyy", {}, LONG);
    fireEvent.change(date, { target: { value: "15.08.1990" } });
    fireEvent.keyDown(date, { key: "Enter" });

    expect(await screen.findByRole("heading", { name: "סיכום המפה" }, LONG)).toBeTruthy();
    expect(screen.getByTestId("rs-lp").textContent).toBe("33"); // the numbers stay
    // the first chapter opens by itself; its story is blurred, and says where the full one is
    // the year's theme in the summary is part of the interpretation: blurred too, beside its number
    expect(screen.getByTestId("rs-py").closest("tr").querySelector(".demo-locked")).toBeTruthy();
    expect((await screen.findAllByText("הפירוש המלא נפתח במנוי", {}, LONG)).length).toBeGreaterThan(0);
    // the first chapter opens by itself a moment later; its story is blurred
    await waitFor(() => expect(container.querySelector(".nar-line .demo-locked")).toBeTruthy(), LONG);
    const story = container.querySelector(".nar-line .demo-locked");
    expect(story.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("note").textContent).toContain("הפירושים המלאים מטושטשים");
  });
});
