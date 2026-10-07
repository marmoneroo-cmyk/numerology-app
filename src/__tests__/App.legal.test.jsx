// @vitest-environment jsdom
/*
 * The terms, privacy and refund pages: the footer opens them, and so does a link straight to
 * #terms, #privacy or #refunds. None of them waits for a sign-in.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import App from "../App.jsx";
import { AccountProvider } from "../account/AccountContext.jsx";
import { ToastProvider } from "../studio/Toasts.jsx";
import { LEGAL_DOCS } from "../legal/content.js";

function page() {
  const loadService = vi.fn(async () => {
    throw new Error("a legal page needs no account");
  });
  render(
    <AccountProvider loadService={loadService}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AccountProvider>,
  );
  return loadService;
}
const title = (doc) => LEGAL_DOCS[doc].he.title;
const h1 = (doc) => screen.findByRole("heading", { level: 1, name: title(doc) });
/** A 2D context that accepts every drawing call: the background canvases draw stars the tests do not look at. */
const canvas2d = new Proxy({}, { get: (store, key) => (key in store ? store[key] : () => canvas2d), set: (store, key, value) => ((store[key] = value), true) });

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
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  history.replaceState(null, "", "/");
});

describe("the legal pages", () => {
  it("open from the customer page's footer, and the back button returns to the page", async () => {
    localStorage.setItem("numerology_owner_mode", "customer");
    page();
    fireEvent.click(await screen.findByRole("link", { name: "מדיניות פרטיות" }));
    expect(await h1("privacy")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "חזרה לאתר" }));
    expect(await screen.findByRole("link", { name: "מדיניות פרטיות" })).toBeTruthy();
    expect(location.hash).toBe("");
  });

  it("open straight from a link, before any sign-in, without loading the accounts", async () => {
    history.replaceState(null, "", "/#terms");
    const loadService = page(); // the Studio is the default view, and it would ask to sign in
    expect(await h1("terms")).toBeTruthy();
    expect(screen.queryByLabelText("סיסמה")).toBeNull();
    expect(loadService).not.toHaveBeenCalled();
  });

  it("go back to where the visitor was, so a reload keeps the customer page", async () => {
    history.replaceState(null, "", "/#customer");
    page();
    fireEvent.click(await screen.findByRole("link", { name: "מדיניות פרטיות" }));
    expect(await h1("privacy")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "חזרה לאתר" }));
    expect(await screen.findByRole("link", { name: "מדיניות פרטיות" })).toBeTruthy();
    await waitFor(() => expect(location.hash).toBe("#customer"));
  });

  it("close when the top bar's home button is pressed", async () => {
    history.replaceState(null, "", "/#customer");
    page();
    fireEvent.click(await screen.findByRole("link", { name: "תקנון" }));
    expect(await h1("terms")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /בית$/ }));
    expect(await screen.findByRole("link", { name: "תקנון" })).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1, name: title("terms") })).toBeNull();
  });

  it("are linked from the sign-in screen too, which new visitors see first", async () => {
    page(); // the Studio is the default view
    const links = await screen.findByRole("navigation", { name: "מסמכים משפטיים" });
    fireEvent.click(within(links).getByRole("link", { name: "מדיניות פרטיות" }));
    expect(await h1("privacy")).toBeTruthy();
  });

  it("follow the address from one policy to another", async () => {
    history.replaceState(null, "", "/#refunds");
    page();
    expect(await h1("refunds")).toBeTruthy();
    window.location.hash = "#privacy";
    expect(await h1("privacy")).toBeTruthy();
  });
});
