/**
 * Quick search (Ctrl/Cmd+K): one input over a list of tools, clients and
 * actions. Arrows move, Enter opens, Esc closes, and the focus comes back to
 * where it was. It renders on <body>: the app's containers animate with
 * transforms, which would trap a fixed overlay inside them.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { vibrate } from "./motion.js";
import "./palette.css";

const MAX_RESULTS = 50;
const NO_ITEMS = [];
const PALETTE_KEYS = ["ArrowDown", "ArrowUp", "Enter", "Escape", "Tab"];
const LATIN_LETTER = /^[a-z]$/;

const TEXT = {
  he: {
    title: "חיפוש מהיר",
    search: "חיפוש כלי, לקוח או פעולה",
    results: "תוצאות",
    empty: "לא נמצא. נסו מילה אחרת.",
    keys: "חצים לבחירה · Enter לפתיחה · Esc לסגירה",
  },
  en: {
    title: "Quick search",
    search: "Search tools, clients and actions",
    results: "Results",
    empty: "Nothing found. Try another word.",
    keys: "Arrows to move · Enter to open · Esc to close",
  },
};

/** Hebrew final letters and their regular forms, so "כספ" finds "כסף" and "שלום" finds "שלומית". */
const FINAL_FORMS = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
const FINAL_LETTER = new RegExp(`[${Object.keys(FINAL_FORMS).join("")}]`, "g");

/** Text as the search compares it: lower case, trimmed, Hebrew final letters in their regular form. */
export function normalize(text) {
  return String(text ?? "").trim().toLowerCase().replace(FINAL_LETTER, (letter) => FINAL_FORMS[letter]);
}

/** Each item with the text it can be found by (its label and keywords) and its place in the list. */
const indexItems = (items) =>
  items.map((item, n) => ({ item, n, text: [item.label, ...(item.keywords ?? [])].map(normalize).join(" ") }));

/** The items that hold every word of the query, at most MAX_RESULTS of them. An empty query keeps them all. */
function search(index, query) {
  const words = normalize(query).split(" ").filter(Boolean);
  return index.filter((entry) => words.every((word) => entry.text.includes(word))).slice(0, MAX_RESULTS);
}

/**
 * Ctrl+K or Cmd+K. On a layout without Latin letters (Hebrew gives "ל" there) the key's place decides; elsewhere its
 * letter does, so Colemak's Ctrl+E, which sits where QWERTY has K, stays the browser's. Alt or Shift make another shortcut.
 */
function isOpenShortcut(e) {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return false;
  const key = String(e.key).toLowerCase();
  return key === "k" || (!LATIN_LETTER.test(key) && e.code === "KeyK");
}

/** Calls `onOpen` on Ctrl+K (Cmd+K on a Mac) wherever the focus is, instead of the browser's own use of those keys. */
export function useCommandShortcut(onOpen, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (e) => {
      if (!isOpenShortcut(e)) return;
      e.preventDefault();
      onOpen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpen, enabled]);
}

/**
 * While open, the input has the focus and the page behind stays still (the lock goes on <html>, which scrolls the
 * window in this app, as in MeetingMode). On close both go back: the focus returns where it was, unless something
 * outside took it meanwhile. Opening also buzzes the phone.
 */
function useModalEffects(rootRef, inputRef) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    const before = document.activeElement;
    const page = document.documentElement;
    const { overflow } = page.style;
    page.style.overflow = "hidden";
    inputRef.current.focus();
    vibrate(8);
    return () => {
      page.style.overflow = overflow;
      const now = document.activeElement;
      if (now === document.body || root.contains(now)) before?.focus?.();
    };
  }, [rootRef, inputRef]);
}

/** The query, the items that match it, and the active one among them (-1 when nothing matches). */
function useSearch(items) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const index = useMemo(() => indexItems(items), [items]);
  const shown = useMemo(() => search(index, query), [index, query]);
  return { query, setQuery, shown, current: Math.min(active, shown.length - 1), setActive };
}

/** The input's keydown handler: arrows move (wrapping), Enter runs the active item, Esc closes, Tab stays put. */
function paletteKeys({ shown, current, setActive, choose, onClose, listRef }) {
  const move = (step) => {
    if (!shown.length) return;
    const next = (current + step + shown.length) % shown.length;
    setActive(next);
    listRef.current.children[next].scrollIntoView?.({ block: "nearest" });
  };
  return (e) => {
    // not while an input method is still composing a word, and not a held Enter (say, the one that opened the palette)
    if (!PALETTE_KEYS.includes(e.key) || e.nativeEvent.isComposing || (e.key === "Enter" && e.repeat)) return;
    e.preventDefault(); // Tab included: the input is the only stop, so the focus stays put
    e.stopPropagation(); // these keys belong to the palette; an Escape here must not also close what lies under it
    if (e.key === "ArrowDown") move(1);
    if (e.key === "ArrowUp") move(-1);
    if (e.key === "Enter") choose(current);
    if (e.key === "Escape") onClose();
  };
}

/**
 * A press anywhere but on the input keeps the focus in the input, so the keys go on working. A press that starts in
 * the panel (say, selecting the query) and ends over the backdrop is not a click on the backdrop.
 */
function useBackdrop(panelRef, inputRef, onClose) {
  const pressedInside = useRef(false);
  const onPress = (e) => {
    pressedInside.current = panelRef.current.contains(e.target);
    if (e.target !== inputRef.current) e.preventDefault();
  };
  const onBackdropClick = (e) => {
    if (!pressedInside.current && !panelRef.current.contains(e.target)) onClose();
  };
  return { onPress, onBackdropClick };
}

function Option({ id, item, selected, onHover, onChoose }) {
  return (
    <li id={id} className="st-palette-option" role="option" aria-selected={selected} onMouseMove={onHover} onClick={onChoose}>
      <span className="st-palette-label">{item.label}</span>
      {item.hint ? <span className="st-palette-hint">{item.hint}</span> : null}
    </li>
  );
}

function PaletteDialog({ onClose, he, items }) {
  const t = TEXT[he ? "he" : "en"];
  const id = useId();
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const { query, setQuery, shown, current, setActive } = useSearch(items);
  const { onPress, onBackdropClick } = useBackdrop(panelRef, inputRef, onClose);
  useModalEffects(rootRef, inputRef);
  const optionId = (entry) => `${id}o${entry.n}`;
  const choose = (i) => {
    if (!shown[i]) return;
    shown[i].item.run();
    onClose();
  };
  const onType = (e) => {
    setQuery(e.target.value);
    setActive(0);
    listRef.current.scrollTop = 0; // the first result is the active one, so it should be in view
  };

  return createPortal(
    <div ref={rootRef} className="st-root st-palette" dir={he ? "rtl" : "ltr"} lang={he ? "he" : "en"} onMouseDown={onPress} onClick={onBackdropClick}>
      <div ref={panelRef} className="st-palette-panel" role="dialog" aria-modal="true" aria-label={t.title}>
        <input
          ref={inputRef}
          className="st-palette-input"
          type="text"
          role="combobox"
          aria-label={t.search}
          aria-expanded={shown.length > 0}
          aria-autocomplete="list"
          aria-controls={`${id}list`}
          aria-activedescendant={current >= 0 ? optionId(shown[current]) : undefined}
          aria-describedby={`${id}keys`}
          placeholder={t.search}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={onType}
          onKeyDown={paletteKeys({ shown, current, setActive, choose, onClose, listRef })}
        />
        <ul ref={listRef} id={`${id}list`} className="st-palette-list" role="listbox" aria-label={t.results}>
          {shown.map((entry, i) => (
            <Option key={entry.item.id} id={optionId(entry)} item={entry.item} selected={i === current} onHover={() => setActive(i)} onChoose={() => choose(i)} />
          ))}
        </ul>
        <div role="status">{shown.length ? null : <p className="st-palette-empty">{t.empty}</p>}</div>
        <p id={`${id}keys`} className="st-palette-keys">{t.keys}</p>
      </div>
    </div>,
    document.body,
  );
}

/**
 * @param {{ open: boolean, onClose: () => void, he?: boolean,
 *   items: Array<{ id: string, label: string, hint?: string, keywords?: string[], run: () => void }> }} props
 *   Ids must be unique. `run` is called first, then `onClose`. Nothing renders while `open` is false.
 *   Render it outside elements that handle clicks or keys: React passes a portal's events up the component tree,
 *   so such an ancestor would also see the palette's clicks and typing.
 */
export default function CommandPalette({ open, onClose, he = true, items }) {
  return open ? <PaletteDialog onClose={onClose} he={he} items={items ?? NO_ITEMS} /> : null;
}
