// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import TarotArt from "../TarotArt.jsx";

afterEach(cleanup);

// the 78 cards as the deck describes them, built here so the art is tested on its own
const SUITS = ["wands", "cups", "swords", "pentacles"];
const MAJORS = Array.from({ length: 22 }, (_, number) => ({ id: `major-${number}`, arcana: "major", number, suit: null }));
const MINORS = SUITS.flatMap((suit) => Array.from({ length: 14 }, (_, i) => ({ id: `${suit}-${i + 1}`, arcana: "minor", number: i + 1, suit })));
const DECK = [...MAJORS, ...MINORS];
const card = (id) => DECK.find((c) => c.id === id);

/** A gallery shows all 78 at once: each drawing stays under this much markup. */
const MARKUP_BUDGET = 16000;

/** The markup with each instance's own part of the ids made the same, so two drawings of the same art compare equal. */
const sameIds = (html) => html.replace(/ta-[A-Za-z0-9]+-/g, "ta-x-");

/** Every id an element of `root` points to through url(#...). */
const urlRefs = (root) =>
  [...root.querySelectorAll("*")].flatMap((el) => [...el.attributes].flatMap((attr) => [...attr.value.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1])));

/** Renders one card, reads what `read` needs from its container, and clears the page again. */
function drawn(c, read, props = {}) {
  const { container, unmount } = render(<TarotArt card={c} {...props} />);
  const value = read(container);
  unmount();
  return value;
}

describe("TarotArt", () => {
  it("draws every one of the 78 cards as one decorative svg in the 240 by 400 box, with an emblem", () => {
    expect(DECK).toHaveLength(78);
    for (const c of DECK) {
      drawn(c, (container) => {
        const svgs = container.querySelectorAll(":scope > svg");
        expect(svgs).toHaveLength(1);
        expect(svgs[0].getAttribute("viewBox")).toBe("0 0 240 400");
        expect(svgs[0].getAttribute("aria-hidden")).toBe("true");
        expect(svgs[0].getAttribute("focusable")).toBe("false");
        expect(svgs[0].querySelector(".ta-emblem").childElementCount).toBeGreaterThan(0);
      });
    }
  });

  it("never shares an id between two cards on the same page, and points only to ids inside its own svg", () => {
    const { container } = render(
      <>
        <TarotArt card={card("major-17")} />
        <TarotArt card={card("major-17")} />
        <TarotArt card={card("cups-3")} />
      </>,
    );
    const ids = [...container.querySelectorAll("[id]")].map((el) => el.id);
    expect(ids.length).toBeGreaterThan(12);
    expect(new Set(ids).size).toBe(ids.length);
    // React's useId marks (colons and the like) are stripped, so url(#...) and CSS can name them
    ids.forEach((id) => expect(id).toMatch(/^ta-[A-Za-z0-9]+-[a-z]+$/));
    for (const svg of container.querySelectorAll("svg")) {
      const refs = urlRefs(svg);
      expect(refs.length).toBeGreaterThan(0);
      refs.forEach((ref) => expect(svg.querySelector(`[id="${ref}"]`)).not.toBeNull());
    }
  });

  it("draws 22 different emblems for the 22 major arcana, and no two of the 78 cards alike", () => {
    const emblemOf = (c) => drawn(c, (container) => sameIds(container.querySelector(".ta-emblem").innerHTML));
    expect(new Set(MAJORS.map(emblemOf)).size).toBe(22);
    expect(new Set(DECK.map(emblemOf)).size).toBe(78);
  });

  it("lays out exactly as many pips as the card's number on the twos to the tens, each in its own place, left and right in mirror", () => {
    const placesOf = (c) =>
      drawn(c, (container) =>
        [...container.querySelectorAll("[data-pip]")].map((pip) => {
          const [, x, y] = pip.getAttribute("transform").match(/translate\(([-\d.]+) ([-\d.]+)\)/);
          return `${Number(x)},${Number(y)}`;
        }),
      );
    for (const suit of SUITS) {
      for (let number = 2; number <= 10; number++) {
        const places = placesOf(card(`${suit}-${number}`));
        expect(places, `${suit}-${number}`).toHaveLength(number);
        expect(new Set(places).size, `${suit}-${number}`).toBe(number);
        places.forEach((place) => {
          const [x, y] = place.split(",").map(Number);
          expect(places, `${suit}-${number} mirror of ${place}`).toContain(`${240 - x},${y}`);
        });
      }
    }
  });

  it("marks no pips on the aces and the court cards", () => {
    for (const suit of SUITS) {
      for (const number of [1, 11, 12, 13, 14]) {
        expect(drawn(card(`${suit}-${number}`), (container) => container.querySelectorAll("[data-pip]").length)).toBe(0);
      }
    }
  });

  it("draws a card the same way every time, its star dust seeded by the card's id", () => {
    const whole = (c) => drawn(c, (container) => sameIds(container.innerHTML));
    const dust = (c) => drawn(c, (container) => container.querySelector(".ta-dust").innerHTML);
    expect(whole(card("wands-7"))).toBe(whole(card("wands-7")));
    expect(whole(card("major-9"))).toBe(whole(card("major-9")));
    expect(dust({ ...card("wands-7"), id: "another-id" })).not.toBe(dust(card("wands-7")));
    expect(dust(card("cups-7"))).not.toBe(dust(card("wands-7")));
  });

  it("writes the Roman numeral, and no other words, at the top of the major arcana only", () => {
    const words = (c) => drawn(c, (container) => [...container.querySelectorAll("text")].map((t) => t.textContent));
    const numerals = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
    expect(MAJORS.map((c) => words(c))).toEqual(numerals.map((numeral) => [numeral]));
    MINORS.forEach((c) => expect(words(c)).toEqual([]));
  });

  it("tints each suit with its own accent, apart from the gold of the major arcana", () => {
    const accent = (c) => drawn(c, (container) => container.querySelector('radialGradient[id$="-halo"] stop').getAttribute("stop-color"));
    const suits = SUITS.map((suit) => accent(card(`${suit}-5`)));
    expect(new Set(suits).size).toBe(4);
    expect(suits).not.toContain(accent(card("major-5")));
    expect(accent(card("cups-12"))).toBe(accent(card("cups-2")));
  });

  it("passes className to the svg", () => {
    const className = drawn(card("cups-1"), (container) => container.querySelector("svg").getAttribute("class"), { className: "tf-art-svg" });
    expect(className).toBe("tf-art-svg");
  });

  it("lays the foil across each suit glyph's own box, so every pip catches the light", () => {
    drawn(card("swords-4"), (container) => {
      const pips = [...container.querySelectorAll("[data-pip]")];
      const foil = container.querySelector('linearGradient[id$="-glyph"]');
      expect(foil).not.toBeNull();
      pips.forEach((pip) => expect(pip.getAttribute("stroke")).toBe(`url(#${foil.id})`));
    });
  });

  it("is memoised, so a screen that redraws its 78 cards skips the ones whose props did not change", () => {
    expect(TarotArt.$$typeof).toBe(Symbol.for("react.memo"));
    const { container, rerender } = render(<TarotArt card={card("major-3")} />);
    rerender(<TarotArt card={card("major-4")} />);
    expect(container.querySelector("text").textContent).toBe("IV");
  });

  it("draws only the night and the frame, without throwing, for a card it does not know", () => {
    const unknown = [
      undefined,
      null,
      {},
      { arcana: "major", number: 22 },
      { arcana: "major", number: -1 },
      { arcana: "major", number: "1" },
      { arcana: "minor", suit: "stars", number: 3 },
      { arcana: "minor", suit: "cups", number: 15 },
      { arcana: "minor", suit: "cups", number: 2.5 },
    ];
    for (const odd of unknown) {
      drawn(odd, (container) => {
        const svg = container.querySelector("svg");
        expect(svg.getAttribute("viewBox")).toBe("0 0 240 400");
        expect(svg.querySelector(".ta-dust")).not.toBeNull();
        expect(svg.querySelector(".ta-emblem")).toBeNull();
        expect(svg.querySelector("text")).toBeNull();
      });
    }
  });

  it("keeps each drawing light enough to show all 78 at once", () => {
    for (const c of DECK) {
      expect(drawn(c, (container) => container.innerHTML.length), c.id).toBeLessThan(MARKUP_BUDGET);
    }
  });
});
