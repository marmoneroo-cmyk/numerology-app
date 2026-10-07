// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { useLayout, useMediaQuery, BREAKPOINTS } from "../useMediaQuery.js";

/** A matchMedia that answers min-width queries for a width that tests can change. */
function fakeScreen(width) {
  const lists = [];
  let current = width;
  const matchMedia = (query) => {
    const min = Number((query.match(/min-width: ([0-9]+)px/) || [])[1] || 0);
    const list = {
      get matches() {
        return current >= min;
      },
      listeners: new Set(),
      addEventListener: (type, fn) => list.listeners.add(fn),
      removeEventListener: (type, fn) => list.listeners.delete(fn),
    };
    lists.push(list);
    return list;
  };
  vi.stubGlobal("matchMedia", vi.fn(matchMedia));
  return {
    resize(to) {
      current = to;
      act(() => lists.forEach((l) => l.listeners.forEach((fn) => fn())));
    },
    listening: () => lists.reduce((n, l) => n + l.listeners.size, 0),
  };
}

function Probe() {
  return <p>{useLayout()}</p>;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useLayout", () => {
  it("names the layout by width, and follows the screen when it changes", () => {
    const screenSize = fakeScreen(390);
    render(<Probe />);
    expect(screen.getByText("phone")).toBeTruthy();
    screenSize.resize(800);
    expect(screen.getByText("tablet")).toBeTruthy();
    screenSize.resize(1300);
    expect(screen.getByText("desk")).toBeTruthy();
    screenSize.resize(BREAKPOINTS.desk - 1);
    expect(screen.getByText("tablet")).toBeTruthy();
  });

  it("stops listening when it unmounts", () => {
    const screenSize = fakeScreen(1300);
    const { unmount } = render(<Probe />);
    expect(screenSize.listening()).toBeGreaterThan(0);
    unmount();
    expect(screenSize.listening()).toBe(0);
  });

  it("assumes a phone when the browser cannot say", () => {
    const original = window.matchMedia;
    delete window.matchMedia;
    try {
      function Single() {
        return <p>{String(useMediaQuery("(min-width: 1024px)"))}</p>;
      }
      render(<><Probe /><Single /></>);
      expect(screen.getByText("phone")).toBeTruthy();
      expect(screen.getByText("false")).toBeTruthy();
    } finally {
      window.matchMedia = original;
    }
  });
});
