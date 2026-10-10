/**
 * Practical numbers: the number of a phone, an address, a car, a bank account or a business name,
 * worked out as it is typed, with how it was calculated. Clients ask for these often (the
 * competitor survey of 2026-10-11).
 */
import { useId, useState } from "react";
import { textNumber } from "../../engine/index.js";
import HowButton from "../../reading/HowButton.jsx";
import "./calcs.css";

const KINDS = [
  { k: "phone", he: "טלפון", en: "Phone", field: ["מספר הטלפון", "Phone number"], hint: "050-1234567" },
  { k: "address", he: "כתובת", en: "Address", field: ["הכתובת", "Address"], hint: "הרצל 12" },
  { k: "car", he: "רכב", en: "Car", field: ["מספר הרכב", "Car plate"], hint: "12-345-67" },
  { k: "account", he: "חשבון בנק", en: "Bank account", field: ["מספר החשבון", "Account number"], hint: "12-345-678901" },
  { k: "business", he: "שם עסק", en: "Business name", field: ["שם העסק", "Business name"], hint: "סטודיו אור" },
];

/** @param {{ he: boolean, numberTitle: (n: number) => string }} props */
export default function PracticalNumbers({ he, numberTitle }) {
  const [kind, setKind] = useState("phone");
  const [text, setText] = useState("");
  const inputId = useId();
  const current = KINDS.find((x) => x.k === kind);
  const value = textNumber(text);
  return (
    <div className="gc calc-card" dir={he ? "rtl" : "ltr"}>
      <div className="calc-chips" role="group" aria-label={he ? "מה בודקים" : "What to check"}>
        {KINDS.map((x) => (
          <button key={x.k} type="button" className="calc-chip" aria-pressed={kind === x.k} onClick={() => setKind(x.k)}>
            {he ? x.he : x.en}
          </button>
        ))}
      </div>
      <label className="calc-label" htmlFor={inputId}>
        {current.field[he ? 0 : 1]}
      </label>
      <input id={inputId} className="gi" value={text} placeholder={current.hint} onChange={(e) => setText(e.target.value)} dir="auto" />
      <p className="calc-note">{he ? "כל ספרה נספרת כמו שהיא, אות עברית לפי ערכה ואות לועזית לפי מקומה. רווחים ומקפים לא נספרים." : "Each digit counts as it is, a Hebrew letter by value, a Latin one by position. Spaces and dashes do not count."}</p>
      {value > 0 && (
        <div className="calc-result" aria-live="polite">
          <span className="calc-big" data-testid="practical-number">
            {value}
          </span>
          <HowButton k="text" ctx={{ text }} he={he} label={he ? current.he : current.en} />
          {numberTitle(value) && <span className="calc-title">{numberTitle(value)}</span>}
        </div>
      )}
    </div>
  );
}
