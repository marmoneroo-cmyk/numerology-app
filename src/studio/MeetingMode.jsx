/**
 * Meeting mode: one reading in large type over the whole window, for showing
 * to a client across the table. No admin buttons: one button (or Esc) ends the
 * meeting and the focus goes back to where it was. It is drawn straight into
 * <body>, because the app's containers animate with transforms, which would
 * trap a fixed overlay. It never asks for the browser's full screen (that fails
 * on phones and inside some frames); it fills the window instead.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { prefersReducedMotion } from "./motion.js";
import "./meeting.css";

const COPY = {
  he: { title: "מצב פגישה", close: "סיום הפגישה", eyebrow: "מפת נומרולוגיה" },
  en: { title: "Meeting mode", close: "End the meeting", eyebrow: "Numerology map" },
};

/**
 * Values are shown as given, so master numbers (11, 22, 33) and "11/2" style strings work.
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   he?: boolean,
 *   person: string,
 *   eyebrow?: string,
 *   main: { value: number | string, label: string },
 *   numbers?: Array<{ value: number | string, label: string }>,
 *   text?: string,
 * }} props
 */
export default function MeetingMode({ open, onClose, he = true, person, eyebrow, main, numbers = [], text }) {
  const closeRef = useRef(null);

  // while open: the page behind stays still and the focus moves in; both go back on close.
  // The lock goes on <html>: the app clips overflow on html and body, so <html> scrolls the
  // window, and locking <body> would only turn it into a scroll box that moves sticky bars.
  useEffect(() => {
    if (!open) return undefined;
    const before = document.activeElement;
    const page = document.documentElement;
    const { overflow } = page.style;
    page.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      page.style.overflow = overflow;
      if (before?.isConnected) before.focus();
    };
  }, [open]);

  // Esc ends the meeting wherever the focus is; Tab stays on the one button
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        e.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const t = he ? COPY.he : COPY.en;
  const enter = prefersReducedMotion() ? "" : " st-meet-enter";
  return createPortal(
    <div
      className={`st-root st-meet${enter}`}
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
      dir={he ? "rtl" : "ltr"}
      lang={he ? "he" : "en"}
    >
      <button ref={closeRef} type="button" className="fx st-meet-close" onClick={onClose}>
        {t.close} <span className="st-meet-key">(Esc)</span>
      </button>
      <div className="st-meet-body">
        <p className="st-meet-eyebrow">{eyebrow ?? t.eyebrow}</p>
        <h2 className="st-meet-name">{person}</h2>
        <span className="st-meet-num">{main.value}</span>
        <p className="st-meet-label">{main.label}</p>
        {numbers.length > 0 && (
          <ul className="st-meet-chips">
            {numbers.map((n, i) => (
              <li key={i} className="st-meet-chip">
                <span className="st-meet-chip-num">{n.value}</span>
                <span className="st-meet-chip-label">{n.label}</span>
              </li>
            ))}
          </ul>
        )}
        {text && <p className="st-meet-text">{text}</p>}
      </div>
    </div>,
    document.body,
  );
}
