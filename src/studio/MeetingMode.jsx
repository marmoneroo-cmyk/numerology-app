/**
 * Meeting mode: a reading in large type over the whole window, for showing to a client across the table. It
 * opens on the person's name and life path, and then shows the whole map, one section after another: the map
 * summary and the life map (the owner, 2026-10-12: "it opens only one page"). A bar at the top reaches each
 * section and ends the meeting (also Esc); Tab stays inside, and the focus goes back to where it was.
 * It is drawn straight into <body>, because the app's containers animate with transforms, which would trap a
 * fixed overlay. It never asks for the browser's full screen (that fails on phones and inside some frames); it
 * fills the window instead. Its text is larger than the Studio's (--ts in meeting.css).
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { prefersReducedMotion } from "./motion.js";
import Locked from "../demo/DemoLock.jsx";
import "./meeting.css";

const COPY = {
  he: { title: "מצב פגישה", close: "סיום הפגישה", eyebrow: "מפת נומרולוגיה", sections: "חלקי הפגישה" },
  en: { title: "Meeting mode", close: "End the meeting", eyebrow: "Numerology map", sections: "Parts of the meeting" },
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
 *   sections?: Array<{ id: string, title: string, content: import("react").ReactNode, ownTitle?: boolean }>,
 * }} props `ownTitle`: the content shows the section's title itself, so the meeting does not repeat it
 */
export default function MeetingMode({ open, onClose, he = true, person, eyebrow, main, numbers = [], text, sections = [] }) {
  const dialogRef = useRef(null);
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

  // Esc ends the meeting wherever the focus is; Tab goes round the meeting's own controls and never leaves it
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      const controls = dialog ? [...dialog.querySelectorAll(FOCUSABLE)] : [];
      const first = controls[0];
      const last = controls[controls.length - 1];
      const inside = dialog?.contains(document.activeElement);
      if (!inside || controls.length <= 1) {
        e.preventDefault();
        closeRef.current?.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const t = he ? COPY.he : COPY.en;
  const enter = prefersReducedMotion() ? "" : " st-meet-enter";
  const jump = (id) => document.getElementById(`st-meet-${id}`)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  return createPortal(
    <div
      ref={dialogRef}
      className={`st-root st-meet${enter}`}
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
      dir={he ? "rtl" : "ltr"}
      lang={he ? "he" : "en"}
    >
      <div className="st-meet-bar">
        {sections.length > 0 && (
          <nav className="st-meet-jumps" aria-label={t.sections}>
            {sections.map((s) => (
              <button key={s.id} type="button" className="fx st-meet-jump" onClick={() => jump(s.id)}>
                {s.title}
              </button>
            ))}
          </nav>
        )}
        <button ref={closeRef} type="button" className="fx st-meet-close" onClick={onClose}>
          {t.close} <span className="st-meet-key">(Esc)</span>
        </button>
      </div>
      <div className={`st-meet-body${sections.length > 0 ? " st-meet-cover" : ""}`}>
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
        {text && (
          <p className="st-meet-text">
            <Locked he={he} chip>
              {text}
            </Locked>
          </p>
        )}
      </div>
      {sections.map((s) => (
        <section key={s.id} id={`st-meet-${s.id}`} className="st-meet-section" aria-label={s.title}>
          {!s.ownTitle && <h2 className="st-meet-section-title">{s.title}</h2>}
          {s.content}
        </section>
      ))}
    </div>,
    document.body,
  );
}
