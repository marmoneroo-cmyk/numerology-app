// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, act, cleanup, within } from "@testing-library/react";
import Deck from "../Deck.jsx";

// the device's reduced-motion setting, switched by each test
let reduce = false;
beforeEach(() => {
  reduce = false;
  vi.spyOn(window, "matchMedia").mockImplementation((q) => ({ matches: reduce && q.includes("reduce"), addEventListener() {}, removeEventListener() {} }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  delete Element.prototype.animate; // jsdom has none; some tests lend one
});

const TITLES = ["המנהיג", "המגשר", "היוצר", "הבונה", "החופשי", "המטפל", "המחפש", "בעל הכוח", "החכם"];
const POOL = TITLES.map((title, i) => ({ number: i + 1, title, subtitle: "", art: null, accent: "#9b8cff" }));
const ENGLISH_TITLES = ["The Leader", "The Mediator", "The Creator", "The Builder", "The Free Spirit", "The Nurturer", "The Seeker", "The Powerhouse", "The Sage"];
const ENGLISH_POOL = ENGLISH_TITLES.map((title, i) => ({ number: i + 1, title, subtitle: "", art: null }));

const INVITE = "לוחצים על ׳ערבוב וחלוקה׳, ושלושה קלפים יוצאים מהחפיסה.";

/** A repeatable random(): the same seed always deals the same cards. */
function seeded(seed) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

const status = () => screen.getByRole("status").textContent;
const shuffle = (name = "ערבוב וחלוקה") => fireEvent.click(screen.getByRole("button", { name }));
const faceDown = () => screen.getAllByRole("button", { name: "קלף סגור" });
const dealtNumbers = (container) => [...container.querySelectorAll(".st-deck-slot .st-card-num")].map((el) => Number(el.textContent));
const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top });

describe("Deck", () => {
  it("starts with the deck, three empty slots, the button and an invitation", () => {
    const { container } = render(<Deck pool={POOL} he />);
    expect(container.querySelectorAll(".st-deck-pile .st-deck-back")).toHaveLength(4);
    expect(container.querySelector(".st-deck-pile").getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll(".st-deck-slot")).toHaveLength(3);
    expect(container.querySelectorAll(".st-card")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "ערבוב וחלוקה" })).toBeTruthy();
    expect(status()).toBe(INVITE);
  });

  it("shuffles for 900ms, then deals three different cards face down", () => {
    vi.useFakeTimers();
    const { container } = render(<Deck pool={POOL} he random={seeded(7)} />);
    shuffle();
    const pile = container.querySelector(".st-deck-pile");
    expect(pile.classList.contains("st-shuffling")).toBe(true);
    expect(status()).toBe("מערבבים…");
    act(() => vi.advanceTimersByTime(899));
    expect(container.querySelectorAll(".st-card")).toHaveLength(0);
    act(() => vi.advanceTimersByTime(1));
    expect(pile.classList.contains("st-shuffling")).toBe(false);
    expect(faceDown()).toHaveLength(3);
    const numbers = dealtNumbers(container);
    expect(new Set(numbers).size).toBe(3);
    numbers.forEach((n) => expect(n >= 1 && n <= 9).toBe(true));
    expect(status()).toBe("בחרו קלף אחד.");
    expect(screen.getByRole("button", { name: "ערבוב מחדש" })).toBeTruthy();
  });

  it("chooses the cards with `random`: the same seed deals the same hand, and every value stays inside the pool", () => {
    reduce = true;
    const hand = (random) => {
      const { container, unmount } = render(<Deck pool={POOL} he random={random} />);
      fireEvent.click(within(container).getByRole("button", { name: "ערבוב וחלוקה" }));
      const numbers = dealtNumbers(container);
      unmount();
      return numbers;
    };
    const seededHand = hand(seeded(42));
    expect(new Set(seededHand).size).toBe(3);
    expect(hand(seeded(42))).toEqual(seededHand);
    expect(hand(() => 0)).toEqual([1, 2, 3]);
    expect(hand(() => 0.9999)).toEqual([9, 8, 7]);
  });

  it("opens the picked card, dims the other two and calls onPick once", () => {
    reduce = true;
    const onPick = vi.fn();
    const { container } = render(<Deck pool={POOL} he random={seeded(3)} onPick={onPick} />);
    shuffle();
    const cards = faceDown();
    const chosen = POOL[dealtNumbers(container)[1] - 1];
    fireEvent.click(cards[1]);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(chosen);
    const open = screen.getByRole("button", { name: `קלף ${chosen.number}: ${chosen.title}` });
    expect(open).toBe(cards[1]);
    expect(open.getAttribute("aria-pressed")).toBe("true");
    expect(open.classList.contains("st-dim")).toBe(false);
    expect(cards[0].classList.contains("st-dim") && cards[2].classList.contains("st-dim")).toBe(true);
    // the two left behind are announced as unavailable, not as cards still waiting for a press
    expect(cards[0].disabled && cards[2].disabled).toBe(true);
    expect(open.disabled).toBe(false);
    expect(status()).toBe(`הקלף שלך היום: ${chosen.number} · ${chosen.title}`);
    // the choice is made: the others stay shut and the open one stays open until a new shuffle
    fireEvent.click(cards[0]);
    fireEvent.click(cards[2]);
    fireEvent.click(open);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll(".st-card.st-open")).toHaveLength(1);
    expect(open.getAttribute("aria-pressed")).toBe("true");
  });

  it("puts everything back on a new shuffle and deals a fresh hand", () => {
    vi.useFakeTimers();
    const onPick = vi.fn();
    const { container } = render(<Deck pool={POOL} he random={seeded(5)} onPick={onPick} />);
    shuffle();
    act(() => vi.advanceTimersByTime(900));
    fireEvent.click(faceDown()[0]);
    shuffle("ערבוב מחדש");
    expect(container.querySelectorAll(".st-card")).toHaveLength(0);
    expect(status()).toBe("מערבבים…");
    act(() => vi.advanceTimersByTime(900));
    expect(faceDown()).toHaveLength(3);
    expect(container.querySelectorAll(".st-card.st-open, .st-card.st-dim")).toHaveLength(0);
    expect(faceDown().every((card) => !card.disabled)).toBe(true);
    expect(status()).toBe("בחרו קלף אחד.");
    fireEvent.click(faceDown()[2]);
    expect(onPick).toHaveBeenCalledTimes(2);
  });

  it("deals at once under reduced motion, without waiting for timers or flying", () => {
    reduce = true;
    vi.useFakeTimers();
    const animate = vi.fn();
    Element.prototype.animate = animate;
    const { container } = render(<Deck pool={POOL} he random={seeded(9)} />);
    shuffle();
    expect(faceDown()).toHaveLength(3);
    expect(container.querySelector(".st-deck-pile").classList.contains("st-shuffling")).toBe(false);
    expect(status()).toBe("בחרו קלף אחד.");
    expect(vi.getTimerCount()).toBe(0);
    expect(animate).not.toHaveBeenCalled();
  });

  it("comes into view and shuffles as it appears when asked to (shuffleOnMount)", () => {
    vi.useFakeTimers();
    const scrolled = vi.fn();
    Element.prototype.scrollIntoView = scrolled; // jsdom has none
    try {
      render(<Deck pool={POOL} he random={seeded(7)} shuffleOnMount />);
      expect(status()).toBe("מערבבים…");
      expect(scrolled).toHaveBeenCalledTimes(1);
      act(() => vi.advanceTimersByTime(900));
      expect(faceDown()).toHaveLength(3);
    } finally {
      delete Element.prototype.scrollIntoView;
    }
  });

  it("flies each card from the deck to its slot, turned and smaller at first, 150ms apart", () => {
    vi.useFakeTimers();
    const animate = vi.fn();
    Element.prototype.animate = animate;
    // the deck's centre is at (552, 98); each slot reports its centre at (66, 99)
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function where() {
      return this.classList.contains("st-deck-pile") ? rect(500, 20, 104, 156) : rect(0, 0, 132, 198);
    });
    const { container } = render(<Deck pool={POOL} he random={seeded(11)} />);
    shuffle();
    act(() => vi.advanceTimersByTime(900));
    expect(animate).toHaveBeenCalledTimes(3);
    const flyers = [...container.querySelectorAll(".st-deck-slot .st-deck-fly")];
    animate.mock.contexts.forEach((el, i) => expect(el).toBe(flyers[i]));
    const [frames, timing] = animate.mock.calls[0];
    expect(frames[0]).toMatchObject({ transform: "translate(486px, -1px) rotate(-12deg) scale(0.8)", opacity: 0 });
    expect(frames[frames.length - 1]).toMatchObject({ transform: "none", opacity: 1 });
    expect(timing.fill).toBe("backwards");
    expect(animate.mock.calls.map(([, t]) => t.delay)).toEqual([0, 150, 300]);
  });

  it("lets a shuffle finish: a second press while the deck is shuffling does not start it over", () => {
    vi.useFakeTimers();
    const { container } = render(<Deck pool={POOL} he random={seeded(17)} />);
    shuffle();
    act(() => vi.advanceTimersByTime(500));
    shuffle();
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(400));
    expect(faceDown()).toHaveLength(3);
    expect(container.querySelector(".st-deck-pile").classList.contains("st-shuffling")).toBe(false);
    expect(status()).toBe("בחרו קלף אחד.");
  });

  it("deals without a flight when the deck has no size to measure (it would fly in from the corner)", () => {
    vi.useFakeTimers();
    const animate = vi.fn();
    Element.prototype.animate = animate;
    // a hidden deck measures 0 by 0 at the top left corner of the window; the slots are where they are
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function where() {
      return this.classList.contains("st-deck-pile") ? rect(0, 0, 0, 0) : rect(300, 40, 132, 198);
    });
    render(<Deck pool={POOL} he random={seeded(19)} />);
    shuffle();
    act(() => vi.advanceTimersByTime(900));
    expect(faceDown()).toHaveLength(3);
    expect(animate).not.toHaveBeenCalled();
  });

  it("does not fly when reduced motion is switched on during the shuffle", () => {
    vi.useFakeTimers();
    const animate = vi.fn();
    Element.prototype.animate = animate;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function where() {
      return this.classList.contains("st-deck-pile") ? rect(500, 20, 104, 156) : rect(0, 0, 132, 198);
    });
    render(<Deck pool={POOL} he random={seeded(23)} />);
    shuffle();
    reduce = true;
    act(() => vi.advanceTimersByTime(900));
    expect(faceDown()).toHaveLength(3);
    expect(animate).not.toHaveBeenCalled();
  });

  it("stops its timer when it goes away mid-shuffle", () => {
    vi.useFakeTimers();
    const { unmount } = render(<Deck pool={POOL} he random={seeded(13)} />);
    shuffle();
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("speaks English", () => {
    vi.useFakeTimers();
    const { container } = render(<Deck pool={ENGLISH_POOL} he={false} random={seeded(2)} />);
    expect(status()).toBe("Press Shuffle and deal and three cards come out of the deck.");
    shuffle("Shuffle and deal");
    expect(status()).toBe("Shuffling…");
    act(() => vi.advanceTimersByTime(900));
    expect(status()).toBe("Choose one card.");
    const cards = screen.getAllByRole("button", { name: "Face-down card" });
    expect(cards).toHaveLength(3);
    const chosen = ENGLISH_POOL[dealtNumbers(container)[0] - 1];
    fireEvent.click(cards[0]);
    expect(status()).toBe(`Your card today: ${chosen.number} · ${chosen.title}`);
    expect(screen.getByRole("button", { name: "Shuffle again" })).toBeTruthy();
  });
});
