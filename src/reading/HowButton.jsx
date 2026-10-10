/**
 * The "?" beside a number: opens a small window with how the number was calculated (how.js),
 * step by step, ending in the number itself.
 */
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { howFor, howTitle } from "./how.js";
import "./how.css";

/** The result line: a number, a list (pinnacles, debts) or the Lo Shu's missing numbers. */
function shown(result, he) {
  if (Array.isArray(result)) return result.length ? result.join(" · ") : he ? "אין" : "None";
  if (result && typeof result === "object") {
    const miss = result.miss.length ? result.miss.join(", ") : he ? "אין" : "none";
    return he ? `חסרים: ${miss}` : `Missing: ${miss}`;
  }
  return String(result);
}

function HowDialog({ how, he, onClose }) {
  const titleId = useId();
  const closeButton = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close.current();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, []);

  // the window has one control, so Tab stays on it
  const keepFocus = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      closeButton.current?.focus();
    }
  };

  return (
    <div className="how-backdrop" onClick={() => close.current()}>
      <div className="how-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} dir={he ? "rtl" : "ltr"} onClick={(e) => e.stopPropagation()} onKeyDown={keepFocus}>
        <div className="how-head">
          <h3 id={titleId}>{he ? `איך זה חושב: ${how.title}` : `How it was calculated: ${how.title}`}</h3>
          <button ref={closeButton} type="button" className="how-close" onClick={() => close.current()} aria-label={he ? "סגירה" : "Close"}>
            ×
          </button>
        </div>
        <ol className="how-steps">
          {how.steps.map((s, i) => (
            <li key={i}>
              <span>{s.text}</span>
              {s.math && (
                <bdi dir="ltr" className="how-math">
                  {s.math}
                </bdi>
              )}
            </li>
          ))}
        </ol>
        <p className="how-result">
          {he ? "התוצאה: " : "Result: "}
          <b>{how.shown ?? shown(how.result, he)}</b>
        </p>
      </div>
    </div>
  );
}

/**
 * @param {{ k: string, ctx: object, he: boolean, label?: string }} props `k` and `ctx` as howFor takes them;
 *   `label` names the number for screen readers when the explanation's own title is not specific enough
 */
export default function HowButton({ k, ctx, he, label }) {
  const [open, setOpen] = useState(false);
  const button = useRef(null);
  const how = open ? howFor(k, ctx, he) : null;
  const name = label || howTitle(k, he);
  const closeDialog = () => {
    setOpen(false);
    button.current?.focus();
  };
  return (
    <>
      <button
        ref={button}
        type="button"
        className="how-btn"
        aria-haspopup="dialog"
        aria-label={he ? `איך זה חושב: ${name}` : `How it was calculated: ${name}`}
        title={he ? "איך זה חושב?" : "How was this calculated?"}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        ?
      </button>
      {how && createPortal(<HowDialog how={how} he={he} onClose={closeDialog} />, document.body)}
    </>
  );
}
