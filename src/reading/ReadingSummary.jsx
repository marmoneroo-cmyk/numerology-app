/**
 * The whole map on one screen: every number of a reading in one table, grouped the way a
 * numerologist reads it to a client (the core numbers, now, the life cycles, karma and Lo Shu),
 * each with a "?" that shows how it was calculated.
 */
import { useId } from "react";
import { useContent, numberTitle } from "../workspace/content.js";
import { LV, cycleAt, cycleSpans, maturity, birthdayNumber, dominantNumbers, missingNumbers } from "../engine/index.js";
import { agesText } from "./ages.js";
import HowButton from "./HowButton.jsx";
import "./summary.css";

const CYCLE_NAMES = { he: ["חיפוש", "מציאה", "יתד", "שיא"], en: ["Search", "Discovery", "Anchor", "Peak"] };
const PLANES = { mind: ["מחשבה", "mind"], emotional: ["רגש", "emotion"], practical: ["מעשה", "practice"] };
const pad2 = (n) => String(n).padStart(2, "0");

/** The year's theme from the year-energy text: its first sentence ("שנת התחלות חדשות"). */
const firstSentence = (text) => String(text ?? "").split(".")[0].trim();

/** One number: its name, the number, a short meaning, and the "?". */
function Row({ k, label, value, meaning, ctx, he, testId }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className="rs-num" data-testid={testId}>
        {value}
      </td>
      <td className="rs-meaning">{meaning}</td>
      <td className="rs-how">
        <HowButton k={k} ctx={ctx} he={he} label={label} />
      </td>
    </tr>
  );
}

function Group({ title, children }) {
  return (
    <section className="rs-group">
      <h3>{title}</h3>
      <table className="rs-table">
        <tbody>{children}</tbody>
      </table>
    </section>
  );
}

/** The four life cycles: ages, pinnacle, challenge, hidden pinnacle and hidden challenge; the current one marked. */
function Cycles({ r, ctx, he }) {
  const names = CYCLE_NAMES[he ? "he" : "en"];
  const heads = [
    ["pk", he ? "פסגה" : "Pinnacle"],
    ["ch", he ? "אתגר" : "Challenge"],
    ["hp", he ? "פסגה נסתרת" : "Hidden pinnacle"],
    ["hc", he ? "אתגר נסתר" : "Hidden challenge"],
  ];
  return (
    <section className="rs-group rs-wide">
      <h3>{he ? "מחזורי חיים" : "Life cycles"}</h3>
      <div className="rs-scroll">
        <table className="rs-table rs-cycles">
          <thead>
            <tr>
              <th scope="col">
                {he ? "מחזור וגילים" : "Cycle and ages"}
                <HowButton k="exit" ctx={ctx} he={he} />
              </th>
              {heads.map(([k, label]) => (
                <th key={k} scope="col">
                  {label}
                  <HowButton k={k} ctx={ctx} he={he} label={label} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {names.map((name, i) => {
              const now = cycleAt(r.age, r.exit) === i;
              return (
                <tr key={name} className={now ? "rs-now" : undefined} aria-current={now ? "true" : undefined}>
                  <th scope="row">
                    {name} <span className="rs-ages">{agesText(cycleSpans(r.exit)[i])}</span>
                    {now && <span className="rs-badge">{he ? "עכשיו" : "Now"}</span>}
                  </th>
                  {[r.pk[i], r.ch[i], r.hp[i], r.hc[i]].map((v, j) => (
                    <td key={j} className="rs-num" data-testid={`rs-${heads[j][0]}-${i}`}>
                      {v}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Maturity, the birthday number, and the numbers the name's letters carry most and never (added 2026-10). */
function NameStructure({ r, name, ctx, he, title, none }) {
  const mat = maturity(r.d, r.m, r.y, name);
  const bday = birthdayNumber(r.d);
  const list = (ns) => (ns.length ? ns.join(" · ") : none);
  return (
    <Group title={he ? "הבגרות ומבנה השם" : "Maturity and the name's make-up"}>
      <Row k="mat" label={he ? "מספר הבגרות" : "Maturity"} value={mat} meaning={title(mat)} ctx={ctx} he={he} testId="rs-mat" />
      <Row k="bday" label={he ? "מספר יום הלידה" : "Birthday number"} value={bday} meaning={title(bday)} ctx={ctx} he={he} testId="rs-bday" />
      <Row k="dom" label={he ? "דומיננטיים בשם" : "Dominant in the name"} value={list(dominantNumbers(name))} ctx={ctx} he={he} testId="rs-dom" />
      <Row k="miss" label={he ? "חסרים בשם" : "Missing in the name"} value={list(missingNumbers(name))} ctx={ctx} he={he} testId="rs-name-miss" />
    </Group>
  );
}

/**
 * @param {{ r: object, name: string, now: Date, add?: boolean, he: boolean }} props
 *   `r` is a full map (engine fullCalc), made for `name` on `now`; `add` is the +1 a saved reading recorded
 */
export default function ReadingSummary({ r, name, now, add, he }) {
  const content = useContent();
  const titleId = useId();
  const ctx = { d: r.d, m: r.m, y: r.y, name, now, add };
  const title = (n) => numberTitle(content, n, he);
  const year = content.YEAR_ENERGY?.[r.py];
  const none = he ? "אין" : "None";
  const planes = r.ls.planes.map((p) => (PLANES[p] || [p, p])[he ? 0 : 1]);
  // the name numbers count Hebrew letters only: a name typed in Latin letters makes them 0
  const hebrewName = [...String(name ?? "")].some((ch) => LV[ch]);
  return (
    <section className="rs" aria-labelledby={titleId} dir={he ? "rtl" : "ltr"}>
      <header className="rs-head">
        <h2 id={titleId}>{he ? "סיכום המפה" : "Map summary"}</h2>
        <p>
          {name} · <bdi>{`${pad2(r.d)}.${pad2(r.m)}.${r.y}`}</bdi> · {he ? `גיל ${r.age}` : `Age ${r.age}`}
        </p>
      </header>
      {!hebrewName && (
        <p className="rs-note" role="note">
          {he
            ? "בשם אין אותיות עבריות, ולכן ערך השם, קול הנשמה והביטוי יוצאים 0: הם נספרים לפי ערכי האותיות העבריות. כדאי לכתוב את השם בעברית."
            : "The name has no Hebrew letters, so the name number, soul and expression come out 0: they count Hebrew letter values. Write the name in Hebrew."}
        </p>
      )}
      <div className="rs-grid">
        <Group title={he ? "המספרים המרכזיים" : "Core numbers"}>
          <Row k="lp" label={he ? "שביל הגורל" : "Life path"} value={r.lp} meaning={title(r.lp)} ctx={ctx} he={he} testId="rs-lp" />
          <Row k="nv" label={he ? "ערך השם" : "Name number"} value={r.nv} meaning={title(r.nv)} ctx={ctx} he={he} testId="rs-nv" />
          <Row k="su" label={he ? "קול הנשמה" : "Soul"} value={r.su} meaning={title(r.su)} ctx={ctx} he={he} testId="rs-su" />
          <Row k="ex" label={he ? "ביטוי" : "Expression"} value={r.ex} meaning={title(r.ex)} ctx={ctx} he={he} testId="rs-ex" />
        </Group>
        <Group title={he ? "התקופה עכשיו" : "This season"}>
          <Row k="py" label={he ? "שנה אישית" : "Personal year"} value={r.py} meaning={firstSentence(year?.[he ? "he" : "en"])} ctx={ctx} he={he} testId="rs-py" />
          <Row k="pm" label={he ? "חודש אישי" : "Personal month"} value={r.pm} ctx={ctx} he={he} testId="rs-pm" />
          <Row k="pd" label={he ? "יום אישי" : "Personal day"} value={r.pd} ctx={ctx} he={he} testId="rs-pd" />
          <Row k="hy" label={he ? "שנה נסתרת" : "Hidden year"} value={r.hy} ctx={ctx} he={he} testId="rs-hy" />
          <Row k="age" label={he ? "גיל" : "Age"} value={r.age} ctx={ctx} he={he} testId="rs-age" />
        </Group>
        <Cycles r={r} ctx={ctx} he={he} />
        <Group title={he ? "קארמה ולו שו" : "Karma and Lo Shu"}>
          <Row k="kd" label={he ? "חובות קארמתיים" : "Karmic debts"} value={r.kd.length ? r.kd.join(" · ") : none} ctx={ctx} he={he} testId="rs-kd" />
          <Row k="ls" label={he ? "חסרים בלו שו" : "Missing in Lo Shu"} value={r.ls.miss.length ? r.ls.miss.join(" · ") : none} ctx={ctx} he={he} testId="rs-miss" />
          {planes.length > 0 && (
            <tr>
              <th scope="row">{he ? "שורות שלמות" : "Complete rows"}</th>
              <td className="rs-meaning" colSpan={3}>
                {planes.join(", ")}
              </td>
            </tr>
          )}
        </Group>
        <NameStructure r={r} name={name} ctx={ctx} he={he} title={title} none={none} />
      </div>
    </section>
  );
}
