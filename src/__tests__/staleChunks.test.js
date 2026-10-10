/* A deploy replaced the app's files while a page was open: reload once for the new ones, never in a loop. */
import { describe, it, expect, vi } from "vitest";
import { reloadOnStaleChunks } from "../staleChunks.js";

/** A window stand-in: its event listeners, and a reload to watch. */
function fakeWindow() {
  const listeners = {};
  return {
    addEventListener: (type, fn) => (listeners[type] = fn),
    fire: (type) => {
      const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      listeners[type]?.(event);
      return event;
    },
    location: { reload: vi.fn() },
  };
}
const memoryStorage = () => {
  const items = new Map();
  return { getItem: (k) => items.get(k) ?? null, setItem: (k, v) => items.set(k, String(v)) };
};

describe("reloadOnStaleChunks", () => {
  it("reloads once when a file of the app cannot load, then lets the error show", () => {
    const win = fakeWindow();
    reloadOnStaleChunks(win, memoryStorage());
    expect(win.fire("vite:preloadError").defaultPrevented).toBe(true);
    expect(win.location.reload).toHaveBeenCalledTimes(1);
    // the reloaded page fails again: no loop, the page's own error screen takes over
    expect(win.fire("vite:preloadError").defaultPrevented).toBe(false);
    expect(win.location.reload).toHaveBeenCalledTimes(1);
  });

  it("does nothing when storage is refused, rather than risk reloading forever", () => {
    const win = fakeWindow();
    reloadOnStaleChunks(win, { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
    win.fire("vite:preloadError");
    expect(win.location.reload).not.toHaveBeenCalled();
  });
});
