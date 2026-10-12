// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import Particles from "../Particles.jsx";

/** A 2D context that records what is drawn. */
function fakeContext() {
  const gradient = { addColorStop: vi.fn() };
  return {
    clearRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
    setTransform: vi.fn(), createRadialGradient: vi.fn(() => gradient), createLinearGradient: vi.fn(() => gradient),
  };
}

/** A reduced-motion setting that can be turned on and off, telling its listeners as the browser does. */
function motionSetting(reduce) {
  const listeners = new Set();
  const query = {
    matches: reduce,
    addEventListener: vi.fn((type, fn) => listeners.add(fn)),
    removeEventListener: vi.fn((type, fn) => listeners.delete(fn)),
  };
  vi.stubGlobal("matchMedia", vi.fn(() => query));
  return {
    query,
    turn(on) {
      query.matches = on;
      for (const fn of [...listeners]) fn();
    },
  };
}

let ctx;
let queued;
/** Runs the next `count` frames the sky asked for. */
const runFrames = (count) => {
  for (let i = 0; i < count; i++) queued.shift()?.();
};
beforeEach(() => {
  ctx = fakeContext();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ctx);
  queued = [];
  vi.stubGlobal("requestAnimationFrame", vi.fn((fn) => queued.push(fn)));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the sky", () => {
  it("moves: it asks for frame after frame, follows the cursor and sends a shooting star", () => {
    motionSetting(false);
    render(<Particles dk />);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    fireEvent.mouseMove(window, { clientX: 500, clientY: 380 });
    runFrames(160); // a shooting star comes every 150th frame
    expect(requestAnimationFrame).toHaveBeenCalledTimes(161);
    expect(ctx.createRadialGradient).toHaveBeenCalled(); // the glow around the cursor
    expect(ctx.createLinearGradient).toHaveBeenCalled(); // a shooting star's tail
  });

  it("stands still under reduced motion: one frame and no animation", () => {
    motionSetting(true);
    render(<Particles dk={false} />);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(ctx.clearRect).toHaveBeenCalledTimes(2); // drawn on the first sizing, then on start
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fillStyle).toMatch(/^rgba\(147,118,64,/); // the light theme's gold
  });

  it("draws the still sky again when the window changes size", () => {
    motionSetting(true);
    render(<Particles dk />);
    const before = ctx.clearRect.mock.calls.length;
    fireEvent(window, new Event("resize"));
    expect(ctx.clearRect.mock.calls.length).toBe(before + 1);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("starts moving when reduced motion is turned off, and stops when it is turned on again", () => {
    const setting = motionSetting(true);
    render(<Particles dk />);
    setting.turn(false);
    expect(requestAnimationFrame).toHaveBeenCalled();
    setting.turn(true);
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it("lets go of the window and the setting when it leaves", () => {
    const setting = motionSetting(true);
    const { unmount } = render(<Particles dk />);
    unmount();
    expect(setting.query.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("draws nothing where there is no canvas to draw on", () => {
    motionSetting(false);
    HTMLCanvasElement.prototype.getContext.mockImplementation(() => null);
    expect(() => render(<Particles dk />)).not.toThrow();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
});
