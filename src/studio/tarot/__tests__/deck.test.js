import { describe, it, expect } from "vitest";
import { TAROT, SUITS, cardById } from "../deck.js";

// the deck's contract, written out here rather than read from the module, so a slip on either side shows
const MAJOR_HE = [
  "השוטה", "הקוסם", "הכוהנת הגדולה", "הקיסרית", "הקיסר", "הכוהן הגדול", "האוהבים", "המרכבה", "הכוח", "הנזיר", "גלגל המזל",
  "הצדק", "התלוי", "המוות", "המתינות", "השטן", "המגדל", "הכוכב", "הירח", "השמש", "הדין", "העולם",
];
const MAJOR_EN = [
  "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor", "The Hierophant", "The Lovers", "The Chariot",
  "Strength", "The Hermit", "Wheel of Fortune", "Justice", "The Hanged Man", "Death", "Temperance", "The Devil", "The Tower",
  "The Star", "The Moon", "The Sun", "Judgement", "The World",
];
const SUIT_ORDER = ["wands", "cups", "swords", "pentacles"];
const SUIT = {
  wands: { name: { he: "מטות", en: "Wands" }, element: { he: "אש", en: "Fire" } },
  cups: { name: { he: "גביעים", en: "Cups" }, element: { he: "מים", en: "Water" } },
  swords: { name: { he: "חרבות", en: "Swords" }, element: { he: "אוויר", en: "Air" } },
  pentacles: { name: { he: "מטבעות", en: "Pentacles" }, element: { he: "אדמה", en: "Earth" } },
};
// ace (1) to king (14)
const RANK_HE = ["אס", "2", "3", "4", "5", "6", "7", "8", "9", "10", "עלם", "אביר", "מלכת", "מלך"];
const RANK_EN = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"];
const LANGUAGES = ["he", "en"];
const UPRIGHT_MAX = 170;
const REVERSED_MAX = 140;

const filled = (text) => typeof text === "string" && text.trim().length > 0;
/** How many sentences a text has: each one ends in ".", "!" or "?". */
const sentences = (text) => (text.match(/[.!?](?=\s|$)/g) || []).length;

describe("the tarot deck", () => {
  it("holds the 78 cards in order: the major arcana 0 to 21, then wands, cups, swords and pentacles, each ace to king", () => {
    const expected = [
      ...MAJOR_HE.map((_, number) => `major-${number}`),
      ...SUIT_ORDER.flatMap((suit) => RANK_EN.map((_, i) => `${suit}-${i + 1}`)),
    ];

    const ids = TAROT.map((card) => card.id);

    expect(TAROT).toHaveLength(78);
    expect(ids).toEqual(expected);
  });

  it("gives every card a unique id made of its suit (or 'major') and its number", () => {
    const ids = TAROT.map((card) => card.id);

    const misnamed = TAROT.filter(
      (card) =>
        !/^(major-(\d|1\d|2[01])|(wands|cups|swords|pentacles)-([1-9]|1[0-4]))$/.test(card.id) ||
        card.id !== `${card.suit ?? "major"}-${card.number}`,
    );

    expect(new Set(ids).size).toBe(78);
    expect(misnamed.map((card) => card.id)).toEqual([]);
  });

  it("numbers the major arcana 0 to 21 in the Rider-Waite-Smith order, with their Hebrew and English names", () => {
    const major = TAROT.filter((card) => card.arcana === "major");

    expect(major).toHaveLength(22);
    expect(major.map((card) => card.number)).toEqual(MAJOR_HE.map((_, number) => number));
    expect(major.map((card) => card.suit)).toEqual(MAJOR_HE.map(() => null));
    expect(major.map((card) => card.name.he)).toEqual(MAJOR_HE);
    expect(major.map((card) => card.name.en)).toEqual(MAJOR_EN);
    expect([cardById("major-8").name, cardById("major-11").name]).toEqual([
      { he: "הכוח", en: "Strength" },
      { he: "הצדק", en: "Justice" },
    ]);
  });

  it.each(SUIT_ORDER)("numbers the %s 1 to 14, ace to king, named after the rank and the suit", (suit) => {
    const { he, en } = SUIT[suit].name;

    const cards = TAROT.filter((card) => card.suit === suit);

    expect(cards.map((card) => card.arcana)).toEqual(RANK_EN.map(() => "minor"));
    expect(cards.map((card) => card.number)).toEqual(RANK_EN.map((_, i) => i + 1));
    expect(cards.map((card) => card.name.he)).toEqual(RANK_HE.map((rank) => `${rank} ${he}`));
    expect(cards.map((card) => card.name.en)).toEqual(RANK_EN.map((rank) => `${rank} of ${en}`));
  });

  it("fills every name and both meanings in Hebrew and in English", () => {
    const empty = TAROT.flatMap((card) =>
      ["name", "upright", "reversed"].flatMap((field) =>
        LANGUAGES.filter((lang) => !filled(card[field]?.[lang])).map((lang) => `${card.id} ${field}.${lang}`),
      ),
    );

    expect(empty).toEqual([]);
  });

  it("gives each card exactly three short keywords (one or two words) in each language", () => {
    const short = (word) => filled(word) && word.trim().split(/\s+/).length <= 2;

    const wrong = TAROT.flatMap((card) =>
      LANGUAGES.filter((lang) => {
        const words = card.keywords?.[lang];
        return !Array.isArray(words) || words.length !== 3 || !words.every(short);
      }).map((lang) => `${card.id} keywords.${lang}`),
    );

    expect(wrong).toEqual([]);
  });

  it(`keeps the meanings short: upright in 1-2 sentences of up to ${UPRIGHT_MAX} characters, reversed in one of up to ${REVERSED_MAX}`, () => {
    const tooLong = TAROT.flatMap((card) =>
      LANGUAGES.flatMap((lang) => {
        const upright = card.upright[lang];
        const reversed = card.reversed[lang];
        return [
          ...(upright.length <= UPRIGHT_MAX && [1, 2].includes(sentences(upright)) ? [] : [`${card.id} upright.${lang}: ${upright.length}`]),
          ...(reversed.length <= REVERSED_MAX && sentences(reversed) === 1 ? [] : [`${card.id} reversed.${lang}: ${reversed.length}`]),
        ];
      }),
    );

    expect(tooLong).toEqual([]);
  });

  it("says the Death card is about endings and transformation, not physical death", () => {
    const death = cardById("major-13");

    expect(death.name).toEqual({ he: "המוות", en: "Death" });
    expect(death.keywords.en).toEqual(expect.arrayContaining(["Endings", "Transformation"]));
    expect(death.upright.he).toContain("אינו מדבר על מוות פיזי");
    expect(death.upright.en).toContain("not about physical death");
  });

  it("is frozen, so a screen that shuffles the cards works on a copy", () => {
    const shuffleInPlace = () => TAROT.reverse();
    const renameCard = () => {
      TAROT[0].name.he = "x";
    };
    const addKeyword = () => TAROT[0].keywords.en.push("x");

    expect(shuffleInPlace).toThrow(TypeError);
    expect(renameCard).toThrow(TypeError);
    expect(addKeyword).toThrow(TypeError);
    expect(TAROT[0].id).toBe("major-0");
    expect(Object.isFrozen(SUITS.cups.theme)).toBe(true);
  });
});

describe("cardById", () => {
  it("finds every card by its id", () => {
    const found = TAROT.map((card) => cardById(card.id));

    expect(found.every((card, i) => card === TAROT[i])).toBe(true);
  });

  it("returns undefined for an id that is not in the deck", () => {
    const unknown = ["major-22", "major--1", "wands-0", "wands-15", "coins-1", "Major-0", " cups-1", "cups 1", "", undefined, null, 5];

    const found = unknown.map((id) => cardById(id));

    expect(found).toEqual(unknown.map(() => undefined));
  });
});

describe("SUITS", () => {
  it("describes the four suits, each with its name, element and theme in both languages", () => {
    const described = SUIT_ORDER.map((suit) => SUITS[suit]);

    expect(Object.keys(SUITS)).toEqual(SUIT_ORDER);
    expect(described.map(({ name, element }) => ({ name, element }))).toEqual(SUIT_ORDER.map((suit) => SUIT[suit]));
    expect(described.every(({ theme }) => LANGUAGES.every((lang) => filled(theme?.[lang])))).toBe(true);
  });
});
