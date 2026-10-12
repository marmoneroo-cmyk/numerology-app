// @vitest-environment jsdom
/*
 * Saving the map as a PDF: the PDF library loads only when a report is saved (it is large), so the button waits for
 * it, can't be pressed twice meanwhile, falls back to an image when no PDF can be made, and says so when
 * nothing could be saved.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import App from "../App.jsx";
import { AccountProvider } from "../account/AccountContext.jsx";
import { ToastProvider } from "../studio/Toasts.jsx";

const pdf = vi.hoisted(() => ({ gate: Promise.resolve(), fail: false, saved: [] }));
// the module is made once per file: the first save waits for `gate` (the library's download), and `fail` is read on each save
vi.mock("jspdf", async () => {
  await pdf.gate;
  return {
    jsPDF: class {
      constructor() {
        if (pdf.fail) throw new Error("no PDF here");
      }
      addImage() {}
      save(name) {
        pdf.saved.push(name);
      }
    },
  };
});

const canvas2d = new Proxy({}, { get: (store, key) => (key in store ? store[key] : () => canvas2d), set: (store, key, value) => ((store[key] = value), true) });
const LONG = { timeout: 8000 };

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("numerology_lead_done", "1");
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  HTMLCanvasElement.prototype.getContext = () => canvas2d;
  HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,AAAA";
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
  pdf.saved = [];
  pdf.fail = false;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Shani's page with a map made for one name: returns the save button. */
async function mapReady() {
  render(
    <AccountProvider loadService={() => new Promise(() => {})}>
      <ToastProvider>
        <App view="customer" navigate={vi.fn()} />
      </ToastProvider>
    </AccountProvider>,
  );
  fireEvent.change(await screen.findByPlaceholderText("השם המלא בעברית...", {}, LONG), { target: { value: "מאיה לוי" } });
  fireEvent.click(screen.getByRole("button", { name: "המשך ←" }));
  const date = await screen.findByPlaceholderText("dd.mm.yyyy", {}, LONG);
  fireEvent.change(date, { target: { value: "19.04.1986" } });
  fireEvent.keyDown(date, { key: "Enter" });
  // the report is offered once every chapter is open
  return waitFor(() => {
    const next = screen.queryByText("לחצו לחשיפה ▾");
    if (next) fireEvent.click(next);
    return screen.getByRole("button", { name: "שמירת דו״ח PDF" });
  }, LONG);
}

describe("saving the map as a PDF", { timeout: 20000 }, () => {
  it("waits for the PDF library, saves once, and can't be pressed twice meanwhile", async () => {
    let open;
    pdf.gate = new Promise((resolve) => (open = resolve));
    const save = await mapReady();
    fireEvent.click(save);
    expect(save.disabled).toBe(true);
    fireEvent.click(save); // a second press while the library loads does nothing
    open();
    await waitFor(() => expect(save.disabled).toBe(false));
    expect(pdf.saved).toEqual(["numerology-מאיה לוי.pdf"]);
  });

  it("saves an image when no PDF can be made, and says so when nothing could be saved", async () => {
    pdf.fail = true;
    const clicks = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      if (this.download.endsWith(".png")) throw new Error("no downloads here");
    });
    const save = await mapReady();
    fireEvent.click(save);
    expect(await screen.findByText("לא הצלחנו לשמור את הדו״ח. אפשר לנסות שוב.", {}, LONG)).toBeTruthy();
    expect(clicks).toHaveBeenCalledTimes(1); // the image was tried
    expect(save.disabled).toBe(false);
  });
});
