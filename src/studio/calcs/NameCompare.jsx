/**
 * Name comparison: two or three spellings of a name side by side (the current name, a proposed one,
 * a second name), with every number they make and where they differ from the first. Name changes
 * are a large part of Israeli practice (the competitor survey of 2026-10-11).
 */
import { useId, useState } from "react";
import { NV, SU, EX, LPm, maturity, dominantNumbers, missingNumbers } from "../../engine/index.js";
import { parseBirthDate } from "../../workspace/format.js";
import HowButton from "../../reading/HowButton.jsx";
import "./calcs.css";

const list = (ns, he) => (ns.length ? ns.join(" · ") : he ? "אין" : "None");

/** @param {{ he: boolean, numberTitle: (n: number) => string }} props */
export default function NameCompare({ he, numberTitle }) {
  const [names, setNames] = useState(["", "", ""]);
  const [dob, setDob] = useState("");
  const ids = [useId(), useId(), useId()];
  const dobId = useId();
  const born = parseBirthDate(dob);
  const filled = names.map((n) => n.trim()).filter(Boolean);
  const labels = he ? ["השם הנוכחי", "שם מוצע", "שם נוסף"] : ["Current name", "Proposed name", "Another name"];

  const rows = [
    { k: "nv", l: he ? "ערך השם" : "Name number", v: (n) => NV(n), titled: true },
    { k: "su", l: he ? "קול הנשמה" : "Soul", v: (n) => SU(n), titled: true },
    { k: "ex", l: he ? "ביטוי" : "Expression", v: (n) => EX(n), titled: true },
    ...(born ? [{ k: "mat", l: he ? "מספר הבגרות" : "Maturity", v: (n) => maturity(born.d, born.m, born.y, n), titled: true }] : []),
    { k: "dom", l: he ? "דומיננטיים בשם" : "Dominant in the name", v: (n) => list(dominantNumbers(n), he) },
    { k: "miss", l: he ? "חסרים בשם" : "Missing in the name", v: (n) => list(missingNumbers(n), he) },
  ];

  const setName = (i) => (e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)));

  return (
    <div className="gc calc-card" dir={he ? "rtl" : "ltr"}>
      <div className="calc-grid">
        {labels.map((label, i) => (
          <div key={label}>
            <label className="calc-label" htmlFor={ids[i]}>
              {label}
            </label>
            <input id={ids[i]} className="gi" value={names[i]} onChange={setName(i)} dir="rtl" />
          </div>
        ))}
        <div>
          <label className="calc-label" htmlFor={dobId}>
            {he ? "תאריך לידה (לא חובה)" : "Date of birth (optional)"}
          </label>
          <input id={dobId} className="gi" value={dob} onChange={(e) => setDob(e.target.value)} dir="ltr" placeholder="dd.mm.yyyy" />
        </div>
      </div>
      {born && (
        <p className="calc-note">
          {he ? `שביל הגורל: ${LPm(born.d, born.m, born.y)}. מספר הבגרות משלב אותו עם כל שם.` : `Life path: ${LPm(born.d, born.m, born.y)}. Maturity joins it with each name.`}
        </p>
      )}
      {filled.length >= 1 && (
        <div className="calc-scroll">
          <table className="calc-table">
            <thead>
              <tr>
                <th scope="col" />
                {filled.map((n, i) => (
                  <th key={`${n}-${i}`} scope="col">
                    {n}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const first = row.v(filled[0]);
                return (
                  <tr key={row.k}>
                    <th scope="row">{row.l}</th>
                    {filled.map((n, i) => {
                      const value = row.v(n);
                      const differs = i > 0 && value !== first;
                      const ctx = born ? { name: n, d: born.d, m: born.m, y: born.y } : { name: n };
                      return (
                        <td key={`${n}-${i}`} className={differs ? "calc-differs" : undefined} data-testid={`compare-${row.k}-${i}`}>
                          <span className="calc-value">{value}</span>
                          <HowButton k={row.k} ctx={ctx} he={he} label={`${row.l}: ${n}`} />
                          {row.titled && numberTitle(value) && <span className="calc-title">{numberTitle(value)}</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filled.length > 1 && <p className="calc-note">{he ? "מסומן: מה שונה מהשם הראשון." : "Marked: what differs from the first name."}</p>}
        </div>
      )}
    </div>
  );
}
