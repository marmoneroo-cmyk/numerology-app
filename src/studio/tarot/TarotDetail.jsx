/**
 * One tarot card opened large: the card, where it belongs, its keywords and both its meanings. A card that came
 * from a draw marks the way it came out, in words. The arrows (and the arrow keys, in the reading direction) step
 * through the cards on screen. A modal dialog drawn into <body>, like meeting mode: Esc, its button or a press
 * on the backdrop closes it, Tab stays inside (dialog.js), and the focus goes back to the card that opened it.
 * @param {{
 *   card: import("./deck.js").TarotCard,
 *   drawnAs?: "upright"|"reversed"|null,
 *   he: boolean,
 *   onClose: () => void,
 *   onStep: (by: 1|-1) => void,
 * }} props `drawnAs`: the way the card came out of a draw; null when it was opened from the deck
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import TarotFace from "./TarotFace.jsx";
import { keepTabInside, lockPage } from "../dialog.js";
import { TEXT, groupLine } from "./text.js";

export default function TarotDetail({ card, drawnAs = null, he, onClose, onStep }) {
  const backdropRef = useRef(null);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const pressedOnBackdrop = useRef(false);
  const lang = he ? "he" : "en";
  const t = TEXT[lang];

  // while open: the page stays still and the focus is inside; both go back when it closes. The focus does not
  // scroll the dialog: on a phone it opens at its top, on the card, and not at the buttons below it.
  useEffect(() => {
    const before = document.activeElement;
    const unlock = lockPage();
    closeRef.current?.focus({ preventScroll: true });
    if (backdropRef.current) backdropRef.current.scrollTop = 0;
    return () => {
      unlock();
      if (before?.isConnected) before.focus();
    };
  }, []);

  useEffect(() => {
    const forward = he ? "ArrowLeft" : "ArrowRight";
    const back = he ? "ArrowRight" : "ArrowLeft";
    const onKey = (e) => {
      // another window's key, and the browser's own shortcuts (Alt+arrow and the like), are not this dialog's
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === forward || e.key === back) {
        const target = e.target;
        if (target !== document.body && !dialogRef.current?.contains(target)) return;
        e.preventDefault();
        onStep(e.key === forward ? 1 : -1);
      } else {
        keepTabInside(e, dialogRef.current, closeRef.current);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [he, onClose, onStep]);

  const name = card.name[lang];
  const other = card.name[he ? "en" : "he"];
  const meaning = (way, title, text) => (
    <section className={`td-meaning${drawnAs === way ? " td-now" : ""}`}>
      <h3>
        {title}
        {drawnAs === way && <span className="td-came">{t.cameOut}</span>}
      </h3>
      <p>{text}</p>
    </section>
  );
  return createPortal(
    <div
      ref={backdropRef}
      className="st-root td-backdrop"
      // a press that starts on the card (selecting text, say) and ends on the backdrop does not close it
      onPointerDown={(e) => {
        pressedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressedOnBackdrop.current) onClose();
      }}
    >
      <div ref={dialogRef} className="td" role="dialog" aria-modal="true" aria-label={name} dir={he ? "rtl" : "ltr"} lang={lang}>
        <div className="td-card">
          <TarotFace key={card.id} card={card} reversed={drawnAs === "reversed"} size="lg" />
        </div>
        <div className="td-text">
          <p className="td-eyebrow">{groupLine(card, he)}</p>
          <h2 className="td-name">{name}</h2>
          <p className="td-other" lang={he ? "en" : "he"} dir={he ? "ltr" : "rtl"}>
            {other}
          </p>
          <ul className="td-keys" aria-label={t.keywords}>
            {card.keywords[lang].map((word) => (
              <li key={word}>{word}</li>
            ))}
          </ul>
          {meaning("upright", t.uprightMeaning, card.upright[lang])}
          {meaning("reversed", t.reversedMeaning, card.reversed[lang])}
          <div className="td-nav">
            <button type="button" className="fx td-btn" onClick={() => onStep(-1)}>
              <span aria-hidden="true">{he ? "→ " : "← "}</span>
              {t.prev}
            </button>
            <button type="button" className="fx td-btn" onClick={() => onStep(1)}>
              {t.next}
              <span aria-hidden="true">{he ? " ←" : " →"}</span>
            </button>
            <button ref={closeRef} type="button" className="fx td-btn td-close" onClick={onClose}>
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
