// @vitest-environment jsdom
/*
 * The deck's content and its art agree: every card of deck.js gets an emblem of its own. The art draws an unknown
 * card blank on purpose, so a card renamed in one file and not in the other would show up here, not as an empty card.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import TarotArt from "../TarotArt.jsx";
import { TAROT } from "../deck.js";

afterEach(cleanup);

describe("the deck and its art", () => {
  it("draws an emblem for every one of the 78 cards", () => {
    const blank = TAROT.filter((card) => {
      const { container } = render(<TarotArt card={card} />);
      const emblem = container.querySelector(".ta-emblem");
      const empty = !emblem || emblem.childElementCount === 0;
      cleanup();
      return empty;
    });
    expect(blank.map((card) => card.id)).toEqual([]);
  });

  it("gives the major arcana their Roman numerals and the suits their pips", () => {
    // Arrange
    const fool = render(<TarotArt card={TAROT[0]} />).container;
    const numeral = fool.querySelector("text")?.textContent;
    cleanup();
    const threeOfCups = render(<TarotArt card={TAROT.find((c) => c.id === "cups-3")} />).container;

    // Assert
    expect(numeral).toBe("0");
    expect(threeOfCups.querySelectorAll("[data-pip]")).toHaveLength(3);
  });
});
