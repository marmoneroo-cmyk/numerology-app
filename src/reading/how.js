/**
 * "How was this calculated?" for the numbers the Studio shows: each step in words, with its
 * arithmetic. Every explanation is rebuilt from the engine's own building blocks and ends in
 * `result`, which the tests compare with the engine's answer, so an explanation cannot drift
 * from the number beside it.
 */
import {
  LV, VOW, R, LP, LPm, NV, CA, addsOne, CH, cycleSpans, karmicDebt, reductionChain, loShu, dailyRitualNumber,
  nameCounts, dominantNumbers, missingNumbers, charValue,
} from "../engine/index.js";
import { agesText } from "./ages.js";

const MASTERS = [11, 22, 33];
const KARMIC = [13, 14, 16, 19];
const sum = (ns) => ns.reduce((a, b) => a + b, 0);
const digitsOf = (value) => [...String(value)].filter((c) => c >= "0" && c <= "9").map(Number);
const pad2 = (n) => String(n).padStart(2, "0");
/** "1+4+0+3 = 8"; a single number stays as it is. */
const addition = (ns) => (ns.length > 1 ? `${ns.join("+")} = ${sum(ns)}` : `${sum(ns)}`);
const step = (text, math = "") => ({ text, math });
const lettersOf = (name, keep) => [...String(name ?? "")].filter((ch) => LV[ch] && keep(ch));

/** The name of each number, as the Studio labels it. */
const TITLES = {
  nv: ["ערך השם", "Name number"],
  su: ["קול הנשמה", "Soul"],
  ex: ["ביטוי", "Expression"],
  lp: ["שביל הגורל", "Life path"],
  age: ["גיל", "Age"],
  py: ["שנה אישית", "Personal year"],
  pm: ["חודש אישי", "Personal month"],
  pd: ["יום אישי", "Personal day"],
  hy: ["שנה נסתרת", "Hidden year"],
  pk: ["פסגות", "Pinnacles"],
  ch: ["אתגרים", "Challenges"],
  hp: ["פסגות נסתרות", "Hidden pinnacles"],
  hc: ["אתגרים נסתרים", "Hidden challenges"],
  exit: ["גילי המחזורים", "Cycle ages"],
  kd: ["חובות קארמיים", "Karmic debts"],
  ls: ["לו שו", "Lo Shu"],
  daily: ["המספר של היום", "Today's number"],
  mat: ["מספר הבגרות", "Maturity"],
  bday: ["מספר יום הלידה", "Birthday number"],
  dom: ["דומיננטיים בשם", "Dominant in the name"],
  miss: ["חסרים בשם", "Missing in the name"],
  text: ["המספר", "The number"],
};

/** The name of a number's explanation ("" for an unknown key). */
export const howTitle = (key, he) => (Object.hasOwn(TITLES, key) ? TITLES[key][he ? 0 : 1] : "");

/**
 * The steps from `n` down to one digit, e.g. 31 -> ["3+1 = 4"]. With `keepMasters` it stops at 11, 22
 * and 33, as the engine's Rm does; without, it goes on, as R does.
 * @returns {{ steps: string[], result: number, master: boolean }}
 */
export function reduction(n, keepMasters = false) {
  const steps = [];
  let x = n;
  if (keepMasters && MASTERS.includes(x)) return { steps, result: x, master: true };
  while (x >= 10) {
    const ds = digitsOf(x);
    x = sum(ds);
    steps.push(addition(ds));
    if (keepMasters && MASTERS.includes(x)) return { steps, result: x, master: true };
  }
  return { steps, result: x, master: false };
}

/** The reduction as steps, with the master-number note when it stopped at one. */
function reduceSteps(n, keepMasters, he) {
  const red = reduction(n, keepMasters);
  const out = red.steps.map((m) => step(he ? "מצמצמים" : "Reduce", m));
  if (red.master) out.push(step(he ? `${red.result} הוא מספר מאסטר, ולכן נשאר כמו שהוא` : `${red.result} is a master number, so it stays`));
  return { steps: out, result: red.result };
}

/** Adds two numbers and reduces: "5+5 = 10 → 1". */
function addReduce(a, b) {
  const red = reduction(a + b);
  return { math: [`${a}+${b} = ${a + b}`, ...red.steps.map((s) => s.split(" = ")[1])].join(" → "), result: red.result };
}

/** The challenge between two numbers: their difference, 0 when they are equal. */
const diff = (a, b) => ({ math: `|${a}−${b}| = ${Math.abs(a - b)}`, result: CH(a, b) });

/** The soul's letters as the engine counts them: "א, ה, ו, י, ע". */
const VOWELS = [...VOW].join(", ");

const LETTER_KINDS = {
  nv: { keep: () => true, he: "ערך כל אות בשם", en: "The value of every letter" },
  su: { keep: (ch) => VOW.has(ch), he: `רק האותיות ${VOWELS}`, en: `Only the letters ${VOWELS}` },
  ex: { keep: (ch) => !VOW.has(ch), he: `כל האותיות חוץ מ-${VOWELS}`, en: `Every letter except ${VOWELS}` },
};

/** A name number: nv (every letter), su (the soul's letters, VOW) or ex (the other letters). */
function nameNumber(kind, name, he) {
  const k = LETTER_KINDS[kind];
  const which = he ? k.he : k.en;
  const letters = lettersOf(name, k.keep);
  const values = letters.map((ch) => LV[ch]);
  if (!letters.length) return { steps: [step(which), step(he ? "אין אותיות כאלה בשם, ולכן 0" : "The name has none, so 0", "0")], result: 0 };
  const reduced = reduceSteps(sum(values), true, he);
  return {
    steps: [step(which, letters.map((ch) => `${ch}=${LV[ch]}`).join(" ")), step(he ? "סוכמים" : "Add them up", addition(values)), ...reduced.steps],
    result: reduced.result,
  };
}

/** The life path: every digit of the date (dd.mm.yyyy), masters kept. */
function lifePath({ d, m, y }, he) {
  const date = `${pad2(d)}.${pad2(m)}.${y}`;
  const ds = digitsOf(date);
  const reduced = reduceSteps(sum(ds), true, he);
  return {
    steps: [step(he ? `סוכמים את כל ספרות תאריך הלידה ${date}` : `Add every digit of the birth date ${date}`, addition(ds)), ...reduced.steps],
    result: reduced.result,
  };
}

function age({ d, m, y, now }, he) {
  const years = now.getFullYear() - y;
  const result = CA(d, m, y, now);
  const steps = [step(he ? "השנה פחות שנת הלידה" : "This year minus the birth year", `${now.getFullYear()}−${y} = ${years}`)];
  if (result !== years) steps.push(step(he ? "יום ההולדת של השנה עוד לא הגיע, אז פחות 1" : "This year's birthday has not come yet, so minus 1", `${years}−1 = ${result}`));
  return { steps, result };
}

/**
 * The personal year of calendar year `year`; `plus` is the +1. `inSeason` says whether the date it was made for
 * falls between July 1 and December 31: a reading saved with a +1 outside them added it by hand.
 */
function personalYear({ d, m, year, plus, inSeason = true }, he) {
  const ds = digitsOf(`${pad2(d)}${pad2(m)}${year}`);
  const base = reduceSteps(sum(ds), false, he);
  const steps = [step(he ? `ספרות יום וחודש הלידה, ועוד ספרות השנה ${year}` : `The digits of the birth day and month, plus those of ${year}`, addition(ds)), ...base.steps];
  if (!plus) return { steps, result: base.result };
  const after = reduceSteps(base.result + 1, false, he);
  const why = inSeason
    ? (he ? "מה-1.7 ועד ה-31.12 מוסיפים 1" : "From July 1 to December 31, add 1")
    : (he ? "ה-1+ נוסף בבדיקה הזו" : "This reading added the +1");
  steps.push(step(why, `${base.result}+1 = ${base.result + 1}`), ...after.steps);
  return { steps, result: after.result };
}

/** The personal year on `now`, as a reading made then had it: its own +1 when it saved one, else the date's. */
const yearOf = ({ d, m, now, add }, he) => personalYear({ d, m, year: now.getFullYear(), plus: add ?? addsOne(now), inSeason: addsOne(now) }, he);

/** The personal month: the personal year, plus the month. */
function personalMonth(ctx, he) {
  const year = yearOf(ctx, he);
  const month = ctx.now.getMonth() + 1;
  const reduced = reduceSteps(year.result + month, false, he);
  return {
    steps: [...year.steps, step(he ? `השנה האישית ועוד החודש (${month})` : `The personal year plus the month (${month})`, `${year.result}+${month} = ${year.result + month}`), ...reduced.steps],
    result: reduced.result,
  };
}

/** The personal day: the personal month, plus the day of the month. */
function personalDay(ctx, he) {
  const monthly = personalMonth(ctx, he);
  const day = ctx.now.getDate();
  const reduced = reduceSteps(monthly.result + day, false, he);
  return {
    steps: [...monthly.steps, step(he ? `החודש האישי ועוד היום בחודש (${day})` : `The personal month plus the day of the month (${day})`, `${monthly.result}+${day} = ${monthly.result + day}`), ...reduced.steps],
    result: reduced.result,
  };
}

function hiddenYear({ d, m, y, now }, he) {
  const lp = LPm(d, m, y);
  const a = CA(d, m, y, now);
  const reduced = reduceSteps(lp + a, false, he);
  return { steps: [step(he ? "שביל הגורל ועוד הגיל" : "Life path plus age", `${lp}+${a} = ${lp + a}`), ...reduced.steps], result: reduced.result };
}

/** Day, month and year of birth, each reduced to one digit: the parts of the pinnacles and challenges. */
function parts({ d, m, y }, he) {
  const named = [
    [d, he ? "יום הלידה בספרה אחת" : "The birth day in one digit"],
    [m, he ? "חודש הלידה בספרה אחת" : "The birth month in one digit"],
    [y, he ? "שנת הלידה בספרה אחת" : "The birth year in one digit"],
  ];
  return { steps: named.map(([value, text]) => step(text, [value, ...reduction(value).steps].join(" → "))), rd: R(d), rm: R(m), ry: R(y) };
}

function pinnacles(ctx, he) {
  const { steps, rd, rm, ry } = parts(ctx, he);
  const p1 = addReduce(rd, rm);
  const p2 = addReduce(rd, ry);
  const p3 = addReduce(p1.result, p2.result);
  const p4 = addReduce(rm, ry);
  const words = he ? ["יום ועוד חודש", "יום ועוד שנה", "פסגה 1 ועוד פסגה 2", "חודש ועוד שנה"] : ["day plus month", "day plus year", "pinnacle 1 plus pinnacle 2", "month plus year"];
  const all = [p1, p2, p3, p4];
  return { steps: [...steps, ...all.map((p, i) => step(he ? `פסגה ${i + 1}: ${words[i]}` : `Pinnacle ${i + 1}: ${words[i]}`, p.math))], result: all.map((p) => p.result) };
}

function challenges(ctx, he) {
  const { steps, rd, rm, ry } = parts(ctx, he);
  const c1 = diff(rd, rm);
  const c2 = diff(rd, ry);
  const c3 = diff(c1.result, c2.result);
  const c4 = diff(rm, ry);
  const words = he
    ? ["ההפרש בין היום לחודש", "ההפרש בין היום לשנה", "ההפרש בין אתגר 1 לאתגר 2", "ההפרש בין החודש לשנה"]
    : ["day minus month", "day minus year", "challenge 1 minus challenge 2", "month minus year"];
  const all = [c1, c2, c3, c4];
  return { steps: [...steps, ...all.map((c, i) => step(he ? `אתגר ${i + 1}: ${words[i]}` : `Challenge ${i + 1}: ${words[i]}`, c.math))], result: all.map((c) => c.result) };
}

function hiddenPinnacles(ctx, he) {
  const pk = pinnacles(ctx, he).result;
  const ch = challenges(ctx, he).result;
  const all = pk.map((p, i) => addReduce(p, ch[i]));
  return {
    steps: all.map((h, i) => step(he ? `פסגה ${i + 1} ועוד אתגר ${i + 1}` : `Pinnacle ${i + 1} plus challenge ${i + 1}`, h.math)),
    result: all.map((h) => h.result),
  };
}

function hiddenChallenges(ctx, he) {
  const hp = hiddenPinnacles(ctx, he).result;
  const lp = LPm(ctx.d, ctx.m, ctx.y);
  const all = hp.map((h) => addReduce(h, lp));
  return {
    steps: all.map((h, i) => step(he ? `פסגה נסתרת ${i + 1} ועוד שביל הגורל` : `Hidden pinnacle ${i + 1} plus the life path`, h.math)),
    result: all.map((h) => h.result),
  };
}

/** The ages of the four cycles: the first ends at 36 minus the life path, the next two last 9 years, the last never ends. */
function cycles({ d, m, y }, he) {
  const lp = LPm(d, m, y);
  const one = R(lp);
  const exit = 27 - one;
  const spans = cycleSpans(exit);
  const steps = [];
  if (one !== lp) steps.push(step(he ? "שביל הגורל בספרה אחת" : "The life path in one digit", `${lp} → ${one}`));
  steps.push(
    step(he ? "המחזור הראשון: מהלידה עד גיל 36 פחות שביל הגורל" : "The first cycle: from birth to 36 minus the life path", `36−${one} = ${spans[0].to}`),
    step(he ? "השני והשלישי: 9 שנים כל אחד" : "The second and third: 9 years each", `${agesText(spans[1])}, ${agesText(spans[2])}`),
    step(he ? `הרביעי: מגיל ${spans[3].from} והלאה` : `The fourth: from ${spans[3].from} on`, agesText(spans[3])),
  );
  return { steps, result: exit, shown: spans.map(agesText).join(" · ") };
}

/** A sum and the way down from it, with any karmic number on the way marked: "4+9+... = 49 → 13 → 4 ← 13". */
function sumWithChain(values, he) {
  if (!values.length) return "0";
  const chain = reductionChain(sum(values));
  const debts = chain.filter((n) => KARMIC.includes(n));
  const down = chain.length > 1 ? ` → ${chain.slice(1).join(" → ")}` : "";
  const flag = debts.length ? (he ? ` ← חוב קארמי ${debts.join(", ")}` : ` ← karmic debt ${debts.join(", ")}`) : "";
  return `${addition(values)}${down}${flag}`;
}

function karmic({ d, m, y, name }, he) {
  const valuesOf = (keep) => lettersOf(name, keep).map((ch) => LV[ch]);
  return {
    steps: [
      step(he ? "חוב קארמי הוא 13, 14, 16 או 19 בכל שלב של הצמצום, או יום לידה כזה" : "A karmic debt is 13, 14, 16 or 19 at any step of a reduction, or such a birth day"),
      step(he ? "סכום ספרות תאריך הלידה" : "The sum of the birth date's digits", sumWithChain(digitsOf(`${d}${m}${y}`), he)),
      step(he ? "סכום ערכי האותיות בשם" : "The sum of the name's letter values", sumWithChain(valuesOf(() => true), he)),
      step(he ? `קול הנשמה (${VOWELS})` : `The soul (${VOWELS})`, sumWithChain(valuesOf((ch) => VOW.has(ch)), he)),
      step(he ? "הביטוי (שאר האותיות)" : "The expression (the other letters)", sumWithChain(valuesOf((ch) => !VOW.has(ch)), he)),
      step(he ? "יום הלידה" : "The birth day", KARMIC.includes(d) ? `${d}${he ? " ← חוב קארמי" : " ← karmic debt"}` : `${d}`),
    ],
    result: karmicDebt(d, m, y, name),
  };
}

const PLANE_WORDS = {
  mind: { he: "מחשבה (4, 9, 2)", en: "mind (4, 9, 2)" },
  emotional: { he: "רגש (3, 5, 7)", en: "emotion (3, 5, 7)" },
  practical: { he: "מעשה (8, 1, 6)", en: "practice (8, 1, 6)" },
};

function loShuGrid({ d, m, y }, he) {
  const ls = loShu(d, m, y);
  const list = (ns) => (ns.length ? ns.join(", ") : he ? "אין" : "none");
  const steps = [
    step(he ? "ספרות תאריך הלידה, בלי אפסים" : "The birth date's digits, without zeros", digitsOf(`${d}${m}${y}`).filter((n) => n !== 0).join(", ")),
    step(he ? "ועוד שביל הגורל בספרה אחת, ויום הלידה בספרה אחת" : "Plus the life path in one digit and the birth day in one digit", `${LP(d, m, y)}, ${R(d)}`),
    step(he ? "המספרים שאינם בטבלה" : "The numbers missing from the grid", list(ls.miss)),
  ];
  if (ls.planes.length) steps.push(step(he ? "שורה שלמה" : "Complete rows", ls.planes.map((p) => PLANE_WORDS[p][he ? "he" : "en"]).join(", ")));
  return { steps, result: ls };
}

function daily({ now }, he) {
  const day = now.getDate();
  const rest = day % 9;
  const steps = [step(he ? `היום ה-${day} בחודש: השארית בחלוקה ב-9` : `Day ${day} of the month: the remainder after dividing by 9`, `${day} mod 9 = ${rest}`)];
  if (rest === 0) steps.push(step(he ? "שארית 0 נחשבת 9" : "A remainder of 0 counts as 9", "0 → 9"));
  return { steps, result: dailyRitualNumber(now) };
}

function maturityNumber({ d, m, y, name }, he) {
  const lp = LPm(d, m, y);
  const nv = NV(name);
  const reduced = reduceSteps(lp + nv, true, he);
  return { steps: [step(he ? "שביל הגורל ועוד ערך השם" : "Life path plus name number", `${lp}+${nv} = ${lp + nv}`), ...reduced.steps], result: reduced.result };
}

function birthday({ d }, he) {
  const reduced = reduceSteps(d, true, he);
  return { steps: [step(he ? "יום הלידה" : "The day of birth", `${d}`), ...reduced.steps], result: reduced.result };
}

/** The dominant (`most`) or missing numbers in the name, from how often each value appears. */
function nameSpread({ name }, he, most) {
  const letters = lettersOf(name, () => true);
  const result = most ? dominantNumbers(name) : missingNumbers(name);
  if (!letters.length) return { steps: [step(he ? "אין בשם אותיות עבריות, אז אין מה לספור" : "The name has no Hebrew letters to count")], result };
  const counts = nameCounts(name);
  const list = result.length ? result.join(", ") : he ? "אין" : "none";
  return {
    steps: [
      step(he ? "ערך כל אות בשם" : "The value of every letter", letters.map((ch) => `${ch}=${LV[ch]}`).join(" ")),
      step(he ? "כמה פעמים מופיע כל מספר" : "How often each number appears", Object.entries(counts).map(([n, k]) => `${n}×${k}`).join(" ")),
      most
        ? step(he ? `הכי הרבה פעמים (${Math.max(...Object.values(counts))})` : `Most often (${Math.max(...Object.values(counts))} times)`, list)
        : step(he ? "לא מופיעים אף פעם" : "Never appear", list),
    ],
    result,
  };
}

/** A practical number: every digit and letter of the text, added and reduced, masters kept. */
function practical({ text }, he) {
  const chars = [...String(text ?? "")].filter((ch) => charValue(ch) > 0 || ch === "0");
  const values = chars.map(charValue);
  if (!values.some(Boolean)) return { steps: [step(he ? "אין ספרות או אותיות לספור, ולכן 0" : "No digits or letters to count, so 0", "0")], result: 0 };
  const reduced = reduceSteps(sum(values), true, he);
  return {
    steps: [
      step(he ? "ערך כל ספרה ואות (ספרה כמו שהיא, אות עברית לפי ערכה, אות לועזית לפי מקומה)" : "Each digit and letter (a digit as it is, a Hebrew letter by value, a Latin one by position)", chars.map((ch, i) => `${ch}=${values[i]}`).join(" ")),
      step(he ? "סוכמים" : "Add them up", addition(values)),
      ...reduced.steps,
    ],
    result: reduced.result,
  };
}

const BUILDERS = {
  nv: (ctx, he) => nameNumber("nv", ctx.name, he),
  su: (ctx, he) => nameNumber("su", ctx.name, he),
  ex: (ctx, he) => nameNumber("ex", ctx.name, he),
  lp: lifePath,
  age,
  py: (ctx, he) => personalYear({ d: ctx.d, m: ctx.m, year: ctx.year ?? ctx.now.getFullYear(), plus: ctx.add ?? addsOne(ctx.now), inSeason: addsOne(ctx.now) }, he),
  pm: personalMonth,
  pd: personalDay,
  hy: hiddenYear,
  pk: pinnacles,
  ch: challenges,
  hp: hiddenPinnacles,
  hc: hiddenChallenges,
  exit: cycles,
  kd: karmic,
  ls: loShuGrid,
  daily,
  mat: maturityNumber,
  bday: birthday,
  dom: (ctx, he) => nameSpread(ctx, he, true),
  miss: (ctx, he) => nameSpread(ctx, he, false),
  text: practical,
};

/** The numbers that have an explanation. */
export const HOW_KEYS = Object.freeze(Object.keys(BUILDERS));

/**
 * How a number was calculated.
 * @param {string} key one of HOW_KEYS ("lp", "py", "pk" ...)
 * @param {{d?: number, m?: number, y?: number, name?: string, now?: Date, add?: boolean, year?: number}} ctx
 *   the birth date and name the number was made from, and the date it was made for (`add` and `year`
 *   pin a personal year that a reading saved, or a year in the cycle table)
 * @param {boolean} he Hebrew or English
 * @returns {{title: string, steps: {text: string, math: string}[], result: *} | null} null for an unknown key
 */
export function howFor(key, ctx, he) {
  if (!Object.hasOwn(BUILDERS, key)) return null;
  return { title: howTitle(key, he), ...BUILDERS[key]({ ...ctx, now: ctx.now ?? new Date() }, he) };
}
