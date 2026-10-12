/**
 * The numerology engine: every calculation the app makes, as pure functions.
 *
 * No React, no DOM, no storage. Anything that depends on "today" takes it as an
 * explicit `now` argument (defaulting to the current date), so a result can be
 * reproduced exactly and a saved reading can record the date it was made for.
 *
 * The arithmetic is a faithful port of App.jsx v7; equivalence.test.js runs it
 * side by side with a verbatim copy of the original over every date 1900-2030.
 * The short names (R, NV, LPm ...) are kept because the UI calls them everywhere.
 */

/** Bump whenever any result can change, so a saved reading knows which rules made it. */
// 1.1.0: the +1 follows the date (July 1 - December 31) when a reading does not choose it
// 1.2.0: a studio match of a parent and child scores as the parent-and-child reading
// 2.0.0: the owner's answers to the calculation audit (2026-10-11): the soul counts ה, the personal month is
//        the personal year plus the month (the day adds the day), karmic debts count every reduction step
// 2.1.0: the owner's decisions on the review (2026-10-11, temporary defaults): the psychological map shows 0
//        for a trait no number gives points to (no more filler), the live calculator keeps the master numbers,
//        and a couple scores the same everywhere (the studio's love match; see compat.js)
// 2.2.0: the owner's answers of 2026-10-12: compatibility compares the name, soul and expression in one digit
//        too (their originals come back beside them), and the Hebrew recommendations speak of the numbers,
//        not to the reader in the singular (same rules)
// 3.0.0: no +1 (the owner, 2026-10-12): the personal year is the birth day and month with the current year all
//        year round, and so are the personal month and day and the years table built on it; saved readings
//        that had it are shown without it (saved.js)
export const ENGINE_VERSION = "3.0.0";

/** Hebrew letter values, final forms included. Any other character counts 0. Frozen: shared by every reading. */
export const LV = Object.freeze({
  "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9,
  "י": 1, "כ": 2, "ך": 2, "ל": 3, "מ": 4, "ם": 4, "נ": 5, "ן": 5, "ס": 6,
  "ע": 7, "פ": 8, "ף": 8, "צ": 9, "ץ": 9, "ק": 1, "ר": 2, "ש": 3, "ת": 4,
});

/** The letters that make the soul number: א ה ו י ע (ה since 2026-10-11, the owner). Treat as read-only. */
export const VOW = new Set(["א", "ה", "ו", "י", "ע"]);

/** The master numbers, kept whole where the method keeps them. The one list every screen uses. */
export const MASTER_NUMBERS = Object.freeze([11, 22, 33]);
export const isMaster = (n) => MASTER_NUMBERS.includes(n);
const digitSum = (n) => [...String(Math.abs(n))].reduce((a, d) => a + +d, 0);
const sumChars = (s) => [...s].reduce((a, c) => a + +c, 0);
const pad2 = (n) => String(n).padStart(2, "0");
/** The date as the method sums it: zero-padded day and month, then the year. */
const dateDigits = (d, m, y) => `${pad2(d)}${pad2(m)}${y}`;
const letterSum = (s, keep = () => true) => [...s].filter(keep).reduce((a, c) => a + (LV[c] || 0), 0);

/**
 * The one reduction every number goes through: add the digits until one is left (38 → 11 → 2). With
 * `keepMasters` it stops at 11, 22 or 33, as the sum itself or at any step on the way (38 → 11). Which
 * numbers keep their masters is the method's choice, made where each number is calculated:
 * the name, soul, expression, life path, maturity and birthday keep them; the personal year, month and day,
 * the hidden year, the pinnacles, challenges and their hidden ones, Lo Shu and the universal day do not.
 * 0 stays 0. Without `keepMasters` a negative single digit is returned as is (the shipped R's behaviour).
 */
export function reduce(n, { keepMasters = false } = {}) {
  if (n === 0) return 0; // and -0, which the shipped R also gave as 0
  if (keepMasters && isMaster(n)) return n;
  let x = keepMasters ? Math.abs(n) : n;
  while (x >= 10 || x <= -10) {
    x = digitSum(x);
    if (keepMasters && isMaster(x)) return x;
  }
  return x;
}

/** Reduce to a single digit. 0 stays 0; a negative single digit is returned as is. */
export const R = (n) => reduce(n);

/** Reduce to a single digit, but stop at the master numbers 11, 22 and 33. */
export const Rm = (n) => reduce(n, { keepMasters: true });

/** Name number: every letter of the name. */
export const NV = (s) => Rm(letterSum(s));

/** Soul number: the vowels א ה ו י ע. */
export const SU = (s) => Rm(letterSum(s, (c) => VOW.has(c)));

/** Consonant number: the letters that are not vowels. */
export const EX = (s) => Rm(letterSum(s, (c) => !VOW.has(c) && LV[c]));

/** Life path reduced to one digit (the form Lo Shu uses). */
export const LP = (d, m, y) => R(sumChars(dateDigits(d, m, y)));

/** Life path that keeps master numbers - the one readings show. */
export const LPm = (d, m, y) => Rm(sumChars(dateDigits(d, m, y)));

/** Age in whole years on `now`; the birthday itself counts. */
export function CA(d, m, y, now = new Date()) {
  let age = now.getFullYear() - y;
  const month = now.getMonth() + 1;
  if (month < m || (month === m && now.getDate() < d)) age--;
  return age;
}

/**
 * Personal year for calendar year `yr`: the birth day and month with that year, reduced. No +1 (the owner,
 * 2026-10-12): it changes on January 1.
 */
export const PY = (d, m, yr) => R(sumChars(dateDigits(d, m, yr)));

/** The personal year on a date: that of its calendar year. */
export const personalYearOn = (d, m, now = new Date()) => PY(d, m, now.getFullYear());

/** Personal years from two years before `now`'s year to ten after it. */
export function yearCycle(d, m, now = new Date()) {
  const cy = now.getFullYear();
  const proj = [];
  for (let i = -2; i <= 10; i++) {
    const yr = cy + i;
    proj.push({ year: yr, py: PY(d, m, yr), isCurrent: yr === cy });
  }
  return proj;
}

/**
 * Personal month: the personal year on `now` plus its calendar month (the owner, 2026-10-11; before, the
 * birth day and month plus the month, without the year).
 */
export const PM = (d, m, now = new Date()) => R(personalYearOn(d, m, now) + now.getMonth() + 1);

/** Personal day: the personal month plus the day of the month of `now`. */
export const PD = (d, m, now = new Date()) => R(PM(d, m, now) + now.getDate());

/** Challenge between two numbers: their reduced difference, 0 when equal. */
export const CH = (a, b) => (a === b ? 0 : R(Math.abs(a - b)));

/** The meaning a master number borrows: 11 -> 2, 22 -> 4, 33 -> 6. Single digits stay. */
export const masterBase = (n) => (n > 9 ? sumChars(String(n)) : n);

/**
 * The number of the day of the month, for the daily ritual on the "יומי" screen: the day mod 9, 9 instead
 * of 0. The same for everyone, and not the universal day (below) nor anyone's personal day (PD).
 */
export const dailyRitualNumber = (now = new Date()) => now.getDate() % 9 || 9;

/**
 * The universal day, on the "היום" screen (the owner, 2026-10-11): every digit of the date, reduced to one
 * digit (11.10.2026: 1+1+1+0+2+0+2+6 = 13 → 4). A sum of 11 or 22 is reduced too, until the owner says
 * otherwise.
 */
export const universalDay = (now = new Date()) => R(sumChars(dateDigits(now.getDate(), now.getMonth() + 1, now.getFullYear())));

const KARMIC = [13, 14, 16, 19];

/** A sum and every step of its reduction: 49 -> [49, 13, 4]. */
export function reductionChain(n) {
  const steps = [n];
  for (let x = n; x >= 10; ) steps.push((x = digitSum(x)));
  return steps;
}

/**
 * Karmic debts: 13, 14, 16 or 19 anywhere on the way down of the date's sum, the name's, the soul's or the
 * consonants' (the owner, 2026-10-11; before, only the raw date and name sums), or the birth day itself.
 * In the order 13, 14, 16, 19, then the birth day's.
 */
export function karmicDebt(d, m, y, nm) {
  const sums = [sumChars(`${d}${m}${y}`), letterSum(nm), letterSum(nm, (c) => VOW.has(c)), letterSum(nm, (c) => !VOW.has(c))];
  const found = KARMIC.filter((k) => sums.some((s) => reductionChain(s).includes(k)));
  if (KARMIC.includes(d)) found.push(d);
  return [...new Set(found)];
}

/** Lo Shu grid: counts of 1-9 in the date digits plus the life path and the reduced day. */
export function loShu(d, m, y) {
  const digits = [...`${d}${m}${y}`].filter((c) => c !== "0").map(Number);
  const g = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  for (const n of [...digits, LP(d, m, y), R(d)]) if (n >= 1 && n <= 9) g[n]++;
  const miss = Object.entries(g).filter(([, v]) => v === 0).map(([k]) => +k);
  const planes = [];
  if (g[4] && g[9] && g[2]) planes.push("mind");
  if (g[3] && g[5] && g[7]) planes.push("emotional");
  if (g[8] && g[1] && g[6]) planes.push("practical");
  return { g, miss, planes };
}

/**
 * The four life cycles (pinnacles) by age, from a map's `exit` (27 minus the life path in one digit):
 * the first from birth until `exit` + 9 (36 minus the life path), the next two 9 years each, the last
 * from then on (`to` null).
 * @returns {{from: number, to: number | null}[]}
 */
export function cycleSpans(exit) {
  return [0, 1, 2, 3].map((i) => ({ from: i === 0 ? 0 : exit + 9 * i, to: i === 3 ? null : exit + 9 * (i + 1) }));
}

/** The life cycle (0-3) a person of `age` is in; -1 only for a negative age. */
export const cycleAt = (age, exit) => cycleSpans(exit).findIndex(({ from, to }) => age >= from && (to === null || age < to));

/**
 * The psychological map: six traits on 0-10, from points the numbers (in one digit) give. A trait no number
 * gives points to shows 0 (the owner, 2026-10-11; it used to get a filler of 2-4 that came from no number).
 */
export function psychMap({ nv, lp, su, ex, py }) {
  return {
    leadership: Math.min(10, (nv === 1 || nv === 8 ? 3 : 0) + (lp === 1 || lp === 8 ? 3 : 0) + (su === 1 ? 2 : 0) + (ex === 8 ? 2 : 0)),
    intuition: Math.min(10, (nv === 2 || nv === 7 ? 3 : 0) + (lp === 2 || lp === 7 ? 3 : 0) + (su === 7 ? 2 : 0) + (su === 2 ? 2 : 0)),
    creativity: Math.min(10, (nv === 3 || nv === 5 ? 3 : 0) + (lp === 3 || lp === 5 ? 3 : 0) + (su === 3 ? 2 : 0) + (ex === 5 ? 2 : 0)),
    stability: Math.min(10, (nv === 4 || nv === 6 ? 3 : 0) + (lp === 4 || lp === 6 ? 3 : 0) + (su === 6 ? 2 : 0) + (ex === 4 ? 2 : 0)),
    ambition: Math.min(10, (nv === 8 || nv === 1 ? 3 : 0) + (lp === 8 ? 3 : 0) + (py === 8 || py === 1 ? 2 : 0) + (ex === 8 ? 2 : 0)),
    wisdom: Math.min(10, (nv === 7 || nv === 9 ? 3 : 0) + (lp === 7 || lp === 9 ? 3 : 0) + (su === 9 ? 2 : 0) + (su === 7 ? 2 : 0)),
  };
}

/**
 * The full numerological map of a person.
 * @param {number} d birth day
 * @param {number} m birth month
 * @param {number} y birth year
 * @param {string} nm full name (Hebrew letters carry the values)
 * @param {Date} [now] the date the reading is made for (must be a Date)
 * @returns {{nv:number, lp:number, age:number, py:number, hy:number, su:number, ex:number, pm:number, pd:number,
 *   pk:number[], ch:number[], hp:number[], hc:number[], exit:number, kd:number[],
 *   ls:{g:Object<number,number>, miss:number[], planes:string[]},
 *   proj:{year:number, py:number, isCurrent:boolean}[], psych:Object<string,number>, d:number, m:number, y:number}}
 *   name, life path (masters kept), age, personal/hidden year, soul, consonants, personal month/day,
 *   pinnacles, challenges, hidden pinnacles/challenges, `exit` (27 minus the life path in one digit:
 *   the first cycle ends 9 years later, see cycleSpans), karmic debts, Lo Shu, the personal-year
 *   cycle, the psychological map, and the birth date echoed back
 */
export function fullCalc(d, m, y, nm, now = new Date()) {
  const nv = NV(nm), lp = LPm(d, m, y), age = CA(d, m, y, now);
  const py = personalYearOn(d, m, now), hy = R(lp + age), su = SU(nm), ex = EX(nm);
  const pm = PM(d, m, now), pd = PD(d, m, now);

  const rd = R(d), rm = R(m), ry = R(y);
  const pk = [R(rd + rm), R(rd + ry), 0, R(rm + ry)];
  pk[2] = R(pk[0] + pk[1]);
  const ch = [CH(rd, rm), CH(rd, ry), 0, CH(rm, ry)];
  ch[2] = CH(ch[0], ch[1]);
  const hp = pk.map((v, i) => R(v + ch[i]));
  const hc = hp.map((v) => R(v + lp));

  const kd = karmicDebt(d, m, y, nm);
  const ls = loShu(d, m, y);
  const proj = yearCycle(d, m, now);

  const reduced = { nv: R(nv), lp: R(lp), su: R(su), ex: R(ex) };
  const psych = psychMap({ ...reduced, py });
  return { nv, lp, age, py, hy, su, ex, pm, pd, pk, ch, hp, hc, exit: 27 - reduced.lp, kd, ls, proj, psych, d, m, y };
}

/**
 * The live calculator: Hebrew by letter value, Latin by position ((code - 65) % 9 + 1), master numbers
 * kept as the full reading keeps them (the owner, 2026-10-11: "Dana" is 11, not 2).
 * A character counts as Latin when its upper case falls between "A" and "Z" as a string,
 * so "ß" (upper case "SS") counts as S. Digits, spaces and everything else count 0.
 */
export function liveNum(s) {
  let sum = 0;
  for (const ch of s) {
    if (LV[ch]) sum += LV[ch];
    else {
      const u = ch.toUpperCase();
      if (u >= "A" && u <= "Z") sum += ((u.charCodeAt(0) - 65) % 9) + 1;
    }
  }
  return sum ? Rm(sum) : 0;
}
