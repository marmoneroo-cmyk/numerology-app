/** Small shared pieces for the workspace screens. Styling follows App.jsx's global classes. */
import { Component, cloneElement, createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";

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

/**
 * Runs `load` when `deps` change; `reload()` runs it again. Only the latest
 * run's answer is kept, so a slow earlier search can never overwrite a newer one.
 */
export function useLoad(load, deps) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const latest = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    const call = ++latest.current;
    try {
      const data = await load();
      if (call === latest.current) setState({ loading: false, data, error: null });
    } catch (error) {
      if (call === latest.current) setState({ loading: false, data: null, error });
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

export function ErrorCard({ he, c, onBack, text, backLabel }) {
  return (
    <Card style={{ textAlign: "center" }}>
      <p role="alert" style={{ color: c.danger, marginTop: 0 }}>{text || (he ? "משהו השתבש בטעינה." : "Something went wrong while loading.")}</p>
      {onBack && <button className="ghost" style={btnGhost} onClick={onBack}>{backLabel || (he ? "חזרה" : "Back")}</button>}
    </Card>
  );
}

/** Shows `fallback` instead of a screen that failed to render. Give it a new `key` to try again. */
export class ScreenBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Label + control + hint/error. `children(id)` renders the control with that
 * id; the control is marked invalid and described by the error (or the hint).
 */
export function Field({ label, error, hint, children, c }) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error || hint;
  const control = cloneElement(children(id), { "aria-invalid": error ? true : undefined, "aria-describedby": note ? noteId : undefined });
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={{ display: "block", marginBottom: 6, fontSize: 12, color: c.ac, fontWeight: 500 }}>{label}</label>
      {control}
      {error ? (
        <div id={noteId} role="alert" style={{ fontSize: 12, color: c.danger, marginTop: 5 }}>{error}</div>
      ) : (
        hint && <div id={noteId} style={{ fontSize: 11, color: c.ts, marginTop: 4 }}>{hint}</div>
      )}
    </div>
  );
}

/**
 * A destructive action in two steps: the button, then a question with
 * "confirm" and "keep". The focus moves to "keep" when the question appears,
 * and back to the button when kept, so keyboard and screen-reader users are
 * never dropped. `stacked` puts a long question on a line of its own.
 */
export function ConfirmAction({ c, label, ariaLabel, question, confirmLabel, confirmAriaLabel, keepLabel, onConfirm, busy = false, stacked = false }) {
  const [asking, setAsking] = useState(false);
  const askRef = useRef(null);
  const keepRef = useRef(null);
  const wasAsking = useRef(false);
  useEffect(() => {
    if (asking) keepRef.current?.focus();
    else if (wasAsking.current) askRef.current?.focus();
    wasAsking.current = asking;
  }, [asking]);

  const danger = { ...btnGhost, color: c.danger };
  if (!asking) {
    return (
      <button ref={askRef} className="ghost" style={danger} aria-label={ariaLabel} onClick={() => setAsking(true)} disabled={busy}>
        {label}
      </button>
    );
  }
  return (
    <>
      <span style={{ fontSize: 13, color: c.danger, lineHeight: 1.6, ...(stacked ? { flexBasis: "100%" } : null) }}>{question}</span>
      <button className="ghost" style={{ ...danger, borderColor: c.danger }} aria-label={confirmAriaLabel} onClick={onConfirm} disabled={busy}>
        {confirmLabel}
      </button>
      <button ref={keepRef} className="ghost" style={btnGhost} onClick={() => setAsking(false)} disabled={busy}>
        {keepLabel}
      </button>
    </>
  );
}

/** True once the person has moved between screens; the new screen's title then takes the focus. */
export const FocusTitleContext = createContext(false);

/** A screen's title. After a move between screens it takes the focus, so screen readers announce the new screen. */
export function ScreenTitle({ children, c, size = 26, style }) {
  const ref = useRef(null);
  const focus = useContext(FocusTitleContext);
  useEffect(() => {
    if (focus) ref.current?.focus({ preventScroll: true });
  }, [focus]);
  return (
    <h2 ref={ref} tabIndex={-1} style={{ margin: 0, fontFamily: display, color: c.ac, fontSize: size, fontWeight: 600, ...style }}>
      {children}
    </h2>
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
