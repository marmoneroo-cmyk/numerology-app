/**
 * The method's +1 on the personal year. It used to be a checkbox; now the date decides it
 * (engine/core.js addsOne), and this note says so wherever the checkbox was.
 */
import { addsOne } from "../engine/index.js";
import { fs } from "./type.js";

/** The note's words: whether the 1 was added on `now`, and the rule. */
export function plusOneNote(he, now = new Date()) {
  if (addsOne(now)) {
    return he
      ? "נוסף 1 לשנה האישית: מה-1.7 ועד ה-31.12 מוסיפים 1, אוטומטית."
      : "1 was added to the personal year: from July 1 to December 31 it is added automatically.";
  }
  return he
    ? "מה-1.7 ועד ה-31.12 מוסיפים 1 לשנה האישית, אוטומטית."
    : "From July 1 to December 31, 1 is added to the personal year automatically.";
}

export default function PlusOneNote({ he, now, color, style }) {
  return (
    <p role="note" style={{ margin: 0, fontSize: fs(11.5), lineHeight: 1.5, color, ...style }}>
      {plusOneNote(he, now)}
    </p>
  );
}
