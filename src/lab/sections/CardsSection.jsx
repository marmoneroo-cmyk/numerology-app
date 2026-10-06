/**
 * Lab section (dev only): today's card ritual and the nine cards in a grid,
 * with sample titles and simple line drawings. No sign-in and no network.
 */
import { useState } from "react";
import Card from "../../studio/cards/Card.jsx";
import Deck from "../../studio/cards/Deck.jsx";

/** Line drawings in a 100 by 100 box; the card gives them their gold stroke. */
const SHAPES = {
  1: (
    <>
      <circle cx="50" cy="50" r="22" />
      <path d="M50 18v-8M50 90v-8M18 50h-8M90 50h-8" />
    </>
  ),
  2: (
    <>
      <circle cx="38" cy="50" r="18" />
      <circle cx="62" cy="50" r="18" />
    </>
  ),
  3: <path d="M50 20L80 74H20z" />,
  4: <rect x="25" y="25" width="50" height="50" rx="2" />,
  5: <path d="M50 16l9.8 30.2H91.5L65.8 64.9l9.8 30.2L50 76.4 24.4 95.1l9.8-30.2L8.5 46.2h31.7z" />,
  6: (
    <>
      <path d="M50 18L78 66H22z" />
      <path d="M50 82L22 34h56z" />
    </>
  ),
  7: (
    <>
      <ellipse cx="50" cy="50" rx="34" ry="18" />
      <circle cx="50" cy="50" r="8" />
    </>
  ),
  8: <path d="M50 50c-8-14-30-14-30 0s22 14 30 0 30-14 30 0-22 14-30 0z" />,
  9: (
    <>
      <circle cx="50" cy="50" r="30" />
      <circle cx="50" cy="50" r="18" />
      <circle cx="50" cy="50" r="6" />
    </>
  ),
};

/** Sample cards only: titles, subtitles and accents to see the cards with. */
const SAMPLE = [
  { number: 1, he: ["המנהיג", "מנהיגות · עצמאות · חדשנות"], en: ["The Leader", "Leadership · Independence · Innovation"], accent: "#e8c35a" },
  { number: 2, he: ["המגשר", "שותפות · אינטואיציה · הרמוניה"], en: ["The Mediator", "Partnership · Intuition · Harmony"], accent: "#c9ccd6" },
  { number: 3, he: ["היוצר", "ביטוי · תקשורת · שמחה"], en: ["The Creator", "Expression · Communication · Joy"], accent: "#f2a07b" },
  { number: 4, he: ["הבונה", "יציבות · סדר · מסירות"], en: ["The Builder", "Stability · Order · Devotion"], accent: "#8fc9a8" },
  { number: 5, he: ["החופשי", "חופש · הרפתקה · שינוי"], en: ["The Free Spirit", "Freedom · Adventure · Change"], accent: "#7fb6e8" },
  { number: 6, he: ["המטפל", "אהבה · אחריות · יופי"], en: ["The Nurturer", "Love · Responsibility · Beauty"], accent: "#ee9fbd" },
  { number: 7, he: ["המחפש", "חוכמה · שקט · רוחניות"], en: ["The Seeker", "Wisdom · Stillness · Spirituality"], accent: "#9b8cff" },
  { number: 8, he: ["בעל הכוח", "כוח · שפע · הגשמה"], en: ["The Powerhouse", "Power · Abundance · Manifestation"], accent: "#e3a857" },
  { number: 9, he: ["החכם", "חמלה · סיום · חכמה עליונה"], en: ["The Sage", "Compassion · Completion · Higher wisdom"], accent: "#b7a3e8" },
];

const cardsIn = (he) =>
  SAMPLE.map(({ number, accent, ...words }) => {
    const [title, subtitle] = he ? words.he : words.en;
    const art = (
      <svg viewBox="0 0 100 100" focusable="false">
        {SHAPES[number]}
      </svg>
    );
    return { number, title, subtitle, accent, art };
  });

// small gold text takes --st-gold-text, which stays at 4.5:1 or more in the light theme too
const heading = { margin: "0 0 10px", color: "var(--st-gold-text)", fontWeight: 500, fontSize: 15 };

export default function CardsSection() {
  const [he, setHe] = useState(true);
  const cards = cardsIn(he);
  return (
    <div className="st-view" dir={he ? "rtl" : "ltr"} style={{ display: "grid", gap: 18 }}>
      <p style={{ margin: 0, color: "var(--st-ink-soft)" }}>
        {he
          ? "לוחצים על קלף כדי לפתוח אותו. במחשב, מעבירים את העכבר מעל קלף סגור."
          : "Press a card to open it. On a computer, move the mouse over a closed card."}
      </p>
      <label style={{ display: "inline-flex", gap: 8, alignItems: "center", width: "max-content", color: "var(--st-ink-soft)" }}>
        <input type="checkbox" checked={!he} onChange={(e) => setHe(!e.target.checked)} />
        English
      </label>
      <section className="st-panel">
        <h3 style={heading}>{he ? "קלף היום" : "Today's card"}</h3>
        <Deck key={he ? "he" : "en"} pool={cards} he={he} />
      </section>
      <section>
        <h3 style={heading}>{he ? "תשעת הקלפים" : "The nine cards"}</h3>
        <div className="st-cards">
          {cards.map((card) => (
            <Card key={card.number} {...card} he={he} />
          ))}
        </div>
      </section>
    </div>
  );
}
