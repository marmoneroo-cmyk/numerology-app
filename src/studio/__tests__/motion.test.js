// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { prefersReducedMotion, vibrate, withViewTransition, attachRipple } from "../motion.js";

// the device's reduced-motion setting, switched by each test
let reduce = false;
const motion = (value) => {
  reduce = value;
};
beforeEach(() => {
  reduce = false;
  vi.stubGlobal("matchMedia", vi.fn((q) => ({ matches: reduce && q.includes("reduce"), addEventListener() {}, removeEventListener() {} })));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("motion", () => {
  it("reads the reduced-motion setting, and treats a missing matchMedia as motion allowed", () => {
    expect(prefersReducedMotion({ matchMedia: () => ({ matches: true }) })).toBe(true);
    expect(prefersReducedMotion({ matchMedia: () => ({ matches: false }) })).toBe(false);
    expect(prefersReducedMotion({})).toBe(false);
  });

  it("vibrates only where the phone can and motion is welcome, and never throws", () => {
    motion(false);
    const nav = { vibrate: vi.fn(() => true) };
    expect(vibrate(12, nav)).toBe(true);
    expect(nav.vibrate).toHaveBeenCalledWith(12);
    expect(vibrate(12, {})).toBe(false);
    expect(vibrate(12, { vibrate: () => { throw new Error("blocked"); } })).toBe(false);
    motion(true);
    expect(vibrate(12, nav)).toBe(false);
    expect(nav.vibrate).toHaveBeenCalledTimes(1);
  });

  it("runs a screen change inside a view transition when there is one, and directly otherwise", () => {
    motion(false);
    const update = vi.fn();
    const doc = {
      startViewTransition: vi.fn((fn) => {
        fn();
        return "transition";
      }),
    };
    expect(withViewTransition(update, doc)).toBe("transition");
    expect(update).toHaveBeenCalledTimes(1);
    expect(withViewTransition(update, {})).toBe(null);
    expect(update).toHaveBeenCalledTimes(2);
    motion(true);
    withViewTransition(update, doc);
    expect(doc.startViewTransition).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(3);
  });

  it("draws the gold ripple on .fx elements only, removes it, and can be detached", () => {
    motion(false);
    vi.useFakeTimers();
    document.body.innerHTML = '<button class="fx" id="a"><span id="inner">a</span></button><button id="b">b</button>';
    const detach = attachRipple(document);
    const press = (id) => document.getElementById(id).dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 5 }));
    press("inner");
    const ripple = document.querySelector("#a .st-ripple");
    expect(ripple).toBeTruthy();
    expect(ripple.getAttribute("aria-hidden")).toBe("true");
    expect(ripple.style.getPropertyValue("--x")).toBe("10px");
    expect(ripple.style.getPropertyValue("--y")).toBe("5px");
    press("b");
    expect(document.querySelector("#b .st-ripple")).toBeNull();
    vi.advanceTimersByTime(800);
    expect(document.querySelector(".st-ripple")).toBeNull();
    detach();
    press("a");
    expect(document.querySelector(".st-ripple")).toBeNull();
  });

  it("can draw the ripple on other button classes too", () => {
    motion(false);
    document.body.innerHTML = '<button class="gb" id="g">g</button><button class="fx" id="f">f</button><button class="other" id="o">o</button>';
    const detach = attachRipple(document, ".gb, .ghost");
    const press = (id) => document.getElementById(id).dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    press("g");
    press("f");
    press("o");
    expect(document.querySelector("#g .st-ripple")).toBeTruthy();
    expect(document.querySelector("#f .st-ripple")).toBeNull();
    expect(document.querySelector("#o .st-ripple")).toBeNull();
    detach();
  });

  it("draws no ripple under reduced motion", () => {
    motion(true);
    document.body.innerHTML = '<button class="fx" id="a">a</button>';
    attachRipple(document);
    document.getElementById("a").dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    expect(document.querySelector(".st-ripple")).toBeNull();
  });
});
