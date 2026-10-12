/** The tarot screen's own words (the cards' texts are in deck.js). Impersonal Hebrew, like every text in the app. */
import { SUITS } from "./deck.js";

export const TEXT = {
  he: {
    all: "הכול",
    major: "הארקנה הגדולה",
    gallery: "כל הקלפים",
    groups: "קבוצות הקלפים",
    hint: "לוחצים על קלף כדי לקרוא את המשמעות שלו.",
    draw: "לשלוף קלף",
    again: "לשלוף קלף נוסף",
    drawn: "הקלף שנשלף",
    random: "הקלף נשלף באקראי מתוך 78 הקלפים.",
    upright: "רגיל",
    reversed: "הפוך",
    uprightMeaning: "משמעות רגילה",
    reversedMeaning: "משמעות הפוכה",
    keywords: "מילות מפתח",
    full: "לקריאה המלאה",
    prev: "הקלף הקודם",
    next: "הקלף הבא",
    close: "סגירה",
  },
  en: {
    all: "All",
    major: "Major arcana",
    gallery: "All the cards",
    groups: "Card groups",
    hint: "Press a card to read its meaning.",
    draw: "Draw a card",
    again: "Draw another card",
    drawn: "The card drawn",
    random: "The card is drawn at random from the 78 cards.",
    upright: "Upright",
    reversed: "Reversed",
    uprightMeaning: "Upright meaning",
    reversedMeaning: "Reversed meaning",
    keywords: "Keywords",
    full: "Read it in full",
    prev: "Previous card",
    next: "Next card",
    close: "Close",
  },
};

/**
 * Where a card belongs, in a few words: "הארקנה הגדולה · 13", or the suit and its element ("גביעים · יסוד המים").
 * @param {import("./deck.js").TarotCard} card
 * @param {boolean} he
 */
export function groupLine(card, he) {
  const lang = he ? "he" : "en";
  if (card.arcana === "major") return `${TEXT[lang].major} · ${card.number}`;
  const suit = SUITS[card.suit];
  return he ? `${suit.name.he} · יסוד ה${suit.element.he}` : `${suit.name.en} · ${suit.element.en}`;
}
