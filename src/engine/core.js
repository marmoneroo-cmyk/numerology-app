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
export const ENGINE_VERSION = "1.0.0";

/** Hebrew letter values, final forms included. Any other character counts 0. */
export const LV = {
  "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9,
  "י": 1, "כ": 2, "ך": 2, "ל": 3, "מ": 4, "ם": 4, "נ": 5, "ן": 5, "ס": 6,
  "ע": 7, "פ": 8, "ף": 8, "צ": 9, "ץ": 9, "ק": 1, "ר": 2, "ש": 3, "ת": 4,
};

/** The letters that make the soul number. */
export const VOW = new Set(["א", "ו", "י", "ע"]);

const isMaster = (n) => n === 11 || n === 22 || n === 33;
const digitSum = (n) => [...String(Math.abs(n))].reduce((a, d) => a + +d, 0);
const sumChars = (s) => [...s].reduce((a, c) => a + +c, 0);
const pad2 = (n) => String(n).padStart(2, "0");
/** The date as the method sums it: zero-padded day and month, then the year. */
const dateDigits = (d, m, y) => `${pad2(d)}${pad2(m)}${y}`;
const letterSum = (s, keep = () => true) => [...s].filter(keep).reduce((a, c) => a + (LV[c] || 0), 0);

/** Reduce to a single digit. 0 stays 0; a negative single digit is returned as is. */
export function R(n) {
  if (n === 0) return 0;
  while (n >= 10 || n <= -10) n = digitSum(n);
  return n;
}

/** Reduce to a single digit, but stop at the master numbers 11, 22 and 33. */
export function Rm(n) {
  if (isMaster(n)) return n;
  let x = Math.abs(n);
  while (x >= 10) {
    x = digitSum(x);
    if (isMaster(x)) return x;
  }
  return x;
}

/** Name number: every letter of the name. */
export const NV = (s) => Rm(letterSum(s));

/** Soul number: the vowels א ו י ע. */
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

/** Personal year for calendar year `yr`; `add` is the "+1" toggle that moves it on a year. */
export function PY(d, m, yr, add) {
  const p = R(sumChars(dateDigits(d, m, yr)));
  return add ? R(p + 1) : p;
}

/** Personal month: birth day and month plus the calendar month of `now`. */
export const PM = (d, m, now = new Date()) => R(sumChars(`${pad2(d)}${pad2(m)}${now.getMonth() + 1}`));

/** Personal day: birth day and month plus the full date of `now`. */
export const PD = (d, m, now = new Date()) =>
  R(sumChars(`${pad2(d)}${pad2(m)}${now.getDate()}${now.getMonth() + 1}${now.getFullYear()}`));

/** Challenge between two numbers: their reduced difference, 0 when equal. */
export const CH = (a, b) => (a === b ? 0 : R(Math.abs(a - b)));

const KARMIC = [13, 14, 16, 19];

/** Karmic debts 13/14/16/19 found in the raw date sum, the raw name sum, or the birth day. */
export function karmicDebt(d, m, y, nm) {
  const dateSum = sumChars(`${d}${m}${y}`);
  const nameSum = letterSum(nm);
  const found = KARMIC.filter((k) => dateSum === k || nameSum === k);
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

/** The psychological map: six traits on 0-10, with a deterministic floor of 2-4. */
function psychMap({ nv, lp, su, ex, py, d, m, y }) {
  const psych = {
    leadership: Math.min(10, (nv === 1 || nv === 8 ? 3 : 0) + (lp === 1 || lp === 8 ? 3 : 0) + (su === 1 ? 2 : 0) + (ex === 8 ? 2 : 0)),
    intuition: Math.min(10, (nv === 2 || nv === 7 ? 3 : 0) + (lp === 2 || lp === 7 ? 3 : 0) + (su === 7 ? 2 : 0) + (su === 2 ? 2 : 0)),
    creativity: Math.min(10, (nv === 3 || nv === 5 ? 3 : 0) + (lp === 3 || lp === 5 ? 3 : 0) + (su === 3 ? 2 : 0) + (ex === 5 ? 2 : 0)),
    stability: Math.min(10, (nv === 4 || nv === 6 ? 3 : 0) + (lp === 4 || lp === 6 ? 3 : 0) + (su === 6 ? 2 : 0) + (ex === 4 ? 2 : 0)),
    ambition: Math.min(10, (nv === 8 || nv === 1 ? 3 : 0) + (lp === 8 ? 3 : 0) + (py === 8 || py === 1 ? 2 : 0) + (ex === 8 ? 2 : 0)),
    wisdom: Math.min(10, (nv === 7 || nv === 9 ? 3 : 0) + (lp === 7 || lp === 9 ? 3 : 0) + (su === 9 ? 2 : 0) + (su === 7 ? 2 : 0)),
  };
  const seed = Math.abs(nv * 7 + lp * 13 + su * 17 + ex * 19 + py * 23 + d * 3 + m * 5 + y);
  Object.keys(psych).forEach((k, i) => {
    if (psych[k] < 2) psych[k] = 2 + ((seed + i * 37) % 3);
  });
  return psych;
}

/**
 * The full numerological map of a person.
 * @param {number} d birth day
 * @param {number} m birth month
 * @param {number} y birth year
 * @param {string} nm full name (Hebrew letters carry the values)
 * @param {boolean} add the "+1" personal-year toggle
 * @param {Date} [now] the date the reading is made for
 */
export function fullCalc(d, m, y, nm, add, now = new Date()) {
  const nv = NV(nm), lp = LPm(d, m, y), age = CA(d, m, y, now), cy = now.getFullYear();
  const py = PY(d, m, cy, add), hy = R(lp + age), su = SU(nm), ex = EX(nm);
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
  const proj = [];
  for (let i = -2; i <= 10; i++) {
    const yr = cy + i;
    proj.push({ year: yr, py: PY(d, m, yr, add), isCurrent: yr === cy });
  }

  const reduced = { nv: R(nv), lp: R(lp), su: R(su), ex: R(ex) };
  const psych = psychMap({ ...reduced, py, d, m, y });
  return { nv, lp, age, py, hy, su, ex, pm, pd, pk, ch, hp, hc, exit: 27 - reduced.lp, kd, ls, proj, psych, d, m, y };
}

/** The live calculator: Hebrew by letter value, Latin A-Z Pythagorean, anything else ignored. */
export function liveNum(s) {
  let sum = 0;
  for (const ch of s) {
    if (LV[ch]) sum += LV[ch];
    else {
      const u = ch.toUpperCase();
      if (u >= "A" && u <= "Z") sum += ((u.charCodeAt(0) - 65) % 9) + 1;
    }
  }
  return sum ? R(sum) : 0;
}
