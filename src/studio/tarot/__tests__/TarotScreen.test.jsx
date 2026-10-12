// @vitest-environment jsdom
/*
 * The tarot screen in the קלפים tab (the owner, 2026-10-12): every one of the 78 cards with its meanings, by
 * group, a card opened large with its upright and reversed meaning, and a card drawn at random.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import TarotScreen from "../TarotScreen.jsx";
import { TAROT, cardById } from "../deck.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const gallery = () => within(screen.getByRole("list", { name: "כל הקלפים" }));
const filter = (name) => fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${name}`) }));

describe("the tarot gallery", () => {
  it("shows all 78 cards, each by its Hebrew name", () => {
    // Act
    render(<TarotScreen he />);

    // Assert
    const cards = gallery().getAllByRole("button");
    expect(cards).toHaveLength(78);
    expect(cards[0].getAttribute("aria-label")).toBe("השוטה");
    expect(cards[77].getAttribute("aria-label")).toBe("מלך מטבעות");
  });

  it("shows one group at a time: the major arcana, or one suit", () => {
    // Arrange
    render(<TarotScreen he />);

    // Act and assert
    filter("הארקנה הגדולה");
    expect(gallery().getAllByRole("button")).toHaveLength(22);
    filter("גביעים");
    expect(gallery().getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(TAROT.filter((c) => c.suit === "cups").map((c) => c.name.he));
    filter("הכול");
    expect(gallery().getAllByRole("button")).toHaveLength(78);
  });

  it("marks the chosen group as pressed, with its count", () => {
    render(<TarotScreen he />);
    filter("חרבות");
    const chosen = screen.getByRole("button", { name: /^חרבות/ });
    expect(chosen.getAttribute("aria-pressed")).toBe("true");
    expect(chosen.textContent).toContain("14");
    expect(screen.getByRole("button", { name: /^הכול/ }).getAttribute("aria-pressed")).toBe("false");
  });
});

describe("a card opened large", () => {
  it("shows the name, the group, the keywords and both meanings", () => {
    // Arrange
    render(<TarotScreen he />);
    const death = cardById("major-13");

    // Act
    fireEvent.click(gallery().getByRole("button", { name: "המוות" }));

    // Assert
    const dialog = within(screen.getByRole("dialog", { name: "המוות" }));
    expect(dialog.getByRole("heading", { name: "המוות" })).toBeTruthy();
    expect(dialog.getByText("Death")).toBeTruthy();
    expect(dialog.getByText(/הארקנה הגדולה/)).toBeTruthy();
    for (const word of death.keywords.he) expect(dialog.getByText(word)).toBeTruthy();
    expect(dialog.getByText(death.upright.he)).toBeTruthy();
    expect(dialog.getByText(death.reversed.he)).toBeTruthy();
  });

  it("names a suit card's suit and element", () => {
    render(<TarotScreen he />);
    fireEvent.click(gallery().getByRole("button", { name: "אביר גביעים" }));
    expect(within(screen.getByRole("dialog")).getByText(/גביעים · יסוד המים/)).toBeTruthy();
  });

  it("steps to the next and the previous card of the group on screen, round the ends", () => {
    // Arrange
    render(<TarotScreen he />);
    filter("הארקנה הגדולה");
    fireEvent.click(gallery().getByRole("button", { name: "העולם" }));
    const dialog = () => within(screen.getByRole("dialog"));

    // Act and assert
    fireEvent.click(dialog().getByRole("button", { name: "הקלף הבא" }));
    expect(screen.getByRole("dialog", { name: "השוטה" })).toBeTruthy();
    fireEvent.click(dialog().getByRole("button", { name: "הקלף הקודם" }));
    expect(screen.getByRole("dialog", { name: "העולם" })).toBeTruthy();
    fireEvent.keyDown(document.activeElement, { key: "ArrowLeft" });
    expect(screen.getByRole("dialog", { name: "השוטה" })).toBeTruthy();
  });

  it("closes on Esc and on its button, and gives the focus back to the card that opened it", () => {
    // Arrange
    render(<TarotScreen he />);
    const opener = gallery().getByRole("button", { name: "הכוכב" });
    opener.focus();

    // Act and assert
    fireEvent.click(opener);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(document.activeElement, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
    fireEvent.click(opener);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "סגירה" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("a card drawn at random", () => {
  it("draws the card the random number points to, upright or reversed, and says which", () => {
    // Arrange: the first number picks the card, the second its way up
    const numbers = [13.5 / 78, 0.2];
    const random = vi.fn(() => numbers.shift());
    render(<TarotScreen he random={random} />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "לשלוף קלף" }));

    // Assert
    const drawn = within(screen.getByRole("region", { name: "הקלף שנשלף" }));
    expect(drawn.getByRole("heading", { name: "המוות" })).toBeTruthy();
    expect(drawn.getByText("הפוך")).toBeTruthy();
    expect(drawn.getByText(cardById("major-13").reversed.he)).toBeTruthy();
    expect(drawn.queryByText(cardById("major-13").upright.he)).toBeNull();
  });

  it("reads an upright card by its upright meaning, and opens it large", () => {
    const numbers = [0, 0.9];
    render(<TarotScreen he random={() => numbers.shift()} />);
    fireEvent.click(screen.getByRole("button", { name: "לשלוף קלף" }));
    const drawn = within(screen.getByRole("region", { name: "הקלף שנשלף" }));
    expect(drawn.getByText("רגיל")).toBeTruthy();
    expect(drawn.getByText(cardById("major-0").upright.he)).toBeTruthy();
    fireEvent.click(drawn.getByRole("button", { name: "לקריאה המלאה" }));
    expect(screen.getByRole("dialog", { name: "השוטה" })).toBeTruthy();
  });

  it("says the card is chosen at random, and offers another draw", () => {
    const numbers = [0.5, 0.9, 0.1, 0.9];
    render(<TarotScreen he random={() => numbers.shift()} />);
    expect(screen.getByText("הקלף נשלף באקראי מתוך 78 הקלפים.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "לשלוף קלף" }));
    const first = screen.getByRole("region", { name: "הקלף שנשלף" }).querySelector("h3").textContent;
    fireEvent.click(screen.getByRole("button", { name: "לשלוף קלף נוסף" }));
    const second = screen.getByRole("region", { name: "הקלף שנשלף" }).querySelector("h3").textContent;
    expect(second).not.toBe(first);
  });
});

describe("in English", () => {
  it("names the cards and the groups in English", () => {
    render(<TarotScreen he={false} />);
    expect(within(screen.getByRole("list", { name: "All the cards" })).getAllByRole("button")[0].getAttribute("aria-label")).toBe("The Fool");
    expect(screen.getByRole("button", { name: /^Major arcana/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Draw a card" })).toBeTruthy();
  });
});
