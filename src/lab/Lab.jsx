/**
 * Development only (lab.html): each new Studio piece with sample data, in
 * either theme. Pick a section and a theme in the bar; the choice is kept in
 * the address (#s=basics&t=dark) so a reload or a link shows the same thing.
 * For phone and tablet widths, resize the window: the pieces follow the real
 * screen width, as they will in the app.
 */
import { useEffect, useState } from "react";
import "../studio/studio.css";
import { ToastProvider, useToast } from "../studio/Toasts.jsx";
import { attachRipple } from "../studio/motion.js";
import { useLayout } from "../studio/useMediaQuery.js";
import { AccountProvider } from "../account/AccountContext.jsx";
import App from "../App.jsx";
import { labService } from "./labAccount.js";
import MeetingSection from "./sections/MeetingSection.jsx";

/** The whole Studio, signed in as the sample admin with sample clients (see labAccount.js). */
function StudioPreview() {
  try {
    localStorage.setItem("numerology_owner_mode", "owner");
  } catch {
    /* storage blocked: the app falls back to its default view */
  }
  return (
    <AccountProvider active loadService={async () => labService()}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AccountProvider>
  );
}

function Basics() {
  const toast = useToast();
  const layout = useLayout();
  return (
    <div className="st-view" style={{ display: "grid", gap: 16 }}>
      <p style={{ margin: 0, color: "var(--st-ink-soft)" }}>
        פריסה נוכחית: <b style={{ color: "var(--st-gold)" }}>{layout}</b>. לוחצים על כפתור כדי לראות את הבזק הזהב.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="fx lab-btn" onClick={() => toast("נשמר")}>הודעה קצרה</button>
        <button type="button" className="fx lab-btn" onClick={() => toast("הועתק")}>עוד אחת</button>
      </div>
      <div className="st-cols-3">
        {["ימי הולדת השבוע", "לקוחות אחרונים", "פעולות מהירות"].map((title) => (
          <article key={title} className="st-panel">
            <h3 style={{ margin: "0 0 8px", color: "var(--st-gold)", fontWeight: 500, fontSize: 15 }}>{title}</h3>
            <p style={{ margin: 0, color: "var(--st-ink-soft)" }}>שלוש עמודות במחשב, שתיים בטאבלט, אחת בטלפון.</p>
          </article>
        ))}
      </div>
    </div>
  );
}

/** Each later task adds its own section here: [key, label, Component]. "studio" fills the whole page. */
export const SECTIONS = [
  ["basics", "בסיס", Basics],
  ["meeting", "מצב פגישה", MeetingSection],
  ["studio", "הסטודיו המלא", StudioPreview],
];

const readHash = () => Object.fromEntries(new URLSearchParams(window.location.hash.slice(1)));

export default function Lab() {
  const initial = readHash();
  const [section, setSection] = useState(SECTIONS.some(([k]) => k === initial.s) ? initial.s : SECTIONS[0][0]);
  const [theme, setTheme] = useState(initial.t === "light" ? "light" : "dark");
  useEffect(() => {
    // the full Studio sets its own theme from its dark/light switch
    if (section !== "studio") document.documentElement.dataset.stTheme = theme;
    window.history.replaceState(null, "", `#s=${section}&t=${theme}`);
  }, [section, theme]);
  useEffect(() => (section === "studio" ? undefined : attachRipple(document)), [section]);
  const Current = SECTIONS.find(([k]) => k === section)[2];
  // the full Studio brings its own top bar and theme; to leave it, change #s= in the address and reload
  if (section === "studio") return <Current />;
  return (
    <ToastProvider>
      <style>{`
        body { margin: 0; background: var(--st-void); color: var(--st-ink); font-family: var(--st-body); }
        .lab-bar { position: sticky; top: 0; z-index: 10; display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
          padding: 10px 16px; border-bottom: 1px solid var(--st-line); background: var(--st-panel); }
        .lab-bar select { font: inherit; padding: 6px 10px; border-radius: 10px; border: 1px solid var(--st-line); background: var(--st-void); color: var(--st-ink); }
        .lab-btn { font: inherit; padding: 10px 16px; border-radius: 12px; border: 1px solid var(--st-line-strong); background: var(--st-gold-wash); color: var(--st-gold); cursor: pointer; }
      `}</style>
      <div className="lab-bar" dir="rtl">
        <strong style={{ color: "var(--st-gold)" }}>מעבדת הסטודיו</strong>
        <label>
          חלק{" "}
          <select value={section} onChange={(e) => setSection(e.target.value)}>
            {SECTIONS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
        <label>
          ערכת צבעים{" "}
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="dark">כהה</option>
            <option value="light">בהירה</option>
          </select>
        </label>
      </div>
      <main className="st-root" dir="rtl" style={{ maxWidth: 1240, margin: "0 auto", padding: "22px 16px 80px" }}>
        <Current />
      </main>
    </ToastProvider>
  );
}
