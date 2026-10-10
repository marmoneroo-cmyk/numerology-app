/**
 * Numbers the Studio added in 2026-10 from common practice (Decoz, and the Israeli schools' "dominant
 * and missing in the name"): the name's dominant and missing numbers, maturity, the birthday number,
 * and the number of any text (a phone, an address, a car, an account, a business name).
 * They are not part of fullCalc, so saved maps and the legacy oracles keep their exact shape.
 */
import { LV, Rm, LPm, NV } from "./core.js";

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** How many letters of the name carry each value 1-9 (Hebrew letters; anything else is not counted). */
export function nameCounts(nm) {
  const counts = Object.fromEntries(DIGITS.map((n) => [n, 0]));
  for (const ch of String(nm ?? "")) if (LV[ch]) counts[LV[ch]] += 1;
  return counts;
}

/** The values that appear most among the name's letters, ties kept; none for a name with no Hebrew letters. */
export function dominantNumbers(nm) {
  const counts = nameCounts(nm);
  const most = Math.max(...Object.values(counts));
  return most ? DIGITS.filter((n) => counts[n] === most) : [];
}

/** The values 1-9 that no letter of the name carries; none for a name with no Hebrew letters. */
export function missingNumbers(nm) {
  const counts = nameCounts(nm);
  return Object.values(counts).some(Boolean) ? DIGITS.filter((n) => counts[n] === 0) : [];
}

/** Maturity: the life path plus the name number, reduced, masters kept. */
export const maturity = (d, m, y, nm) => Rm(LPm(d, m, y) + NV(nm));

/** The birthday number: the day of birth reduced, masters kept (29 -> 11). */
export const birthdayNumber = (d) => Rm(d);

/** Each character's value in a practical number: a digit as it is, a Hebrew letter by value, a Latin one by position. */
export function charValue(ch) {
  if (ch >= "0" && ch <= "9") return Number(ch);
  if (LV[ch]) return LV[ch];
  const u = ch.toUpperCase();
  return u >= "A" && u <= "Z" ? ((u.charCodeAt(0) - 65) % 9) + 1 : 0;
}

/** A practical number (phone, address, car, account, business name): every digit and letter, reduced, masters kept. */
export function textNumber(text) {
  const sum = [...String(text ?? "")].reduce((a, ch) => a + charValue(ch), 0);
  return sum ? Rm(sum) : 0;
}
