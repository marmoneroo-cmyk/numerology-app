/**
 * The tarot in the קלפים tab (the owner, 2026-10-12): a card to draw, and the whole deck by group, each card
 * opening large with its meanings. The deck and its art load with this screen only (App.jsx loads it lazily).
 * @param {{ he: boolean, random?: () => number }} props
 */
import { useCallback, useMemo, useState } from "react";
import TarotFace from "./TarotFace.jsx";
import TarotDraw from "./TarotDraw.jsx";
import TarotDetail from "./TarotDetail.jsx";
import { TAROT, SUITS, cardById } from "./deck.js";
import { TEXT } from "./text.js";
import "./tarot.css";

const GROUPS = ["all", "major", "wands", "cups", "swords", "pentacles"];
const ALL_IDS = TAROT.map((c) => c.id);

/** The cards of a group, in deck order. */
const cardsOf = (group) => (group === "all" ? TAROT : group === "major" ? TAROT.filter((c) => c.arcana === "major") : TAROT.filter((c) => c.suit === group));

export default function TarotScreen({ he, random = Math.random }) {
  const [group, setGroup] = useState("all");
  const [open, setOpen] = useState(null); // { id, drawnAs: "upright"|"reversed"|null, pool: the ids the arrows step through }
  const lang = he ? "he" : "en";
  const t = TEXT[lang];
  const cards = useMemo(() => cardsOf(group), [group]);

  const groupName = (g) => (g === "all" ? t.all : g === "major" ? t.major : SUITS[g].name[lang]);
  const step = useCallback(
    (by) =>
      setOpen((o) => {
        if (!o) return o;
        const at = o.pool.indexOf(o.id);
        return { ...o, id: o.pool[(at + by + o.pool.length) % o.pool.length], drawnAs: null };
      }),
    [],
  );
  const close = useCallback(() => setOpen(null), []);

  return (
    <div className="tarot" dir={he ? "rtl" : "ltr"}>
      <TarotDraw he={he} random={random} onOpen={(id, reversed) => setOpen({ id, drawnAs: reversed ? "reversed" : "upright", pool: ALL_IDS })} />

      <div className="tg-groups" role="group" aria-label={t.groups}>
        {GROUPS.map((g) => (
          <button key={g} type="button" className={`fx tg-chip${group === g ? " act" : ""}`} aria-pressed={group === g} onClick={() => setGroup(g)}>
            {groupName(g)} <span className="tg-count">{cardsOf(g).length}</span>
          </button>
        ))}
      </div>
      <p className="tg-hint">{t.hint}</p>

      <ul className="tg-grid" aria-label={t.gallery}>
        {cards.map((card) => (
          <li key={card.id} className="tg-item">
            <button type="button" className="tg-open" aria-label={card.name[lang]} onClick={() => setOpen({ id: card.id, drawnAs: null, pool: cards.map((c) => c.id) })}>
              <TarotFace card={card} size="sm" />
              <span className="tg-name" aria-hidden="true">
                {card.name[lang]}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open && <TarotDetail card={cardById(open.id)} drawnAs={open.drawnAs} he={he} onClose={close} onStep={step} />}
    </div>
  );
}
