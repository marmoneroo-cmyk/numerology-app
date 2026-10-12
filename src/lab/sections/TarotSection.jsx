/**
 * Lab section (dev only): the 78 tarot drawings in one grid on the night
 * background, about the size of a gallery, each with its id under it. The
 * cards are built here from their ids, so the section needs none of the deck's
 * texts. No sign-in and no network.
 */
import TarotArt from "../../studio/tarot/TarotArt.jsx";

const SUITS = ["wands", "cups", "swords", "pentacles"];
const CARDS = [
  ...Array.from({ length: 22 }, (_, number) => ({ id: `major-${number}`, arcana: "major", number, suit: null })),
  ...SUITS.flatMap((suit) => Array.from({ length: 14 }, (_, i) => ({ id: `${suit}-${i + 1}`, arcana: "minor", number: i + 1, suit }))),
];

export default function TarotSection() {
  return (
    <div className="st-view" style={{ display: "grid", gap: 14 }}>
      <style>{`
        .lab-tarot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 18px 12px;
          padding: 18px 16px; border-radius: 16px; background: #080812; }
        .lab-tarot-grid figure { margin: 0; display: grid; gap: 6px; justify-items: center; }
        .lab-tarot { display: block; width: 120px; height: 200px; border-radius: 10px;
          box-shadow: 0 0 0 1px rgba(200, 169, 106, 0.35), 0 8px 20px rgba(0, 0, 0, 0.45); }
        .lab-tarot-grid figcaption { direction: ltr; font: 12px/1.2 ui-monospace, Consolas, monospace; color: #c8a96a; }
      `}</style>
      <p style={{ margin: 0, color: "var(--st-ink-soft)" }}>כל 78 קלפי הטארוט, והמזהה של כל קלף מתחתיו. אותו קלף מצויר תמיד באותו אופן.</p>
      <div className="lab-tarot-grid">
        {CARDS.map((card) => (
          <figure key={card.id}>
            <TarotArt card={card} className="lab-tarot" />
            <figcaption>{card.id}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
