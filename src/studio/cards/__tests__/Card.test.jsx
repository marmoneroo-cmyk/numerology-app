// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach, beforeAll, afterAll } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import Card from "../Card.jsx";

// the device's reduced-motion setting, switched by each test
let reduce = false;
beforeEach(() => {
  reduce = false;
  vi.stubGlobal("matchMedia", vi.fn((q) => ({ matches: reduce && q.includes("reduce"), addEventListener() {}, removeEventListener() {} })));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  delete navigator.vibrate;
});

// jsdom has no PointerEvent; a mouse event that also carries pointerType is enough for the tilt
const hadPointerEvent = "PointerEvent" in window;
beforeAll(() => {
  if (hadPointerEvent) return;
  window.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init);
      this.pointerType = init.pointerType ?? "";
    }
  };
});
afterAll(() => {
  if (!hadPointerEvent) delete window.PointerEvent;
});

const seeker = { number: 7, title: "המחפש", subtitle: "חוכמה · שקט · רוחניות", art: <svg data-testid="art" />, accent: "#9b8cff" };
const sparksIn = (container) => container.querySelectorAll(".st-card-sparks .st-spark");
const box = { left: 0, top: 0, right: 100, bottom: 150, width: 100, height: 150, x: 0, y: 0 };
const listenForVibration = () => {
  const buzz = vi.fn(() => true);
  Object.defineProperty(navigator, "vibrate", { value: buzz, configurable: true, writable: true });
  return buzz;
};

describe("Card", () => {
  it("starts face down, with a label that does not give the card away", () => {
    render(<Card {...seeker} he />);
    const card = screen.getByRole("button", { name: "קלף סגור" });
    expect(card.getAttribute("type")).toBe("button");
    expect(card.getAttribute("aria-pressed")).toBe("false");
    expect(card.classList.contains("st-card")).toBe(true);
    expect(card.classList.contains("st-open")).toBe(false);
  });

  it("carries the number, art, title and subtitle on its face, its accent and its size", () => {
    const { rerender } = render(<Card {...seeker} he />);
    const card = screen.getByRole("button");
    expect(card.querySelector(".st-card-front .st-card-num").textContent).toBe("7");
    expect(card.querySelector(".st-card-front .st-card-art [data-testid='art']")).toBeTruthy();
    expect(card.querySelector(".st-card-front .st-card-title").textContent).toBe("המחפש");
    expect(card.querySelector(".st-card-front .st-card-sub").textContent).toBe("חוכמה · שקט · רוחניות");
    expect(card.querySelector(".st-card-back").getAttribute("aria-hidden")).toBe("true");
    expect(card.style.getPropertyValue("--st-accent")).toBe("#9b8cff");
    expect(card.classList.contains("st-card-md")).toBe(true);
    rerender(<Card {...seeker} he size="lg" />);
    expect(card.classList.contains("st-card-lg")).toBe(true);
  });

  it("opens on a click: pressed, named, a burst of 18 sparks and a short vibration", () => {
    const buzz = listenForVibration();
    const { container } = render(<Card {...seeker} he />);
    fireEvent.click(screen.getByRole("button", { name: "קלף סגור" }));
    const card = screen.getByRole("button", { name: "קלף 7: המחפש" });
    expect(card.getAttribute("aria-pressed")).toBe("true");
    expect(card.classList.contains("st-open")).toBe(true);
    const sparks = [...sparksIn(container)];
    expect(sparks).toHaveLength(18);
    const dxs = sparks.map((s) => parseFloat(s.style.getPropertyValue("--dx")));
    const dys = sparks.map((s) => parseFloat(s.style.getPropertyValue("--dy")));
    sparks.forEach((spark, i) => {
      const reach = Math.hypot(dxs[i], dys[i]);
      expect(reach).toBeGreaterThan(69.5);
      expect(reach).toBeLessThan(130.5);
      const delay = parseFloat(spark.style.getPropertyValue("--delay"));
      expect(delay).toBeGreaterThanOrEqual(0.35);
      expect(delay).toBeLessThanOrEqual(0.5);
    });
    // they fly out all around the card, not to one side
    expect(dxs.some((d) => d > 0) && dxs.some((d) => d < 0)).toBe(true);
    expect(dys.some((d) => d > 0) && dys.some((d) => d < 0)).toBe(true);
    expect(buzz).toHaveBeenCalledWith(14);
  });

  it("closes on a second click", () => {
    render(<Card {...seeker} he />);
    fireEvent.click(screen.getByRole("button", { name: "קלף סגור" }));
    fireEvent.click(screen.getByRole("button", { name: "קלף 7: המחפש" }));
    const card = screen.getByRole("button", { name: "קלף סגור" });
    expect(card.getAttribute("aria-pressed")).toBe("false");
    expect(card.classList.contains("st-open")).toBe(false);
  });

  it("removes the sparks after 1.7 seconds", () => {
    vi.useFakeTimers();
    const { container } = render(<Card {...seeker} he />);
    fireEvent.click(screen.getByRole("button"));
    expect(sparksIn(container)).toHaveLength(18);
    act(() => vi.advanceTimersByTime(1699));
    expect(sparksIn(container)).toHaveLength(18);
    act(() => vi.advanceTimersByTime(1));
    expect(sparksIn(container)).toHaveLength(0);
  });

  it("never shows more than 18 sparks, even when opened again while the last burst is flying", () => {
    vi.useFakeTimers();
    const { container } = render(<Card {...seeker} he />);
    const card = screen.getByRole("button");
    fireEvent.click(card);
    act(() => vi.advanceTimersByTime(500));
    fireEvent.click(card);
    fireEvent.click(card);
    expect(sparksIn(container)).toHaveLength(18);
    act(() => vi.advanceTimersByTime(1699));
    expect(sparksIn(container)).toHaveLength(18);
    act(() => vi.advanceTimersByTime(1));
    expect(sparksIn(container)).toHaveLength(0);
  });

  it("opens without sparks or vibration under reduced motion", () => {
    reduce = true;
    const buzz = listenForVibration();
    const { container } = render(<Card {...seeker} he />);
    fireEvent.click(screen.getByRole("button", { name: "קלף סגור" }));
    expect(screen.getByRole("button", { name: "קלף 7: המחפש" }).getAttribute("aria-pressed")).toBe("true");
    expect(sparksIn(container)).toHaveLength(0);
    expect(buzz).not.toHaveBeenCalled();
  });

  it("in controlled mode asks with onToggle, and opens only when `open` changes", () => {
    const onToggle = vi.fn();
    const { container, rerender } = render(<Card {...seeker} he open={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "קלף סגור" }));
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("false");
    expect(sparksIn(container)).toHaveLength(0);
    rerender(<Card {...seeker} he open onToggle={onToggle} />);
    const card = screen.getByRole("button", { name: "קלף 7: המחפש" });
    expect(card.getAttribute("aria-pressed")).toBe("true");
    expect(sparksIn(container)).toHaveLength(18);
    fireEvent.click(card);
    expect(onToggle).toHaveBeenLastCalledWith(false);
    expect(card.getAttribute("aria-pressed")).toBe("true");
  });

  it("stays quiet when it arrives already open", () => {
    const buzz = listenForVibration();
    const { container } = render(<Card {...seeker} he open />);
    expect(screen.getByRole("button", { name: "קלף 7: המחפש" }).getAttribute("aria-pressed")).toBe("true");
    expect(sparksIn(container)).toHaveLength(0);
    expect(buzz).not.toHaveBeenCalled();
  });

  it("dims when asked: it steps back, is announced as unavailable, and ignores presses and the mouse", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<Card {...seeker} he dimmed onToggle={onToggle} />);
    const card = screen.getByRole("button", { name: "קלף סגור" });
    vi.spyOn(card, "getBoundingClientRect").mockReturnValue(box);
    expect(card.classList.contains("st-dim")).toBe(true);
    expect(card.disabled).toBe(true);
    fireEvent.click(card);
    expect(onToggle).not.toHaveBeenCalled();
    expect(card.getAttribute("aria-pressed")).toBe("false");
    fireEvent.pointerMove(card, { pointerType: "mouse", clientX: 100, clientY: 0 });
    expect(card.style.getPropertyValue("--tx")).toBe("");
    rerender(<Card {...seeker} he onToggle={onToggle} />);
    expect(card.classList.contains("st-dim")).toBe(false);
    expect(card.disabled).toBe(false);
    fireEvent.click(card);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("stops its timer when it goes away while the sparks are flying", () => {
    vi.useFakeTimers();
    const { unmount } = render(<Card {...seeker} he />);
    fireEvent.click(screen.getByRole("button"));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("speaks English", () => {
    render(<Card number={7} title="The Seeker" subtitle="Wisdom · Quiet · Spirit" he={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Face-down card" }));
    expect(screen.getByRole("button", { name: "Card 7: The Seeker" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("leans a closed card toward the mouse, at most 9 degrees across (--tx) and 7 up and down (--ty), and lets go when the mouse leaves", () => {
    render(<Card {...seeker} he />);
    const card = screen.getByRole("button");
    vi.spyOn(card, "getBoundingClientRect").mockReturnValue(box);
    const expectTilt = (tx, ty) => {
      expect(parseFloat(card.style.getPropertyValue("--tx"))).toBeCloseTo(tx);
      expect(parseFloat(card.style.getPropertyValue("--ty"))).toBeCloseTo(ty);
    };
    fireEvent.pointerMove(card, { pointerType: "mouse", clientX: 100, clientY: 0 }); // top right corner
    expectTilt(9, 7);
    fireEvent.pointerMove(card, { pointerType: "mouse", clientX: 0, clientY: 150 }); // bottom left corner
    expectTilt(-9, -7);
    fireEvent.pointerMove(card, { pointerType: "mouse", clientX: 50, clientY: 75 }); // the middle
    expectTilt(0, 0);
    fireEvent.pointerLeave(card);
    expect(card.style.getPropertyValue("--tx")).toBe("");
    expect(card.style.getPropertyValue("--ty")).toBe("");
  });

  it("does not lean for touch, when open, or under reduced motion", () => {
    render(<Card {...seeker} he />);
    const card = screen.getByRole("button");
    vi.spyOn(card, "getBoundingClientRect").mockReturnValue(box);
    const corner = { clientX: 100, clientY: 0 };
    fireEvent.pointerMove(card, { pointerType: "touch", ...corner });
    expect(card.style.getPropertyValue("--ty")).toBe("");
    reduce = true;
    fireEvent.pointerMove(card, { pointerType: "mouse", ...corner });
    expect(card.style.getPropertyValue("--ty")).toBe("");
    reduce = false;
    fireEvent.pointerMove(card, { pointerType: "mouse", ...corner });
    expect(card.style.getPropertyValue("--ty")).not.toBe("");
    fireEvent.click(card); // opening lets go of the tilt
    expect(card.style.getPropertyValue("--ty")).toBe("");
    fireEvent.pointerMove(card, { pointerType: "mouse", ...corner });
    expect(card.style.getPropertyValue("--ty")).toBe("");
  });

  it("lets go of the lean when the parent opens or dims the card under the mouse", () => {
    const { rerender } = render(<Card {...seeker} he open={false} />);
    const card = screen.getByRole("button");
    vi.spyOn(card, "getBoundingClientRect").mockReturnValue(box);
    const corner = { pointerType: "mouse", clientX: 100, clientY: 0 };
    fireEvent.pointerMove(card, corner);
    expect(card.style.getPropertyValue("--tx")).not.toBe("");
    rerender(<Card {...seeker} he open />);
    expect(card.style.getPropertyValue("--tx")).toBe("");
    rerender(<Card {...seeker} he open={false} />);
    fireEvent.pointerMove(card, corner);
    expect(card.style.getPropertyValue("--tx")).not.toBe("");
    rerender(<Card {...seeker} he open={false} dimmed />);
    expect(card.style.getPropertyValue("--tx")).toBe("");
    expect(card.style.getPropertyValue("--ty")).toBe("");
  });
});
