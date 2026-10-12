/**
 * One tarot card opened large: the card, where it belongs, its keywords and both its meanings, the one it was
 * drawn in marked. The arrows (and the arrow keys, in the reading direction) step through the cards on screen.
 * A modal dialog drawn into <body>, like meeting mode: Esc, its button or a press outside closes it, Tab stays
 * inside, and the focus goes back to the card that opened it.
 * @param {{
 *   card: import("./deck.js").TarotCard,
 *   reversed?: boolean,
 *   he: boolean,
 *   onClose: () => void,
 *   onStep: (by: 1|-1) => void,
 * }} props
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import TarotFace from "./TarotFace.jsx";
import { TEXT, groupLine } from "./text.js";

const FOCUSABLE = "button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";

export default function TarotDetail({ card, reversed = false, he, onClose, onStep }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const lang = he ? "he" : "en";
  const t = TEXT[lang];

  // while open: the page stays still and the focus is inside; both go back when it closes
  useEffect(() => {
    const before = document.activeElement;
    const page = document.documentElement;
    const { overflow } = page.style;
    page.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      page.style.overflow = overflow;
      if (before?.isConnected) before.focus();
    };
  }, []);

  useEffect(() => {
    const forward = he ? "ArrowLeft" : "ArrowRight";
    const back = he ? "ArrowRight" : "ArrowLeft";
    const onKey = (e) => {
      if (e.defaultPrevented) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === forward || e.key === back) {
        e.preventDefault();
        onStep(e.key === forward ? 1 : -1);
      } else if (e.key === "Tab") {
        const controls = [...(dialogRef.current?.querySelectorAll(FOCUSABLE) ?? [])];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!dialogRef.current?.contains(document.activeElement)) {
          e.preventDefault();
          closeRef.current?.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [he, onClose, onStep]);

  const name = card.name[lang];
  const other = card.name[he ? "en" : "he"];
  return createPortal(
    <div className="st-root td-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} className="td" role="dialog" aria-modal="true" aria-label={name} dir={he ? "rtl" : "ltr"} lang={lang}>
        <div className="td-card">
          <TarotFace key={card.id} card={card} reversed={reversed} size="lg" />
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
          <section className={`td-meaning${reversed ? "" : " td-now"}`}>
            <h3>{t.uprightMeaning}</h3>
            <p>{card.upright[lang]}</p>
          </section>
          <section className={`td-meaning${reversed ? " td-now" : ""}`}>
            <h3>{t.reversedMeaning}</h3>
            <p>{card.reversed[lang]}</p>
          </section>
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
