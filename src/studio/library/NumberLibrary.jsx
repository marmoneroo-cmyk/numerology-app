/**
 * The number library (the owner, 2026-10-12, in place of the tarot): every number the method knows, 1 to 9, the
 * master numbers and the karmic debts, each opening a page with what the Studio already says about it. Nothing here
 * is new text: `texts` are the app's own interpretations (D, MASTER, KARMA, YEAR_ENERGY, NUM_LIB and TRAITS in
 * App.jsx), and a page shows only the parts that exist. In the demo the interpretations are blurred (DemoLock);
 * numbers, titles and keywords stay, as everywhere in the demo.
 */
import { useEffect, useId, useRef } from "react";
import Locked from "../../demo/DemoLock.jsx";
import { R, isMaster, MASTER_NUMBERS, KARMIC_DEBTS } from "../../engine/index.js";
import { numberTitle as titleOf } from "../../workspace/content.js";
import "./library.css";

export const LIBRARY_GROUPS = [
  { key: "base", he: "המספרים 1–9", en: "Numbers 1–9", numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  { key: "master", he: "מספרי מאסטר", en: "Master numbers", numbers: [...MASTER_NUMBERS] },
  { key: "karmic", he: "חובות קארמיים", en: "Karmic debts", numbers: [...KARMIC_DEBTS] },
];

const isDebt = (n) => KARMIC_DEBTS.includes(n);

/** A karmic debt's text in two: its name before the dash and its lesson after ("חוב של עצלות — ..."). */
function debtParts(texts, n, he) {
  const text = texts.KARMA?.[n]?.[he ? "he" : "en"] ?? "";
  const dash = text.indexOf(" — ");
  return dash > 0 ? { name: text.slice(0, dash), lesson: text.slice(dash + 3) } : { name: "", lesson: text };
}

/** The title a number goes by: its archetype or a master number's own (as everywhere), or the name of a debt. */
export function numberTitle(texts, n, he) {
  if (isDebt(n)) return debtParts(texts, n, he).name || (he ? `חוב קארמי ${n}` : `Karmic debt ${n}`);
  return titleOf(texts, n, he);
}

const nameOf = (texts, n, he) => {
  const title = numberTitle(texts, n, he);
  return title ? `${n} · ${title}` : String(n);
};

/** The number's colour: a master's own, else that of its digit (a debt takes its digit's). */
const accentOf = (texts, n) => (isMaster(n) ? texts.MASTER?.[n]?.c : texts.D?.[R(n)]?.c) ?? "var(--st-gold)";

/** A titled part of a page; nothing when it has no content. */
function Part({ title, show = true, children }) {
  const id = useId();
  if (!show) return null;
  return (
    <section className="nl-part" aria-labelledby={id}>
      <h3 id={id}>{title}</h3>
      {children}
    </section>
  );
}

/** Pairs of a term and its value, the empty ones left out; `locked` blurs the values in the demo. */
function Facts({ he, rows, locked = false }) {
  const shown = rows.filter(([, value]) => value);
  if (shown.length === 0) return null;
  return (
    <dl className="nl-facts">
      {shown.map(([term, value]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{locked ? <Locked he={he}>{value}</Locked> : value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Every number in its group: a button that opens its page. `focusNumber` takes the focus (coming back to it). */
function Grid({ he, texts, onOpen, focusNumber }) {
  const groupsRef = useRef(null);
  useEffect(() => {
    if (focusNumber != null) groupsRef.current?.querySelector(`[data-number="${focusNumber}"]`)?.focus();
  }, [focusNumber]);
  return (
    <div className="nl-groups" ref={groupsRef}>
      {LIBRARY_GROUPS.map((group) => (
        <section key={group.key} className="nl-group" aria-labelledby={`nl-${group.key}`}>
          <h2 id={`nl-${group.key}`}>{he ? group.he : group.en}</h2>
          <ul className="nl-grid">
            {group.numbers.map((n) => (
              <li key={n}>
                <button type="button" className="nl-num" data-number={n} style={{ "--nl-accent": accentOf(texts, n) }} onClick={() => onOpen(n)}>
                  <span className="nl-num-value">{n}</span>
                  <span className="st-sr"> · </span>
                  <span className="nl-num-title">{numberTitle(texts, n, he)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** A number's page: its title and keywords, then every part the Studio has a text for. */
function Page({ he, texts, n, onOpen, onClose }) {
  const headingRef = useRef(null);
  const headingId = useId();
  useEffect(() => headingRef.current?.focus(), [n]);
  const lang = he ? "he" : "en";
  const d = n <= 9 ? texts.D?.[n] : null;
  const lib = texts.NUM_LIB?.[n]?.[lang];
  const traits = n <= 9 ? texts.TRAITS?.[n]?.[lang] : null;
  const year = n <= 9 ? texts.YEAR_ENERGY?.[n]?.[lang] : null;
  const master = isMaster(n) ? texts.MASTER?.[n]?.[lang] : null;
  const debt = isDebt(n) ? debtParts(texts, n, he).lesson : null;
  const digit = n > 9 ? R(n) : null;
  const keywords = d ? (he ? d.s : d.se) : lib?.k;
  const ritual = d?.ritual;
  const list = (items) => (
    <ul className="nl-list">
      {items.map((item) => (
        <li key={item}>
          <Locked he={he}>{item}</Locked>
        </li>
      ))}
    </ul>
  );
  // `chip`: in the demo, the first interpretation on the page says where the full one is
  const text = (value, chip = false) => (
    <p>
      <Locked he={he} chip={chip}>
        {value}
      </Locked>
    </p>
  );
  return (
    <article className="nl-page" style={{ "--nl-accent": accentOf(texts, n) }} aria-labelledby={headingId}>
      <button type="button" className="fx nl-btn nl-back" onClick={onClose}>
        <span aria-hidden="true">{he ? "→" : "←"}</span> {he ? "לכל המספרים" : "All the numbers"}
      </button>
      <header className="nl-head">
        <span className="nl-head-value" aria-hidden="true">
          {n}
        </span>
        <h2 id={headingId} ref={headingRef} tabIndex={-1}>
          {nameOf(texts, n, he)}
        </h2>
        {keywords && <p className="nl-keywords">{keywords}</p>}
      </header>
      <Part title={he ? "מספר מאסטר" : "Master number"} show={Boolean(master)}>
        {text(master)}
      </Part>
      <Part title={he ? "החוב" : "The debt"} show={Boolean(debt)}>
        {text(debt, true)}
      </Part>
      {digit != null && (
        <p className="nl-digit">
          <button type="button" className="fx nl-btn" onClick={() => onOpen(digit)}>
            {`${he ? "בספרה אחת" : "In one digit"}: ${nameOf(texts, digit, he)}`}
          </button>
        </p>
      )}
      <Part title={he ? "המהות" : "Essence"} show={Boolean(lib?.p)}>
        {text(lib?.p, true)}
      </Part>
      <Part title={he ? `הסיפור של אנשי ${n}` : `The story of the ${n}s`} show={Boolean(d?.narrative)}>
        {text(he ? d?.narrative : d?.narrativeE)}
      </Part>
      <Part title={he ? "חוזקות" : "Strengths"} show={Boolean(traits?.str?.length)}>
        {traits?.str && list(traits.str)}
      </Part>
      <Part title={he ? "אתגרים" : "Challenges"} show={Boolean(traits?.ch?.length)}>
        {traits?.ch && list(traits.ch)}
      </Part>
      <Part title={he ? "השיעור" : "The lesson"} show={Boolean(traits?.soul)}>
        {text(traits?.soul)}
      </Part>
      <Part title={he ? "צל וצמיחה" : "Shadow and growth"} show={Boolean(d?.shadow || d?.growth)}>
        <Facts he={he} locked rows={[[he ? "צל" : "Shadow", he ? d?.shadow : d?.shadowE], [he ? "צמיחה" : "Growth", he ? d?.growth : d?.growthE]]} />
      </Part>
      <Part title={he ? "כשנה אישית" : "As a personal year"} show={Boolean(year)}>
        {text(year)}
      </Part>
      <Part title={he ? "מאפיינים" : "Details"} show={Boolean(d?.stone || d?.el || d?.color || d?.career)}>
        <Facts
          he={he}
          locked
          rows={[
            [he ? "אבן" : "Stone", d?.stone],
            [he ? "קריסטל" : "Crystal", d?.crystal],
            [he ? "צבע" : "Colour", d?.color],
            [he ? "יסוד" : "Element", d?.el],
            [he ? "קריירה" : "Career", d?.career],
            [he ? "יום מזל" : "Lucky day", d?.luck],
          ]}
        />
      </Part>
      <Part title={he ? "טקס" : "Ritual"} show={Boolean(ritual)}>
        <Facts
          he={he}
          locked
          rows={[
            [he ? "מילה" : "Word", he ? ritual?.word : ritual?.wordE],
            [he ? "פעולה" : "Act", he ? ritual?.act : ritual?.actE],
            [he ? "טקס קטן" : "A small ritual", he ? ritual?.micro : ritual?.microE],
            [he ? "שאלה למחשבה" : "A question to reflect on", he ? ritual?.reflect : ritual?.reflectE],
          ]}
        />
      </Part>
    </article>
  );
}

/**
 * The library: every number, or the page of the `open` one. The screen holding it keeps which is open (`onOpen`,
 * `onClose`), so the home screen's "today's number" can open a page; coming back puts the focus on that number.
 */
export default function NumberLibrary({ he, texts, open, onOpen, onClose }) {
  const lastOpen = useRef(null);
  if (open != null) lastOpen.current = open;
  return open != null ? (
    <Page he={he} texts={texts} n={open} onOpen={onOpen} onClose={onClose} />
  ) : (
    <Grid he={he} texts={texts} onOpen={onOpen} focusNumber={lastOpen.current} />
  );
}

/** Today's number on the home screen (the universal day, in place of a drawn card): its title, and its page. */
export function DayNumber({ he, texts, n, onOpen }) {
  const d = texts.D?.[n];
  return (
    <div className="nl-day" style={{ "--nl-accent": accentOf(texts, n) }}>
      <span className="nl-day-value">{n}</span>
      <span className="nl-day-title">{numberTitle(texts, n, he)}</span>
      {d && <span className="nl-day-words">{he ? d.s : d.se}</span>}
      <button type="button" className="fx nl-btn" onClick={() => onOpen(n)}>
        {he ? `לעמוד של המספר ${n}` : `Open number ${n}`}
      </button>
    </div>
  );
}
