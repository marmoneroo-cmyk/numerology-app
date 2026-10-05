/** Small shared pieces for the workspace screens. Styling follows App.jsx's global classes. */
import { useCallback, useEffect, useId, useState } from "react";

/** Theme colours, the same pair App.jsx uses (dark: champagne gold on night blue). */
export function colors(dk) {
  return {
    ac: dk ? "#c8a96a" : "#937640",
    tm: dk ? "#e8e0d0" : "#2a2520",
    ts: dk ? "rgba(232,224,208,.62)" : "rgba(42,37,32,.62)",
    line: dk ? "rgba(200,169,106,.16)" : "rgba(147,118,64,.2)",
    soft: dk ? "rgba(18,18,38,.35)" : "rgba(255,255,255,.45)",
    warn: dk ? "#e7b16b" : "#8a5a14",
    danger: dk ? "#f0a8a8" : "#a33a3a",
    ok: dk ? "#9fd8b8" : "#2d6e4e",
  };
}

export const btnPrimary = { width: "auto", padding: "11px 20px", fontSize: 14 };
export const btnGhost = { padding: "9px 16px", fontSize: 13, borderRadius: 12, cursor: "pointer" };
export const display = "'Cormorant Garamond',serif";

/** Runs `load` when `deps` change; `reload()` runs it again. */
export function useLoad(load, deps) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    try {
      const data = await load();
      setState({ loading: false, data, error: null });
    } catch (error) {
      setState({ loading: false, data: null, error });
    }
  }, deps);
  useEffect(() => {
    run();
  }, [run]);
  return { ...state, reload: run };
}

export function Card({ children, style }) {
  return <section className="gc" style={{ padding: 20, marginBottom: 14, ...style }}>{children}</section>;
}

export function Loading({ he, c }) {
  return <Card style={{ textAlign: "center", color: c.ts }}>{he ? "טוען…" : "Loading…"}</Card>;
}

export function ErrorCard({ he, c, onBack }) {
  return (
    <Card style={{ textAlign: "center" }}>
      <p role="alert" style={{ color: c.danger, marginTop: 0 }}>{he ? "משהו השתבש בטעינה." : "Something went wrong while loading."}</p>
      {onBack && <button className="ghost" style={btnGhost} onClick={onBack}>{he ? "חזרה" : "Back"}</button>}
    </Card>
  );
}

/** Label + control + hint/error. `children(id)` renders the control with that id. */
export function Field({ label, error, hint, children, c }) {
  const id = useId();
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={{ display: "block", marginBottom: 6, fontSize: 12, color: c.ac, fontWeight: 500 }}>{label}</label>
      {children(id)}
      {hint && !error && <div style={{ fontSize: 11, color: c.ts, marginTop: 4 }}>{hint}</div>}
      {error && <div role="alert" style={{ fontSize: 12, color: c.danger, marginTop: 5 }}>{error}</div>}
    </div>
  );
}

/** A number tile: label, the number, and its archetype title. */
export function Num({ label, value, title, testId, c }) {
  return (
    <div data-testid={testId} style={{ textAlign: "center", padding: "12px 8px", background: c.soft, border: `1px solid ${c.line}`, borderRadius: 14, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: c.ts }}>{label}</div>
      <div style={{ fontSize: 30, fontFamily: display, color: c.ac, lineHeight: 1.15 }}>{value}</div>
      {title && <div style={{ fontSize: 11, color: c.tm, opacity: 0.8 }}>{title}</div>}
    </div>
  );
}

export const tilesGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 };

/** A whole list row as one button (the .rrow look, without native button chrome). */
export function rowButton(c) {
  return { width: "100%", background: "none", border: 0, borderBottom: `1px solid ${c.line}`, cursor: "pointer", color: "inherit", font: "inherit", textAlign: "start" };
}

export function SectionTitle({ children, c }) {
  return <h3 style={{ margin: "0 0 12px", fontSize: 15, color: c.ac, fontWeight: 600 }}>{children}</h3>;
}

export function BackButton({ children, onClick }) {
  return (
    <button className="ghost" style={{ ...btnGhost, marginBottom: 12 }} onClick={onClick}>
      {children}
    </button>
  );
}
