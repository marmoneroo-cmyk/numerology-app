/**
 * A card drawn at random from the 78, upright or reversed (one chance in two), read by the meaning of the way it
 * came out, with the way to read it in full. `random` is injectable for the tests.
 * @param {{ he: boolean, random?: () => number, onOpen: (id: string, reversed: boolean) => void }} props
 */
import { useState } from "react";
import TarotFace from "./TarotFace.jsx";
import { TAROT } from "./deck.js";
import { TEXT } from "./text.js";

export default function TarotDraw({ he, random = Math.random, onOpen }) {
  const [drawn, setDrawn] = useState(null);
  const [round, setRound] = useState(0);
  const lang = he ? "he" : "en";
  const t = TEXT[lang];

  const draw = () => {
    const index = Math.min(TAROT.length - 1, Math.floor(random() * TAROT.length));
    setDrawn({ card: TAROT[index], reversed: random() < 0.5 });
    setRound((n) => n + 1);
  };

  return (
    <div className="tdr">
      <div className="tdr-top">
        <div className="tdr-deck" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="tdr-actions">
          <button type="button" className="fx tdr-btn" onClick={draw}>
            {drawn ? t.again : t.draw}
          </button>
          <p className="tdr-note">{t.random}</p>
        </div>
      </div>
      {drawn && (
        <section key={round} className="tdr-result" aria-label={t.drawn}>
          <div className="tdr-card">
            <TarotFace card={drawn.card} reversed={drawn.reversed} size="md" />
          </div>
          <div className="tdr-text">
            <p className="tdr-eyebrow">{t.drawn}</p>
            <h3 className="tdr-name">{drawn.card.name[lang]}</h3>
            <span className={`tdr-way${drawn.reversed ? " tdr-way-rev" : ""}`}>{drawn.reversed ? t.reversed : t.upright}</span>
            <p className="tdr-meaning">{(drawn.reversed ? drawn.card.reversed : drawn.card.upright)[lang]}</p>
            <button type="button" className="fx tdr-more" onClick={() => onOpen(drawn.card.id, drawn.reversed)}>
              {t.full}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
