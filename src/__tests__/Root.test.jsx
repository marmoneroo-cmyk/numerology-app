// @vitest-environment jsdom
/* Root: the sales page at the plain address, and the app's views (the Studio, its demo, Shani's page) on demand. */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import Root from "../Root.jsx";
import { SAVED_LOGIN_KEY } from "../routes.js";
import { SALES } from "../sales/content.js";

/** A 2D context that accepts every drawing call: the background canvases draw stars the tests do not look at. */
const canvas2d = new Proxy({}, { get: (store, key) => (key in store ? store[key] : () => canvas2d), set: (store, key, value) => ((store[key] = value), true) });
let fetches;

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
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
  fetches = [];
  vi.stubGlobal("fetch", vi.fn(async (url) => {
    fetches.push(String(url));
    throw new Error("offline in tests");
  }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  history.replaceState(null, "", "/");
});

const LONG = { timeout: 8000 };
const salesTitle = () => screen.findByRole("heading", { level: 1, name: SALES.he.hero.title }, LONG);

describe("Root", { timeout: 25000 }, () => {
  it("opens the sales page on the plain address", async () => {
    render(<Root storage={localStorage} />);
    expect(await salesTitle()).toBeTruthy();
  });

  it("runs the demo in memory: the banner and sample clients, no request to Supabase, no IndexedDB, and back to the page", async () => {
    const open = vi.fn(() => {
      throw new Error("the demo must not open IndexedDB");
    });
    vi.stubGlobal("indexedDB", { open });
    render(<Root storage={localStorage} />);
    fireEvent.click(await screen.findByRole("link", { name: SALES.he.hero.tryIt }));
    const banner = await screen.findByRole("note", {}, LONG);
    expect((await screen.findAllByText(/רחל כהן/, {}, LONG)).length).toBeGreaterThan(0);
    expect(fetches.filter((url) => url.includes("supabase.co"))).toEqual([]);
    expect(open).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "חזרה לעמוד" }));
    expect(await salesTitle()).toBeTruthy();
    expect(location.hash).toBe("");
    expect(banner.isConnected).toBe(false);
  });

  it("opens Shani's page at #customer", async () => {
    history.replaceState(null, "", "/#customer");
    render(<Root storage={localStorage} />);
    expect(await screen.findByTitle("דברו איתי בוואטסאפ", {}, LONG)).toBeTruthy();
  });

  it("opens a legal page light from the sales page, and goes back to it", async () => {
    render(<Root storage={localStorage} />);
    fireEvent.click(await screen.findByRole("link", { name: SALES.he.footer.privacy }));
    expect(await screen.findByRole("heading", { level: 1, name: "מדיניות פרטיות" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "חזרה לאתר" }));
    expect(await salesTitle()).toBeTruthy();
  });

  it("opens a legal page asked for directly, and goes to the sales page from it", async () => {
    history.replaceState(null, "", "/#terms");
    render(<Root storage={localStorage} />);
    expect(await screen.findByRole("heading", { level: 1, name: "תנאי שימוש" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "חזרה לאתר" }));
    expect(await salesTitle()).toBeTruthy();
    expect(location.hash).toBe("");
  });

  it("opens the Studio in a browser that keeps a login, and says #studio in the address", async () => {
    const storage = { getItem: (key) => (key === SAVED_LOGIN_KEY ? "{}" : null) };
    render(<Root storage={storage} />);
    await waitFor(() => expect(location.hash).toBe("#studio"));
    expect(screen.queryByRole("heading", { level: 1, name: SALES.he.hero.title })).toBeNull();
  });

  it("goes into the Studio from the sales page's sign-in, and home again from the Studio's exit", async () => {
    render(<Root storage={localStorage} />);
    fireEvent.click(await screen.findByRole("link", { name: SALES.he.signIn }));
    fireEvent.click(await screen.findByRole("button", { name: "יציאה ממצב בעל עסק" }, LONG));
    expect(await salesTitle()).toBeTruthy();
    expect(location.hash).toBe("");
  });
});
